// engine/Sprites.js
// Todo el arte son rectángulos: no hay imágenes que cargar. Origen = pies, centrados.

const R = (ctx, c, x, y, w, h) => {
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}

export function sombra(ctx, x, y, w = 8) {
  R(ctx, 'rgba(0,0,0,0.4)', x - w / 2, y - 1, w, 2)
}

export function casa(ctx, c, t) {
  const { x, y, w, h } = c
  const alto = h - 8
  R(ctx, c.tejado, x, y, w, alto)
  R(ctx, 'rgba(255,255,255,0.08)', x, y, w, 2)
  for (let i = 4; i < alto; i += 4) R(ctx, 'rgba(0,0,0,0.22)', x, y + i, w, 1)
  R(ctx, 'rgba(0,0,0,0.3)', x + w - 3, y, 3, alto)
  R(ctx, '#bda782', x, y + alto, w, 8)
  R(ctx, 'rgba(0,0,0,0.25)', x, y + alto, w, 1)
  R(ctx, '#33200f', x + w / 2 - 3, y + alto, 6, 8)
  const brillo = 0.85 + 0.15 * Math.sin(t * 7 + x)
  ctx.globalAlpha = brillo
  R(ctx, '#ffcf70', x + 6, y + alto + 2, 5, 4)
  R(ctx, '#ffcf70', x + w - 11, y + alto + 2, 5, 4)
  ctx.globalAlpha = 1
}

export function iglesia(ctx, c, t) {
  const { x, y, w, h } = c
  const cx = x + w / 2
  R(ctx, '#6b3b3b', x + 8, y + 18, w - 16, h - 28)
  for (let i = 4; i < h - 28; i += 4) R(ctx, 'rgba(0,0,0,0.22)', x + 8, y + 18 + i, w - 16, 1)
  R(ctx, '#b8ae98', x + 8, y + h - 10, w - 16, 10)
  R(ctx, '#2a1a10', cx - 4, y + h - 10, 8, 10)
  R(ctx, '#b8ae98', cx - 11, y + 4, 22, 22)
  R(ctx, 'rgba(0,0,0,0.2)', cx + 6, y + 4, 5, 22)
  R(ctx, '#0e0e18', cx - 3, y + 9, 6, 10)
  R(ctx, '#7a4a3a', cx - 12, y + 2, 24, 3)
  R(ctx, '#e8e0c0', cx - 1, y - 7, 2, 10)
  R(ctx, '#e8e0c0', cx - 4, y - 4, 8, 2)
  ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 6)
  R(ctx, '#ffcf70', x + 16, y + h - 7, 4, 4)
  R(ctx, '#ffcf70', x + w - 20, y + h - 7, 4, 4)
  ctx.globalAlpha = 1
}

export function arbol(ctx, a) {
  const { x, y } = a
  sombra(ctx, x, y, 12)
  R(ctx, '#2a1d14', x - 1, y - 5, 3, 5)
  R(ctx, '#10301f', x - 6, y - 14, 12, 10)
  R(ctx, '#10301f', x - 4, y - 18, 8, 5)
  R(ctx, '#17402b', x - 4, y - 12, 4, 3)
  R(ctx, '#0b2216', x + 1, y - 8, 5, 3)
}

export function pozo(ctx, p) {
  const { x, y } = p
  R(ctx, '#6a665c', x - 7, y - 7, 14, 7)
  R(ctx, '#15151c', x - 5, y - 7, 10, 3)
  R(ctx, '#3a2a1a', x - 7, y - 15, 2, 8)
  R(ctx, '#3a2a1a', x + 5, y - 15, 2, 8)
  R(ctx, '#3a2a1a', x - 7, y - 16, 14, 2)
}

export function tumba(ctx, p) {
  sombra(ctx, p.x, p.y, 6)
  R(ctx, '#8a867a', p.x - 1, p.y - 8, 2, 8)
  R(ctx, '#8a867a', p.x - 3, p.y - 6, 6, 2)
}

export function jugador(ctx, p, t, alba) {
  const { x, y } = p
  sombra(ctx, x, y, 10)
  const paso = p.moviendo ? Math.floor(t * 9) % 2 : 0
  ctx.save()
  if (p.inv > 0 && Math.floor(t * 16) % 2) ctx.globalAlpha = 0.45
  R(ctx, '#0d0d16', x - 4, y - 9, 8, 9)
  R(ctx, '#1c1c2c', x - 1, y - 8, 1, 8)
  R(ctx, '#14141f', x - 5, y - 10, 10, 2)
  R(ctx, '#0d0d16', x - 5, y - 2 + paso, 10, 2)
  R(ctx, '#14141f', x - 6, y - 9, 2, 5)
  R(ctx, '#14141f', x + 4, y - 9, 2, 5)
  // cuello cercenado: el rojo es lo único vivo en él
  R(ctx, '#e8e8f0', x - 2, y - 11, 4, 1)
  R(ctx, '#8a1424', x - 1, y - 13, 2, 2)
  // donde debería estar la cabeza, un resplandor violeta
  const f = Math.sin(t * 9)
  ctx.globalAlpha = (p.inv > 0 ? 0.3 : 0.75) + 0.2 * f
  R(ctx, '#9a7bff', x - 1, y - 16 - (f > 0 ? 1 : 0), 2, 2)
  R(ctx, '#c9b8ff', x, y - 18 - (f > 0 ? 0 : 1), 1, 1)
  ctx.restore()
  if (alba > 0.5) {
    ctx.globalAlpha = 0.5 * alba
    R(ctx, '#ffd9a0', x - 4, y - 10, 8, 1)
    ctx.globalAlpha = 1
  }
}

const CAMISAS = ['#8a5a2b', '#2f6b5b', '#a04a3a', '#4a5a8a']

export function aldeano(ctx, a, t) {
  const { x, y } = a
  sombra(ctx, x, y, 7)
  const paso = Math.floor(t * (a.estado === 'huir' ? 14 : 7) + a.fase) % 2
  R(ctx, '#2a2a36', x - 2, y - 3, 2, 3 - paso)
  R(ctx, '#2a2a36', x, y - 3, 2, 2 + paso)
  R(ctx, CAMISAS[a.color % 4], x - 3, y - 8, 6, 5)
  R(ctx, CAMISAS[a.color % 4], x - 4, y - 8, 1, 4)
  R(ctx, CAMISAS[a.color % 4], x + 3, y - 8, 1, 4)
  R(ctx, '#d6a06a', x - 2, y - 12, 4, 4)
  if (a.sombrero) {
    R(ctx, '#c9a24a', x - 4, y - 13, 8, 2)
    R(ctx, '#c9a24a', x - 2, y - 15, 4, 2)
  } else R(ctx, '#201510', x - 2, y - 12, 4, 1)
  if (a.vela) {
    R(ctx, '#f4e8c0', x + 4, y - 7, 1, 3)
    R(ctx, Math.floor(t * 12 + a.fase) % 2 ? '#ffd070' : '#ffb040', x + 4, y - 9, 1, 2)
  }
  if (a.estado === 'huir') {
    ctx.fillStyle = '#ff5a5a'
    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('!', Math.round(x), Math.round(y - 17))
  }
}

export function cuerpo(ctx, c) {
  R(ctx, 'rgba(0,0,0,0.3)', c.x - 5, c.y, 10, 2)
  R(ctx, CAMISAS[c.color % 4], c.x - 4, c.y - 3, 5, 3)
  R(ctx, '#2a2a36', c.x + 1, c.y - 3, 3, 2)
  R(ctx, '#d6a06a', c.x - 6, c.y - 3, 2, 3)
}

export function perro(ctx, e, t) {
  const { x, y } = e
  const d = e.dir >= 0 ? 1 : -1
  sombra(ctx, x, y, 10)
  const paso = Math.floor(t * 14) % 2
  R(ctx, '#3a3026', x - 5, y - 6, 10, 4)
  R(ctx, '#3a3026', x + (d > 0 ? 3 : -7), y - 8, 4, 4)
  R(ctx, '#241c14', x + (d > 0 ? 5 : -7), y - 9, 2, 2)
  R(ctx, '#ffe0a0', x + (d > 0 ? 5 : -6), y - 7, 1, 1)
  R(ctx, '#3a3026', x - 4, y - 2, 2, 2 + paso)
  R(ctx, '#3a3026', x + 2, y - 2, 2, 3 - paso)
  R(ctx, '#3a3026', x + (d > 0 ? -7 : 5), y - 8, 2, 3)
}

export function monaguillo(ctx, e, t) {
  const { x, y } = e
  sombra(ctx, x, y, 8)
  R(ctx, '#a8322c', x - 3, y - 9, 6, 8)
  R(ctx, '#e8e4d8', x - 3, y - 6, 6, 5)
  R(ctx, '#d6a06a', x - 2, y - 13, 4, 4)
  R(ctx, '#201510', x - 2, y - 13, 4, 1)
  const sacude = e.toca > 0 ? Math.sin(t * 40) * 2 : 0
  R(ctx, '#e0b43a', x + 4 + sacude, y - 9, 4, 4)
  R(ctx, '#7a5a1a', x + 5 + sacude, y - 5, 2, 1)
}

export function beata(ctx, e) {
  const { x, y } = e
  sombra(ctx, x, y, 8)
  R(ctx, '#2b2431', x - 4, y - 9, 8, 9)
  R(ctx, '#d6a06a', x - 2, y - 13, 4, 4)
  R(ctx, '#d8d8e0', x - 3, y - 14, 6, 2)
  R(ctx, '#d9d9ff', x + 3, y - 6, 1, 4)
  if (e.carga > 0) {
    R(ctx, '#bfefff', x - 6, y - 12, 2, 2)
    R(ctx, '#bfefff', x + 4, y - 12, 2, 2)
  }
}

export function valiente(ctx, e) {
  const { x, y } = e
  sombra(ctx, x, y, 12)
  R(ctx, '#14141a', x - 5, y - 12, 10, 12)
  R(ctx, '#7a3fb0', x - 1, y - 12, 2, 10)
  R(ctx, '#d6a06a', x - 3, y - 17, 6, 5)
  R(ctx, '#d0d0d8', x - 3, y - 17, 6, 1)
  R(ctx, '#f0e8c8', x + 6, y - 15, 2, 10)
  R(ctx, '#f0e8c8', x + 4, y - 13, 6, 2)
  ctx.fillStyle = '#ff8080'
  for (let i = 0; i < e.hp; i++) ctx.fillRect(Math.round(x - 4 + i * 3), Math.round(y - 21), 2, 2)
}

export function aguaBendita(ctx, p, t) {
  R(ctx, '#bfefff', p.x - 1, p.y - 1, 3, 3)
  R(ctx, '#ffffff', p.x, p.y - 2 - (Math.floor(t * 20) % 2), 1, 1)
}

// El Rosario del Padre: una cruz pequeña con cuentas que brillan en la oscuridad.
export function rosario(ctx, o, t) {
  const { x, y } = o
  const pulso = 0.55 + 0.35 * Math.sin(t * 5 + (o.fase ?? 0))
  sombra(ctx, x, y, 6)
  ctx.globalAlpha = pulso * 0.45
  ctx.fillStyle = '#ffd98a'
  ctx.beginPath()
  ctx.arc(x, y - 6, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  // cruz
  R(ctx, '#e8c46a', x - 1, y - 13, 2, 8)
  R(ctx, '#f4e0a0', x - 4, y - 10, 8, 2)
  // cuentas
  R(ctx, '#f4e0a0', x - 5, y - 5, 2, 2)
  R(ctx, '#f4e0a0', x - 2, y - 3, 2, 2)
  R(ctx, '#f4e0a0', x + 1, y - 3, 2, 2)
  R(ctx, '#f4e0a0', x + 4, y - 5, 2, 2)
  // destello
  if (Math.floor(t * 6 + (o.fase ?? 0)) % 3 === 0) R(ctx, '#ffffff', x, y - 15, 1, 1)
}
