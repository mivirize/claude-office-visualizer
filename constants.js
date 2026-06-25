/* ============================================
   Constants and Data Definitions
   ============================================ */

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
]

const BOSS = {
  id: 'boss',
  name: 'Boss Claude',
  role: 'Project Manager',
  avatar: '👑',
  color: '#ffdd44',
  skinColor: '#ffd5a0',
  shirtColor: '#1a1a60',
  status: 'thinking',
  x: 0,
  y: 0,
  frame: 0,
  speechBubble: null,
  speechTimer: 0,
}

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
]

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
]

const SPEECH_BUBBLES = {
  coding: [
    'Writing code...',
    'function() {...}',
    'Compiling...',
    'import ...',
    'async/await',
    'git commit',
  ],
  thinking: ['Hmm...', 'Analyzing...', 'Planning...', '🤔', 'Let me think...', 'Processing...'],
  reading: ['Reading file...', 'Checking docs...', 'LGTM 👀', 'Parsing...', 'Scanning...'],
  idle: ['☕', 'Break time', '...', 'Waiting...', 'Ready!'],
  complete: ['Done! ✓', 'Shipped! 🚀', 'All tests pass!', 'Complete!'],
  error: ['Bug found!', 'Error!', 'Fixing...', '⚠️'],
}

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
]

const ACHIEVEMENTS_DATA = [
  { icon: '🚀', name: 'First Deploy', desc: 'Deploy to staging', unlocked: true },
  { icon: '🧪', name: 'Test Master', desc: '100 tests passing', unlocked: true },
  { icon: '🔥', name: 'Speed Coder', desc: '1000 lines/hour', unlocked: false },
  { icon: '🏗️', name: 'Architect', desc: 'Design system complete', unlocked: false },
]
