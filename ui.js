/* ============================================
   UI Updates
   Logging, toasts, stats, and DOM manipulation
   ============================================ */

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function addLog(type, msg) {
  const terminal = document.getElementById('terminal-log')
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  const entry = document.createElement('div')
  entry.className = 'log-entry'

  const timeSpan = document.createElement('span')
  timeSpan.className = 'log-time'
  timeSpan.textContent = time

  const msgSpan = document.createElement('span')
  msgSpan.className = `log-msg ${escapeHtml(type)}`
  msgSpan.textContent = msg

  entry.appendChild(timeSpan)
  entry.appendChild(msgSpan)
  terminal.appendChild(entry)
  terminal.scrollTop = terminal.scrollHeight

  state.totalLogs++
  document.getElementById('log-count').textContent = state.totalLogs
}

function showToast(icon, text, type = '') {
  const container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast ${escapeHtml(type)}`

  const iconSpan = document.createElement('span')
  iconSpan.className = 'toast-icon'
  iconSpan.textContent = icon

  const textSpan = document.createElement('span')
  textSpan.className = 'toast-text'
  textSpan.textContent = text

  toast.appendChild(iconSpan)
  toast.appendChild(textSpan)
  container.appendChild(toast)

  setTimeout(() => toast.remove(), 4000)
}

function updateXP(amount) {
  state.xp += amount
  if (state.xp >= state.xpMax) {
    state.xp -= state.xpMax
    state.xpMax = Math.floor(state.xpMax * 1.5)
    showToast('🎉', 'Level Up!', 'success')
  }
  const pct = (state.xp / state.xpMax) * 100
  document.getElementById('xp-fill').style.width = pct + '%'
  document.getElementById('xp-text').textContent =
    `${state.xp.toLocaleString()} / ${state.xpMax.toLocaleString()}`
}

function updateClock() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  document.getElementById('clock').textContent = `${h}:${m}`
}

function updateUptime() {
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0')
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
  const s = String(elapsed % 60).padStart(2, '0')
  document.getElementById('uptime').textContent = `${h}:${m}:${s}`
}

function createFileTree() {
  const tree = document.getElementById('file-tree')
  tree.innerHTML = ''
  for (const file of FILE_TREE) {
    const item = document.createElement('div')
    item.className = `file-tree-item ${escapeHtml(file.type)}`
    const icon =
      file.type === 'dir'
        ? '📂'
        : file.type === 'modified'
          ? '📝'
          : file.type === 'added'
            ? '✨'
            : '📄'

    const iconSpan = document.createElement('span')
    iconSpan.textContent = icon
    const nameSpan = document.createElement('span')
    nameSpan.textContent = file.name

    item.appendChild(iconSpan)
    item.appendChild(nameSpan)
    tree.appendChild(item)
  }
}

function createAchievements() {
  const container = document.getElementById('achievements')
  container.innerHTML = ''
  for (const ach of ACHIEVEMENTS_DATA) {
    const div = document.createElement('div')
    div.className = `achievement ${ach.unlocked ? 'unlocked' : 'locked'}`

    const iconSpan = document.createElement('span')
    iconSpan.className = 'achievement-icon'
    iconSpan.textContent = ach.icon

    const infoDiv = document.createElement('div')
    infoDiv.className = 'achievement-info'

    const nameSpan = document.createElement('span')
    nameSpan.className = 'achievement-name'
    nameSpan.textContent = ach.name

    const descSpan = document.createElement('span')
    descSpan.className = 'achievement-desc'
    descSpan.textContent = ach.desc

    infoDiv.appendChild(nameSpan)
    infoDiv.appendChild(descSpan)
    div.appendChild(iconSpan)
    div.appendChild(infoDiv)
    container.appendChild(div)
  }
}

function updateCurrentTask() {
  state.taskIndex = (state.taskIndex + 1) % TASKS.length
  document.querySelector('.task-text').textContent = `Current: ${TASKS[state.taskIndex]}`
}

function updateLiveFileStats() {
  const fm = document.getElementById('files-modified')
  const la = document.getElementById('lines-added')
  const lr = document.getElementById('lines-removed')
  if (fm) fm.textContent = liveStats.filesModified.size
  if (la) la.textContent = '+' + liveStats.totalTools
  if (lr) lr.textContent = liveStats.filesRead.size + ' read'
}

function updateLiveFileTree() {
  const tree = document.getElementById('file-tree')
  if (!tree) return
  tree.innerHTML = ''

  const modified = Array.from(liveStats.filesModified).slice(-8)
  const read = Array.from(liveStats.filesRead).slice(-5)

  if (modified.length > 0) {
    const header = document.createElement('div')
    header.className = 'file-tree-item dir'
    const hIcon = document.createElement('span')
    hIcon.textContent = '📂'
    const hLabel = document.createElement('span')
    hLabel.textContent = 'Modified:'
    header.appendChild(hIcon)
    header.appendChild(hLabel)
    tree.appendChild(header)

    for (const f of modified) {
      const item = document.createElement('div')
      item.className = 'file-tree-item modified'
      const mIcon = document.createElement('span')
      mIcon.textContent = '📝'
      const mName = document.createElement('span')
      mName.textContent = `  ${f}`
      item.appendChild(mIcon)
      item.appendChild(mName)
      tree.appendChild(item)
    }
  }

  if (read.length > 0) {
    const header = document.createElement('div')
    header.className = 'file-tree-item dir'
    const hIcon = document.createElement('span')
    hIcon.textContent = '📂'
    const hLabel = document.createElement('span')
    hLabel.textContent = 'Read:'
    header.appendChild(hIcon)
    header.appendChild(hLabel)
    tree.appendChild(header)

    for (const f of read) {
      const item = document.createElement('div')
      item.className = 'file-tree-item'
      const rIcon = document.createElement('span')
      rIcon.textContent = '📄'
      const rName = document.createElement('span')
      rName.textContent = `  ${f}`
      item.appendChild(rIcon)
      item.appendChild(rName)
      tree.appendChild(item)
    }
  }
}

function updateSessionSelector() {
  const select = document.getElementById('session-select')
  const input = document.getElementById('command-input')
  const btn = document.getElementById('command-send')

  if (!select) return
  select.innerHTML = ''

  if (availableSessions.length === 0) {
    select.innerHTML = '<option value="">No sessions</option>'
    if (input) input.disabled = true
    if (btn) btn.disabled = true
    return
  }

  availableSessions.forEach((sess) => {
    const opt = document.createElement('option')
    opt.value = sess.id
    opt.textContent = sess.label
    select.appendChild(opt)
  })

  if (input) input.disabled = false
  if (btn) btn.disabled = false
}
