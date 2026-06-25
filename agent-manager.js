/* ============================================
   Agent Management
   Creation, lookup, and card rendering
   ============================================ */

// Dynamic agents array - populated based on real sessions/subagents
let AGENTS = []

// Map session agents to visualizer agents
let sessionAgentMap = new Map() // sessionId -> agentIndex

// Team tracking: sessionId -> { ownerAgentIdx, subAgentIdxs[], sessionId, cwd }
let teams = new Map()

// Available sessions for command bar
let availableSessions = [] // [{ id, cwd, status }]

function createAgent(id, name, role) {
  const templateIdx = AGENTS.length % AGENT_TEMPLATES.length
  const t = AGENT_TEMPLATES[templateIdx]
  return {
    id,
    name,
    role,
    avatar: t.avatar,
    color: t.color,
    skinColor: t.skinColor,
    shirtColor: t.shirtColor,
    status: 'idle',
    task: 'Waiting...',
    progress: 0,
    deskX: 0,
    deskY: 0,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    frame: 0,
    direction: 'down',
    speechBubble: null,
    speechTimer: 0,
    actionTimer: 0,
  }
}

function createDemoAgents() {
  AGENTS = [
    createAgent('alpha', 'Agent Alpha', 'Lead Developer'),
    createAgent('beta', 'Agent Beta', 'Frontend Engineer'),
    createAgent('gamma', 'Agent Gamma', 'Backend Engineer'),
    createAgent('delta', 'Agent Delta', 'DevOps Specialist'),
  ]
  AGENTS[0].status = 'coding'
  AGENTS[0].task = 'Building authentication module'
  AGENTS[0].progress = 65
  AGENTS[1].status = 'thinking'
  AGENTS[1].task = 'Designing component library'
  AGENTS[1].progress = 40
  AGENTS[2].status = 'reading'
  AGENTS[2].task = 'Reviewing database schema'
  AGENTS[2].progress = 80
  AGENTS[3].status = 'coding'
  AGENTS[3].task = 'Setting up CI/CD pipeline'
  AGENTS[3].progress = 25
}

function getAgentForSession(sessionId) {
  if (sessionAgentMap.has(sessionId)) {
    return AGENTS[sessionAgentMap.get(sessionId)]
  }
  const shortId = sessionId.substring(0, 6)
  const newAgent = createAgent(`session-${shortId}`, `Claude (new)`, 'Session')
  newAgent.sessionId = sessionId
  const idx = AGENTS.length
  AGENTS.push(newAgent)
  sessionAgentMap.set(sessionId, idx)

  layoutOffice()
  createAgentCards()

  return newAgent
}

function mapSessionStatus(status) {
  const statusMap = {
    coding: 'coding',
    reading: 'reading',
    thinking: 'thinking',
    delegating: 'coding',
    communicating: 'thinking',
    responding: 'coding',
    working: 'coding',
    processing: 'thinking',
    idle: 'idle',
  }
  return statusMap[status] || 'coding'
}

// ============================================
// AGENT CARDS WITH TEAM HIERARCHY
// ============================================

function createAgentCards() {
  const list = document.getElementById('agent-list')
  list.innerHTML = ''

  if (isLiveMode && teams.size > 0) {
    for (const [sessionId, team] of teams) {
      const section = document.createElement('div')
      section.className = 'team-section'

      const header = document.createElement('div')
      header.className = 'team-header'
      const ownerAgent = AGENTS[team.ownerAgentIdx]
      const teamLabel =
        ownerAgent?.name?.replace(/^[👑💤]\s*/, '') || team.cwd?.split(/[/\\]/).pop() || 'Session'
      header.innerHTML = `<span class="team-icon">🏢</span> ${teamLabel}`
      section.appendChild(header)

      if (ownerAgent) {
        section.appendChild(createSingleAgentCard(ownerAgent, false))
      }

      for (const subIdx of team.subAgentIdxs) {
        const subAgent = AGENTS[subIdx]
        if (subAgent) {
          section.appendChild(createSingleAgentCard(subAgent, true))
        }
      }

      list.appendChild(section)
    }
  } else {
    for (const agent of AGENTS) {
      list.appendChild(createSingleAgentCard(agent, false))
    }
  }
}

function createSingleAgentCard(agent, isSubAgent) {
  const esc = (s) => {
    if (!s) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
  const card = document.createElement('div')
  card.className = `agent-card status-${esc(agent.status)}` + (isSubAgent ? ' sub-agent-card' : '')
  card.id = `agent-card-${esc(agent.id)}`

  const top = document.createElement('div')
  top.className = 'agent-card-top'

  const avatar = document.createElement('span')
  avatar.className = 'agent-avatar'
  avatar.textContent = agent.avatar

  const badge = document.createElement('span')
  badge.className = `agent-status-badge badge-${esc(agent.status)}`
  badge.textContent = agent.status

  top.appendChild(avatar)
  top.appendChild(badge)

  const info = document.createElement('div')
  info.className = 'agent-info'

  const name = document.createElement('span')
  name.className = 'agent-name'
  name.textContent = agent.name

  const task = document.createElement('span')
  task.className = 'agent-task'
  task.textContent = agent.task

  const progressOuter = document.createElement('div')
  progressOuter.className = 'agent-progress'
  const progressFill = document.createElement('div')
  progressFill.className = `agent-progress-fill ${esc(agent.status)}`
  progressFill.style.width = `${Math.min(Math.max(Number(agent.progress) || 0, 0), 100)}%`
  progressOuter.appendChild(progressFill)

  info.appendChild(name)
  info.appendChild(task)
  info.appendChild(progressOuter)

  card.appendChild(top)
  card.appendChild(info)
  return card
}

function updateAgentCards() {
  for (const agent of AGENTS) {
    const card = document.getElementById(`agent-card-${agent.id}`)
    if (!card) continue
    card.className = `agent-card status-${agent.status}`
    const nameEl = card.querySelector('.agent-name')
    if (nameEl) nameEl.textContent = agent.name
    card.querySelector('.agent-task').textContent = agent.task
    card.querySelector('.agent-status-badge').textContent = agent.status
    card.querySelector('.agent-status-badge').className = `agent-status-badge badge-${agent.status}`
    card.querySelector('.agent-progress-fill').className = `agent-progress-fill ${agent.status}`
    card.querySelector('.agent-progress-fill').style.width = agent.progress + '%'
  }
}
