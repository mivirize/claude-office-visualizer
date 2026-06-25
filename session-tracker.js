const path = require('path')

const MAX_RECENT_EVENTS = 100

function createSessionTracker() {
  const sessionStats = new Map()
  const recentEvents = []

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
        sessionTitle: '',
        totalTools: 0,
        totalThinking: 0,
        userMessages: 0,
        turnCompletes: 0,
        lastEventTime: null,
        subAgents: [],
        activeSubAgent: null,
        inSubTask: false,
      })
    }
    return sessionStats.get(sessionId)
  }

  function addEvent(event) {
    recentEvents.push(event)
    if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift()
  }

  function trimEvents() {
    while (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.shift()
  }

  function buildSessionsSummary() {
    const sessionsArr = []
    const NOW = Date.now()

    for (const [id, stats] of sessionStats) {
      const lastTime = stats.lastEventTime ? new Date(stats.lastEventTime).getTime() : 0
      const minutesAgo = (NOW - lastTime) / 60000
      const isRecentlyActive = minutesAgo < 10

      const activeSubAgents = stats.subAgents.filter((s) => {
        if (s.status === 'completed') return false
        if (!isRecentlyActive) return false
        const spawnedTime = s.spawnedAt ? new Date(s.spawnedAt).getTime() : 0
        const spawnedMinutesAgo = (NOW - spawnedTime) / 60000
        return spawnedMinutesAgo < 5 || s.id === stats.activeSubAgent
      })

      sessionsArr.push({
        id: stats.id,
        cwd: stats.cwd,
        status: isRecentlyActive ? stats.lastStatus : 'idle',
        currentTask: stats.lastTask,
        sessionTitle: stats.sessionTitle,
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
      })
    }

    return sessionsArr
  }

  return {
    sessionStats,
    recentEvents,
    getSessionStats,
    addEvent,
    trimEvents,
    buildSessionsSummary,
  }
}

function getStatusFromTool(toolName) {
  const map = {
    Read: 'reading',
    ReadFile: 'reading',
    View: 'reading',
    LS: 'reading',
    Glob: 'reading',
    Grep: 'reading',
    Find: 'reading',
    Write: 'coding',
    Edit: 'coding',
    MultiEdit: 'coding',
    CreateFile: 'coding',
    Bash: 'coding',
    TodoWrite: 'thinking',
    Task: 'delegating',
    TeamCreate: 'delegating',
    SendMessage: 'communicating',
    WebSearch: 'reading',
    WebFetch: 'reading',
  }
  return map[toolName] || 'working'
}

function summarizeToolInput(toolName, input) {
  const s = {}
  if (input.file_path) {
    s.file = path.basename(input.file_path)
    s.fullPath = input.file_path
  }
  if (input.path) {
    s.file = path.basename(input.path)
    s.fullPath = input.path
  }
  if (input.command) s.command = input.command.substring(0, 120)
  if (input.name) s.name = input.name
  if (input.team_name) s.team = input.team_name
  if (input.recipient) s.recipient = input.recipient
  if (input.query) s.query = input.query.substring(0, 100)
  if (input.todos) s.todoCount = input.todos.length
  if (input.description) s.description = input.description.substring(0, 100)
  return s
}

function processEvent(event, filePath, tracker) {
  const sessionId = event.sessionId || path.basename(filePath, '.jsonl')
  if (event.type === 'file-history-snapshot') return null

  const stats = tracker.getSessionStats(sessionId)
  if (event.timestamp) stats.lastEventTime = event.timestamp

  if (event.type === 'user') {
    return processUserEvent(event, sessionId, stats)
  }

  if (event.type === 'assistant') {
    return processAssistantEvent(event, sessionId, stats, tracker)
  }

  if (event.type === 'queue-operation' && event.content) {
    const match = event.content.match(/teammate_id="([^"]+)"/)
    if (match) {
      return { type: 'teammate_message', sessionId, agentId: match[1], timestamp: event.timestamp }
    }
  }

  return null
}

function processUserEvent(event, sessionId, stats) {
  if (event.cwd) stats.cwd = event.cwd
  stats.userMessages++

  if (event.message?.content && Array.isArray(event.message.content)) {
    for (const block of event.message.content) {
      if (block.type === 'tool_result') {
        return {
          type: 'tool_result',
          sessionId,
          toolId: block.tool_use_id,
          timestamp: event.timestamp,
        }
      }
    }
  }

  if (
    typeof event.message?.content === 'string' &&
    event.message.content.includes('teammate-message')
  ) {
    const match = event.message.content.match(/teammate_id="([^"]+)"/)
    const colorMatch = event.message.content.match(/color="([^"]+)"/)
    return {
      type: 'teammate_message',
      sessionId,
      agentId: match ? match[1] : 'unknown',
      color: colorMatch ? colorMatch[1] : 'blue',
      timestamp: event.timestamp,
    }
  }

  if (event.todos) {
    return { type: 'todos_update', sessionId, todos: event.todos, timestamp: event.timestamp }
  }

  let text = ''
  if (typeof event.message?.content === 'string') text = event.message.content.substring(0, 200)
  else if (Array.isArray(event.message?.content)) {
    const textBlock = event.message.content.find((b) => b.type === 'text')
    if (textBlock) text = textBlock.text.substring(0, 200)
  }
  if (!text) return null

  if (!stats.sessionTitle && text.length > 3) {
    stats.sessionTitle = text.substring(0, 120)
  }

  return { type: 'user_message', sessionId, text, cwd: stats.cwd, timestamp: event.timestamp }
}

function processAssistantEvent(event, sessionId, stats, tracker) {
  const stopReason = event.message?.stop_reason
  const isTurnEnd = stopReason === 'end_turn' || stopReason === 'stop_sequence'

  if (isTurnEnd) {
    stats.lastStatus = 'idle'
    stats.turnCompletes++
    if (stats.activeSubAgent) {
      const sub = stats.subAgents.find((s) => s.id === stats.activeSubAgent)
      if (sub) sub.status = 'completed'
      stats.activeSubAgent = null
      stats.inSubTask = false
    }
  }

  if (event.message?.content) {
    for (const block of event.message.content) {
      if (block.type === 'tool_use') {
        return processToolUseBlock(block, event, sessionId, stats, isTurnEnd, tracker)
      }

      if (block.type === 'thinking') {
        stats.totalThinking++
        stats.lastStatus = 'thinking'
        return { type: 'thinking', sessionId, timestamp: event.timestamp }
      }

      if (block.type === 'text' && block.text && block.text.length > 5) {
        stats.lastStatus = isTurnEnd ? 'idle' : 'responding'
        return {
          type: isTurnEnd ? 'turn_complete' : 'assistant_text',
          sessionId,
          text: block.text.substring(0, 200),
          timestamp: event.timestamp,
        }
      }
    }
  }

  if (isTurnEnd) {
    return { type: 'turn_complete', sessionId, timestamp: event.timestamp }
  }

  return null
}

function processToolUseBlock(block, event, sessionId, stats, isTurnEnd, tracker) {
  const toolName = block.name
  const toolInput = block.input || {}
  const agentStatus = getStatusFromTool(toolName)

  stats.toolCounts[toolName] = (stats.toolCounts[toolName] || 0) + 1
  stats.totalTools++
  stats.lastStatus = agentStatus

  let subAgentEvent = null
  if (['Task', 'Agent'].includes(toolName)) {
    if (stats.activeSubAgent) {
      const prevSub = stats.subAgents.find((s) => s.id === stats.activeSubAgent)
      if (prevSub) prevSub.status = 'completed'
    }

    const subName = toolInput.description?.substring(0, 60) || toolInput.name || 'Sub-agent'
    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const sub = {
      id: subId,
      name: subName,
      description: toolInput.description?.substring(0, 120) || '',
      spawnedAt: event.timestamp,
      status: 'working',
    }
    stats.subAgents.push(sub)
    stats.activeSubAgent = subId
    stats.inSubTask = true

    subAgentEvent = {
      type: 'sub_agent_spawned',
      sessionId,
      subAgent: sub,
      timestamp: event.timestamp,
    }
  }

  if (['TaskStop', 'TaskOutput'].includes(toolName)) {
    if (stats.activeSubAgent) {
      const sub = stats.subAgents.find((s) => s.id === stats.activeSubAgent)
      if (sub) sub.status = 'completed'
      const completedId = stats.activeSubAgent
      stats.activeSubAgent = null
      stats.inSubTask = false

      return {
        type: 'sub_agent_completed',
        sessionId,
        subAgentId: completedId,
        timestamp: event.timestamp,
      }
    }
  }

  const fp = toolInput.file_path || toolInput.path || ''
  if (fp) {
    const baseName = path.basename(fp)
    if (['Write', 'Edit', 'MultiEdit', 'CreateFile'].includes(toolName)) {
      stats.filesModified.add(baseName)
      stats.lastTask = `Editing ${baseName}`
    } else if (['Read', 'ReadFile', 'View'].includes(toolName)) {
      stats.filesRead.add(baseName)
      stats.lastTask = `Reading ${baseName}`
    }
  } else if (toolInput.command) {
    stats.lastTask = `Running: ${toolInput.command.substring(0, 60)}`
  } else if (toolInput.name) {
    stats.lastTask = `Agent: ${toolInput.name}`
  } else if (toolInput.query) {
    stats.lastTask = `Searching: ${toolInput.query.substring(0, 60)}`
  } else {
    stats.lastTask = `Using ${toolName}`
  }

  const toolEvent = {
    type: 'tool_use',
    sessionId,
    toolName,
    toolInput: summarizeToolInput(toolName, toolInput),
    agentStatus,
    taskText: stats.lastTask,
    isSubAgentWork: stats.inSubTask,
    activeSubAgentId: stats.activeSubAgent,
    timestamp: event.timestamp,
  }

  if (subAgentEvent && tracker) {
    tracker.addEvent(subAgentEvent)
  }

  return toolEvent
}

function parseLine(line, filePath, tracker) {
  if (!line || line.length < 10) return null
  try {
    const event = JSON.parse(line)
    return processEvent(event, filePath, tracker)
  } catch (e) {
    return null
  }
}

module.exports = {
  createSessionTracker,
  getStatusFromTool,
  summarizeToolInput,
  processEvent,
  processUserEvent,
  processAssistantEvent,
  processToolUseBlock,
  parseLine,
  MAX_RECENT_EVENTS,
}
