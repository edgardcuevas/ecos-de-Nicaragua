// engine/Player.js
// El Borracho: física de salto, animación y dibujo.
// R09 sustituirá el dibujo procedural por sprites; la física y la API no cambian.

const GRAVITY = 2200 // px/s² a escala 1
const JUMP_SPEED = 760 // px/s a escala 1
const UNIT_HEIGHT = 58 // altura de referencia del personaje

const COLORES = {
  pantalon: '#2b3a5c',
  camisa: '#1e4da1',
  camisaSombra: '#163b7c',
  piel: '#b97a4e',
  sombrero: '#d9b46a',
  sombreroSombra: '#b8892b',
  zapato: '#141d33',
  pelo: '#3a2a1e',
  faja: '#f1c66d',
}

export class Player {
  constructor() {
    this.x = 0
    this.y = 0 // posición de los pies
    this.vy = 0
    this.onGround = true
    this.state = 'running' // running | jumping | hit
    this.time = 0
    this.hitTimer = 0
    this.invulnerable = 0
    this.scale = 1
    this.groundY = 0
    this.w = 24
    this.h = UNIT_HEIGHT
  }

  /**
   * Recoloca al jugador para un nuevo tamaño de canvas.
   * Se llama al montar y en cada resize.
   */
  reset(width, height) {
    this.scale = Math.min(Math.max(height / 360, 0.55), 1.2)
    this.x = Math.max(40, Math.round(width * 0.18))
    this.groundY = Math.round(height * 0.84)
    this.y = this.groundY
    this.vy = 0
    this.onGround = true
    this.state = 'running'
    this.hitTimer = 0
    this.invulnerable = 0
    this.time = 0
    this.w = Math.round(24 * this.scale)
    this.h = Math.round(UNIT_HEIGHT * this.scale)
  }

  update(dt) {
    this.time += dt

    if (this.invulnerable > 0) {
      this.invulnerable = Math.max(0, this.invulnerable - dt)
    }

    if (this.hitTimer > 0) {
      this.hitTimer -= dt
      if (this.hitTimer <= 0) {
        this.hitTimer = 0
        this.state = this.onGround ? 'running' : 'jumping'
      }
    }

    if (!this.onGround) {
      this.vy += GRAVITY * this.scale * dt
      this.y += this.vy * dt

      if (this.y >= this.groundY) {
        this.y = this.groundY
        this.vy = 0
        this.onGround = true
        if (this.state === 'jumping') this.state = 'running'
      }
    }
  }

  jump() {
    if (!this.onGround || this.state === 'hit') return false
    this.vy = -JUMP_SPEED * this.scale
    this.onGround = false
    this.state = 'jumping'
    return true
  }

  /** Animación de golpe. La invulnerabilidad la gestiona R07. */
  hit(duration = 0.6) {
    this.state = 'hit'
    this.hitTimer = duration
  }

  startInvulnerability(duration = 1.5) {
    this.invulnerable = Math.max(this.invulnerable, duration)
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
    const parpadeo = this.invulnerable > 0 && Math.floor(this.time * 14) % 2 === 0
    const bouncing = this.onGround && this.state === 'running'
    const phase = this.time * 12
    const bob = bouncing ? Math.abs(Math.sin(phase)) * 1.5 : 0

    ctx.save()
    if (parpadeo) ctx.globalAlpha = 0.35

    // Sombra en el suelo: se separa y aclara al saltar.
    const altura = Math.max(0, this.groundY - this.y)
    const sombra = Math.max(0.08, 0.28 - altura / 1200)
    ctx.save()
    ctx.globalAlpha = sombra
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.ellipse(this.x, this.groundY + 2, 16 * s, 4 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(this.x, this.y - bob)
    ctx.scale(s, s)
    if (this.state === 'hit') ctx.rotate(-0.22)

    const enSalto = this.state === 'jumping' || !this.onGround
    const enGolpe = this.state === 'hit'
    const balanceo = Math.sin(phase)

    // Piernas
    const piernaTrasera = enSalto ? 0.65 : enGolpe ? 0.35 : balanceo * 0.55
    const piernaDelantera = enSalto ? -0.55 : enGolpe ? -0.3 : -balanceo * 0.55
    this.limbs(ctx, -3.5, -20, piernaTrasera, 20, 6, COLORES.pantalon)
    this.limbs(ctx, 3.5, -20, piernaDelantera, 20, 6, COLORES.pantalon)

    // Zapato de la pierna delantera (detalle simple)
    ctx.save()
    ctx.translate(3.5, -20)
    ctx.rotate(piernaDelantera)
    ctx.fillStyle = COLORES.zapato
    ctx.fillRect(-4.5, 17, 9, 5)
    ctx.restore()

    // Brazo trasero
    const brazoTrasero = enSalto ? -1.9 : enGolpe ? -1.2 : -balanceo * 0.7
    this.limbs(ctx, -10, -40, brazoTrasero, 14, 5, COLORES.camisaSombra)

    // Cuerpo (poncho)
    ctx.fillStyle = COLORES.camisa
    this.roundedRect(ctx, -11, -46, 22, 27, 7)
    ctx.fill()
    ctx.fillStyle = COLORES.camisaSombra
    ctx.fillRect(-11, -26, 22, 4)
    ctx.fillStyle = COLORES.faja
    ctx.fillRect(-11, -30, 22, 4)

    // Brazo delantero
    const brazoDelantero = enSalto ? -2.3 : enGolpe ? -1.7 : balanceo * 0.7
    this.limbs(ctx, 10, -40, brazoDelantero, 14, 5, COLORES.camisa)

    // Cabeza
    ctx.fillStyle = COLORES.piel
    ctx.beginPath()
    ctx.arc(0, -52, 7, 0, Math.PI * 2)
    ctx.fill()

    // Pelo y bigote
    ctx.fillStyle = COLORES.pelo
    ctx.beginPath()
    ctx.arc(0, -54, 7, Math.PI * 0.95, Math.PI * 2.05)
    ctx.fill()
    ctx.fillRect(-4.5, -49, 9, 2)

    // Ojo
    ctx.fillStyle = '#101828'
    ctx.beginPath()
    ctx.arc(3, -53, 1.1, 0, Math.PI * 2)
    ctx.fill()

    // Sombrero
    ctx.fillStyle = COLORES.sombrero
    ctx.beginPath()
    ctx.ellipse(0, -57, 15, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COLORES.sombreroSombra
    this.roundedRect(ctx, -7, -68, 14, 12, 4)
    ctx.fill()
    ctx.fillStyle = COLORES.pelo
    ctx.fillRect(-7, -61, 14, 2.5)

    ctx.restore()
    ctx.restore()
  }

  limbs(ctx, x, y, angle, length, width, color) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillStyle = color
    this.roundedRect(ctx, -width / 2, 0, width, length, width / 2)
    ctx.fill()
    ctx.restore()
  }

  roundedRect(ctx, x, y, w, h, r) {
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
