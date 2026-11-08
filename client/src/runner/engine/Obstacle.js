// engine/Obstacle.js
// Obstáculos de suelo: barril, piedra y rama.
// R09 sustituirá el dibujo procedural por sprites; la física y la API no cambian.

const TIPOS = [
  { w: 28, h: 36 }, // barril
  { w: 38, h: 26 }, // piedra
  { w: 48, h: 20 }, // rama
]

export class Obstacle {
  constructor() {
    this.x = 0
    this.y = 0
    this.groundY = 0
    this.scale = 1
    this.kind = 0
    this.w = TIPOS[0].w
    this.h = TIPOS[0].h
  }

  spawn({ x, groundY, scale, variant = 0 }) {
    this.scale = Math.min(Math.max(scale, 0.55), 1.2)
    this.kind = ((variant % TIPOS.length) + TIPOS.length) % TIPOS.length
    this.x = x
    this.groundY = groundY
    this.y = groundY
    this.w = Math.round(TIPOS[this.kind].w * this.scale)
    this.h = Math.round(TIPOS[this.kind].h * this.scale)
  }

  update(dt, speed) {
    this.x -= speed * dt
  }

  fueraDePantalla() {
    return this.x + this.w < -20
  }

  /** Caja de colisión para R05 (AABB). */
  getBounds() {
    const margenX = this.w * 0.08
    return {
      x: this.x - this.w / 2 + margenX,
      y: this.y - this.h,
      w: this.w - margenX * 2,
      h: this.h,
    }
  }

  render(ctx) {
    const s = this.scale

    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.ellipse(this.x, this.groundY + 2, (this.w / 2) * 1.05, 4 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.scale(s, s)

    if (this.kind === 0) this.dibujarBarril(ctx)
    else if (this.kind === 1) this.dibujarPiedra(ctx)
    else this.dibujarRama(ctx)

    ctx.restore()
  }

  dibujarBarril(ctx) {
    const w = TIPOS[0].w
    const h = TIPOS[0].h

    ctx.fillStyle = '#8a5a2b'
    this.rectRedondeado(ctx, -w / 2, -h, w, h, 6)
    ctx.fill()

    ctx.strokeStyle = '#6d431d'
    ctx.lineWidth = 1
    for (const x of [-9, 0, 9]) {
      ctx.beginPath()
      ctx.moveTo(x, -h + 4)
      ctx.lineTo(x, -4)
      ctx.stroke()
    }

    ctx.fillStyle = '#d9a441'
    ctx.fillRect(-w / 2 + 1, -h + 7, w - 2, 3)
    ctx.fillRect(-w / 2 + 1, -12, w - 2, 3)

    ctx.fillStyle = '#a06a33'
    ctx.beginPath()
    ctx.ellipse(0, -h + 3, w / 2 - 2, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#6d431d'
    ctx.stroke()

    ctx.strokeStyle = '#4e2f12'
    ctx.lineWidth = 1.5
    this.rectRedondeado(ctx, -w / 2, -h, w, h, 6)
    ctx.stroke()
  }

  dibujarPiedra(ctx) {
    ctx.beginPath()
    ctx.moveTo(-19, 0)
    ctx.lineTo(-16, -12)
    ctx.lineTo(-7, -22)
    ctx.lineTo(5, -24)
    ctx.lineTo(16, -14)
    ctx.lineTo(19, 0)
    ctx.closePath()
    ctx.fillStyle = '#5c6b85'
    ctx.fill()
    ctx.strokeStyle = '#3e4a5f'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(-7, -22)
    ctx.lineTo(5, -24)
    ctx.lineTo(1, -14)
    ctx.lineTo(-10, -12)
    ctx.closePath()
    ctx.fillStyle = '#7b8aa3'
    ctx.fill()
  }

  dibujarRama(ctx) {
    ctx.strokeStyle = '#6b4a2a'
    ctx.lineCap = 'round'

    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(-23, -6)
    ctx.lineTo(23, -6)
    ctx.stroke()

    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-9, -7)
    ctx.lineTo(-15, -18)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(7, -7)
    ctx.lineTo(13, -19)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, -6)
    ctx.lineTo(2, -15)
    ctx.stroke()

    ctx.strokeStyle = '#8a6438'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-21, -8)
    ctx.lineTo(21, -8)
    ctx.stroke()
  }

  rectRedondeado(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
