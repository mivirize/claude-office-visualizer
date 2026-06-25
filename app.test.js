/**
 * Tests for app.js pure functions and server-side modules.
 *
 * app.js is a browser script so we load it via vm with mocked DOM globals.
 * Variables declared with `let` are not accessible on the vm sandbox, so we
 * append accessor functions (declared with `var`) that close over them.
 *
 * session-tracker.js and logger.js are Node modules tested directly.
 */

const vm = require('vm')
const fs = require('fs')
const path = require('path')

// ---------------------------------------------------------------------------
// Helpers: build a minimal DOM/canvas mock context and load app.js into it
// ---------------------------------------------------------------------------

function createMockElement(tag) {
  return {
    tagName: tag,
    className: '',
    id: '',
    innerHTML: '',
    textContent: '0',
    style: {},
    children: [],
    disabled: false,
    value: '',
    appendChild(child) {
      this.children.push(child)
      return child
    },
    querySelector() {
      return createMockElement('span')
    },
    querySelectorAll() {
      return []
    },
    addEventListener() {},
    remove() {},
    getBoundingClientRect() {
      return { width: 800, height: 600 }
    },
  }
}

function createMockContext() {
  const elements = {}

  const canvasCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    fill() {},
    stroke() {},
    fillText() {},
    setLineDash() {},
    createLinearGradient() {
      return { addColorStop() {} }
    },
    createRadialGradient() {
      return { addColorStop() {} }
    },
  }

  const canvasEl = {
    ...createMockElement('canvas'),
    width: 800,
    height: 600,
    getContext() {
      return canvasCtx
    },
    parentElement: {
      getBoundingClientRect() {
        return { width: 800, height: 600 }
      },
    },
  }

  elements['office-canvas'] = canvasEl

  const elementIds = [
    'terminal-log',
    'toast-container',
    'agent-list',
    'file-tree',
    'achievements',
    'agent-count',
    'task-count',
    'log-count',
    'xp-fill',
    'xp-text',
    'clock',
    'uptime',
    'system-status',
    'files-modified',
    'lines-added',
    'lines-removed',
    'session-select',
    'command-input',
    'command-send',
    'command-response',
    'command-response-text',
    'command-response-close',
  ]
  for (const id of elementIds) {
    elements[id] = createMockElement('div')
    elements[id].id = id
  }

  return {
    document: {
      getElementById(id) {
        return elements[id] || createMockElement('div')
      },
      createElement(tag) {
        return createMockElement(tag)
      },
      querySelector() {
        return createMockElement('div')
      },
      addEventListener() {},
    },
    window: { addEventListener() {} },
    WebSocket: undefined,
    requestAnimationFrame() {},
    setTimeout() {},
    setInterval() {},
    clearTimeout() {},
    Math,
    Date,
    String,
    Array,
    Map,
    Set,
    parseInt,
    console,
    JSON,
  }
}

// Accessor functions appended to app.js to expose let-scoped variables
const ACCESSORS = `
var __getAGENTS = function() { return AGENTS; };
var __setAGENTS = function(v) { AGENTS = v; };
var __getState = function() { return state; };
var __getSessionAgentMap = function() { return sessionAgentMap; };
var __setSessionAgentMap = function(v) { sessionAgentMap = v; };
var __getTeams = function() { return teams; };
var __setTeams = function(v) { teams = v; };
var __getAvailableSessions = function() { return availableSessions; };
var __setAvailableSessions = function(v) { availableSessions = v; };
var __getLiveStats = function() { return liveStats; };
var __getIsLiveMode = function() { return isLiveMode; };
var __setIsLiveMode = function(v) { isLiveMode = v; };
var __getIsReplaying = function() { return isReplaying; };
var __setIsReplaying = function(v) { isReplaying = v; };
`

// Load order must match index.html script tag order
const APP_FILES = [
  'constants.js',
  'renderer.js',
  'agent-manager.js',
  'ui.js',
  'event-handler.js',
  'app.js',
]

function loadApp() {
  const code = APP_FILES.map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n')
  const ctx = createMockContext()
  const sandbox = vm.createContext(ctx)
  vm.runInContext(code + '\n' + ACCESSORS, sandbox)
  return sandbox
}

// ---------------------------------------------------------------------------
// app.js tests
// ---------------------------------------------------------------------------

describe('app.js', () => {
  let sandbox

  beforeAll(() => {
    sandbox = loadApp()
  })

  describe('createAgent', () => {
    it('should create an agent with correct id, name, and role', () => {
      const agent = sandbox.createAgent('test-1', 'Test Agent', 'Developer')
      expect(agent.id).toBe('test-1')
      expect(agent.name).toBe('Test Agent')
      expect(agent.role).toBe('Developer')
    })

    it('should initialise default properties', () => {
      const agent = sandbox.createAgent('a', 'A', 'R')
      expect(agent.status).toBe('idle')
      expect(agent.task).toBe('Waiting...')
      expect(agent.progress).toBe(0)
      expect(agent.frame).toBe(0)
      expect(agent.direction).toBe('down')
      expect(agent.speechBubble).toBeNull()
      expect(agent.speechTimer).toBe(0)
      expect(agent.actionTimer).toBe(0)
    })

    it('should cycle through agent templates based on AGENTS length', () => {
      sandbox.__setAGENTS([])
      const a1 = sandbox.createAgent('x1', 'X1', 'R')
      sandbox.__getAGENTS().push(a1)
      const a2 = sandbox.createAgent('x2', 'X2', 'R')
      expect(a1.color).toBe('#4488ff')
      expect(a2.color).toBe('#aa66ff')
    })

    it('should include skin and shirt colors from template', () => {
      sandbox.__setAGENTS([])
      const agent = sandbox.createAgent('c', 'C', 'R')
      expect(agent.skinColor).toBeDefined()
      expect(agent.shirtColor).toBeDefined()
      expect(agent.avatar).toBeDefined()
    })
  })

  describe('shadeColor', () => {
    it('should lighten a color with positive percent', () => {
      const result = sandbox.shadeColor('#808080', 10)
      expect(result).toMatch(/^#[0-9a-f]{6}$/)
      expect(result).toBe('#8a8a8a')
    })

    it('should darken a color with negative percent', () => {
      expect(sandbox.shadeColor('#808080', -10)).toBe('#767676')
    })

    it('should clamp at 0 for very dark', () => {
      expect(sandbox.shadeColor('#050505', -20)).toBe('#000000')
    })

    it('should clamp at 255 for very bright', () => {
      expect(sandbox.shadeColor('#fafafa', 20)).toBe('#ffffff')
    })
  })

  describe('hexToRgb', () => {
    it('should convert hex to comma-separated rgb', () => {
      expect(sandbox.hexToRgb('#ff0000')).toBe('255, 0, 0')
      expect(sandbox.hexToRgb('#00ff00')).toBe('0, 255, 0')
      expect(sandbox.hexToRgb('#0000ff')).toBe('0, 0, 255')
    })

    it('should handle white and black', () => {
      expect(sandbox.hexToRgb('#ffffff')).toBe('255, 255, 255')
      expect(sandbox.hexToRgb('#000000')).toBe('0, 0, 0')
    })
  })

  describe('mapSessionStatus', () => {
    it('should map known statuses correctly', () => {
      expect(sandbox.mapSessionStatus('coding')).toBe('coding')
      expect(sandbox.mapSessionStatus('reading')).toBe('reading')
      expect(sandbox.mapSessionStatus('thinking')).toBe('thinking')
      expect(sandbox.mapSessionStatus('idle')).toBe('idle')
      expect(sandbox.mapSessionStatus('delegating')).toBe('coding')
      expect(sandbox.mapSessionStatus('communicating')).toBe('thinking')
    })

    it('should default to coding for unknown statuses', () => {
      expect(sandbox.mapSessionStatus('unknown')).toBe('coding')
      expect(sandbox.mapSessionStatus('')).toBe('coding')
    })
  })

  describe('createDemoAgents', () => {
    it('should create exactly 4 demo agents', () => {
      sandbox.createDemoAgents()
      expect(sandbox.__getAGENTS().length).toBe(4)
    })

    it('should set different statuses and tasks for demo agents', () => {
      sandbox.createDemoAgents()
      const statuses = sandbox.__getAGENTS().map((a) => a.status)
      expect(statuses).toEqual(['coding', 'thinking', 'reading', 'coding'])
    })
  })

  describe('handleServerEvent', () => {
    it('should ignore null or missing type', () => {
      sandbox.handleServerEvent(null)
      sandbox.handleServerEvent({})
      sandbox.handleServerEvent({ type: 'unknown_event_type' })
    })
  })

  describe('spawnParticle', () => {
    it('should add a particle to state', () => {
      const st = sandbox.__getState()
      st.particles = []
      sandbox.spawnParticle(100, 100, '#ff0000')
      expect(st.particles.length).toBe(1)
      expect(st.particles[0].color).toBe('#ff0000')
      expect(st.particles[0].life).toBe(60)
      expect(st.particles[0].maxLife).toBe(60)
    })
  })

  describe('updateParticles', () => {
    it('should move particles and decrement life', () => {
      const st = sandbox.__getState()
      st.particles = [
        {
          x: 10,
          y: 10,
          vx: 1,
          vy: -1,
          life: 5,
          maxLife: 60,
          color: '#fff',
          size: 2,
        },
      ]
      sandbox.updateParticles()
      expect(st.particles[0].x).toBe(11)
      expect(st.particles[0].y).toBe(9)
      expect(st.particles[0].life).toBe(4)
    })

    it('should remove dead particles', () => {
      const st = sandbox.__getState()
      st.particles = [
        {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          life: 1,
          maxLife: 60,
          color: '#fff',
          size: 1,
        },
      ]
      sandbox.updateParticles()
      expect(st.particles.length).toBe(0)
    })
  })

  describe('drawOffice', () => {
    it('should run without errors (smoke test)', () => {
      sandbox.createDemoAgents()
      const st = sandbox.__getState()
      st.animTick = 0
      st.particles = []
      sandbox.layoutOffice()
      expect(() => sandbox.drawOffice()).not.toThrow()
    })
  })

  describe('drawCharacter', () => {
    it('should run without errors for each status', () => {
      const st = sandbox.__getState()
      st.animTick = 10
      const agent = sandbox.createAgent('t', 'T', 'R')
      for (const status of ['coding', 'thinking', 'reading', 'idle']) {
        agent.status = status
        agent.frame = 0
        expect(() => sandbox.drawCharacter(100, 100, agent, 1)).not.toThrow()
      }
    })
  })

  describe('handleInit', () => {
    it('should populate agents from session data', () => {
      sandbox.__setAGENTS([])
      sandbox.__setSessionAgentMap(new sandbox.Map())
      sandbox.__setTeams(new sandbox.Map())
      sandbox.__setAvailableSessions([])
      sandbox.__setIsLiveMode(true)

      sandbox.handleInit({
        eventCount: 5,
        watchedFiles: 2,
        sessions: [
          {
            id: 'session-abc123',
            cwd: '/home/user/my-project',
            status: 'coding',
            currentTask: 'Writing tests',
            totalTools: 10,
            totalThinking: 3,
            userMessages: 2,
            turnCompletes: 1,
            filesModified: ['app.js'],
            filesRead: ['readme.md'],
            toolCounts: { Edit: 5 },
            subAgents: [],
            isActive: true,
          },
        ],
      })

      const agents = sandbox.__getAGENTS()
      const liveStats = sandbox.__getLiveStats()
      expect(agents.length).toBe(1)
      expect(agents[0].sessionId).toBe('session-abc123')
      expect(agents[0].task).toBe('Writing tests')
      expect(liveStats.projectName).toBe('my-project')
      expect(liveStats.filesModified.has('app.js')).toBe(true)
    })
  })

  describe('handleUserMessage', () => {
    it('should update agent status to reading', () => {
      sandbox.__setAGENTS([])
      sandbox.__setSessionAgentMap(new sandbox.Map())
      sandbox.__setIsReplaying(false)
      sandbox.__setIsLiveMode(true)

      const agent = sandbox.createAgent('s1', 'Test', 'R')
      agent.sessionId = 'sess-001'
      sandbox.__getAGENTS().push(agent)
      sandbox.__getSessionAgentMap().set('sess-001', 0)

      sandbox.handleUserMessage({
        sessionId: 'sess-001',
        text: 'Please fix the bug in auth module',
      })

      expect(agent.status).toBe('reading')
      expect(agent.progress).toBe(0)
    })
  })

  describe('getAgentForSession', () => {
    it('should return existing agent for known session', () => {
      sandbox.__setAGENTS([])
      sandbox.__setSessionAgentMap(new sandbox.Map())
      const agent = sandbox.createAgent('existing', 'Existing', 'R')
      sandbox.__getAGENTS().push(agent)
      sandbox.__getSessionAgentMap().set('known-session', 0)

      const result = sandbox.getAgentForSession('known-session')
      expect(result.id).toBe('existing')
    })

    it('should create new agent for unknown session', () => {
      sandbox.__setAGENTS([])
      sandbox.__setSessionAgentMap(new sandbox.Map())

      const result = sandbox.getAgentForSession('new-session-123456')
      expect(result.id).toBe('session-new-se')
      expect(sandbox.__getAGENTS().length).toBe(1)
      expect(sandbox.__getSessionAgentMap().has('new-session-123456')).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// session-tracker.js tests
// ---------------------------------------------------------------------------

const {
  createSessionTracker,
  getStatusFromTool,
  summarizeToolInput,
  processEvent,
  parseLine,
  MAX_RECENT_EVENTS,
} = require('./session-tracker')

describe('session-tracker.js', () => {
  describe('createSessionTracker', () => {
    it('should create a tracker with empty state', () => {
      const tracker = createSessionTracker()
      expect(tracker.sessionStats.size).toBe(0)
      expect(tracker.recentEvents.length).toBe(0)
    })

    it('should add and trim events', () => {
      const tracker = createSessionTracker()
      for (let i = 0; i < MAX_RECENT_EVENTS + 10; i++) {
        tracker.addEvent({ type: 'test', i })
      }
      expect(tracker.recentEvents.length).toBe(MAX_RECENT_EVENTS)
    })

    it('should get or create session stats', () => {
      const tracker = createSessionTracker()
      const stats = tracker.getSessionStats('s1')
      expect(stats.id).toBe('s1')
      expect(stats.totalTools).toBe(0)
      expect(tracker.getSessionStats('s1')).toBe(stats)
    })
  })

  describe('getStatusFromTool', () => {
    it('should return reading for read tools', () => {
      expect(getStatusFromTool('Read')).toBe('reading')
      expect(getStatusFromTool('Glob')).toBe('reading')
      expect(getStatusFromTool('Grep')).toBe('reading')
    })

    it('should return coding for write tools', () => {
      expect(getStatusFromTool('Write')).toBe('coding')
      expect(getStatusFromTool('Edit')).toBe('coding')
      expect(getStatusFromTool('Bash')).toBe('coding')
    })

    it('should return working for unknown tools', () => {
      expect(getStatusFromTool('CustomTool')).toBe('working')
    })
  })

  describe('summarizeToolInput', () => {
    it('should extract file_path as basename', () => {
      const result = summarizeToolInput('Read', { file_path: '/home/user/src/app.js' })
      expect(result.file).toBe('app.js')
      expect(result.fullPath).toBe('/home/user/src/app.js')
    })

    it('should truncate command', () => {
      const result = summarizeToolInput('Bash', { command: 'x'.repeat(200) })
      expect(result.command.length).toBe(120)
    })

    it('should extract query', () => {
      const result = summarizeToolInput('Grep', { query: 'TODO' })
      expect(result.query).toBe('TODO')
    })
  })

  describe('parseLine', () => {
    it('should return null for empty or short lines', () => {
      const tracker = createSessionTracker()
      expect(parseLine('', 'file.jsonl', tracker)).toBeNull()
      expect(parseLine('short', 'file.jsonl', tracker)).toBeNull()
    })

    it('should return null for invalid JSON', () => {
      const tracker = createSessionTracker()
      expect(parseLine('this is not json at all!!', 'file.jsonl', tracker)).toBeNull()
    })

    it('should parse a user message event', () => {
      const tracker = createSessionTracker()
      const event = {
        type: 'user',
        message: { content: 'Fix the bug' },
        cwd: '/project',
        timestamp: '2025-01-01T00:00:00Z',
      }
      const result = parseLine(JSON.stringify(event), '/projects/sess1.jsonl', tracker)
      expect(result).not.toBeNull()
      expect(result.type).toBe('user_message')
      expect(result.text).toBe('Fix the bug')
    })

    it('should return null for file-history-snapshot events', () => {
      const tracker = createSessionTracker()
      const event = { type: 'file-history-snapshot', timestamp: '2025-01-01T00:00:00Z' }
      const result = parseLine(JSON.stringify(event), '/projects/s.jsonl', tracker)
      expect(result).toBeNull()
    })
  })

  describe('processEvent', () => {
    it('should process assistant tool_use events', () => {
      const tracker = createSessionTracker()
      const event = {
        type: 'assistant',
        sessionId: 'sess-1',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Edit',
              input: { file_path: '/src/app.js' },
            },
          ],
        },
        timestamp: '2025-01-01T00:00:00Z',
      }
      const result = processEvent(event, '/projects/sess-1.jsonl', tracker)
      expect(result).not.toBeNull()
      expect(result.type).toBe('tool_use')
      expect(result.toolName).toBe('Edit')
    })

    it('should track turn completions', () => {
      const tracker = createSessionTracker()
      const event = {
        type: 'assistant',
        sessionId: 'sess-1',
        message: {
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Task completed successfully.' }],
        },
        timestamp: '2025-01-01T00:00:00Z',
      }
      const result = processEvent(event, '/projects/sess-1.jsonl', tracker)
      expect(result).not.toBeNull()
      expect(result.type).toBe('turn_complete')
    })
  })

  describe('buildSessionsSummary', () => {
    it('should build summary from session stats', () => {
      const tracker = createSessionTracker()
      const stats = tracker.getSessionStats('s1')
      stats.cwd = '/project'
      stats.totalTools = 5
      stats.lastEventTime = new Date().toISOString()
      stats.lastStatus = 'coding'

      const summary = tracker.buildSessionsSummary()
      expect(summary.length).toBe(1)
      expect(summary[0].id).toBe('s1')
      expect(summary[0].totalTools).toBe(5)
      expect(summary[0].isActive).toBe(true)
    })

    it('should mark old sessions as inactive', () => {
      const tracker = createSessionTracker()
      const stats = tracker.getSessionStats('old')
      stats.lastEventTime = new Date(Date.now() - 20 * 60 * 1000).toISOString()

      const summary = tracker.buildSessionsSummary()
      expect(summary[0].isActive).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// logger.js tests
// ---------------------------------------------------------------------------

const { createLogger, LOG_LEVELS } = require('./logger')

describe('logger.js', () => {
  it('should write info messages when level is INFO', () => {
    const output = []
    const writer = {
      write(msg) {
        output.push(msg)
      },
    }
    const log = createLogger({ writer, errorWriter: writer })

    log.info('TEST', 'hello')
    expect(output.length).toBe(1)
    expect(output[0]).toContain('[TEST]')
    expect(output[0]).toContain('hello')
  })

  it('should suppress debug messages at INFO level', () => {
    const output = []
    const writer = {
      write(msg) {
        output.push(msg)
      },
    }
    const log = createLogger({ writer, errorWriter: writer })
    log.debug('TEST', 'hidden')
    expect(output.length).toBe(0)
  })

  it('should show debug messages at DEBUG level', () => {
    const output = []
    const writer = {
      write(msg) {
        output.push(msg)
      },
    }
    const log = createLogger({ level: 'DEBUG', writer, errorWriter: writer })
    log.debug('TEST', 'visible')
    expect(output.length).toBe(1)
  })

  it('should write errors to errorWriter', () => {
    const stdOut = []
    const stdErr = []
    const log = createLogger({
      writer: {
        write(m) {
          stdOut.push(m)
        },
      },
      errorWriter: {
        write(m) {
          stdErr.push(m)
        },
      },
    })
    log.error('ERR', 'something broke')
    expect(stdOut.length).toBe(0)
    expect(stdErr.length).toBe(1)
    expect(stdErr[0]).toContain('something broke')
  })

  it('should suppress all messages at SILENT level', () => {
    const output = []
    const writer = {
      write(msg) {
        output.push(msg)
      },
    }
    const log = createLogger({ level: 'SILENT', writer, errorWriter: writer })
    log.debug('T', 'x')
    log.info('T', 'x')
    log.warn('T', 'x')
    log.error('T', 'x')
    expect(output.length).toBe(0)
  })

  it('should include ISO timestamp in messages', () => {
    const output = []
    const writer = {
      write(msg) {
        output.push(msg)
      },
    }
    const log = createLogger({ writer, errorWriter: writer })
    log.info('T', 'msg')
    expect(output[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
