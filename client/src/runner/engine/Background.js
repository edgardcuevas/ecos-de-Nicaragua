// engine/Background.js
// Fondo parallax en tres capas: cielo con luna, montañas lejanas y colinas cercanas.
// Todo procedural; R09 puede sustituirlo por imágenes sin cambiar la API.

const LEJOS = [
  [0, 1],
  [0.06, 0.62],
  [0.14, 0.82],
  [0.24, 0.22],
  [0.34, 0.78],
  [0.44, 0.94],
  [0.54, 0.48],
  [0.64, 0.86],
  [0.74, 0.3],
  [0.84, 0.72],
  [0.93, 0.9],
  [1, 1],
]

const CERCA = [
  [0, 1],
  [0.08, 0.78],
  [0.18, 0.88],
  [0.3, 0.32],
  [0.4, 0.9],
  [0.52, 0.68],
  [0.62, 0.92],
  [0.72, 0.52],
  [0.82, 0.9],
  [0.92, 0.74],
  [1, 1],
]

const PERIODO_LEJOS = 760
const PERIODO_CERCA = 540
const PERIODO_SUELO = 160

export class Background {
  constructor() {
    this.width = 0
    this.height = 0
    this.groundY = 0
    this.time = 0
    this.offsetLejos = 0
    this.offsetCerca = 0
    this.offsetSuelo = 0
    this.stars = []
    this._sky = null
  }

  reset(width, height, groundY) {
    this.width = width
    this.height = height
    this.groundY = groundY
    this.time = 0
    this.offsetLejos = 0
    this.offsetCerca = 0
    this.offsetSuelo = 0
    this._sky = null
    this.stars = Array.from({ length: 44 }, (_, i) => ({
      x: (((i * 73) % 101) / 101) * width,
      y: (((i * 37) % 89) / 89) * height * 0.52,
      r: 0.6 + (i % 3) * 0.35,
      a: 0.3 + (i % 5) * 0.1,
      fase: i * 0.7,
    }))
  }

  update(dt, speed) {
    this.time += dt
    this.offsetLejos = (this.offsetLejos + speed * 0.08 * dt) % PERIODO_LEJOS
    this.offsetCerca = (this.offsetCerca + speed * 0.22 * dt) % PERIODO_CERCA
    this.offsetSuelo = (this.offsetSuelo + speed * dt) % PERIODO_SUELO
  }

  render(ctx) {
    this.dibujarCielo(ctx)
    this.dibujarLuna(ctx)
    this.dibujarRidge(ctx, LEJOS, PERIODO_LEJOS, this.height * 0.22, '#17315e', 1)
    this.dibujarRidge(ctx, CERCA, PERIODO_CERCA, this.height * 0.14, '#0c2148', 1)
    this.dibujarSuelo(ctx)
  }

  dibujarCielo(ctx) {
    if (!this._sky) {
      const sky = ctx.createLinearGradient(0, 0, 0, this.groundY)
      sky.addColorStop(0, '#04122e')
      sky.addColorStop(0.55, '#081d42')
      sky.addColorStop(1, '#123a6e')
      this._sky = sky
    }
    ctx.fillStyle = this._sky
    ctx.fillRect(0, 0, this.width, this.groundY)

    for (const star of this.stars) {
      ctx.globalAlpha = star.a * (0.7 + 0.3 * Math.sin(this.time * 1.8 + star.fase))
      ctx.fillStyle = '#dfe8f7'
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  dibujarLuna(ctx) {
    const x = this.width * 0.8
    const y = Math.max(30, this.height * 0.2)
    const pulso = 0.85 + 0.15 * Math.sin(this.time * 1.2)

    ctx.save()
    ctx.fillStyle = '#f1c66d'
    ctx.globalAlpha = 0.07 * pulso
    ctx.beginPath()
    ctx.arc(x, y, 40, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.12 * pulso
    ctx.beginPath()
    ctx.arc(x, y, 25, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.92
    ctx.beginPath()
    ctx.arc(x, y, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#b8892b'
    ctx.beginPath()
    ctx.arc(x - 4, y + 3, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + 5, y - 4, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  dibujarRidge(ctx, puntos, periodo, altura, color, alpha) {
    const desplazamiento = periodo === PERIODO_LEJOS ? this.offsetLejos : this.offsetCerca
    const start = -(((desplazamiento % periodo) + periodo) % periodo)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    for (let base = start; base < this.width + periodo; base += periodo) {
      ctx.beginPath()
      ctx.moveTo(base, this.groundY)
      for (const [px, py] of puntos) {
        ctx.lineTo(base + px * periodo, this.groundY - altura + py * altura)
      }
      ctx.lineTo(base + periodo, this.groundY)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  dibujarSuelo(ctx) {
    ctx.fillStyle = '#07152c'
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY)

    ctx.save()
    ctx.strokeStyle = '#1b3357'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    const baseY = this.groundY + 9
    for (let x = -this.offsetSuelo; x < this.width + PERIODO_SUELO; x += PERIODO_SUELO) {
      // Matas de hierba
      ctx.beginPath()
      ctx.moveTo(x + 18, baseY + 7)
      ctx.lineTo(x + 15, baseY)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 22, baseY + 7)
      ctx.lineTo(x + 23, baseY - 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 26, baseY + 7)
      ctx.lineTo(x + 29, baseY + 1)
      ctx.stroke()

      // Piedras
      ctx.fillStyle = '#132a4a'
      ctx.beginPath()
      ctx.ellipse(x + 92, this.groundY + 22, 7, 3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x + 124, this.groundY + 31, 4, 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // Línea de horizonte.
    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.fillStyle = '#f1c66d'
    ctx.fillRect(0, this.groundY, this.width, 1.5)
    ctx.restore()
  }
}
