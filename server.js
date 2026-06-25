/* ============================================
   Claude Office Visualizer - Backend Server v4
   + Team hierarchy tracking
   + Send command to session via claude CLI
   ============================================ */

const fs = require('fs')
const path = require('path')
const http = require('http')
const WebSocket = require('ws')
const { exec } = require('child_process')
const { createLogger } = require('./logger')
const { createSessionTracker, parseLine } = require('./session-tracker')

// ============================================
// CONFIGURATION
// ============================================
const PORT = process.env.PORT || 3456
const CLAUDE_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude')
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects')
const POLL_INTERVAL_MS = 500
const STATIC_DIR = __dirname

const log = createLogger()
const tracker = createSessionTracker()

// ============================================
// HTTP STATIC FILE SERVER
// ============================================
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

function handleStaticRequest(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0]
  filePath = path.join(STATIC_DIR, filePath)
  const ext = path.extname(filePath)
  const contentType = MIME_TYPES[ext] || 'text/plain'
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not Found')
      return
    }
    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' })
    res.end(data)
  })
}

const server = http.createServer(handleStaticRequest)

// ============================================
// WEBSOCKET SERVER
// ============================================
const wss = new WebSocket.Server({ server })

function broadcast(data) {
  const msg = JSON.stringify(data)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  }
}

function storeAndBroadcast(event) {
  tracker.addEvent(event)
  broadcast(event)
}

wss.on('connection', (ws) => {
  log.info('WS', 'Client connected')

  const sessionsArr = tracker.buildSessionsSummary()

  ws.send(
    JSON.stringify({
      type: 'init',
      sessions: sessionsArr,
      eventCount: tracker.recentEvents.length,
      watchedFiles: watchedFiles.size,
      timestamp: new Date().toISOString(),
    }),
  )

  for (const evt of tracker.recentEvents) {
    ws.send(JSON.stringify(evt))
  }

  ws.on('message', (rawMsg) => {
    try {
      const msg = JSON.parse(rawMsg.toString())
      if (msg.type === 'send_command') {
        handleSendCommand(msg)
      }
    } catch (e) {
      log.error('WS', `Invalid message: ${e.message}`)
    }
  })

  ws.on('close', () => {
    log.info('WS', 'Client disconnected')
  })
})

// ============================================
// SEND COMMAND TO CLAUDE SESSION
// ============================================

function handleSendCommand(msg) {
  const { sessionId, message } = msg
  if (!sessionId || !message) {
    broadcast({ type: 'command_error', error: 'Missing sessionId or message' })
    return
  }

  log.info(
    'CMD',
    `Sending to session ${sessionId.substring(0, 8)}: "${message.substring(0, 50)}..."`,
  )

  broadcast({
    type: 'command_sent',
    sessionId,
    message,
    timestamp: new Date().toISOString(),
  })

  const cmd = `claude -p --resume "${sessionId}" "${message.replace(/"/g, '\\"')}"`

  log.debug('CMD', `Executing: ${cmd}`)

  exec(
    cmd,
    {
      timeout: 300000,
      maxBuffer: 1024 * 1024 * 10,
      encoding: 'utf8',
    },
    (error, stdout) => {
      if (error) {
        log.error('CMD', `Error: ${error.message}`)
        broadcast({
          type: 'command_error',
          sessionId,
          error: error.message,
          timestamp: new Date().toISOString(),
        })
        return
      }

      log.info('CMD', `Response received (${stdout.length} chars)`)
      broadcast({
        type: 'command_response',
        sessionId,
        response: stdout.substring(0, 2000),
        timestamp: new Date().toISOString(),
      })
    },
  )
}

// ============================================
// FILE WATCHER
// ============================================

let watchedFiles = new Map()

function scanForNewFiles() {
  if (!fs.existsSync(PROJECTS_DIR)) return
  try {
    const projectDirs = fs.readdirSync(PROJECTS_DIR)
    for (const projDir of projectDirs) {
      const projPath = path.join(PROJECTS_DIR, projDir)
      try {
        if (!fs.statSync(projPath).isDirectory()) continue
      } catch {
        continue
      }
      let files
      try {
        files = fs.readdirSync(projPath).filter((f) => f.endsWith('.jsonl'))
      } catch {
        continue
      }
      for (const file of files) {
        const filePath = path.join(projPath, file)
        if (watchedFiles.has(filePath)) continue
        try {
          const fstats = fs.statSync(filePath)
          const now = new Date()
          if (now - fstats.mtime > 24 * 60 * 60 * 1000) continue
          if (fstats.size < 100) continue
          log.info('WATCH', `${path.basename(filePath)} (${(fstats.size / 1024).toFixed(0)} KB)`)
          const eventCount = loadFileHistory(filePath)
          log.info('WATCH', `Parsed ${eventCount} events`)
          watchedFiles.set(filePath, { lastRead: fstats.size })
        } catch (e) {
          log.error('WATCH', `${filePath}: ${e.message}`)
        }
      }
    }
  } catch (e) {
    log.error('SCAN', e.message)
  }
}

function loadFileHistory(filePath) {
  let eventCount = 0
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    for (const line of lines) {
      if (!line.trim()) continue
      const event = parseLine(line, filePath, tracker)
      if (event) {
        tracker.addEvent(event)
        eventCount++
      }
    }
    tracker.trimEvents()
  } catch (e) {
    try {
      const fstats = fs.statSync(filePath)
      const readSize = Math.min(fstats.size, 500000)
      const buffer = Buffer.alloc(readSize)
      const fd = fs.openSync(filePath, 'r')
      fs.readSync(fd, buffer, 0, readSize, fstats.size - readSize)
      fs.closeSync(fd)
      const text = buffer.toString('utf8')
      const firstNewline = text.indexOf('\n')
      const cleanText = firstNewline > 0 ? text.substring(firstNewline + 1) : text
      for (const line of cleanText.split('\n')) {
        if (!line.trim()) continue
        const event = parseLine(line, filePath, tracker)
        if (event) {
          tracker.addEvent(event)
          eventCount++
        }
      }
      tracker.trimEvents()
    } catch (e2) {
      log.error('WATCH', `Failed to read: ${e2.message}`)
    }
  }
  return eventCount
}

function pollFiles() {
  for (const [filePath, info] of watchedFiles) {
    try {
      const fstats = fs.statSync(filePath)
      if (fstats.size <= info.lastRead) continue
      const newSize = fstats.size - info.lastRead
      const buffer = Buffer.alloc(newSize)
      const fd = fs.openSync(filePath, 'r')
      fs.readSync(fd, buffer, 0, newSize, info.lastRead)
      fs.closeSync(fd)
      const text = buffer.toString('utf8')
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        const event = parseLine(line, filePath, tracker)
        if (event) {
          storeAndBroadcast(event)
          log.debug(
            'EVENT',
            `${event.type} | ${event.sessionId?.substring(0, 8)}... | ${event.toolName || event.text?.substring(0, 30) || ''}`,
          )
        }
      }
      info.lastRead = fstats.size
    } catch (e) {
      watchedFiles.delete(filePath)
    }
  }
}

// ============================================
// MAIN
// ============================================

function startServer() {
  log.info('SERVER', '===========================================')
  log.info('SERVER', 'Claude Office Visualizer - Server v4')
  log.info('SERVER', '===========================================')
  log.info('CONFIG', `Claude dir: ${CLAUDE_DIR}`)
  log.info('CONFIG', `Projects:   ${PROJECTS_DIR}`)
  log.info('CONFIG', `Port:       ${PORT}`)

  scanForNewFiles()

  log.info('INIT', `Total recent events cached: ${tracker.recentEvents.length}`)
  log.info('INIT', `Watching ${watchedFiles.size} active file(s)`)
  for (const [id, stats] of tracker.sessionStats) {
    const activeSubs = stats.subAgents.filter((s) => s.status !== 'completed').length
    const totalSubs = stats.subAgents.length
    const lastEvt = stats.lastEventTime || 'never'
    log.info(
      'INIT',
      `Session ${id.substring(0, 8)}: ${stats.totalTools} tools, ${stats.filesModified.size} modified, ${activeSubs}/${totalSubs} sub-agents active, last: ${lastEvt}`,
    )
  }

  setInterval(pollFiles, POLL_INTERVAL_MS)
  setInterval(scanForNewFiles, 10000)

  server.listen(PORT, () => {
    log.info('SERVER', `Server running at http://localhost:${PORT}`)
  })
}

startServer()

module.exports = {
  server,
  wss,
  tracker,
  broadcast,
  storeAndBroadcast,
  handleSendCommand,
  handleStaticRequest,
  scanForNewFiles,
  loadFileHistory,
  pollFiles,
  watchedFiles,
  MIME_TYPES,
}
