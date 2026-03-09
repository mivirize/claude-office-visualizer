/* ============================================
   Claude Office Visualizer - Backend Server v4
   + Team hierarchy tracking
   + Send command to session via claude CLI
   ============================================ */

const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { exec, spawn } = require('child_process');

// ============================================
// CONFIGURATION
// ============================================
const PORT = 3456;
const CLAUDE_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const POLL_INTERVAL_MS = 500;
const STATIC_DIR = __dirname;

// ============================================
// STATE
// ============================================
let watchedFiles = new Map();
let recentEvents = [];
const MAX_RECENT_EVENTS = 100;

// Session stats
let sessionStats = new Map();

function getSessionStats(sessionId) {
    if (!sessionStats.has(sessionId)) {
        sessionStats.set(sessionId, {
            id: sessionId,
            toolCounts: {},
            filesModified: new Set(),
            filesRead: new Set(),
            cwd: null,
            lastStatus: 'idle',
            lastTask: '',
            totalTools: 0,
            totalThinking: 0,
            userMessages: 0,
            turnCompletes: 0,
            lastEventTime: null,  // timestamp of most recent event
            // Team tracking
            subAgents: [],        // [{ id, name, description, spawnedAt, status }]
            activeSubAgent: null, // currently running sub-agent id
            inSubTask: false,     // true between Task and TaskStop
        });
    }
    return sessionStats.get(sessionId);
}

// ============================================
// HTTP STATIC FILE SERVER
// ============================================
const mimeTypes = {
    '.html': 'text/html', '.css': 'text/css',
    '.js': 'application/javascript', '.json': 'application/json',
    '.png': 'image/png', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    filePath = path.join(STATIC_DIR, filePath);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
        res.end(data);
    });
});

// ============================================
// WEBSOCKET SERVER
// ============================================
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('[WS] Client connected');

    // Build sessions summary - only include active sub-agents
    const sessionsArr = [];
    const NOW = Date.now();

    for (const [id, stats] of sessionStats) {
        // Only include sessions that have had recent activity (last 10 min)
        const lastTime = stats.lastEventTime ? new Date(stats.lastEventTime).getTime() : 0;
        const minutesAgo = (NOW - lastTime) / 60000;
        const isRecentlyActive = minutesAgo < 10;

        // Filter sub-agents strictly: 
        // 1. Must not be completed
        // 2. Session must be recently active
        // 3. Sub-agent must have been spawned in the last 5 minutes OR be the current activeSubAgent
        const activeSubAgents = stats.subAgents.filter(s => {
            if (s.status === 'completed') return false;
            if (!isRecentlyActive) return false;

            const spawnedTime = s.spawnedAt ? new Date(s.spawnedAt).getTime() : 0;
            const spawnedMinutesAgo = (NOW - spawnedTime) / 60000;

            // Allow if it was spawned very recently or is the very last one we tracked
            return spawnedMinutesAgo < 5 || s.id === stats.activeSubAgent;
        });

        sessionsArr.push({
            id: stats.id,
            cwd: stats.cwd,
            status: isRecentlyActive ? stats.lastStatus : 'idle',
            currentTask: stats.lastTask,
            totalTools: stats.totalTools,
            totalThinking: stats.totalThinking,
            userMessages: stats.userMessages,
            turnCompletes: stats.turnCompletes,
            filesModified: Array.from(stats.filesModified).slice(-20),
            filesRead: Array.from(stats.filesRead).slice(-20),
            toolCounts: stats.toolCounts,
            subAgents: activeSubAgents,
            isActive: isRecentlyActive,
            lastEventTime: stats.lastEventTime,
        });
    }

    ws.send(JSON.stringify({
        type: 'init',
        sessions: sessionsArr,
        eventCount: recentEvents.length,
        watchedFiles: watchedFiles.size,
        timestamp: new Date().toISOString(),
    }));

    // Replay recent events
    for (const evt of recentEvents) {
        ws.send(JSON.stringify(evt));
    }

    // Handle incoming messages from client
    ws.on('message', (rawMsg) => {
        try {
            const msg = JSON.parse(rawMsg.toString());
            if (msg.type === 'send_command') {
                handleSendCommand(msg);
            }
        } catch (e) {
            console.error('[WS] Invalid message:', e.message);
        }
    });

    ws.on('close', () => {
        console.log('[WS] Client disconnected');
    });
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
}

function storeAndBroadcast(event) {
    recentEvents.push(event);
    if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift();
    broadcast(event);
}

// ============================================
// SEND COMMAND TO CLAUDE SESSION
// ============================================

function handleSendCommand(msg) {
    const { sessionId, message } = msg;
    if (!sessionId || !message) {
        broadcast({ type: 'command_error', error: 'Missing sessionId or message' });
        return;
    }

    console.log(`[CMD] Sending to session ${sessionId.substring(0, 8)}: "${message.substring(0, 50)}..."`);

    // Broadcast that we're sending a command
    broadcast({
        type: 'command_sent',
        sessionId,
        message,
        timestamp: new Date().toISOString(),
    });

    // Use claude CLI to resume session with message
    // -p = print mode (non-interactive, pipe mode)
    // --resume = resume existing session
    const cmd = `claude -p --resume "${sessionId}" "${message.replace(/"/g, '\\"')}"`;

    console.log(`[CMD] Executing: ${cmd}`);

    const child = exec(cmd, {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        encoding: 'utf8',
    }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[CMD] Error: ${error.message}`);
            broadcast({
                type: 'command_error',
                sessionId,
                error: error.message,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        console.log(`[CMD] Response received (${stdout.length} chars)`);
        broadcast({
            type: 'command_response',
            sessionId,
            response: stdout.substring(0, 2000),
            timestamp: new Date().toISOString(),
        });
    });
}

// ============================================
// JSONL LINE PARSER
// ============================================

function parseLine(line, filePath) {
    if (!line || line.length < 10) return null;
    try {
        const event = JSON.parse(line);
        return processEvent(event, filePath);
    } catch (e) {
        return null;
    }
}

function processEvent(event, filePath) {
    const sessionId = event.sessionId || path.basename(filePath, '.jsonl');
    if (event.type === 'file-history-snapshot') return null;

    const stats = getSessionStats(sessionId);
    // Track when this session last had activity
    if (event.timestamp) stats.lastEventTime = event.timestamp;

    // ---- USER MESSAGE ----
    if (event.type === 'user') {
        if (event.cwd) stats.cwd = event.cwd;
        stats.userMessages++;

        if (event.message?.content && Array.isArray(event.message.content)) {
            for (const block of event.message.content) {
                if (block.type === 'tool_result') {
                    return { type: 'tool_result', sessionId, toolId: block.tool_use_id, timestamp: event.timestamp };
                }
            }
        }

        if (typeof event.message?.content === 'string' && event.message.content.includes('teammate-message')) {
            const match = event.message.content.match(/teammate_id="([^"]+)"/);
            const colorMatch = event.message.content.match(/color="([^"]+)"/);
            return { type: 'teammate_message', sessionId, agentId: match ? match[1] : 'unknown', color: colorMatch ? colorMatch[1] : 'blue', timestamp: event.timestamp };
        }

        if (event.todos) {
            return { type: 'todos_update', sessionId, todos: event.todos, timestamp: event.timestamp };
        }

        let text = '';
        if (typeof event.message?.content === 'string') text = event.message.content.substring(0, 200);
        else if (Array.isArray(event.message?.content)) {
            const textBlock = event.message.content.find(b => b.type === 'text');
            if (textBlock) text = textBlock.text.substring(0, 200);
        }
        if (!text) return null;

        return { type: 'user_message', sessionId, text, cwd: stats.cwd, timestamp: event.timestamp };
    }

    // ---- ASSISTANT MESSAGE ----
    if (event.type === 'assistant') {
        const stopReason = event.message?.stop_reason;
        const isTurnEnd = (stopReason === 'end_turn' || stopReason === 'stop_sequence');

        if (isTurnEnd) {
            stats.lastStatus = 'idle';
            stats.turnCompletes++;
            // Auto-complete any active sub-agent
            if (stats.activeSubAgent) {
                const sub = stats.subAgents.find(s => s.id === stats.activeSubAgent);
                if (sub) sub.status = 'completed';
                stats.activeSubAgent = null;
                stats.inSubTask = false;
            }
        }

        if (event.message?.content) {
            for (const block of event.message.content) {
                if (block.type === 'tool_use') {
                    const toolName = block.name;
                    const toolInput = block.input || {};
                    const agentStatus = getStatusFromTool(toolName);

                    stats.toolCounts[toolName] = (stats.toolCounts[toolName] || 0) + 1;
                    stats.totalTools++;
                    stats.lastStatus = agentStatus;

                    // ===== TEAM: Detect sub-agent spawning =====
                    let subAgentEvent = null;
                    if (['Task', 'Agent'].includes(toolName)) {
                        // Auto-complete any previous sub-agent first
                        if (stats.activeSubAgent) {
                            const prevSub = stats.subAgents.find(s => s.id === stats.activeSubAgent);
                            if (prevSub) prevSub.status = 'completed';
                        }

                        const subName = toolInput.description?.substring(0, 60) || toolInput.name || 'Sub-agent';
                        const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                        const sub = { id: subId, name: subName, description: toolInput.description?.substring(0, 120) || '', spawnedAt: event.timestamp, status: 'working' };
                        stats.subAgents.push(sub);
                        stats.activeSubAgent = subId;
                        stats.inSubTask = true;

                        subAgentEvent = {
                            type: 'sub_agent_spawned',
                            sessionId,
                            subAgent: sub,
                            timestamp: event.timestamp,
                        };
                    }

                    // ===== TEAM: Detect sub-agent completion =====
                    // TaskStop, TaskOutput both indicate sub-agent is done
                    if (['TaskStop', 'TaskOutput'].includes(toolName)) {
                        if (stats.activeSubAgent) {
                            const sub = stats.subAgents.find(s => s.id === stats.activeSubAgent);
                            if (sub) sub.status = 'completed';
                            const completedId = stats.activeSubAgent;
                            stats.activeSubAgent = null;
                            stats.inSubTask = false;

                            return {
                                type: 'sub_agent_completed',
                                sessionId,
                                subAgentId: completedId,
                                timestamp: event.timestamp,
                            };
                        }
                    }

                    // Track files
                    const fp = toolInput.file_path || toolInput.path || '';
                    if (fp) {
                        const baseName = path.basename(fp);
                        if (['Write', 'Edit', 'MultiEdit', 'CreateFile'].includes(toolName)) {
                            stats.filesModified.add(baseName);
                            stats.lastTask = `Editing ${baseName}`;
                        } else if (['Read', 'ReadFile', 'View'].includes(toolName)) {
                            stats.filesRead.add(baseName);
                            stats.lastTask = `Reading ${baseName}`;
                        }
                    } else if (toolInput.command) {
                        stats.lastTask = `Running: ${toolInput.command.substring(0, 60)}`;
                    } else if (toolInput.name) {
                        stats.lastTask = `Agent: ${toolInput.name}`;
                    } else if (toolInput.query) {
                        stats.lastTask = `Searching: ${toolInput.query.substring(0, 60)}`;
                    } else {
                        stats.lastTask = `Using ${toolName}`;
                    }

                    const toolEvent = {
                        type: 'tool_use', sessionId, toolName,
                        toolInput: summarizeToolInput(toolName, toolInput),
                        agentStatus, taskText: stats.lastTask,
                        isSubAgentWork: stats.inSubTask,
                        activeSubAgentId: stats.activeSubAgent,
                        timestamp: event.timestamp,
                    };

                    // If we also spawned a sub-agent, broadcast that first
                    if (subAgentEvent) {
                        // We need to return the tool event but also emit the sub-agent event
                        // Store sub-agent event for broadcast later
                        storeAndBroadcastDirect(subAgentEvent);
                    }

                    return toolEvent;
                }

                if (block.type === 'thinking') {
                    stats.totalThinking++;
                    stats.lastStatus = 'thinking';
                    return { type: 'thinking', sessionId, timestamp: event.timestamp };
                }

                if (block.type === 'text' && block.text && block.text.length > 5) {
                    stats.lastStatus = isTurnEnd ? 'idle' : 'responding';
                    return {
                        type: isTurnEnd ? 'turn_complete' : 'assistant_text',
                        sessionId, text: block.text.substring(0, 200),
                        timestamp: event.timestamp,
                    };
                }
            }
        }

        if (isTurnEnd) {
            return { type: 'turn_complete', sessionId, timestamp: event.timestamp };
        }
    }

    if (event.type === 'queue-operation' && event.content) {
        const match = event.content.match(/teammate_id="([^"]+)"/);
        if (match) {
            return { type: 'teammate_message', sessionId, agentId: match[1], timestamp: event.timestamp };
        }
    }

    return null;
}

// Broadcast directly without storing in recentEvents (for secondary events)
function storeAndBroadcastDirect(event) {
    recentEvents.push(event);
    if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift();
    broadcast(event);
}

function getStatusFromTool(toolName) {
    const map = {
        'Read': 'reading', 'ReadFile': 'reading', 'View': 'reading',
        'LS': 'reading', 'Glob': 'reading', 'Grep': 'reading', 'Find': 'reading',
        'Write': 'coding', 'Edit': 'coding', 'MultiEdit': 'coding',
        'CreateFile': 'coding', 'Bash': 'coding',
        'TodoWrite': 'thinking', 'Task': 'delegating', 'TeamCreate': 'delegating',
        'SendMessage': 'communicating', 'WebSearch': 'reading', 'WebFetch': 'reading',
    };
    return map[toolName] || 'working';
}

function summarizeToolInput(toolName, input) {
    const s = {};
    if (input.file_path) { s.file = path.basename(input.file_path); s.fullPath = input.file_path; }
    if (input.path) { s.file = path.basename(input.path); s.fullPath = input.path; }
    if (input.command) s.command = input.command.substring(0, 120);
    if (input.name) s.name = input.name;
    if (input.team_name) s.team = input.team_name;
    if (input.recipient) s.recipient = input.recipient;
    if (input.query) s.query = input.query.substring(0, 100);
    if (input.todos) s.todoCount = input.todos.length;
    if (input.description) s.description = input.description.substring(0, 100);
    return s;
}

// ============================================
// FILE WATCHER
// ============================================

function scanForNewFiles() {
    if (!fs.existsSync(PROJECTS_DIR)) return;
    try {
        const projectDirs = fs.readdirSync(PROJECTS_DIR);
        for (const projDir of projectDirs) {
            const projPath = path.join(PROJECTS_DIR, projDir);
            try { if (!fs.statSync(projPath).isDirectory()) continue; } catch { continue; }
            let files;
            try { files = fs.readdirSync(projPath).filter(f => f.endsWith('.jsonl')); } catch { continue; }
            for (const file of files) {
                const filePath = path.join(projPath, file);
                if (watchedFiles.has(filePath)) continue;
                try {
                    const fstats = fs.statSync(filePath);
                    const now = new Date();
                    if (now - fstats.mtime > 24 * 60 * 60 * 1000) continue;
                    if (fstats.size < 100) continue;
                    console.log(`[WATCH] ${path.basename(filePath)} (${(fstats.size / 1024).toFixed(0)} KB)`);
                    const eventCount = loadFileHistory(filePath);
                    console.log(`  -> Parsed ${eventCount} events`);
                    watchedFiles.set(filePath, { lastRead: fstats.size });
                } catch (e) {
                    console.error(`[ERROR] ${filePath}:`, e.message);
                }
            }
        }
    } catch (e) {
        console.error('[ERROR] scan:', e.message);
    }
}

function loadFileHistory(filePath) {
    let eventCount = 0;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            const event = parseLine(line, filePath);
            if (event) { recentEvents.push(event); eventCount++; }
        }
        while (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift();
    } catch (e) {
        try {
            const fstats = fs.statSync(filePath);
            const readSize = Math.min(fstats.size, 500000);
            const buffer = Buffer.alloc(readSize);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, buffer, 0, readSize, fstats.size - readSize);
            fs.closeSync(fd);
            const text = buffer.toString('utf8');
            const firstNewline = text.indexOf('\n');
            const cleanText = firstNewline > 0 ? text.substring(firstNewline + 1) : text;
            for (const line of cleanText.split('\n')) {
                if (!line.trim()) continue;
                const event = parseLine(line, filePath);
                if (event) { recentEvents.push(event); eventCount++; }
            }
            while (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift();
        } catch (e2) {
            console.error(`  -> Failed to read: ${e2.message}`);
        }
    }
    return eventCount;
}

function pollFiles() {
    for (const [filePath, info] of watchedFiles) {
        try {
            const fstats = fs.statSync(filePath);
            if (fstats.size <= info.lastRead) continue;
            const newSize = fstats.size - info.lastRead;
            const buffer = Buffer.alloc(newSize);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, buffer, 0, newSize, info.lastRead);
            fs.closeSync(fd);
            const text = buffer.toString('utf8');
            for (const line of text.split('\n')) {
                if (!line.trim()) continue;
                const event = parseLine(line, filePath);
                if (event) {
                    storeAndBroadcast(event);
                    console.log(`[EVENT] ${event.type} | ${event.sessionId?.substring(0, 8)}... | ${event.toolName || event.text?.substring(0, 30) || ''}`);
                }
            }
            info.lastRead = fstats.size;
        } catch (e) {
            watchedFiles.delete(filePath);
        }
    }
}

// ============================================
// MAIN
// ============================================
console.log('');
console.log('===========================================');
console.log('  Claude Office Visualizer - Server v4');
console.log('  + Team Tracking + Command Sending');
console.log('===========================================');
console.log('');
console.log(`  Claude dir: ${CLAUDE_DIR}`);
console.log(`  Projects:   ${PROJECTS_DIR}`);
console.log(`  Port:       ${PORT}`);
console.log('');

scanForNewFiles();

console.log(`  Total recent events cached: ${recentEvents.length}`);
console.log(`  Watching ${watchedFiles.size} active file(s)`);
for (const [id, stats] of sessionStats) {
    const activeSubs = stats.subAgents.filter(s => s.status !== 'completed').length;
    const totalSubs = stats.subAgents.length;
    const lastEvt = stats.lastEventTime || 'never';
    console.log(`  Session ${id.substring(0, 8)}: ${stats.totalTools} tools, ${stats.filesModified.size} modified, ${activeSubs}/${totalSubs} sub-agents active, last: ${lastEvt}`);
}
console.log('');

setInterval(pollFiles, POLL_INTERVAL_MS);
setInterval(scanForNewFiles, 10000);

server.listen(PORT, () => {
    console.log(`  ✅ Server running at http://localhost:${PORT}`);
    console.log('');
});
