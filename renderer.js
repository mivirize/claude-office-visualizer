/* ============================================
   Canvas Rendering Engine
   Pixel Art Drawing Functions
   ============================================ */

// Utility: shade a hex color by percent
function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// Utility: hex to "r, g, b" string
function hexToRgb(hex) {
  const num = parseInt(hex.replace('#', ''), 16)
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`
}

// ============================================
// PIXEL ART PRIMITIVES
// ============================================

function drawPixelRect(x, y, w, h, color, border = null) {
  ctx.fillStyle = color
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h))
  if (border) {
    ctx.strokeStyle = border
    ctx.lineWidth = 2
    ctx.strokeRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h))
  }
}

function drawPixelText(text, x, y, color = '#fff', size = 10, align = 'left') {
  ctx.font = `${size}px "Press Start 2P"`
  ctx.textAlign = align
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillText(text, x + 1, y + 1)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

// ============================================
// CHARACTER DRAWING
// ============================================

function drawCharacter(x, y, agent, scale = 1) {
  const s = 4 * scale
  const cx = Math.floor(x)
  const cy = Math.floor(y)
  const frame = Math.floor(agent.frame) % 4
  const bobY = frame === 1 || frame === 3 ? -1 * scale : 0

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 16 * scale, 8 * scale, 3 * scale, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body (shirt)
  drawPixelRect(cx - 5 * scale, cy - 4 * scale + bobY, 10 * scale, 10 * scale, agent.shirtColor)
  // Shirt detail
  drawPixelRect(
    cx - 1 * scale,
    cy - 2 * scale + bobY,
    2 * scale,
    6 * scale,
    shadeColor(agent.shirtColor, -20),
  )

  // Head
  drawPixelRect(cx - 5 * scale, cy - 14 * scale + bobY, 10 * scale, 10 * scale, agent.skinColor)

  // Hair
  drawPixelRect(
    cx - 6 * scale,
    cy - 16 * scale + bobY,
    12 * scale,
    4 * scale,
    shadeColor(agent.shirtColor, -40),
  )
  drawPixelRect(
    cx - 6 * scale,
    cy - 14 * scale + bobY,
    2 * scale,
    6 * scale,
    shadeColor(agent.shirtColor, -40),
  )

  // Eyes
  const blinkFrame = state.animTick % 120
  if (blinkFrame < 3) {
    drawPixelRect(cx - 3 * scale, cy - 10 * scale + bobY, 2 * scale, 1 * scale, '#333')
    drawPixelRect(cx + 1 * scale, cy - 10 * scale + bobY, 2 * scale, 1 * scale, '#333')
  } else {
    drawPixelRect(cx - 3 * scale, cy - 11 * scale + bobY, 2 * scale, 2 * scale, '#333')
    drawPixelRect(cx + 1 * scale, cy - 11 * scale + bobY, 2 * scale, 2 * scale, '#333')
    drawPixelRect(cx - 3 * scale, cy - 11 * scale + bobY, 1 * scale, 1 * scale, '#fff')
    drawPixelRect(cx + 1 * scale, cy - 11 * scale + bobY, 1 * scale, 1 * scale, '#fff')
  }

  // Mouth
  if (agent.status === 'coding' && frame % 2 === 0) {
    drawPixelRect(cx - 1 * scale, cy - 7 * scale + bobY, 3 * scale, 1 * scale, '#c07050')
  } else {
    drawPixelRect(cx - 1 * scale, cy - 7 * scale + bobY, 2 * scale, 1 * scale, '#c07050')
  }

  // Arms
  if (agent.status === 'coding') {
    const armOffset = frame % 2 === 0 ? 0 : -1 * scale
    drawPixelRect(
      cx - 7 * scale,
      cy - 2 * scale + bobY + armOffset,
      2 * scale,
      6 * scale,
      agent.skinColor,
    )
    drawPixelRect(
      cx + 5 * scale,
      cy - 2 * scale + bobY - armOffset,
      2 * scale,
      6 * scale,
      agent.skinColor,
    )
  } else if (agent.status === 'thinking') {
    drawPixelRect(cx - 7 * scale, cy - 2 * scale + bobY, 2 * scale, 5 * scale, agent.skinColor)
    drawPixelRect(cx + 5 * scale, cy - 8 * scale + bobY, 2 * scale, 5 * scale, agent.skinColor)
  } else {
    drawPixelRect(cx - 7 * scale, cy - 2 * scale + bobY, 2 * scale, 6 * scale, agent.skinColor)
    drawPixelRect(cx + 5 * scale, cy - 2 * scale + bobY, 2 * scale, 6 * scale, agent.skinColor)
  }

  // Legs
  drawPixelRect(cx - 4 * scale, cy + 6 * scale, 3 * scale, 6 * scale, '#334')
  drawPixelRect(cx + 1 * scale, cy + 6 * scale, 3 * scale, 6 * scale, '#334')

  // Status indicator above head
  const statusColors = {
    coding: '#4488ff',
    thinking: '#aa66ff',
    reading: '#ffdd44',
    idle: '#555588',
    complete: '#44ff88',
    error: '#ff4466',
  }
  const indicatorColor = statusColors[agent.status] || '#555588'
  const pulseAlpha = 0.5 + 0.5 * Math.sin(state.animTick * 0.1)
  ctx.fillStyle = indicatorColor
  ctx.globalAlpha = pulseAlpha
  ctx.beginPath()
  ctx.arc(cx, cy - 20 * scale + bobY, 2 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // Speech bubble
  if (agent.speechBubble && agent.speechTimer > 0) {
    drawSpeechBubble(cx, cy - 28 * scale + bobY, agent.speechBubble)
  }
}

function drawSpeechBubble(x, y, text) {
  const bobY = Math.sin(state.animTick * 0.08) * 2
  ctx.font = '11px "VT323"'
  const metrics = ctx.measureText(text)
  const tw = metrics.width + 12
  const th = 18
  const bx = x - tw / 2
  const by = y - th + bobY

  drawPixelRect(bx, by, tw, th, 'rgba(255,255,255,0.95)')
  drawPixelRect(bx, by, tw, th, null, '#333')

  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.beginPath()
  ctx.moveTo(x - 4, by + th)
  ctx.lineTo(x, by + th + 5)
  ctx.lineTo(x + 4, by + th)
  ctx.fill()
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x - 4, by + th)
  ctx.lineTo(x, by + th + 5)
  ctx.lineTo(x + 4, by + th)
  ctx.stroke()

  ctx.font = '11px "VT323"'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#333'
  ctx.fillText(text, x, by + 13)
  ctx.textAlign = 'left'
}

// ============================================
// OFFICE FURNITURE
// ============================================

function drawDesk(x, y, w, h) {
  drawPixelRect(x, y, w, h, '#5a4a3a')
  drawPixelRect(x + 2, y + 2, w - 4, h - 4, '#6b5b4b')
  drawPixelRect(x + 2, y + 2, w - 4, 3, '#7d6d5d')
  drawPixelRect(x + 4, y + h, 4, 12, '#4a3a2a')
  drawPixelRect(x + w - 8, y + h, 4, 12, '#4a3a2a')
}

function drawMonitor(x, y, isActive, agentStatus) {
  drawPixelRect(x, y, 22, 18, '#2a2a3a')
  drawPixelRect(x + 2, y + 2, 18, 12, '#0a0a2a')

  if (isActive) {
    if (agentStatus === 'coding') {
      const colors = ['#66ff88', '#88aaff', '#ffaa44', '#ff6688']
      for (let i = 0; i < 4; i++) {
        const lineW = 4 + Math.sin(state.animTick * 0.1 + i) * 3 + 6
        drawPixelRect(x + 4, y + 4 + i * 3, lineW, 2, colors[i % colors.length])
      }
    } else if (agentStatus === 'thinking') {
      for (let i = 0; i < 3; i++) {
        const dotAlpha = Math.sin(state.animTick * 0.15 + i * 0.8) > 0 ? 1 : 0.3
        ctx.globalAlpha = dotAlpha
        drawPixelRect(x + 6 + i * 4, y + 8, 2, 2, '#aa66ff')
      }
      ctx.globalAlpha = 1
    } else if (agentStatus === 'reading') {
      for (let i = 0; i < 4; i++) {
        drawPixelRect(x + 4, y + 4 + i * 3, 12, 2, '#ffdd44')
      }
    } else if (agentStatus === 'complete') {
      drawPixelRect(x + 7, y + 8, 2, 4, '#44ff88')
      drawPixelRect(x + 9, y + 6, 2, 6, '#44ff88')
      drawPixelRect(x + 11, y + 4, 2, 4, '#44ff88')
    } else {
      const sx = x + 4 + Math.sin(state.animTick * 0.03) * 5 + 5
      const sy = y + 4 + Math.cos(state.animTick * 0.04) * 3 + 3
      drawPixelRect(sx, sy, 4, 4, '#00ddff')
    }
  } else {
    drawPixelRect(x + 2, y + 2, 18, 12, '#050510')
  }

  drawPixelRect(x + 8, y + 18, 6, 4, '#3a3a4a')
  drawPixelRect(x + 5, y + 22, 12, 2, '#3a3a4a')

  if (isActive) {
    const glowColors = {
      coding: 'rgba(68, 136, 255, 0.08)',
      thinking: 'rgba(170, 102, 255, 0.08)',
      reading: 'rgba(255, 221, 68, 0.08)',
      complete: 'rgba(68, 255, 136, 0.08)',
    }
    ctx.fillStyle = glowColors[agentStatus] || 'rgba(0, 221, 255, 0.08)'
    ctx.beginPath()
    ctx.ellipse(x + 11, y + 14, 18, 12, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawChair(x, y) {
  drawPixelRect(x, y, 18, 6, '#3a3a5a')
  drawPixelRect(x + 2, y + 2, 14, 2, '#4a4a6a')
  drawPixelRect(x + 2, y - 12, 14, 12, '#3a3a5a')
  drawPixelRect(x + 4, y - 10, 10, 8, '#4a4a6a')
  drawPixelRect(x + 4, y + 6, 2, 8, '#2a2a4a')
  drawPixelRect(x + 12, y + 6, 2, 8, '#2a2a4a')
  drawPixelRect(x + 2, y + 14, 4, 2, '#222')
  drawPixelRect(x + 12, y + 14, 4, 2, '#222')
}

function drawPlant(x, y) {
  drawPixelRect(x, y + 8, 14, 10, '#8b5e3c')
  drawPixelRect(x + 2, y + 10, 10, 6, '#a87048')
  drawPixelRect(x + 2, y + 8, 10, 3, '#4a3222')
  const sway = Math.sin(state.animTick * 0.03) * 2
  drawPixelRect(x + 4 + sway, y - 4, 6, 10, '#22aa44')
  drawPixelRect(x + 0 + sway, y - 2, 5, 6, '#33bb55')
  drawPixelRect(x + 9 + sway, y + 0, 5, 6, '#33bb55')
  drawPixelRect(x + 2 + sway, y - 8, 4, 6, '#44cc66')
  drawPixelRect(x + 7 + sway, y - 6, 4, 6, '#44cc66')
}

function drawWaterCooler(x, y) {
  drawPixelRect(x, y + 16, 16, 20, '#aabbcc')
  drawPixelRect(x + 2, y + 18, 12, 4, '#8899aa')
  drawPixelRect(x + 3, y - 4, 10, 20, '#aaddff')
  drawPixelRect(x + 5, y - 4, 6, 20, '#88ccff')
  drawPixelRect(x + 4, y - 6, 8, 3, '#99aacc')
  const waterLevel = y + 4 + Math.sin(state.animTick * 0.02)
  drawPixelRect(x + 4, waterLevel, 8, 12 - Math.sin(state.animTick * 0.02), '#4488cc')
  drawPixelRect(x + 14, y + 22, 4, 3, '#888')
  drawPixelRect(x + 14, y + 28, 6, 6, '#fff')
  drawPixelRect(x + 15, y + 29, 4, 4, '#eee')
}

function drawWhiteboard(x, y, w, h) {
  drawPixelRect(x, y, w, h, '#aaa')
  drawPixelRect(x + 3, y + 3, w - 6, h - 6, '#f0f0f0')

  const texts = ['Sprint 5', '[ ] Auth', '[✓] API', '[~] Tests']
  for (let i = 0; i < texts.length; i++) {
    ctx.font = '8px "Press Start 2P"'
    ctx.fillStyle = i === 0 ? '#333' : i === 2 ? '#22aa44' : i === 3 ? '#ff8844' : '#666'
    ctx.fillText(texts[i], x + 8, y + 16 + i * 12)
  }
}

function drawBookshelf(x, y) {
  drawPixelRect(x, y, 30, 50, '#5a3a2a')
  drawPixelRect(x + 2, y + 2, 26, 46, '#6b4b3b')

  const bookWidths = [3, 4, 3, 4, 3, 3, 4, 3, 4, 4, 3, 4, 3, 3, 4, 3, 4, 3, 3, 4]
  for (let s = 0; s < 3; s++) {
    const sy = y + 4 + s * 16
    drawPixelRect(x + 2, sy + 12, 26, 3, '#5a3a2a')
    const bookColors = ['#ff4466', '#4488ff', '#44ff88', '#ffdd44', '#aa66ff', '#ff8844']
    for (let b = 0; b < 4 + s; b++) {
      const bw = bookWidths[(b + s * 5) % bookWidths.length]
      drawPixelRect(x + 4 + b * 5, sy + 2, bw, 10, bookColors[(b + s * 3) % bookColors.length])
    }
  }
}

function drawWindow(x, y, w, h) {
  drawPixelRect(x, y, w, h, '#6a6a8a')
  drawPixelRect(x + 3, y + 3, w - 6, h - 6, '#0a0a2a')

  const gradient = ctx.createLinearGradient(x + 3, y + 3, x + 3, y + h - 6)
  gradient.addColorStop(0, '#05051a')
  gradient.addColorStop(0.6, '#0a0a30')
  gradient.addColorStop(1, '#151540')
  ctx.fillStyle = gradient
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6)

  for (const star of state.stars) {
    const sx = x + 3 + star.x * (w - 6)
    const sy = y + 3 + star.y * (h - 10)
    const alpha = 0.3 + 0.7 * Math.abs(Math.sin(state.animTick * star.speed + star.twinkle))
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#fff'
    ctx.fillRect(sx, sy, star.size, star.size)
  }
  ctx.globalAlpha = 1

  const buildings = [
    { x: 0, w: 10, h: 18 },
    { x: 12, w: 8, h: 25 },
    { x: 22, w: 12, h: 15 },
    { x: 36, w: 7, h: 22 },
    { x: 45, w: 14, h: 20 },
    { x: 61, w: 9, h: 28 },
    { x: 72, w: 11, h: 16 },
  ]

  const windowSeed = Math.floor(state.animTick / 300)
  for (let bi = 0; bi < buildings.length; bi++) {
    const b = buildings[bi]
    const bx = x + 3 + b.x * ((w - 6) / 85)
    const by = y + h - 6 - b.h
    const bw = b.w * ((w - 6) / 85)
    drawPixelRect(bx, by, bw, b.h, '#151530')
    for (let wy = 0; wy < Math.floor(b.h / 5); wy++) {
      for (let wx = 0; wx < Math.floor(bw / 4); wx++) {
        const hash = (bi * 17 + wy * 7 + wx * 13 + windowSeed * 3) % 10
        const lit = hash > 3
        if (lit) {
          drawPixelRect(bx + 2 + wx * 4, by + 2 + wy * 5, 2, 3, '#ffdd44')
        }
      }
    }
  }

  ctx.fillStyle = '#ffffcc'
  ctx.beginPath()
  ctx.arc(x + w - 18, y + 15, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#eeee99'
  ctx.beginPath()
  ctx.arc(x + w - 16, y + 14, 5, 0, Math.PI * 2)
  ctx.fill()

  drawPixelRect(x + w / 2 - 1, y + 3, 2, h - 6, '#6a6a8a')
  drawPixelRect(x + 3, y + h / 2, w - 6, 2, '#6a6a8a')
}

function drawCarpet(x, y, w, h, color) {
  drawPixelRect(x, y, w, h, color)
  drawPixelRect(x + 3, y + 3, w - 6, h - 6, shadeColor(color, 10))
  for (let i = 0; i < w; i += 6) {
    drawPixelRect(x + i, y, 3, 2, shadeColor(color, -15))
    drawPixelRect(x + i, y + h - 2, 3, 2, shadeColor(color, -15))
  }
}

function drawElevator(x, y) {
  drawPixelRect(x, y, 36, 50, '#4a4a5a')
  drawPixelRect(x + 2, y + 2, 32, 46, '#3a3a4a')

  const doorOpen = Math.sin(state.animTick * 0.01) > 0.7
  if (doorOpen) {
    drawPixelRect(x + 4, y + 4, 8, 42, '#2a2a3a')
    drawPixelRect(x + 24, y + 4, 8, 42, '#2a2a3a')
    drawPixelRect(x + 12, y + 4, 12, 42, '#1a1a2a')
  } else {
    drawPixelRect(x + 4, y + 4, 14, 42, '#5a5a6a')
    drawPixelRect(x + 18, y + 4, 14, 42, '#5a5a6a')
    drawPixelRect(x + 17, y + 4, 2, 42, '#4a4a5a')
  }

  const floor = (Math.floor(state.animTick / 60) % 5) + 1
  drawPixelRect(x + 12, y - 8, 12, 8, '#222')
  ctx.font = '7px "Press Start 2P"'
  ctx.fillStyle = '#ff4444'
  ctx.textAlign = 'center'
  ctx.fillText(`${floor}F`, x + 18, y - 2)
  ctx.textAlign = 'left'

  const goingUp = Math.sin(state.animTick * 0.01) > 0
  drawPixelRect(x + 28, y - 8, 6, 8, '#222')
  ctx.fillStyle = goingUp ? '#44ff88' : '#333'
  ctx.fillText('▲', x + 28, y - 3)
}

function drawFloorTiles(x, y, cols, rows, tileSize) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tx = x + c * tileSize
      const ty = y + r * tileSize
      const isAlt = (r + c) % 2 === 0
      drawPixelRect(tx, ty, tileSize, tileSize, isAlt ? '#1a1a30' : '#161628')
      ctx.strokeStyle = 'rgba(255,255,255,0.02)'
      ctx.lineWidth = 1
      ctx.strokeRect(tx, ty, tileSize, tileSize)
    }
  }
}

// ============================================
// PARTICLES
// ============================================

function spawnParticle(x, y, color) {
  state.particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 2,
    vy: -Math.random() * 1.5 - 0.5,
    life: 60,
    maxLife: 60,
    color,
    size: Math.random() * 3 + 1,
  })
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i]
    p.x += p.vx
    p.y += p.vy
    p.life--
    if (p.life <= 0) {
      state.particles.splice(i, 1)
    }
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.fillRect(p.x, p.y, p.size, p.size)
  }
  ctx.globalAlpha = 1
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    spawnParticle(x + Math.random() * 20 - 10, y + Math.random() * 10 - 5, color)
  }
}

// ============================================
// OFFICE LAYOUT
// ============================================

function layoutOffice() {
  const cw = canvas.width
  const ch = canvas.height
  const centerX = cw / 2
  const centerY = ch / 2

  BOSS.x = centerX
  BOSS.y = ch - 80

  const activeAgents = AGENTS.filter((a) => a.isActive !== false)
  if (activeAgents.length === 0) return

  const count = activeAgents.length
  const cols = Math.min(count, Math.max(2, Math.ceil(Math.sqrt(count))))
  const rows = Math.ceil(count / cols)

  const deskSpacingX = Math.min(180, (cw - 100) / cols)
  const deskSpacingY = Math.min(120, (ch - 200) / (rows + 1))

  const gridWidth = (cols - 1) * deskSpacingX
  const gridHeight = (rows - 1) * deskSpacingY
  const desksStartX = centerX - gridWidth / 2
  const desksStartY = centerY - gridHeight / 2 - 30

  for (let i = 0; i < activeAgents.length; i++) {
    const agent = activeAgents[i]
    const col = i % cols
    const row = Math.floor(i / cols)
    agent.deskX = desksStartX + col * deskSpacingX
    agent.deskY = desksStartY + row * deskSpacingY

    if (agent.x === 0 && agent.y === 0) {
      agent.x = agent.deskX
      agent.y = agent.deskY + 20
    }
  }
}

function drawOffice() {
  const cw = canvas.width
  const ch = canvas.height

  ctx.fillStyle = '#0d0d20'
  ctx.fillRect(0, 0, cw, ch)

  drawFloorTiles(0, 0, Math.ceil(cw / 24), Math.ceil(ch / 24), 24)

  // Background elements
  drawWindow(cw / 2 - 50, 10, 100, 60)
  drawElevator(20, 15)
  drawBookshelf(cw - 60, 15)
  drawWhiteboard(cw / 2 - 170, 12, 80, 55)

  // Agent workstations
  for (const agent of AGENTS) {
    if (agent.isActive === false) continue
    drawDesk(agent.deskX - 30, agent.deskY - 12, 60, 20)
    drawMonitor(agent.deskX - 11, agent.deskY - 32, true, agent.status)
    drawChair(agent.deskX - 9, agent.deskY + 10)
    drawCharacter(agent.deskX, agent.deskY + 4, agent, 1.2)

    const cleanName = agent.name.replace(/^[👑💤]\s*/, '')
    const canvasName = cleanName.length > 24 ? cleanName.substring(0, 22) + '..' : cleanName
    drawPixelText(canvasName, agent.deskX, agent.deskY + 35, agent.color, 6, 'center')
  }

  // Decorations
  drawPlant(cw / 2 - 90, ch / 2 - 40)
  drawPlant(cw / 2 + 85, ch / 2 - 40)
  drawWaterCooler(cw - 50, ch / 2 + 20)

  // Boss area
  drawCarpet(cw / 2 - 70, ch - 120, 140, 60, '#6a2222')
  drawDesk(cw / 2 - 45, ch - 100, 90, 24)
  drawMonitor(cw / 2 - 12, ch - 124, true, 'thinking')
  drawChair(cw / 2 - 9, ch - 68)
  drawCharacter(BOSS.x, ch - 64, BOSS, 1.4)

  drawPixelRect(cw / 2 - 40, ch - 38, 80, 14, 'rgba(0,0,0,0.6)')
  drawPixelText('👑 Boss Claude', cw / 2, ch - 28, '#ffdd44', 7, 'center')

  // Connection lines (agent -> boss)
  for (let ai = 0; ai < AGENTS.length; ai++) {
    const agent = AGENTS[ai]
    const flowPhase = (state.animTick + ai * 45) % 180
    if (flowPhase < 30) {
      const alpha = 0.05 + 0.12 * Math.sin((flowPhase / 30) * Math.PI)
      ctx.strokeStyle = `rgba(${hexToRgb(agent.color)}, ${alpha})`
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(agent.deskX, agent.deskY + 35)
      ctx.lineTo(BOSS.x, ch - 90)
      ctx.stroke()
      ctx.setLineDash([])

      const t = flowPhase / 30
      const dotX = agent.deskX + (BOSS.x - agent.deskX) * t
      const dotY = agent.deskY + 35 + (ch - 90 - (agent.deskY + 35)) * t
      ctx.fillStyle = agent.color
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  drawParticles()

  // Room labels
  drawPixelRect(cw / 2 - 55, ch - 148, 110, 14, 'rgba(30,0,0,0.7)')
  drawPixelText('BOSS ROOM', cw / 2, ch - 138, '#ff8844', 7, 'center')

  drawPixelRect(cw / 2 - 55, 78, 110, 14, 'rgba(0,0,30,0.7)')
  drawPixelText('WORK FLOOR', cw / 2, 88, '#4488ff', 7, 'center')
}
