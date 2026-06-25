/* ============================================
   Claude Office Visualizer - Main Entry Point
   State management, WebSocket, simulation loop
   ============================================ */

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
}

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
}

// ============================================
// CANVAS SETUP
// ============================================

const canvas = document.getElementById('office-canvas')
const ctx = canvas.getContext('2d')

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height - 70
}

function generateStars() {
  state.stars = []
  for (let i = 0; i < 30; i++) {
    state.stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    })
  }
}

// ============================================
// SIMULATION ENGINE
// ============================================

function updateAgents() {
  for (const agent of AGENTS) {
    agent.frame += 0.08

    if (agent.speechTimer > 0) {
      agent.speechTimer--
    }

    // Demo simulation only when NOT in live mode
    if (!isLiveMode) {
      agent.actionTimer++
      if (agent.actionTimer > 300 + Math.random() * 400) {
        agent.actionTimer = 0
        changeAgentStatus(agent)
      }

      if (Math.random() < 0.003 && agent.speechTimer <= 0) {
        const bubbles = SPEECH_BUBBLES[agent.status] || SPEECH_BUBBLES.idle
        agent.speechBubble = bubbles[Math.floor(Math.random() * bubbles.length)]
        agent.speechTimer = 120
      }

      if (agent.status === 'coding' || agent.status === 'reading') {
        agent.progress = Math.min(100, agent.progress + 0.02)
        if (agent.progress >= 100) {
          agent.status = 'complete'
          agent.speechBubble = '✓ Done!'
          agent.speechTimer = 180
          spawnParticles(agent.x, agent.y - 20, '#44ff88', 8)
          addLog('success', `${agent.name}: Task complete! ✓`)
          showToast('🎉', `${agent.name} completed their task!`, 'success')
          updateXP(50)
        }
      }
    }

    // Spawn coding particles (both modes)
    if (agent.status === 'coding' && Math.random() < 0.05) {
      spawnParticle(agent.deskX + Math.random() * 10 - 5, agent.deskY - 15, agent.color)
    }
  }

  // Boss AI
  BOSS.frame += 0.06
  if (BOSS.speechTimer > 0) BOSS.speechTimer--

  if (!isLiveMode && Math.random() < 0.002 && BOSS.speechTimer <= 0) {
    const bossBubbles = [
      'Good work!',
      'Status report?',
      'Keep going!',
      'Reviewing...',
      '📊',
      'On track!',
    ]
    BOSS.speechBubble = bossBubbles[Math.floor(Math.random() * bossBubbles.length)]
    BOSS.speechTimer = 150
  }
}

function changeAgentStatus(agent) {
  const statuses = ['coding', 'thinking', 'reading', 'coding', 'coding', 'thinking']
  const newStatus = statuses[Math.floor(Math.random() * statuses.length)]

  if (agent.status === 'complete') {
    agent.progress = 0
    agent.task = TASKS[Math.floor(Math.random() * TASKS.length)]
    addLog('action', `${agent.name}: Starting "${agent.task}"`)
  }

  agent.status = newStatus
  updateAgentCards()

  const actions = {
    coding: ['Writing code', 'Implementing feature', 'Typing...'],
    thinking: ['Analyzing problem', 'Planning approach', 'Designing solution'],
    reading: ['Reading documentation', 'Reviewing code', 'Checking files'],
  }
  const actionMsg = actions[newStatus]
  if (actionMsg) {
    addLog('info', `${agent.name}: ${actionMsg[Math.floor(Math.random() * actionMsg.length)]}`)
  }
}

// ============================================
// LOG DRIP FEED
// ============================================

function dripFeedLogs() {
  if (state.logIndex < LOG_MESSAGES.length) {
    const log = LOG_MESSAGES[state.logIndex]
    addLog(log.type, log.msg)
    state.logIndex++
  } else {
    const randomLogs = [
      {
        type: 'action',
        msgs: [
          'Reading file src/utils.ts',
          'Writing to config.json',
          'Parsing AST...',
          'Compiling TypeScript...',
          'Bundling modules...',
        ],
      },
      {
        type: 'info',
        msgs: [
          'Memory usage: 256MB',
          'CPU: 45%',
          'Cache hit ratio: 92%',
          'Tokens used: 1,234',
          'Response time: 340ms',
        ],
      },
      {
        type: 'success',
        msgs: [
          'Test suite passed ✓',
          'Lint check clean ✓',
          'Type check passed ✓',
          'Build successful ✓',
        ],
      },
      {
        type: 'warning',
        msgs: [
          'Large file detected (>500 lines)',
          'Unused variable warning',
          'Deprecated API usage',
        ],
      },
    ]
    const category = randomLogs[Math.floor(Math.random() * randomLogs.length)]
    const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)]
    const msg = category.msgs[Math.floor(Math.random() * category.msgs.length)]
    addLog(category.type, `${agent.name}: ${msg}`)
  }
}

// ============================================
// MAIN LOOP
// ============================================

function gameLoop() {
  state.animTick++
  updateAgents()
  updateParticles()
  drawOffice()

  if (state.animTick % 60 === 0) {
    updateClock()
    updateUptime()
  }

  requestAnimationFrame(gameLoop)
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================

let ws = null
let wsReconnectTimer = null
let isLiveMode = false
let isReplaying = false

function connectWebSocket() {
  const WS_URL = `ws://localhost:3456`

  try {
    ws = new WebSocket(WS_URL)
  } catch (e) {
    setConnectionStatus('demo')
    return
  }

  ws.onopen = () => {
    isLiveMode = true
    isReplaying = true
    setConnectionStatus('live')

    const terminal = document.getElementById('terminal-log')
    if (terminal) terminal.innerHTML = ''
    state.totalLogs = 0

    addLog('system', '🔗 Connected to Claude Code - LIVE MODE')
    showToast('🔗', 'Connected to Claude Code!', 'success')

    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer)
      wsReconnectTimer = null
    }

    setTimeout(() => {
      isReplaying = false
      addLog('system', '📡 Live event stream active')
    }, 2000)
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      handleServerEvent(data)
    } catch (e) {
      console.error('[WS] Failed to parse message:', e)
    }
  }

  ws.onclose = () => {
    isLiveMode = false
    setConnectionStatus('offline')

    wsReconnectTimer = setTimeout(() => {
      connectWebSocket()
    }, 5000)
  }

  ws.onerror = (err) => {
    setConnectionStatus('demo')
    ws.close()
  }
}

function setConnectionStatus(status) {
  const statusEl = document.getElementById('system-status')
  if (!statusEl) return

  switch (status) {
    case 'live':
      statusEl.textContent = '🟢 LIVE - Claude Code'
      statusEl.style.color = '#44ff88'
      break
    case 'demo':
      statusEl.textContent = '🟡 DEMO MODE'
      statusEl.style.color = '#ffdd44'
      break
    case 'offline':
      statusEl.textContent = '🔴 RECONNECTING...'
      statusEl.style.color = '#ff4466'
      break
  }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
  createDemoAgents()

  resizeCanvas()
  generateStars()
  layoutOffice()
  createAgentCards()
  createFileTree()
  createAchievements()
  updateClock()

  updateXP(0)

  connectWebSocket()

  for (let i = 0; i < 6; i++) {
    dripFeedLogs()
  }
  setInterval(
    () => {
      if (!isLiveMode) {
        dripFeedLogs()
      }
    },
    3000 + Math.random() * 4000,
  )

  setInterval(() => {
    if (!isLiveMode) updateCurrentTask()
  }, 15000)

  setInterval(() => {
    if (isLiveMode) return
    const fm = document.getElementById('files-modified')
    const la = document.getElementById('lines-added')
    const lr = document.getElementById('lines-removed')
    const addAmt = Math.floor(Math.random() * 20) + 1
    const removeAmt = Math.floor(Math.random() * 8)
    fm.textContent = parseInt(fm.textContent) + (Math.random() > 0.7 ? 1 : 0)
    la.textContent = '+' + (parseInt(la.textContent.replace('+', '')) + addAmt)
    lr.textContent = '-' + (parseInt(lr.textContent.replace('-', '')) + removeAmt)
  }, 8000)

  setInterval(() => {
    if (isLiveMode) return
    const tc = document.getElementById('task-count')
    tc.textContent = Math.max(1, parseInt(tc.textContent) + (Math.random() > 0.5 ? 1 : -1))
  }, 10000)

  setTimeout(() => {
    ACHIEVEMENTS_DATA[2].unlocked = true
    createAchievements()
    showToast('🏆', 'Achievement unlocked: Speed Coder!', 'success')
  }, 30000)

  setTimeout(() => {
    ACHIEVEMENTS_DATA[3].unlocked = true
    createAchievements()
    showToast('🏆', 'Achievement unlocked: Architect!', 'success')
  }, 60000)

  window.addEventListener('resize', () => {
    resizeCanvas()
    generateStars()
    layoutOffice()
  })

  const cmdSendBtn = document.getElementById('command-send')
  const cmdInput = document.getElementById('command-input')
  const cmdRespClose = document.getElementById('command-response-close')

  if (cmdSendBtn) {
    cmdSendBtn.addEventListener('click', sendCommand)
  }
  if (cmdInput) {
    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendCommand()
    })
  }
  if (cmdRespClose) {
    cmdRespClose.addEventListener('click', () => {
      document.getElementById('command-response').style.display = 'none'
    })
  }

  gameLoop()

  setTimeout(() => {
    showToast('⚡', 'Claude Office Visualizer is running!', 'success')
  }, 500)
}

// Start
document.addEventListener('DOMContentLoaded', init)
