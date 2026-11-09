// engine/Obstacle.js
// Obstáculos: barril, piedra y rama (se saltan) y liana colgante (hay que agacharse).
// R09 sustituirá el dibujo procedural por sprites; la física y la API no cambian.

const TIPOS = [
  { w: 28, h: 36 }, // barril
  { w: 38, h: 26 }, // piedra
  { w: 48, h: 20 }, // rama
  { w: 56, h: 0 }, // liana: cuelga desde arriba hasta 32 px del suelo (la altura sale del canvas)
]

const LIANA_ELEVACION = 32 // espacio libre bajo la liana, a escala 1

export class Obstacle {
  constructor() {
    this.x = 0
    this.y = 0
    this.groundY = 0
    this.scale = 1
    this.kind = 0
    this.elevacion = 0
    this.w = TIPOS[0].w
    this.h = TIPOS[0].h
  }

  spawn({ x, groundY, scale, variant = 0 }) {
    this.scale = Math.min(Math.max(scale, 0.55), 1.2)
    this.kind = ((variant % TIPOS.length) + TIPOS.length) % TIPOS.length
    this.x = x
    this.groundY = groundY
    this.elevacion = this.kind === 3 ? Math.round(LIANA_ELEVACION * this.scale) : 0
    this.y = groundY - this.elevacion
    this.w = Math.round(TIPOS[this.kind].w * this.scale)
    // La liana ocupa desde el borde superior del canvas hasta su punta: no se puede saltar por encima.
    this.h = this.kind === 3 ? Math.round(this.y) : Math.round(TIPOS[this.kind].h * this.scale)
  }

  update(dt, speed) {
    this.x -= speed * dt
  }

  fueraDePantalla() {
    return this.x + this.w < -20
  }

  /** Caja de colisión para R05 (AABB). */
  getBounds() {
    if (this.kind === 3) {
      const ancho = 34 * this.scale
      return { x: this.x - ancho / 2, y: this.y - this.h, w: ancho, h: this.h }
    }
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

    if (this.kind !== 3) {
      ctx.save()
      ctx.globalAlpha = 0.22
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.ellipse(this.x, this.groundY + 2, (this.w / 2) * 1.05, 4 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.scale(s, s)

    if (this.kind === 0) this.dibujarBarril(ctx)
    else if (this.kind === 1) this.dibujarPiedra(ctx)
    else if (this.kind === 2) this.dibujarRama(ctx)
    else this.dibujarLiana(ctx)

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

  dibujarLiana(ctx) {
    const largo = this.h / this.scale

    // Bejuco que cuelga desde arriba.
    ctx.strokeStyle = '#2a4f35'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, -largo)
    ctx.quadraticCurveTo(7, -largo / 2, 0, -26)
    ctx.stroke()

    // Racimo de hojas en la punta.
    ctx.fillStyle = '#245a38'
    ctx.beginPath()
    ctx.ellipse(0, -20, 20, 14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2f7a49'
    ctx.beginPath()
    ctx.ellipse(-6, -24, 11, 8, -0.4, 0, Math.PI * 2)
    ctx.fill()

    // Hojas colgantes.
    ctx.fillStyle = '#1d4a2e'
    for (const [x, largoHoja] of [[-14, 14], [-4, 20], [7, 16], [15, 11]]) {
      ctx.beginPath()
      ctx.moveTo(x - 4, -14)
      ctx.quadraticCurveTo(x, -14 + largoHoja * 1.1, x + 4, -14)
      ctx.closePath()
      ctx.fill()
    }
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
