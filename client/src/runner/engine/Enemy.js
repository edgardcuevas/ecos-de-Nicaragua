// engine/Enemy.js
// La Cegua: enemigo espectral que entra desde la derecha y avanza hacia el jugador.
// R09 sustituirá el dibujo procedural por sprites; la física y la API no cambian.

const UNIT_W = 46
const UNIT_H = 60

const VARIANTES = [
  { vestido: '#d9d3ef', vestidoSombra: '#a99bd6', aura: '#8b6bd9', ojo: '#ff4d6d' },
  { vestido: '#cfe4df', vestidoSombra: '#8fbcb3', aura: '#3fa7a0', ojo: '#f1c66d' },
]

export class Enemy {
  constructor() {
    this.x = 0
    this.y = 0
    this.groundY = 0
    this.scale = 1
    this.w = UNIT_W
    this.h = UNIT_H
    this.speedFactor = 1
    this.variant = 0
    this.time = 0
    this.phase = 0
    this.bob = 0
  }

  spawn({ x, groundY, scale, variant = 0 }) {
    this.scale = Math.min(Math.max(scale, 0.55), 1.2)
    this.x = x
    this.groundY = groundY
    this.y = groundY
    this.w = Math.round(UNIT_W * this.scale)
    this.h = Math.round(UNIT_H * this.scale)
    this.variant = VARIANTES[variant % VARIANTES.length] ? variant % VARIANTES.length : 0
    this.speedFactor = 0.9 + Math.random() * 0.25
    this.time = 0
    this.phase = Math.random() * Math.PI * 2
    this.bob = 0
  }

  update(dt, speed) {
    this.time += dt
    this.x -= speed * this.speedFactor * dt
    this.bob = -2 - Math.abs(Math.sin(this.time * 3 + this.phase)) * 4
  }

  fueraDePantalla() {
    return this.x + this.w < -20
  }

  /** Caja de colisión para R05 (AABB). */
  getBounds() {
    return {
      x: this.x - this.w / 2,
      y: this.y - this.h,
      w: this.w,
      h: this.h,
    }
  }

  render(ctx) {
    const s = this.scale
    const col = VARIANTES[this.variant]
    const pulso = 0.1 + 0.05 * Math.sin(this.time * 2.5 + this.phase)

    // Sombra en el suelo.
    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.ellipse(this.x, this.groundY + 2, 18 * s, 4 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(this.x, this.y + this.bob)
    ctx.scale(s, s)

    // Aura espectral.
    ctx.globalAlpha = pulso
    ctx.fillStyle = col.aura
    ctx.beginPath()
    ctx.ellipse(0, -34, 26, 34, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // Vestido desgarrado.
    const onda = Math.sin(this.time * 4 + this.phase)
    ctx.beginPath()
    ctx.moveTo(-14, -44)
    ctx.quadraticCurveTo(-20, -36, -19, -24)
    ctx.quadraticCurveTo(-20 + onda * 3, -14, -13, -5)
    ctx.lineTo(-9, -9)
    ctx.lineTo(-4.5, -4)
    ctx.lineTo(0, -9)
    ctx.lineTo(4.5, -4)
    ctx.lineTo(9, -9)
    ctx.lineTo(13, -5)
    ctx.quadraticCurveTo(20 - onda * 3, -14, 19, -24)
    ctx.quadraticCurveTo(20, -36, 14, -44)
    ctx.closePath()
    ctx.fillStyle = col.vestido
    ctx.fill()
    ctx.strokeStyle = col.vestidoSombra
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Brazos pálidos extendidos hacia delante.
    const brazo = Math.sin(this.time * 3 + this.phase) * 2
    ctx.strokeStyle = '#c9d4d0'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-12, -41)
    ctx.quadraticCurveTo(-20, -36, -21 + brazo, -26)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(12, -41)
    ctx.quadraticCurveTo(20, -36, 21 - brazo, -26)
    ctx.stroke()

    // Melena: masa oscura y mechones que se mecen.
    ctx.fillStyle = '#171225'
    ctx.beginPath()
    ctx.ellipse(0, -55, 14, 15, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-13, -58)
    ctx.quadraticCurveTo(-19 + onda * 2, -46, -15, -32)
    ctx.quadraticCurveTo(-10, -38, -9, -47)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(13, -58)
    ctx.quadraticCurveTo(19 - onda * 2, -46, 15, -32)
    ctx.quadraticCurveTo(10, -38, 9, -47)
    ctx.closePath()
    ctx.fill()

    // Rostro pálido, casi oculto por el pelo.
    ctx.fillStyle = '#cdd8cf'
    ctx.beginPath()
    ctx.ellipse(0, -53, 6.5, 8, 0, 0, Math.PI * 2)
    ctx.fill()

    // Mechones sobre la cara.
    ctx.strokeStyle = '#171225'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-5, -62)
    ctx.quadraticCurveTo(-6, -55, -4, -47)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(5, -62)
    ctx.quadraticCurveTo(6, -55, 4, -47)
    ctx.stroke()

    // Ojos que brillan en la oscuridad.
    ctx.save()
    ctx.shadowColor = col.ojo
    ctx.shadowBlur = 7
    ctx.fillStyle = col.ojo
    ctx.beginPath()
    ctx.arc(-2.6, -53, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(2.6, -53, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.restore()
  }
}
