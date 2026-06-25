/* ============================================
   Server Event Handlers
   WebSocket message processing
   ============================================ */

function handleServerEvent(data) {
  if (!data || !data.type) return

  switch (data.type) {
    case 'init':
      handleInit(data)
      break
    case 'tool_use':
      handleToolUse(data)
      break
    case 'thinking':
      handleThinking(data)
      break
    case 'assistant_text':
      handleAssistantText(data)
      break
    case 'user_message':
      handleUserMessage(data)
      break
    case 'tool_result':
      handleToolResult(data)
      break
    case 'teammate_message':
      handleTeammateMessage(data)
      break
    case 'turn_complete':
      handleTurnComplete(data)
      break
    case 'todos_update':
      handleTodosUpdate(data)
      break
    case 'sub_agent_spawned':
      handleSubAgentSpawned(data)
      break
    case 'sub_agent_completed':
      handleSubAgentCompleted(data)
      break
    case 'command_sent':
      handleCommandSent(data)
      break
    case 'command_response':
      handleCommandResponse(data)
      break
    case 'command_error':
      handleCommandError(data)
      break
  }
}

function handleInit(data) {
  addLog(
    'system',
    `📡 接続完了: ${data.eventCount} イベントキャッシュ, ${data.watchedFiles} ファイル監視中`,
  )

  AGENTS = []
  sessionAgentMap.clear()
  teams.clear()
  availableSessions = []

  if (data.sessions && data.sessions.length > 0) {
    data.sessions.forEach((sess, i) => {
      const cwd = sess.cwd || ''
      const projectDir = cwd.split(/[/\\]/).pop() || 'Claude'
      const shortId = sess.id.substring(0, 6)
      const isActive = sess.isActive !== false

      const title = sess.sessionTitle || sess.currentTask || ''
      const displayName = title || projectDir
      const statusLabel = isActive ? '👑' : '💤'
      const agent = createAgent(`session-${shortId}`, `${statusLabel} ${displayName}`, projectDir)
      agent.isOwner = true
      agent.sessionId = sess.id
      agent.isActive = isActive

      if (isActive) {
        if (sess.status) agent.status = mapSessionStatus(sess.status)
        if (sess.currentTask) agent.task = sess.currentTask
      } else {
        agent.status = 'idle'
        agent.task = 'Session inactive'
      }

      const ownerIdx = AGENTS.length
      AGENTS.push(agent)
      sessionAgentMap.set(sess.id, ownerIdx)

      const team = { sessionId: sess.id, ownerAgentIdx: ownerIdx, subAgentIdxs: [], cwd, isActive }
      teams.set(sess.id, team)

      if (isActive && sess.subAgents && sess.subAgents.length > 0) {
        for (const sub of sess.subAgents) {
          const subAgent = createAgent(sub.id, `  🔹 ${sub.name}`, `Sub-agent of ${shortId}`)
          subAgent.isSubAgent = true
          subAgent.parentSessionId = sess.id
          subAgent.status = 'coding'
          subAgent.task = sub.description?.substring(0, 60) || sub.name

          const subIdx = AGENTS.length
          AGENTS.push(subAgent)
          team.subAgentIdxs.push(subIdx)
        }
      }

      const activeTag = isActive ? ' [LIVE]' : ''
      const selectorLabel = displayName + activeTag
      availableSessions.push({ id: sess.id, label: selectorLabel, status: sess.status || 'idle' })
    })

    const mainSession = data.sessions[0]

    if (mainSession.cwd) {
      liveStats.cwd = mainSession.cwd
      liveStats.projectName = mainSession.cwd.split(/[/\\]/).pop() || 'project'
      const projEl = document.querySelector('.project-name')
      if (projEl) projEl.textContent = liveStats.projectName
    }

    if (mainSession.filesModified)
      mainSession.filesModified.forEach((f) => liveStats.filesModified.add(f))
    if (mainSession.filesRead) mainSession.filesRead.forEach((f) => liveStats.filesRead.add(f))
    if (mainSession.toolCounts) liveStats.toolCounts = { ...mainSession.toolCounts }
    liveStats.totalTools = mainSession.totalTools || 0
    liveStats.totalThinking = mainSession.totalThinking || 0
    liveStats.userMessages = mainSession.userMessages || 0
    liveStats.turnCompletes = mainSession.turnCompletes || 0

    document.getElementById('agent-count').textContent = AGENTS.length
    document.getElementById('task-count').textContent = liveStats.turnCompletes

    updateLiveFileStats()
    updateLiveFileTree()
  }

  updateSessionSelector()

  layoutOffice()
  createAgentCards()
  updateAgentCards()
}

function handleToolUse(data) {
  const agent = getAgentForSession(data.sessionId)
  const toolName = data.toolName || 'unknown'
  const summary = data.toolInput || {}

  agent.status = mapSessionStatus(data.agentStatus || 'working')

  let taskText = data.taskText || ''
  if (!taskText) {
    if (summary.file) taskText = `${toolName}: ${summary.file}`
    else if (summary.command) taskText = `Running: ${summary.command}`
    else if (summary.name) taskText = `Agent: ${summary.name}`
    else if (summary.query) taskText = `Searching: ${summary.query}`
    else taskText = `Using ${toolName}`
  }
  agent.task = taskText

  liveStats.totalTools++
  liveStats.toolCounts[toolName] = (liveStats.toolCounts[toolName] || 0) + 1

  if (summary.file) {
    if (['Write', 'Edit', 'MultiEdit', 'CreateFile'].includes(toolName)) {
      liveStats.filesModified.add(summary.file)
    } else {
      liveStats.filesRead.add(summary.file)
    }
  }

  liveStats.currentTask = taskText
  const taskDisplay = document.querySelector('.task-text')
  if (taskDisplay) taskDisplay.textContent = `Current: ${taskText}`

  const bubbleTexts = {
    Write: '✏️ Writing...',
    Edit: '✏️ Editing...',
    Read: '📖 Reading...',
    ReadFile: '📖 Reading...',
    View: '👀 Viewing...',
    Bash: '⚡ Running...',
    Task: '🤖 Spawning...',
    Grep: '🔍 Searching...',
    Find: '🔍 Finding...',
    TodoWrite: '📋 Planning...',
    SendMessage: '💬 Messaging...',
    WebSearch: '🌐 Searching...',
    WebFetch: '🌐 Fetching...',
  }
  agent.speechBubble = bubbleTexts[toolName] || `🔧 ${toolName}`
  agent.speechTimer = 120

  if (!isReplaying) {
    const logTypes = {
      Write: 'action',
      Edit: 'action',
      CreateFile: 'action',
      Read: 'info',
      ReadFile: 'info',
      View: 'info',
      Bash: 'action',
      Task: 'system',
      TeamCreate: 'system',
      Grep: 'info',
      Find: 'info',
      TodoWrite: 'info',
      SendMessage: 'info',
      WebSearch: 'info',
    }
    addLog(logTypes[toolName] || 'action', `${agent.name}: ${taskText}`)
    spawnParticles(agent.deskX + 15, agent.deskY - 10, 3, agent.color)
    updateXP(5)

    updateLiveFileStats()
    updateLiveFileTree()
  }

  agent.progress = Math.min(100, agent.progress + Math.floor(Math.random() * 5) + 1)
  updateAgentCards()
}

function handleThinking(data) {
  const agent = getAgentForSession(data.sessionId)
  agent.status = 'thinking'
  agent.speechBubble = '🤔 Thinking...'
  agent.speechTimer = 90
  updateAgentCards()
}

function handleAssistantText(data) {
  const agent = getAgentForSession(data.sessionId)
  agent.status = 'coding'

  if (data.text) {
    const shortText = data.text.substring(0, 30) + (data.text.length > 30 ? '...' : '')
    agent.speechBubble = `💬 ${shortText}`
    agent.speechTimer = 150
  }
}

function handleUserMessage(data) {
  if (!isReplaying && data.text) {
    addLog('info', `📝 User: ${data.text.substring(0, 80)}${data.text.length > 80 ? '...' : ''}`)
  }
  const agent = getAgentForSession(data.sessionId)
  agent.status = 'reading'

  if (data.text && data.text.length > 3 && !agent.hasTitle) {
    const title = data.text
    const isActive = agent.isActive !== false
    const statusLabel = isActive ? '👑' : '💤'
    agent.name = `${statusLabel} ${title}`
    agent.hasTitle = true
    createAgentCards()
  }

  if (!isReplaying) {
    agent.speechBubble = '📨 New task!'
    agent.speechTimer = 90
  }
  agent.progress = 0
  updateAgentCards()
}

function handleToolResult(data) {
  const agent = getAgentForSession(data.sessionId)
  spawnParticles(agent.deskX + 15, agent.deskY - 5, 2, '#44ff88')
}

function handleTeammateMessage(data) {
  if (isReplaying) return
  const agentId = data.agentId || 'unknown'
  addLog('system', `🤖 Team: ${agentId} ${data.color ? `(${data.color})` : ''}`)
  BOSS.speechBubble = `📩 ${agentId}`
  BOSS.speechTimer = 120
}

function handleTurnComplete(data) {
  const agent = getAgentForSession(data.sessionId)
  agent.status = 'idle'
  agent.progress = 0

  liveStats.turnCompletes++
  const tc = document.getElementById('task-count')
  if (tc) tc.textContent = liveStats.turnCompletes

  if (!isReplaying) {
    agent.status = 'complete'
    agent.speechBubble = '✅ Done!'
    agent.speechTimer = 120
    agent.progress = 100

    addLog('success', `${agent.name}: Task completed ✓`)
    showToast('✅', `${agent.name} completed task!`, 'success')
    updateXP(20)
    spawnParticles(agent.deskX + 15, agent.deskY - 10, 8, agent.color)

    setTimeout(() => {
      agent.status = 'idle'
      agent.progress = 0
      updateAgentCards()
    }, 3000)
  }

  updateAgentCards()
}

function handleTodosUpdate(data) {
  if (data.todos && data.todos.length > 0) {
    const currentTodo = data.todos.find((t) => t.status === 'in_progress')
    if (currentTodo) {
      const taskDisplay = document.querySelector('.task-bar span:first-child')
      if (taskDisplay) {
        taskDisplay.textContent = `📋 ${currentTodo.activeForm || currentTodo.content}`
      }
    }

    const completed = data.todos.filter((t) => t.status === 'completed').length
    const total = data.todos.length
    const pct = Math.round((completed / total) * 100)

    addLog('info', `📋 Tasks: ${completed}/${total} completed (${pct}%)`)
  }
}

// ============================================
// SUB-AGENT HANDLERS
// ============================================

function handleSubAgentSpawned(data) {
  if (!data.subAgent || !data.sessionId) return

  const sub = data.subAgent
  const subAgent = createAgent(sub.id, `  🔹 ${sub.name.substring(0, 25)}`, `Sub-agent`)
  subAgent.isSubAgent = true
  subAgent.parentSessionId = data.sessionId
  subAgent.status = 'coding'
  subAgent.task = sub.description?.substring(0, 60) || sub.name

  const subIdx = AGENTS.length
  AGENTS.push(subAgent)

  const team = teams.get(data.sessionId)
  if (team) {
    team.subAgentIdxs.push(subIdx)
  }

  document.getElementById('agent-count').textContent = AGENTS.length
  layoutOffice()
  createAgentCards()

  if (!isReplaying) {
    addLog('system', `🤖 Sub-agent spawned: ${sub.name.substring(0, 40)}`)
    showToast('🤖', `Sub-agent: ${sub.name.substring(0, 40)}`, 'success')
  }
}

function handleSubAgentCompleted(data) {
  if (!data.subAgentId) return

  const agent = AGENTS.find((a) => a.id === data.subAgentId)
  if (agent) {
    agent.status = 'complete'
    agent.speechBubble = '✅ Done!'
    agent.speechTimer = 120
    agent.progress = 100

    if (!isReplaying) {
      addLog('success', `✅ Sub-agent completed: ${agent.name}`)
    }

    setTimeout(() => {
      agent.status = 'idle'
      updateAgentCards()
    }, 5000)
  }

  updateAgentCards()
}

// ============================================
// COMMAND BAR HANDLERS
// ============================================

function sendCommand() {
  const select = document.getElementById('session-select')
  const input = document.getElementById('command-input')
  const btn = document.getElementById('command-send')

  const sessionId = select?.value
  const message = input?.value?.trim()

  if (!sessionId || !message || !ws) return

  ws.send(
    JSON.stringify({
      type: 'send_command',
      sessionId,
      message,
    }),
  )

  input.value = ''
  if (btn) {
    btn.classList.add('sending')
    btn.querySelector('span').textContent = '⏳ Sending...'
  }

  addLog('action', `📤 Command sent: ${message.substring(0, 60)}`)
}

function handleCommandSent(data) {
  addLog('system', `📡 Command dispatched to session ${data.sessionId.substring(0, 6)}`)
  showToast('📤', 'Command sent to Claude...', 'success')
}

function handleCommandResponse(data) {
  const btn = document.getElementById('command-send')
  if (btn) {
    btn.classList.remove('sending')
    btn.querySelector('span').textContent = '📤 Send'
  }

  const respEl = document.getElementById('command-response')
  const respText = document.getElementById('command-response-text')
  if (respEl && respText) {
    respText.textContent = `📨 Response: ${data.response.substring(0, 200)}`
    respEl.style.display = 'flex'
  }

  addLog('success', `📨 Response: ${data.response.substring(0, 100)}`)
  showToast('📨', 'Claude responded!', 'success')
}

function handleCommandError(data) {
  const btn = document.getElementById('command-send')
  if (btn) {
    btn.classList.remove('sending')
    btn.querySelector('span').textContent = '📤 Send'
  }

  addLog('error', `❌ Command error: ${data.error}`)
  showToast('❌', `Error: ${data.error.substring(0, 80)}`, 'error')
}
