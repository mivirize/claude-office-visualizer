/* ============================================
   Claude Office Visualizer - Application Logic
   Pixel Art Office Simulation Engine
   ============================================ */

// Dynamic agents array - populated based on real sessions/subagents
let AGENTS = [];

// Visual templates for agents (cycled when creating new agents)
const AGENT_TEMPLATES = [
    { avatar: '🤖', color: '#4488ff', skinColor: '#ffcc99', shirtColor: '#4488ff' },
    { avatar: '🧑‍💻', color: '#aa66ff', skinColor: '#f5d0a9', shirtColor: '#aa66ff' },
    { avatar: '👾', color: '#44ff88', skinColor: '#ffe0bd', shirtColor: '#44ff88' },
    { avatar: '🔧', color: '#ff8844', skinColor: '#ffdbac', shirtColor: '#ff8844' },
    { avatar: '🧠', color: '#ff44aa', skinColor: '#ffcc99', shirtColor: '#ff44aa' },
    { avatar: '⚡', color: '#44ddff', skinColor: '#f5d0a9', shirtColor: '#44ddff' },
    { avatar: '🎯', color: '#ffdd44', skinColor: '#ffe0bd', shirtColor: '#ccaa22' },
    { avatar: '🛡️', color: '#88ff44', skinColor: '#ffdbac', shirtColor: '#88ff44' },
];

function createAgent(id, name, role) {
    const templateIdx = AGENTS.length % AGENT_TEMPLATES.length;
    const t = AGENT_TEMPLATES[templateIdx];
    return {
        id, name, role,
        avatar: t.avatar,
        color: t.color,
        skinColor: t.skinColor,
        shirtColor: t.shirtColor,
        status: 'idle',
        task: 'Waiting...',
        progress: 0,
        deskX: 0, deskY: 0,
        x: 0, y: 0, targetX: 0, targetY: 0,
        frame: 0, direction: 'down',
        speechBubble: null, speechTimer: 0,
        actionTimer: 0,
    };
}

// Create demo agents (only used when server is not connected)
function createDemoAgents() {
    AGENTS = [
        createAgent('alpha', 'Agent Alpha', 'Lead Developer'),
        createAgent('beta', 'Agent Beta', 'Frontend Engineer'),
        createAgent('gamma', 'Agent Gamma', 'Backend Engineer'),
        createAgent('delta', 'Agent Delta', 'DevOps Specialist'),
    ];
    AGENTS[0].status = 'coding';
    AGENTS[0].task = 'Building authentication module';
    AGENTS[0].progress = 65;
    AGENTS[1].status = 'thinking';
    AGENTS[1].task = 'Designing component library';
    AGENTS[1].progress = 40;
    AGENTS[2].status = 'reading';
    AGENTS[2].task = 'Reviewing database schema';
    AGENTS[2].progress = 80;
    AGENTS[3].status = 'coding';
    AGENTS[3].task = 'Setting up CI/CD pipeline';
    AGENTS[3].progress = 25;
}

const BOSS = {
    id: 'boss',
    name: 'Boss Claude',
    role: 'Project Manager',
    avatar: '👑',
    color: '#ffdd44',
    skinColor: '#ffd5a0',
    shirtColor: '#1a1a60',
    status: 'thinking',
    x: 0, y: 0,
    frame: 0,
    speechBubble: null, speechTimer: 0,
};

const LOG_MESSAGES = [
    { type: 'system', msg: 'Claude Office Visualizer initialized' },
    { type: 'action', msg: 'Agent Alpha connected to workspace' },
    { type: 'action', msg: 'Agent Beta connected to workspace' },
    { type: 'action', msg: 'Agent Gamma connected to workspace' },
    { type: 'action', msg: 'Agent Delta connected to workspace' },
    { type: 'success', msg: 'All agents online. Starting tasks...' },
    { type: 'info', msg: 'Alpha: Reading project structure...' },
    { type: 'action', msg: 'Alpha: Created src/auth/module.ts' },
    { type: 'info', msg: 'Beta: Analyzing design tokens...' },
    { type: 'action', msg: 'Gamma: Querying database schema...' },
    { type: 'success', msg: 'Delta: Pipeline config validated ✓' },
    { type: 'action', msg: 'Alpha: Writing JWT handler...' },
    { type: 'warning', msg: 'Beta: Component conflict detected' },
    { type: 'success', msg: 'Beta: Conflict resolved automatically' },
    { type: 'action', msg: 'Gamma: Optimizing query indexes...' },
    { type: 'info', msg: 'Boss: Reviewing agent progress...' },
    { type: 'success', msg: 'Alpha: Auth module tests passing ✓' },
    { type: 'action', msg: 'Delta: Deploying to staging...' },
    { type: 'error', msg: 'Delta: Build warning - unused import' },
    { type: 'success', msg: 'Delta: Warning resolved, build clean ✓' },
    { type: 'action', msg: 'Alpha: Implementing password hashing' },
    { type: 'info', msg: 'Gamma: Running migration scripts...' },
    { type: 'success', msg: 'Gamma: Migration complete ✓' },
    { type: 'action', msg: 'Beta: Creating Button component' },
    { type: 'action', msg: 'Beta: Creating Input component' },
    { type: 'success', msg: 'Beta: Component library v1 ready ✓' },
    { type: 'info', msg: 'Boss: Scheduling code review...' },
    { type: 'action', msg: 'Alpha: Refactoring middleware...' },
    { type: 'warning', msg: 'Memory usage: 78% - monitoring' },
    { type: 'success', msg: 'Delta: CI/CD pipeline operational ✓' },
    { type: 'action', msg: 'Gamma: Implementing caching layer' },
    { type: 'info', msg: 'Boss: All tasks on schedule 📊' },
];

const TASKS = [
    'Building authentication system...',
    'Refactoring API endpoints...',
    'Writing unit tests...',
    'Optimizing database queries...',
    'Designing UI components...',
    'Setting up CI/CD pipeline...',
    'Reviewing pull requests...',
    'Implementing error handling...',
    'Creating documentation...',
    'Deploying to production...',
];

const SPEECH_BUBBLES = {
    coding: ['Writing code...', 'function() {...}', 'Compiling...', 'import ...', 'async/await', 'git commit'],
    thinking: ['Hmm...', 'Analyzing...', 'Planning...', '🤔', 'Let me think...', 'Processing...'],
    reading: ['Reading file...', 'Checking docs...', 'LGTM 👀', 'Parsing...', 'Scanning...'],
    idle: ['☕', 'Break time', '...', 'Waiting...', 'Ready!'],
    complete: ['Done! ✓', 'Shipped! 🚀', 'All tests pass!', 'Complete!'],
    error: ['Bug found!', 'Error!', 'Fixing...', '⚠️'],
};

const FILE_TREE = [
    { name: 'src/', type: 'dir' },
    { name: '  auth/', type: 'dir' },
    { name: '    module.ts', type: 'modified' },
    { name: '    handler.ts', type: 'added' },
    { name: '  components/', type: 'dir' },
    { name: '    Button.tsx', type: 'added' },
    { name: '    Input.tsx', type: 'added' },
    { name: '  db/', type: 'dir' },
    { name: '    schema.ts', type: 'modified' },
    { name: '  pipeline/', type: 'dir' },
    { name: '    config.yml', type: 'modified' },
];

const ACHIEVEMENTS_DATA = [
    { icon: '🚀', name: 'First Deploy', desc: 'Deploy to staging', unlocked: true },
    { icon: '🧪', name: 'Test Master', desc: '100 tests passing', unlocked: true },
    { icon: '🔥', name: 'Speed Coder', desc: '1000 lines/hour', unlocked: false },
    { icon: '🏗️', name: 'Architect', desc: 'Design system complete', unlocked: false },
];

// State
let state = {
    logIndex: 0,
    totalLogs: 0,
    xp: 0,
    xpMax: 2000,
    taskIndex: 0,
    startTime: Date.now(),
    particles: [],
    hoveredAgent: null,
    animTick: 0,
    stars: [],
};

// Live mode stats (populated from real Claude Code events)
let liveStats = {
    filesModified: new Set(),
    filesRead: new Set(),
    toolCounts: {},
    totalTools: 0,
    totalThinking: 0,
    userMessages: 0,
    turnCompletes: 0,
    cwd: '',
    projectName: '',
    currentTask: '',
    liveFileTree: [],
};

// Team tracking: sessionId -> { ownerAgentIdx, subAgentIdxs[], sessionId, cwd }
let teams = new Map();
// Available sessions for command bar
let availableSessions = []; // [{ id, cwd, status }]


// ============================================
// CANVAS RENDERING ENGINE
// ============================================

const canvas = document.getElementById('office-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height - 70; // subtract taskbar + command bar
}

// Generate stars for the window
function generateStars() {
    state.stars = [];
    for (let i = 0; i < 30; i++) {
        state.stars.push({
            x: Math.random(),
            y: Math.random(),
            size: Math.random() * 2 + 0.5,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.01,
        });
    }
}

// ============================================
// PIXEL ART DRAWING FUNCTIONS
// ============================================

function drawPixelRect(x, y, w, h, color, border = null) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    if (border) {
        ctx.strokeStyle = border;
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    }
}

function drawPixelText(text, x, y, color = '#fff', size = 10, align = 'left') {
    ctx.font = `${size}px "Press Start 2P"`;
    ctx.textAlign = align;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

// Draw a pixel character (simplified cute style)
function drawCharacter(x, y, agent, scale = 1) {
    const s = 4 * scale; // pixel size
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const frame = Math.floor(agent.frame) % 4;
    const bobY = (frame === 1 || frame === 3) ? -1 * scale : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16 * scale, 8 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (shirt)
    drawPixelRect(cx - 5 * scale, cy - 4 * scale + bobY, 10 * scale, 10 * scale, agent.shirtColor);
    // Shirt detail
    drawPixelRect(cx - 1 * scale, cy - 2 * scale + bobY, 2 * scale, 6 * scale, shadeColor(agent.shirtColor, -20));

    // Head
    drawPixelRect(cx - 5 * scale, cy - 14 * scale + bobY, 10 * scale, 10 * scale, agent.skinColor);

    // Hair
    drawPixelRect(cx - 6 * scale, cy - 16 * scale + bobY, 12 * scale, 4 * scale, shadeColor(agent.shirtColor, -40));
    drawPixelRect(cx - 6 * scale, cy - 14 * scale + bobY, 2 * scale, 6 * scale, shadeColor(agent.shirtColor, -40));

    // Eyes
    const blinkFrame = state.animTick % 120;
    if (blinkFrame < 3) {
        // Blink
        drawPixelRect(cx - 3 * scale, cy - 10 * scale + bobY, 2 * scale, 1 * scale, '#333');
        drawPixelRect(cx + 1 * scale, cy - 10 * scale + bobY, 2 * scale, 1 * scale, '#333');
    } else {
        drawPixelRect(cx - 3 * scale, cy - 11 * scale + bobY, 2 * scale, 2 * scale, '#333');
        drawPixelRect(cx + 1 * scale, cy - 11 * scale + bobY, 2 * scale, 2 * scale, '#333');
        // Eye highlight
        drawPixelRect(cx - 3 * scale, cy - 11 * scale + bobY, 1 * scale, 1 * scale, '#fff');
        drawPixelRect(cx + 1 * scale, cy - 11 * scale + bobY, 1 * scale, 1 * scale, '#fff');
    }

    // Mouth
    if (agent.status === 'coding' && frame % 2 === 0) {
        drawPixelRect(cx - 1 * scale, cy - 7 * scale + bobY, 3 * scale, 1 * scale, '#c07050');
    } else {
        drawPixelRect(cx - 1 * scale, cy - 7 * scale + bobY, 2 * scale, 1 * scale, '#c07050');
    }

    // Arms
    if (agent.status === 'coding') {
        // Typing animation
        const armOffset = frame % 2 === 0 ? 0 : -1 * scale;
        drawPixelRect(cx - 7 * scale, cy - 2 * scale + bobY + armOffset, 2 * scale, 6 * scale, agent.skinColor);
        drawPixelRect(cx + 5 * scale, cy - 2 * scale + bobY - armOffset, 2 * scale, 6 * scale, agent.skinColor);
    } else if (agent.status === 'thinking') {
        // Hand on chin
        drawPixelRect(cx - 7 * scale, cy - 2 * scale + bobY, 2 * scale, 5 * scale, agent.skinColor);
        drawPixelRect(cx + 5 * scale, cy - 8 * scale + bobY, 2 * scale, 5 * scale, agent.skinColor);
    } else {
        drawPixelRect(cx - 7 * scale, cy - 2 * scale + bobY, 2 * scale, 6 * scale, agent.skinColor);
        drawPixelRect(cx + 5 * scale, cy - 2 * scale + bobY, 2 * scale, 6 * scale, agent.skinColor);
    }

    // Legs
    drawPixelRect(cx - 4 * scale, cy + 6 * scale, 3 * scale, 6 * scale, '#334');
    drawPixelRect(cx + 1 * scale, cy + 6 * scale, 3 * scale, 6 * scale, '#334');

    // Status indicator above head
    const statusColors = {
        coding: '#4488ff',
        thinking: '#aa66ff',
        reading: '#ffdd44',
        idle: '#555588',
        complete: '#44ff88',
        error: '#ff4466',
    };
    const indicatorColor = statusColors[agent.status] || '#555588';
    const pulseAlpha = 0.5 + 0.5 * Math.sin(state.animTick * 0.1);
    ctx.fillStyle = indicatorColor;
    ctx.globalAlpha = pulseAlpha;
    ctx.beginPath();
    ctx.arc(cx, cy - 20 * scale + bobY, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Speech bubble
    if (agent.speechBubble && agent.speechTimer > 0) {
        drawSpeechBubble(cx, cy - 28 * scale + bobY, agent.speechBubble);
    }
}

function drawSpeechBubble(x, y, text) {
    const bobY = Math.sin(state.animTick * 0.08) * 2;
    ctx.font = '11px "VT323"';
    const metrics = ctx.measureText(text);
    const tw = metrics.width + 12;
    const th = 18;
    const bx = x - tw / 2;
    const by = y - th + bobY;

    // Bubble background
    drawPixelRect(bx, by, tw, th, 'rgba(255,255,255,0.95)');
    drawPixelRect(bx, by, tw, th, null, '#333');

    // Triangle pointer
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(x - 4, by + th);
    ctx.lineTo(x, by + th + 5);
    ctx.lineTo(x + 4, by + th);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 4, by + th);
    ctx.lineTo(x, by + th + 5);
    ctx.lineTo(x + 4, by + th);
    ctx.stroke();

    // Text
    ctx.font = '11px "VT323"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333';
    ctx.fillText(text, x, by + 13);
    ctx.textAlign = 'left';
}

function drawDesk(x, y, w, h) {
    // Desk top
    drawPixelRect(x, y, w, h, '#5a4a3a');
    drawPixelRect(x + 2, y + 2, w - 4, h - 4, '#6b5b4b');
    // Highlight
    drawPixelRect(x + 2, y + 2, w - 4, 3, '#7d6d5d');

    // Desk legs
    drawPixelRect(x + 4, y + h, 4, 12, '#4a3a2a');
    drawPixelRect(x + w - 8, y + h, 4, 12, '#4a3a2a');
}

function drawMonitor(x, y, isActive, agentStatus) {
    // Monitor body
    drawPixelRect(x, y, 22, 18, '#2a2a3a');
    drawPixelRect(x + 2, y + 2, 18, 12, '#0a0a2a');

    // Screen content based on status
    if (isActive) {
        if (agentStatus === 'coding') {
            // Code lines
            const colors = ['#66ff88', '#88aaff', '#ffaa44', '#ff6688'];
            for (let i = 0; i < 4; i++) {
                const lineW = 4 + Math.sin(state.animTick * 0.1 + i) * 3 + 6;
                drawPixelRect(x + 4, y + 4 + i * 3, lineW, 2, colors[i % colors.length]);
            }
        } else if (agentStatus === 'thinking') {
            // Loading dots
            for (let i = 0; i < 3; i++) {
                const dotAlpha = Math.sin(state.animTick * 0.15 + i * 0.8) > 0 ? 1 : 0.3;
                ctx.globalAlpha = dotAlpha;
                drawPixelRect(x + 6 + i * 4, y + 8, 2, 2, '#aa66ff');
            }
            ctx.globalAlpha = 1;
        } else if (agentStatus === 'reading') {
            // Text lines
            for (let i = 0; i < 4; i++) {
                drawPixelRect(x + 4, y + 4 + i * 3, 12, 2, '#ffdd44');
            }
        } else if (agentStatus === 'complete') {
            // Checkmark
            drawPixelRect(x + 7, y + 8, 2, 4, '#44ff88');
            drawPixelRect(x + 9, y + 6, 2, 6, '#44ff88');
            drawPixelRect(x + 11, y + 4, 2, 4, '#44ff88');
        } else {
            // Screen saver
            const sx = x + 4 + Math.sin(state.animTick * 0.03) * 5 + 5;
            const sy = y + 4 + Math.cos(state.animTick * 0.04) * 3 + 3;
            drawPixelRect(sx, sy, 4, 4, '#00ddff');
        }
    } else {
        // Dark screen
        drawPixelRect(x + 2, y + 2, 18, 12, '#050510');
    }

    // Monitor stand
    drawPixelRect(x + 8, y + 18, 6, 4, '#3a3a4a');
    drawPixelRect(x + 5, y + 22, 12, 2, '#3a3a4a');

    // Screen glow
    if (isActive) {
        const glowColors = {
            coding: 'rgba(68, 136, 255, 0.08)',
            thinking: 'rgba(170, 102, 255, 0.08)',
            reading: 'rgba(255, 221, 68, 0.08)',
            complete: 'rgba(68, 255, 136, 0.08)',
        };
        ctx.fillStyle = glowColors[agentStatus] || 'rgba(0, 221, 255, 0.08)';
        ctx.beginPath();
        ctx.ellipse(x + 11, y + 14, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawChair(x, y) {
    // Seat
    drawPixelRect(x, y, 18, 6, '#3a3a5a');
    drawPixelRect(x + 2, y + 2, 14, 2, '#4a4a6a');
    // Backrest
    drawPixelRect(x + 2, y - 12, 14, 12, '#3a3a5a');
    drawPixelRect(x + 4, y - 10, 10, 8, '#4a4a6a');
    // Legs
    drawPixelRect(x + 4, y + 6, 2, 8, '#2a2a4a');
    drawPixelRect(x + 12, y + 6, 2, 8, '#2a2a4a');
    // Wheels
    drawPixelRect(x + 2, y + 14, 4, 2, '#222');
    drawPixelRect(x + 12, y + 14, 4, 2, '#222');
}

function drawPlant(x, y) {
    // Pot
    drawPixelRect(x, y + 8, 14, 10, '#8b5e3c');
    drawPixelRect(x + 2, y + 10, 10, 6, '#a87048');
    // Soil
    drawPixelRect(x + 2, y + 8, 10, 3, '#4a3222');
    // Leaves
    const sway = Math.sin(state.animTick * 0.03) * 2;
    drawPixelRect(x + 4 + sway, y - 4, 6, 10, '#22aa44');
    drawPixelRect(x + 0 + sway, y - 2, 5, 6, '#33bb55');
    drawPixelRect(x + 9 + sway, y + 0, 5, 6, '#33bb55');
    drawPixelRect(x + 2 + sway, y - 8, 4, 6, '#44cc66');
    drawPixelRect(x + 7 + sway, y - 6, 4, 6, '#44cc66');
}

function drawWaterCooler(x, y) {
    // Base
    drawPixelRect(x, y + 16, 16, 20, '#aabbcc');
    drawPixelRect(x + 2, y + 18, 12, 4, '#8899aa');
    // Water bottle
    drawPixelRect(x + 3, y - 4, 10, 20, '#aaddff');
    drawPixelRect(x + 5, y - 4, 6, 20, '#88ccff');
    // Cap
    drawPixelRect(x + 4, y - 6, 8, 3, '#99aacc');
    // Water level
    const waterLevel = y + 4 + Math.sin(state.animTick * 0.02);
    drawPixelRect(x + 4, waterLevel, 8, 12 - Math.sin(state.animTick * 0.02), '#4488cc');
    // Tap
    drawPixelRect(x + 14, y + 22, 4, 3, '#888');
    // Cup
    drawPixelRect(x + 14, y + 28, 6, 6, '#fff');
    drawPixelRect(x + 15, y + 29, 4, 4, '#eee');
}

function drawWhiteboard(x, y, w, h) {
    // Frame
    drawPixelRect(x, y, w, h, '#aaa');
    // Board
    drawPixelRect(x + 3, y + 3, w - 6, h - 6, '#f0f0f0');

    // Content on the whiteboard
    const texts = ['Sprint 5', '[ ] Auth', '[✓] API', '[~] Tests'];
    for (let i = 0; i < texts.length; i++) {
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = i === 0 ? '#333' : i === 2 ? '#22aa44' : i === 3 ? '#ff8844' : '#666';
        ctx.fillText(texts[i], x + 8, y + 16 + i * 12);
    }
}

function drawBookshelf(x, y) {
    // Shelf frame
    drawPixelRect(x, y, 30, 50, '#5a3a2a');
    drawPixelRect(x + 2, y + 2, 26, 46, '#6b4b3b');

    // Shelves
    const bookWidths = [3, 4, 3, 4, 3, 3, 4, 3, 4, 4, 3, 4, 3, 3, 4, 3, 4, 3, 3, 4];
    for (let s = 0; s < 3; s++) {
        const sy = y + 4 + s * 16;
        drawPixelRect(x + 2, sy + 12, 26, 3, '#5a3a2a');
        // Books
        const bookColors = ['#ff4466', '#4488ff', '#44ff88', '#ffdd44', '#aa66ff', '#ff8844'];
        for (let b = 0; b < 4 + s; b++) {
            const bw = bookWidths[(b + s * 5) % bookWidths.length];
            drawPixelRect(x + 4 + b * 5, sy + 2, bw, 10, bookColors[(b + s * 3) % bookColors.length]);
        }
    }
}

function drawWindow(x, y, w, h) {
    // Frame
    drawPixelRect(x, y, w, h, '#6a6a8a');
    drawPixelRect(x + 3, y + 3, w - 6, h - 6, '#0a0a2a');

    // Night sky
    const gradient = ctx.createLinearGradient(x + 3, y + 3, x + 3, y + h - 6);
    gradient.addColorStop(0, '#05051a');
    gradient.addColorStop(0.6, '#0a0a30');
    gradient.addColorStop(1, '#151540');
    ctx.fillStyle = gradient;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

    // Stars
    for (const star of state.stars) {
        const sx = x + 3 + star.x * (w - 6);
        const sy = y + 3 + star.y * (h - 10);
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(state.animTick * star.speed + star.twinkle));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx, sy, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    // City skyline
    const buildings = [
        { x: 0, w: 10, h: 18 },
        { x: 12, w: 8, h: 25 },
        { x: 22, w: 12, h: 15 },
        { x: 36, w: 7, h: 22 },
        { x: 45, w: 14, h: 20 },
        { x: 61, w: 9, h: 28 },
        { x: 72, w: 11, h: 16 },
    ];

    // Use deterministic window lighting pattern based on slow tick
    const windowSeed = Math.floor(state.animTick / 300);
    for (let bi = 0; bi < buildings.length; bi++) {
        const b = buildings[bi];
        const bx = x + 3 + b.x * ((w - 6) / 85);
        const by = y + h - 6 - b.h;
        const bw = b.w * ((w - 6) / 85);
        drawPixelRect(bx, by, bw, b.h, '#151530');
        // Windows (deterministic pattern)
        for (let wy = 0; wy < Math.floor(b.h / 5); wy++) {
            for (let wx = 0; wx < Math.floor(bw / 4); wx++) {
                const hash = ((bi * 17 + wy * 7 + wx * 13 + windowSeed * 3) % 10);
                const lit = hash > 3;
                if (lit) {
                    drawPixelRect(bx + 2 + wx * 4, by + 2 + wy * 5, 2, 3, '#ffdd44');
                }
            }
        }
    }

    // Moon
    ctx.fillStyle = '#ffffcc';
    ctx.beginPath();
    ctx.arc(x + w - 18, y + 15, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eeee99';
    ctx.beginPath();
    ctx.arc(x + w - 16, y + 14, 5, 0, Math.PI * 2);
    ctx.fill();

    // Window divider
    drawPixelRect(x + w / 2 - 1, y + 3, 2, h - 6, '#6a6a8a');
    drawPixelRect(x + 3, y + h / 2, w - 6, 2, '#6a6a8a');
}

function drawCarpet(x, y, w, h, color) {
    drawPixelRect(x, y, w, h, color);
    drawPixelRect(x + 3, y + 3, w - 6, h - 6, shadeColor(color, 10));
    // Border pattern
    for (let i = 0; i < w; i += 6) {
        drawPixelRect(x + i, y, 3, 2, shadeColor(color, -15));
        drawPixelRect(x + i, y + h - 2, 3, 2, shadeColor(color, -15));
    }
}

function drawElevator(x, y) {
    // Elevator frame
    drawPixelRect(x, y, 36, 50, '#4a4a5a');
    drawPixelRect(x + 2, y + 2, 32, 46, '#3a3a4a');

    // Doors
    const doorOpen = Math.sin(state.animTick * 0.01) > 0.7;
    if (doorOpen) {
        drawPixelRect(x + 4, y + 4, 8, 42, '#2a2a3a');
        drawPixelRect(x + 24, y + 4, 8, 42, '#2a2a3a');
        // Interior
        drawPixelRect(x + 12, y + 4, 12, 42, '#1a1a2a');
    } else {
        drawPixelRect(x + 4, y + 4, 14, 42, '#5a5a6a');
        drawPixelRect(x + 18, y + 4, 14, 42, '#5a5a6a');
        // Door line
        drawPixelRect(x + 17, y + 4, 2, 42, '#4a4a5a');
    }

    // Floor indicator
    const floor = Math.floor(state.animTick / 60) % 5 + 1;
    drawPixelRect(x + 12, y - 8, 12, 8, '#222');
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'center';
    ctx.fillText(`${floor}F`, x + 18, y - 2);
    ctx.textAlign = 'left';

    // Up/down indicators
    const goingUp = Math.sin(state.animTick * 0.01) > 0;
    drawPixelRect(x + 28, y - 8, 6, 8, '#222');
    ctx.fillStyle = goingUp ? '#44ff88' : '#333';
    ctx.fillText('▲', x + 28, y - 3);
}

function drawFloorTiles(x, y, cols, rows, tileSize) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tx = x + c * tileSize;
            const ty = y + r * tileSize;
            const isAlt = (r + c) % 2 === 0;
            drawPixelRect(tx, ty, tileSize, tileSize, isAlt ? '#1a1a30' : '#161628');
            // Tile border
            ctx.strokeStyle = 'rgba(255,255,255,0.02)';
            ctx.lineWidth = 1;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
        }
    }
}

// ============================================
// MAIN OFFICE LAYOUT
// ============================================

function layoutOffice() {
    const cw = canvas.width;
    const ch = canvas.height;
    const centerX = cw / 2;
    const centerY = ch / 2;

    // Boss position
    BOSS.x = centerX;
    BOSS.y = ch - 80;

    // Only show active members on the floor
    const activeAgents = AGENTS.filter(a => a.isActive !== false);

    if (activeAgents.length === 0) return;

    // Dynamic grid layout based on count
    const count = activeAgents.length;
    const cols = Math.min(count, Math.max(2, Math.ceil(Math.sqrt(count))));
    const rows = Math.ceil(count / cols);

    const deskSpacingX = Math.min(180, (cw - 100) / cols);
    const deskSpacingY = Math.min(120, (ch - 200) / (rows + 1));

    const gridWidth = (cols - 1) * deskSpacingX;
    const gridHeight = (rows - 1) * deskSpacingY;
    const desksStartX = centerX - gridWidth / 2;
    const desksStartY = centerY - gridHeight / 2 - 30;

    for (let i = 0; i < activeAgents.length; i++) {
        const agent = activeAgents[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        agent.deskX = desksStartX + col * deskSpacingX;
        agent.deskY = desksStartY + row * deskSpacingY;

        if (agent.x === 0 && agent.y === 0) {
            agent.x = agent.deskX;
            agent.y = agent.deskY + 20;
        }
    }
}

function drawOffice() {
    const cw = canvas.width;
    const ch = canvas.height;

    // Clear
    ctx.fillStyle = '#0d0d20';
    ctx.fillRect(0, 0, cw, ch);

    // Floor tiles
    drawFloorTiles(0, 0, Math.ceil(cw / 24), Math.ceil(ch / 24), 24);

    // === Background elements ===

    // Window (top center)
    drawWindow(cw / 2 - 50, 10, 100, 60);

    // Elevator (top left)
    drawElevator(20, 15);

    // Bookshelf (top right)
    drawBookshelf(cw - 60, 15);

    // Whiteboard (top center-left)
    drawWhiteboard(cw / 2 - 170, 12, 80, 55);

    // === Agent workstations ===
    for (const agent of AGENTS) {
        if (agent.isActive === false) continue;

        // Desk
        drawDesk(agent.deskX - 30, agent.deskY - 12, 60, 20);

        // Monitor
        drawMonitor(agent.deskX - 11, agent.deskY - 32, true, agent.status);

        // Chair
        drawChair(agent.deskX - 9, agent.deskY + 10);

        // Character
        drawCharacter(agent.deskX, agent.deskY + 4, agent, 1.2);

        // Name tag
        drawPixelText(agent.name, agent.deskX, agent.deskY + 35, agent.color, 7, 'center');
    }

    // === Decorations ===

    // Plants
    drawPlant(cw / 2 - 90, ch / 2 - 40);
    drawPlant(cw / 2 + 85, ch / 2 - 40);

    // Water cooler
    drawWaterCooler(cw - 50, ch / 2 + 20);

    // === Boss area ===

    // Boss carpet
    drawCarpet(cw / 2 - 70, ch - 120, 140, 60, '#6a2222');

    // Boss desk (bigger)
    drawDesk(cw / 2 - 45, ch - 100, 90, 24);

    // Boss monitor (bigger)
    drawMonitor(cw / 2 - 12, ch - 124, true, 'thinking');

    // Boss chair
    drawChair(cw / 2 - 9, ch - 68);

    // Boss character
    drawCharacter(BOSS.x, ch - 64, BOSS, 1.4);

    // Boss name plate
    drawPixelRect(cw / 2 - 40, ch - 38, 80, 14, 'rgba(0,0,0,0.6)');
    drawPixelText('👑 Boss Claude', cw / 2, ch - 28, '#ffdd44', 7, 'center');

    // Connection lines (agent → boss) - smooth data flow
    for (let ai = 0; ai < AGENTS.length; ai++) {
        const agent = AGENTS[ai];
        const flowPhase = (state.animTick + ai * 45) % 180;
        if (flowPhase < 30) {
            const alpha = 0.05 + 0.12 * Math.sin(flowPhase / 30 * Math.PI);
            ctx.strokeStyle = `rgba(${hexToRgb(agent.color)}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(agent.deskX, agent.deskY + 35);
            ctx.lineTo(BOSS.x, ch - 90);
            ctx.stroke();
            ctx.setLineDash([]);

            // Data packet dot flowing along the line
            const t = flowPhase / 30;
            const dotX = agent.deskX + (BOSS.x - agent.deskX) * t;
            const dotY = (agent.deskY + 35) + ((ch - 90) - (agent.deskY + 35)) * t;
            ctx.fillStyle = agent.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // === Particles ===
    drawParticles();

    // === Floating labels ===
    // Room label
    drawPixelRect(cw / 2 - 55, ch - 148, 110, 14, 'rgba(30,0,0,0.7)');
    drawPixelText('BOSS ROOM', cw / 2, ch - 138, '#ff8844', 7, 'center');

    drawPixelRect(cw / 2 - 55, 78, 110, 14, 'rgba(0,0,30,0.7)');
    drawPixelText('WORK FLOOR', cw / 2, 88, '#4488ff', 7, 'center');
}

// ============================================
// PARTICLES
// ============================================

function spawnParticle(x, y, color) {
    state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.5 - 0.5,
        life: 60,
        maxLife: 60,
        color,
        size: Math.random() * 3 + 1,
    });
}

function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
            state.particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const p of state.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

// ============================================
// SIMULATION ENGINE
// ============================================

function updateAgents() {
    for (const agent of AGENTS) {
        // Animate character frame
        agent.frame += 0.08;

        // Speech bubble timer
        if (agent.speechTimer > 0) {
            agent.speechTimer--;
        }

        // === Only run demo simulation when NOT in live mode ===
        if (!isLiveMode) {
            // Action timer - change status periodically
            agent.actionTimer++;
            if (agent.actionTimer > 300 + Math.random() * 400) {
                agent.actionTimer = 0;
                changeAgentStatus(agent);
            }

            // Random speech bubbles
            if (Math.random() < 0.003 && agent.speechTimer <= 0) {
                const bubbles = SPEECH_BUBBLES[agent.status] || SPEECH_BUBBLES.idle;
                agent.speechBubble = bubbles[Math.floor(Math.random() * bubbles.length)];
                agent.speechTimer = 120;
            }

            // Progress update
            if (agent.status === 'coding' || agent.status === 'reading') {
                agent.progress = Math.min(100, agent.progress + 0.02);
                if (agent.progress >= 100) {
                    agent.status = 'complete';
                    agent.speechBubble = '✓ Done!';
                    agent.speechTimer = 180;
                    spawnParticles(agent.x, agent.y - 20, '#44ff88', 8);
                    addLog('success', `${agent.name}: Task complete! ✓`);
                    showToast('🎉', `${agent.name} completed their task!`, 'success');
                    updateXP(50);
                }
            }
        }

        // Spawn coding particles (both modes - visual only)
        if (agent.status === 'coding' && Math.random() < 0.05) {
            spawnParticle(agent.deskX + Math.random() * 10 - 5, agent.deskY - 15, agent.color);
        }
    }

    // Boss AI
    BOSS.frame += 0.06;
    if (BOSS.speechTimer > 0) BOSS.speechTimer--;

    // Boss random speech only in demo mode
    if (!isLiveMode && Math.random() < 0.002 && BOSS.speechTimer <= 0) {
        const bossBubbles = ['Good work!', 'Status report?', 'Keep going!', 'Reviewing...', '📊', 'On track!'];
        BOSS.speechBubble = bossBubbles[Math.floor(Math.random() * bossBubbles.length)];
        BOSS.speechTimer = 150;
    }
}

function changeAgentStatus(agent) {
    const statuses = ['coding', 'thinking', 'reading', 'coding', 'coding', 'thinking'];
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];

    if (agent.status === 'complete') {
        // Start new task
        agent.progress = 0;
        agent.task = TASKS[Math.floor(Math.random() * TASKS.length)];
        addLog('action', `${agent.name}: Starting "${agent.task}"`);
    }

    agent.status = newStatus;
    updateAgentCards();

    const actions = {
        coding: ['Writing code', 'Implementing feature', 'Typing...'],
        thinking: ['Analyzing problem', 'Planning approach', 'Designing solution'],
        reading: ['Reading documentation', 'Reviewing code', 'Checking files'],
    };
    const actionMsg = actions[newStatus];
    if (actionMsg) {
        addLog('info', `${agent.name}: ${actionMsg[Math.floor(Math.random() * actionMsg.length)]}`);
    }
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        spawnParticle(x + Math.random() * 20 - 10, y + Math.random() * 10 - 5, color);
    }
}

// ============================================
// UI UPDATES
// ============================================

function addLog(type, msg) {
    const terminal = document.getElementById('terminal-log');
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg ${type}">${msg}</span>`;
    terminal.appendChild(entry);
    terminal.scrollTop = terminal.scrollHeight;

    state.totalLogs++;
    document.getElementById('log-count').textContent = state.totalLogs;
}

function showToast(icon, text, type = '') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${text}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

function updateXP(amount) {
    state.xp += amount;
    if (state.xp >= state.xpMax) {
        state.xp -= state.xpMax;
        state.xpMax = Math.floor(state.xpMax * 1.5);
        showToast('🎉', 'Level Up!', 'success');
    }
    const pct = (state.xp / state.xpMax) * 100;
    document.getElementById('xp-fill').style.width = pct + '%';
    document.getElementById('xp-text').textContent = `${state.xp.toLocaleString()} / ${state.xpMax.toLocaleString()}`;
}

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock').textContent = `${h}:${m}`;
}

function updateUptime() {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    document.getElementById('uptime').textContent = `${h}:${m}:${s}`;
}

// createAgentCards is defined below with team hierarchy support

function updateAgentCards() {
    for (const agent of AGENTS) {
        const card = document.getElementById(`agent-card-${agent.id}`);
        if (!card) continue;
        card.className = `agent-card status-${agent.status}`;
        const nameEl = card.querySelector('.agent-name');
        if (nameEl) nameEl.textContent = agent.name;
        card.querySelector('.agent-task').textContent = agent.task;
        card.querySelector('.agent-status-badge').textContent = agent.status;
        card.querySelector('.agent-status-badge').className = `agent-status-badge badge-${agent.status}`;
        card.querySelector('.agent-progress-fill').className = `agent-progress-fill ${agent.status}`;
        card.querySelector('.agent-progress-fill').style.width = agent.progress + '%';
    }
}

function createFileTree() {
    const tree = document.getElementById('file-tree');
    tree.innerHTML = '';
    for (const file of FILE_TREE) {
        const item = document.createElement('div');
        item.className = `file-tree-item ${file.type}`;
        const icon = file.type === 'dir' ? '📂' : file.type === 'modified' ? '📝' : file.type === 'added' ? '✨' : '📄';
        item.innerHTML = `<span>${icon}</span><span>${file.name}</span>`;
        tree.appendChild(item);
    }
}

function createAchievements() {
    const container = document.getElementById('achievements');
    container.innerHTML = '';
    for (const ach of ACHIEVEMENTS_DATA) {
        const div = document.createElement('div');
        div.className = `achievement ${ach.unlocked ? 'unlocked' : 'locked'}`;
        div.innerHTML = `
            <span class="achievement-icon">${ach.icon}</span>
            <div class="achievement-info">
                <span class="achievement-name">${ach.name}</span>
                <span class="achievement-desc">${ach.desc}</span>
            </div>
        `;
        container.appendChild(div);
    }
}

function updateCurrentTask() {
    state.taskIndex = (state.taskIndex + 1) % TASKS.length;
    document.querySelector('.task-text').textContent = `Current: ${TASKS[state.taskIndex]}`;
}

// ============================================
// LOG DRIP FEED
// ============================================

function dripFeedLogs() {
    if (state.logIndex < LOG_MESSAGES.length) {
        const log = LOG_MESSAGES[state.logIndex];
        addLog(log.type, log.msg);
        state.logIndex++;
    } else {
        // Generate random logs after initial ones are done
        const randomLogs = [
            { type: 'action', msgs: ['Reading file src/utils.ts', 'Writing to config.json', 'Parsing AST...', 'Compiling TypeScript...', 'Bundling modules...'] },
            { type: 'info', msgs: ['Memory usage: 256MB', 'CPU: 45%', 'Cache hit ratio: 92%', 'Tokens used: 1,234', 'Response time: 340ms'] },
            { type: 'success', msgs: ['Test suite passed ✓', 'Lint check clean ✓', 'Type check passed ✓', 'Build successful ✓'] },
            { type: 'warning', msgs: ['Large file detected (>500 lines)', 'Unused variable warning', 'Deprecated API usage'] },
        ];
        const category = randomLogs[Math.floor(Math.random() * randomLogs.length)];
        const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
        const msg = category.msgs[Math.floor(Math.random() * category.msgs.length)];
        addLog(category.type, `${agent.name}: ${msg}`);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

function hexToRgb(hex) {
    const num = parseInt(hex.replace('#', ''), 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

// ============================================
// MAIN LOOP
// ============================================

function gameLoop() {
    state.animTick++;

    // Update
    updateAgents();
    updateParticles();

    // Draw
    drawOffice();

    // Periodic updates
    if (state.animTick % 60 === 0) {
        updateClock();
        updateUptime();
    }

    requestAnimationFrame(gameLoop);
}

// ============================================
// WEBSOCKET - REAL CLAUDE CODE CONNECTION
// ============================================

let ws = null;
let wsReconnectTimer = null;
let isLiveMode = false;
let isReplaying = false; // true during initial event replay from server

function connectWebSocket() {
    const WS_URL = `ws://localhost:3456`;

    try {
        ws = new WebSocket(WS_URL);
    } catch (e) {
        console.log('[WS] WebSocket not available, running in demo mode');
        setConnectionStatus('demo');
        return;
    }

    ws.onopen = () => {
        console.log('[WS] Connected to server');
        isLiveMode = true;
        isReplaying = true; // suppress log flooding during event replay
        setConnectionStatus('live');

        // Clear demo logs
        const terminal = document.getElementById('terminal-log');
        if (terminal) terminal.innerHTML = '';
        state.totalLogs = 0;

        addLog('system', '🔗 Connected to Claude Code - LIVE MODE');
        showToast('🔗', 'Connected to Claude Code!', 'success');

        // Clear reconnect timer
        if (wsReconnectTimer) {
            clearTimeout(wsReconnectTimer);
            wsReconnectTimer = null;
        }

        // Stop replay mode after init events are done (give 2 sec for replay)
        setTimeout(() => {
            isReplaying = false;
            addLog('system', '📡 Live event stream active');
        }, 2000);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleServerEvent(data);
        } catch (e) {
            console.error('[WS] Failed to parse message:', e);
        }
    };

    ws.onclose = () => {
        console.log('[WS] Disconnected');
        isLiveMode = false;
        setConnectionStatus('offline');

        // Reconnect after 5 seconds
        wsReconnectTimer = setTimeout(() => {
            console.log('[WS] Attempting to reconnect...');
            connectWebSocket();
        }, 5000);
    };

    ws.onerror = (err) => {
        console.log('[WS] Connection error - running in demo mode');
        setConnectionStatus('demo');
        ws.close();
    };
}

function setConnectionStatus(status) {
    const statusEl = document.getElementById('system-status');
    if (!statusEl) return;

    switch (status) {
        case 'live':
            statusEl.textContent = '🟢 LIVE - Claude Code';
            statusEl.style.color = '#44ff88';
            break;
        case 'demo':
            statusEl.textContent = '🟡 DEMO MODE';
            statusEl.style.color = '#ffdd44';
            break;
        case 'offline':
            statusEl.textContent = '🔴 RECONNECTING...';
            statusEl.style.color = '#ff4466';
            break;
    }
}

// Map session agents to visualizer agents
let sessionAgentMap = new Map(); // sessionId -> agentIndex

function getAgentForSession(sessionId) {
    if (sessionAgentMap.has(sessionId)) {
        return AGENTS[sessionAgentMap.get(sessionId)];
    }
    // Create a new agent for this session
    const shortId = sessionId.substring(0, 6);
    const newAgent = createAgent(
        `session-${shortId}`,
        `Claude ${shortId}`,
        'Session'
    );
    const idx = AGENTS.length;
    AGENTS.push(newAgent);
    sessionAgentMap.set(sessionId, idx);

    // Re-layout and rebuild cards
    layoutOffice();
    createAgentCards();

    return newAgent;
}

function handleServerEvent(data) {
    if (!data || !data.type) return;

    switch (data.type) {
        case 'init':
            handleInit(data);
            break;
        case 'tool_use':
            handleToolUse(data);
            break;
        case 'thinking':
            handleThinking(data);
            break;
        case 'assistant_text':
            handleAssistantText(data);
            break;
        case 'user_message':
            handleUserMessage(data);
            break;
        case 'tool_result':
            handleToolResult(data);
            break;
        case 'teammate_message':
            handleTeammateMessage(data);
            break;
        case 'turn_complete':
            handleTurnComplete(data);
            break;
        case 'todos_update':
            handleTodosUpdate(data);
            break;
        case 'sub_agent_spawned':
            handleSubAgentSpawned(data);
            break;
        case 'sub_agent_completed':
            handleSubAgentCompleted(data);
            break;
        case 'command_sent':
            handleCommandSent(data);
            break;
        case 'command_response':
            handleCommandResponse(data);
            break;
        case 'command_error':
            handleCommandError(data);
            break;
    }
}

function handleInit(data) {
    addLog('system', `📡 接続完了: ${data.eventCount} イベントキャッシュ, ${data.watchedFiles} ファイル監視中`);

    // Clear everything
    AGENTS = [];
    sessionAgentMap.clear();
    teams.clear();
    availableSessions = [];

    if (data.sessions && data.sessions.length > 0) {
        // Create owner agent per session + active sub-agents only
        data.sessions.forEach((sess, i) => {
            const cwd = sess.cwd || '';
            const projectDir = cwd.split(/[/\\]/).pop() || 'Claude';
            const shortId = sess.id.substring(0, 6);
            const isActive = sess.isActive !== false;

            // Create owner agent
            const statusLabel = isActive ? '👑' : '💤';
            const agent = createAgent(
                `session-${shortId}`,
                `${statusLabel} Claude ${shortId}`,
                projectDir
            );
            agent.isOwner = true;
            agent.sessionId = sess.id;
            agent.isActive = isActive;

            if (isActive) {
                if (sess.status) agent.status = mapSessionStatus(sess.status);
                if (sess.currentTask) agent.task = sess.currentTask;
            } else {
                agent.status = 'idle';
                agent.task = 'Session inactive';
            }

            const ownerIdx = AGENTS.length;
            AGENTS.push(agent);
            sessionAgentMap.set(sess.id, ownerIdx);

            // Track team
            const team = { sessionId: sess.id, ownerAgentIdx: ownerIdx, subAgentIdxs: [], cwd, isActive };
            teams.set(sess.id, team);

            // Only create sub-agents for active sessions with active sub-agents
            if (isActive && sess.subAgents && sess.subAgents.length > 0) {
                for (const sub of sess.subAgents) {
                    const subAgent = createAgent(
                        sub.id,
                        `  🔹 ${sub.name.substring(0, 25)}`,
                        `Sub-agent of ${shortId}`
                    );
                    subAgent.isSubAgent = true;
                    subAgent.parentSessionId = sess.id;
                    subAgent.status = 'coding';
                    subAgent.task = sub.description?.substring(0, 60) || sub.name;

                    const subIdx = AGENTS.length;
                    AGENTS.push(subAgent);
                    team.subAgentIdxs.push(subIdx);
                }
            }

            // Add to available sessions for command bar
            const activeTag = isActive ? ' ● LIVE' : '';
            availableSessions.push({ id: sess.id, cwd: projectDir + activeTag, status: sess.status || 'idle' });
        });

        const mainSession = data.sessions[0];

        // Set project name
        if (mainSession.cwd) {
            liveStats.cwd = mainSession.cwd;
            liveStats.projectName = mainSession.cwd.split(/[/\\]/).pop() || 'project';
            const projEl = document.querySelector('.project-name');
            if (projEl) projEl.textContent = liveStats.projectName;
        }

        // Populate stats
        if (mainSession.filesModified) mainSession.filesModified.forEach(f => liveStats.filesModified.add(f));
        if (mainSession.filesRead) mainSession.filesRead.forEach(f => liveStats.filesRead.add(f));
        if (mainSession.toolCounts) liveStats.toolCounts = { ...mainSession.toolCounts };
        liveStats.totalTools = mainSession.totalTools || 0;
        liveStats.totalThinking = mainSession.totalThinking || 0;
        liveStats.userMessages = mainSession.userMessages || 0;
        liveStats.turnCompletes = mainSession.turnCompletes || 0;

        // Update header
        document.getElementById('agent-count').textContent = AGENTS.length;
        document.getElementById('task-count').textContent = liveStats.turnCompletes;

        updateLiveFileStats();
        updateLiveFileTree();
    }

    // Update session selector in command bar
    updateSessionSelector();

    // Layout and render
    layoutOffice();
    createAgentCards();
    updateAgentCards();
}

function updateLiveFileStats() {
    const fm = document.getElementById('files-modified');
    const la = document.getElementById('lines-added');
    const lr = document.getElementById('lines-removed');
    if (fm) fm.textContent = liveStats.filesModified.size;
    if (la) la.textContent = '+' + liveStats.totalTools;
    if (lr) lr.textContent = liveStats.filesRead.size + ' read';
}

function updateLiveFileTree() {
    const tree = document.getElementById('file-tree');
    if (!tree) return;
    tree.innerHTML = '';

    // Show recently modified files
    const modified = Array.from(liveStats.filesModified).slice(-8);
    const read = Array.from(liveStats.filesRead).slice(-5);

    if (modified.length > 0) {
        const header = document.createElement('div');
        header.className = 'file-tree-item dir';
        header.innerHTML = '<span>📂</span><span>Modified:</span>';
        tree.appendChild(header);

        for (const f of modified) {
            const item = document.createElement('div');
            item.className = 'file-tree-item modified';
            item.innerHTML = `<span>📝</span><span>  ${f}</span>`;
            tree.appendChild(item);
        }
    }

    if (read.length > 0) {
        const header = document.createElement('div');
        header.className = 'file-tree-item dir';
        header.innerHTML = '<span>📂</span><span>Read:</span>';
        tree.appendChild(header);

        for (const f of read) {
            const item = document.createElement('div');
            item.className = 'file-tree-item';
            item.innerHTML = `<span>📄</span><span>  ${f}</span>`;
            tree.appendChild(item);
        }
    }
}

function mapSessionStatus(status) {
    const statusMap = {
        'coding': 'coding',
        'reading': 'reading',
        'thinking': 'thinking',
        'delegating': 'coding',
        'communicating': 'thinking',
        'responding': 'coding',
        'working': 'coding',
        'processing': 'thinking',
        'idle': 'idle',
    };
    return statusMap[status] || 'coding';
}

function handleToolUse(data) {
    const agent = getAgentForSession(data.sessionId);
    const toolName = data.toolName || 'unknown';
    const summary = data.toolInput || {};

    // Update agent status based on tool
    agent.status = mapSessionStatus(data.agentStatus || 'working');

    // Sub-agent spawning is now handled via 'sub_agent_spawned' events from server

    // Use server-provided task text, or build from input
    let taskText = data.taskText || '';
    if (!taskText) {
        if (summary.file) taskText = `${toolName}: ${summary.file}`;
        else if (summary.command) taskText = `Running: ${summary.command}`;
        else if (summary.name) taskText = `Agent: ${summary.name}`;
        else if (summary.query) taskText = `Searching: ${summary.query}`;
        else taskText = `Using ${toolName}`;
    }
    agent.task = taskText;

    // Update live stats
    liveStats.totalTools++;
    liveStats.toolCounts[toolName] = (liveStats.toolCounts[toolName] || 0) + 1;

    if (summary.file) {
        if (['Write', 'Edit', 'MultiEdit', 'CreateFile'].includes(toolName)) {
            liveStats.filesModified.add(summary.file);
        } else {
            liveStats.filesRead.add(summary.file);
        }
    }

    // Update current task in task bar
    liveStats.currentTask = taskText;
    const taskDisplay = document.querySelector('.task-text');
    if (taskDisplay) taskDisplay.textContent = `Current: ${taskText}`;

    // Show speech bubble
    const bubbleTexts = {
        'Write': '✏️ Writing...', 'Edit': '✏️ Editing...',
        'Read': '📖 Reading...', 'ReadFile': '📖 Reading...', 'View': '👀 Viewing...',
        'Bash': '⚡ Running...', 'Task': '🤖 Spawning...',
        'Grep': '🔍 Searching...', 'Find': '🔍 Finding...',
        'TodoWrite': '📋 Planning...', 'SendMessage': '💬 Messaging...',
        'WebSearch': '🌐 Searching...', 'WebFetch': '🌐 Fetching...',
    };
    agent.speechBubble = bubbleTexts[toolName] || `🔧 ${toolName}`;
    agent.speechTimer = 120;

    // Only show visual effects for live events (not during replay)
    if (!isReplaying) {
        const logTypes = {
            'Write': 'action', 'Edit': 'action', 'CreateFile': 'action',
            'Read': 'info', 'ReadFile': 'info', 'View': 'info',
            'Bash': 'action', 'Task': 'system', 'TeamCreate': 'system',
            'Grep': 'info', 'Find': 'info', 'TodoWrite': 'info',
            'SendMessage': 'info', 'WebSearch': 'info',
        };
        addLog(logTypes[toolName] || 'action', `${agent.name}: ${taskText}`);
        spawnParticles(agent.deskX + 15, agent.deskY - 10, 3, agent.color);
        updateXP(5);

        // Update file tree and stats in real-time
        updateLiveFileStats();
        updateLiveFileTree();
    }

    // Update progress
    agent.progress = Math.min(100, agent.progress + Math.floor(Math.random() * 5) + 1);

    // Update UI
    updateAgentCards();
}

function handleThinking(data) {
    const agent = getAgentForSession(data.sessionId);
    agent.status = 'thinking';
    agent.speechBubble = '🤔 Thinking...';
    agent.speechTimer = 90;
    updateAgentCards();
}

function handleAssistantText(data) {
    const agent = getAgentForSession(data.sessionId);
    agent.status = 'coding';

    // Show first few words as speech bubble
    if (data.text) {
        const shortText = data.text.substring(0, 30) + (data.text.length > 30 ? '...' : '');
        agent.speechBubble = `💬 ${shortText}`;
        agent.speechTimer = 150;
    }
}

function handleUserMessage(data) {
    if (!isReplaying && data.text) {
        addLog('info', `📝 User: ${data.text.substring(0, 80)}${data.text.length > 80 ? '...' : ''}`);
    }
    const agent = getAgentForSession(data.sessionId);
    agent.status = 'reading';
    if (!isReplaying) {
        agent.speechBubble = '📨 New task!';
        agent.speechTimer = 90;
    }
    agent.progress = 0;
    updateAgentCards();
}

function handleToolResult(data) {
    const agent = getAgentForSession(data.sessionId);
    spawnParticles(agent.deskX + 15, agent.deskY - 5, 2, '#44ff88');
}

function handleTeammateMessage(data) {
    if (isReplaying) return;
    const agentId = data.agentId || 'unknown';
    addLog('system', `🤖 Team: ${agentId} ${data.color ? `(${data.color})` : ''}`);
    BOSS.speechBubble = `📩 ${agentId}`;
    BOSS.speechTimer = 120;
}

function handleTurnComplete(data) {
    const agent = getAgentForSession(data.sessionId);
    agent.status = 'idle';
    agent.progress = 0;

    // Update turn counter
    liveStats.turnCompletes++;
    const tc = document.getElementById('task-count');
    if (tc) tc.textContent = liveStats.turnCompletes;

    if (!isReplaying) {
        agent.status = 'complete';
        agent.speechBubble = '✅ Done!';
        agent.speechTimer = 120;
        agent.progress = 100;

        addLog('success', `${agent.name}: Task completed ✓`);
        showToast('✅', `${agent.name} completed task!`, 'success');
        updateXP(20);
        spawnParticles(agent.deskX + 15, agent.deskY - 10, 8, agent.color);

        setTimeout(() => {
            agent.status = 'idle';
            agent.progress = 0;
            updateAgentCards();
        }, 3000);
    }

    updateAgentCards();
}

function handleTodosUpdate(data) {
    if (data.todos && data.todos.length > 0) {
        // Update the task bar
        const currentTodo = data.todos.find(t => t.status === 'in_progress');
        if (currentTodo) {
            const taskDisplay = document.querySelector('.task-bar span:first-child');
            if (taskDisplay) {
                taskDisplay.textContent = `📋 ${currentTodo.activeForm || currentTodo.content}`;
            }
        }

        // Count completed
        const completed = data.todos.filter(t => t.status === 'completed').length;
        const total = data.todos.length;
        const pct = Math.round((completed / total) * 100);

        addLog('info', `📋 Tasks: ${completed}/${total} completed (${pct}%)`);
    }
}

// ============================================
// SUB-AGENT HANDLERS
// ============================================

function handleSubAgentSpawned(data) {
    if (!data.subAgent || !data.sessionId) return;

    const sub = data.subAgent;
    const subAgent = createAgent(
        sub.id,
        `  🔹 ${sub.name.substring(0, 25)}`,
        `Sub-agent`
    );
    subAgent.isSubAgent = true;
    subAgent.parentSessionId = data.sessionId;
    subAgent.status = 'coding';
    subAgent.task = sub.description?.substring(0, 60) || sub.name;

    const subIdx = AGENTS.length;
    AGENTS.push(subAgent);

    // Add to team
    const team = teams.get(data.sessionId);
    if (team) {
        team.subAgentIdxs.push(subIdx);
    }

    // Update UI
    document.getElementById('agent-count').textContent = AGENTS.length;
    layoutOffice();
    createAgentCards();

    if (!isReplaying) {
        addLog('system', `🤖 Sub-agent spawned: ${sub.name.substring(0, 40)}`);
        showToast('🤖', `Sub-agent: ${sub.name.substring(0, 40)}`, 'success');
    }
}

function handleSubAgentCompleted(data) {
    if (!data.subAgentId) return;

    const agent = AGENTS.find(a => a.id === data.subAgentId);
    if (agent) {
        agent.status = 'complete';
        agent.speechBubble = '✅ Done!';
        agent.speechTimer = 120;
        agent.progress = 100;

        if (!isReplaying) {
            addLog('success', `✅ Sub-agent completed: ${agent.name}`);
        }

        setTimeout(() => {
            agent.status = 'idle';
            updateAgentCards();
        }, 5000);
    }

    updateAgentCards();
}

// ============================================
// COMMAND BAR
// ============================================

function updateSessionSelector() {
    const select = document.getElementById('session-select');
    const input = document.getElementById('command-input');
    const btn = document.getElementById('command-send');

    if (!select) return;
    select.innerHTML = '';

    if (availableSessions.length === 0) {
        select.innerHTML = '<option value="">No sessions</option>';
        if (input) input.disabled = true;
        if (btn) btn.disabled = true;
        return;
    }

    availableSessions.forEach(sess => {
        const opt = document.createElement('option');
        opt.value = sess.id;
        opt.textContent = `${sess.cwd} (${sess.id.substring(0, 6)})`;
        select.appendChild(opt);
    });

    if (input) input.disabled = false;
    if (btn) btn.disabled = false;
}

function sendCommand() {
    const select = document.getElementById('session-select');
    const input = document.getElementById('command-input');
    const btn = document.getElementById('command-send');

    const sessionId = select?.value;
    const message = input?.value?.trim();

    if (!sessionId || !message || !ws) return;

    // Send via WebSocket
    ws.send(JSON.stringify({
        type: 'send_command',
        sessionId,
        message,
    }));

    input.value = '';
    if (btn) {
        btn.classList.add('sending');
        btn.querySelector('span').textContent = '⏳ Sending...';
    }

    addLog('action', `📤 Command sent: ${message.substring(0, 60)}`);
}

function handleCommandSent(data) {
    addLog('system', `📡 Command dispatched to session ${data.sessionId.substring(0, 6)}`);
    showToast('📤', 'Command sent to Claude...', 'success');
}

function handleCommandResponse(data) {
    const btn = document.getElementById('command-send');
    if (btn) {
        btn.classList.remove('sending');
        btn.querySelector('span').textContent = '📤 Send';
    }

    // Show response
    const respEl = document.getElementById('command-response');
    const respText = document.getElementById('command-response-text');
    if (respEl && respText) {
        respText.textContent = `📨 Response: ${data.response.substring(0, 200)}`;
        respEl.style.display = 'flex';
    }

    addLog('success', `📨 Response: ${data.response.substring(0, 100)}`);
    showToast('📨', 'Claude responded!', 'success');
}

function handleCommandError(data) {
    const btn = document.getElementById('command-send');
    if (btn) {
        btn.classList.remove('sending');
        btn.querySelector('span').textContent = '📤 Send';
    }

    addLog('error', `❌ Command error: ${data.error}`);
    showToast('❌', `Error: ${data.error.substring(0, 80)}`, 'error');
}

// ============================================
// AGENT CARDS WITH TEAM HIERARCHY
// ============================================

function createAgentCards() {
    const list = document.getElementById('agent-list');
    list.innerHTML = '';

    if (isLiveMode && teams.size > 0) {
        // Team-based layout
        for (const [sessionId, team] of teams) {
            const section = document.createElement('div');
            section.className = 'team-section';

            // Team header
            const header = document.createElement('div');
            header.className = 'team-header';
            const cwd = team.cwd?.split(/[/\\]/).pop() || 'Session';
            header.innerHTML = `<span class="team-icon">🏢</span> TEAM: ${cwd.toUpperCase()} (${sessionId.substring(0, 6)})`;
            section.appendChild(header);

            // Owner agent card
            const ownerAgent = AGENTS[team.ownerAgentIdx];
            if (ownerAgent) {
                section.appendChild(createSingleAgentCard(ownerAgent, false));
            }

            // Sub-agent cards (indented)
            for (const subIdx of team.subAgentIdxs) {
                const subAgent = AGENTS[subIdx];
                if (subAgent) {
                    section.appendChild(createSingleAgentCard(subAgent, true));
                }
            }

            list.appendChild(section);
        }
    } else {
        // Flat list (demo mode)
        for (const agent of AGENTS) {
            list.appendChild(createSingleAgentCard(agent, false));
        }
    }
}

function createSingleAgentCard(agent, isSubAgent) {
    const card = document.createElement('div');
    card.className = `agent-card status-${agent.status}` + (isSubAgent ? ' sub-agent-card' : '');
    card.id = `agent-card-${agent.id}`;
    card.innerHTML = `
        <span class="agent-avatar">${agent.avatar}</span>
        <div class="agent-info">
            <span class="agent-name">${agent.name}</span>
            <span class="agent-role" style="font-size:9px;opacity:0.6">${agent.role}</span>
            <span class="agent-task">${agent.task}</span>
            <div class="agent-progress">
                <div class="agent-progress-fill ${agent.status}" style="width: ${agent.progress}%"></div>
            </div>
        </div>
        <span class="agent-status-badge badge-${agent.status}">${agent.status}</span>
    `;
    return card;
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    // Start with demo agents as fallback (will be replaced if server connects)
    createDemoAgents();

    resizeCanvas();
    generateStars();
    layoutOffice();
    createAgentCards();
    createFileTree();
    createAchievements();
    updateClock();

    // Initial XP
    updateXP(0);

    // Try to connect to the server FIRST (live mode)
    connectWebSocket();

    // Start log drip (demo mode only - will stop when live)
    for (let i = 0; i < 6; i++) {
        dripFeedLogs();
    }
    setInterval(() => {
        if (!isLiveMode) {
            dripFeedLogs();
        }
    }, 3000 + Math.random() * 4000);

    // Update task display periodically (demo mode only)
    setInterval(() => {
        if (!isLiveMode) updateCurrentTask();
    }, 15000);

    // Update file stats periodically (demo mode only)
    setInterval(() => {
        if (isLiveMode) return;
        const fm = document.getElementById('files-modified');
        const la = document.getElementById('lines-added');
        const lr = document.getElementById('lines-removed');
        const addAmt = Math.floor(Math.random() * 20) + 1;
        const removeAmt = Math.floor(Math.random() * 8);
        fm.textContent = parseInt(fm.textContent) + (Math.random() > 0.7 ? 1 : 0);
        la.textContent = '+' + (parseInt(la.textContent.replace('+', '')) + addAmt);
        lr.textContent = '-' + (parseInt(lr.textContent.replace('-', '')) + removeAmt);
    }, 8000);

    // Periodically change task count (demo mode only)
    setInterval(() => {
        if (isLiveMode) return;
        const tc = document.getElementById('task-count');
        tc.textContent = Math.max(1, parseInt(tc.textContent) + (Math.random() > 0.5 ? 1 : -1));
    }, 10000);

    // Random achievements (both modes)
    setTimeout(() => {
        ACHIEVEMENTS_DATA[2].unlocked = true;
        createAchievements();
        showToast('🏆', 'Achievement unlocked: Speed Coder!', 'success');
    }, 30000);

    setTimeout(() => {
        ACHIEVEMENTS_DATA[3].unlocked = true;
        createAchievements();
        showToast('🏆', 'Achievement unlocked: Architect!', 'success');
    }, 60000);

    // Handle resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        generateStars();
        layoutOffice();
    });

    // Command bar event listeners
    const cmdSendBtn = document.getElementById('command-send');
    const cmdInput = document.getElementById('command-input');
    const cmdRespClose = document.getElementById('command-response-close');

    if (cmdSendBtn) {
        cmdSendBtn.addEventListener('click', sendCommand);
    }
    if (cmdInput) {
        cmdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendCommand();
        });
    }
    if (cmdRespClose) {
        cmdRespClose.addEventListener('click', () => {
            document.getElementById('command-response').style.display = 'none';
        });
    }

    // Start game loop
    gameLoop();

    // Initial toast
    setTimeout(() => {
        showToast('⚡', 'Claude Office Visualizer is running!', 'success');
    }, 500);
}

// Start
document.addEventListener('DOMContentLoaded', init);

