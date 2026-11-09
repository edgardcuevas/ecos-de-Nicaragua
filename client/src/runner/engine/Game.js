// engine/Game.js
// Motor del runner: loop, estado, ciclo de vida y orquestación de entidades.
// R02+ añade enemigos, obstáculos, fondo y colisiones.

import { Player } from './Player.js'
import { Enemy } from './Enemy.js'
import { Obstacle } from './Obstacle.js'
import { Background } from './Background.js'
import { Input } from './Input.js'
import { colisionaJugador } from './Collision.js'
import { Spawner } from './Spawner.js'
import { Sonido } from './Sound.js'
import { vidasMaximas, factorVelocidad, NOCHE } from '../config.js'

export class Game {
  constructor(canvas, { premium = false, onLivesChange = null, onGameOver = null, onScore = null } = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.running = false
    this.paused = false
    this.rafId = null
    this.lastTime = 0
    this.elapsed = 0
    this.fps = 0
    this._fpsFrames = 0
    this._fpsAccum = 0

    this.premium = Boolean(premium)
    this.maxLives = vidasMaximas(this.premium)
    this.lives = this.maxLives
    this.gameOver = false
    this.onLivesChange = onLivesChange
    this.onGameOver = onGameOver
    this.onScore = onScore
    this.distance = 0
    this.score = 0
    this._scoreTimer = 0
    this._scoreEmitido = -1

    // Tamaño lógico del canvas en píxeles CSS (se ajusta en resize)
    this.width = canvas.width || 640
    this.height = canvas.height || 360
    this.dpr = 1

    this.player = new Player()
    this.player.reset(this.width, this.height)
    this.background = new Background()
    this.background.reset(this.width, this.height, this.player.groundY)
    this.enemies = []
    this.obstacles = []
    this.speed = 230 * this.player.scale
    this.spawner = new Spawner()
    this.collisions = 0
    this.flash = 0
    this.progreso = 0 // 0 = anochece, 1 = amanece
    this.victoria = false
    this.ayuda = null // aviso breve sobre el lienzo
    this._ayudaVista = false
    this.sound = new Sonido()

    this.input = new Input(canvas, {
      onJump: () => this.jump(),
      onJumpRelease: () => this.jumpRelease(),
      onDuck: (on) => this.duck(on),
      isActive: () => this.running && !this.paused && !this.gameOver,
    })
  }

  resize(width, height) {
    const w = Math.max(1, Math.floor(width))
    const h = Math.max(1, Math.floor(height))
    // Nitidez en pantallas HiDPI sin dibujar a resolución excesiva.
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)

    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.canvas.style.height = `${h}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    this.width = w
    this.height = h
    this.dpr = dpr
    this.player.reset(w, h)
    this.background.reset(w, h, this.player.groundY)
    this.enemies = []
    this.obstacles = []
    this.spawner.reset()
  }

  start() {
    if (this.running) return
    this.running = true
    this.paused = false
    this.lastTime = 0
    this.elapsed = 0
    this.fps = 0
    this._fpsFrames = 0
    this._fpsAccum = 0
    this.player.reset(this.width, this.height)
    this.background.reset(this.width, this.height, this.player.groundY)
    this.enemies = []
    this.obstacles = []
    this.speed = 230 * this.player.scale
    this.spawner.reset()
    this.collisions = 0
    this.flash = 0
    this.maxLives = vidasMaximas(this.premium)
    this.lives = this.maxLives
    this.gameOver = false
    this.progreso = 0
    this.victoria = false
    this.ayuda = null
    this._ayudaVista = false
    this.sound.activar()
    this.distance = 0
    this.score = 0
    this._scoreTimer = 0
    this._scoreEmitido = 0
    this.onLivesChange?.(this.lives)
    this.onScore?.(0)
    this.rafId = requestAnimationFrame((t) => this.loop(t))
  }

  stop() {
    this.running = false
    this.paused = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.lastTime = 0
    this.fps = 0
    this._fpsFrames = 0
    this._fpsAccum = 0
  }

  pause() {
    if (!this.running) return
    this.paused = true
  }

  resume() {
    if (!this.running) return
    this.paused = false
  }

  togglePause() {
    if (this.paused) this.resume()
    else this.pause()
  }

  loop(timestamp) {
    if (!this.running) return

    if (this.lastTime === 0) this.lastTime = timestamp
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1) // clamp para evitar saltos
    this.lastTime = timestamp

    if (!this.paused) {
      this.elapsed += dt
      this.update(dt)
    }

    this.render()

    this._fpsFrames++
    this._fpsAccum += dt
    if (this._fpsAccum >= 1) {
      this.fps = Math.round(this._fpsFrames / this._fpsAccum)
      this._fpsFrames = 0
      this._fpsAccum = 0
    }

    if (this.running) this.rafId = requestAnimationFrame((t) => this.loop(t))
  }

  update(dt) {
    if (this.gameOver) return
    this.player.update(dt)
    this.progreso = Math.min(1, this.elapsed / NOCHE.segundos)
    this.speed = 230 * this.player.scale * factorVelocidad(this.elapsed)
    this.background.update(dt, this.speed)

    this.distance += (this.speed * dt) / 10 // 10 px = 1 m
    this.score = Math.floor(this.distance)
    this._scoreTimer += dt
    if (this._scoreTimer >= 0.1) {
      this._scoreTimer = 0
      if (this.score !== this._scoreEmitido) {
        this._scoreEmitido = this.score
        this.onScore?.(this.score)
      }
    }

    // Un solo generador para obstáculos y Ceguas: garantiza separación mínima entre ellos.
    this.spawner.update(dt, {
      speed: this.speed,
      playerX: this.player.x,
      peligros: [...this.enemies, ...this.obstacles],
      pesos: { enemigo: 0.35, obstaculo: 0.4, liana: this.elapsed >= NOCHE.lianasDesde ? 0.25 : 0 },
      bloqueado: NOCHE.segundos - this.elapsed < NOCHE.cierre, // el final es limpio: no salen peligros nuevos
      crear: (tipo) => {
        if (tipo === 'enemigo') return this.spawnEnemy()
        return this.spawnObstacle(tipo === 'liana' ? 3 : Math.floor(Math.random() * 3))
      },
    })

    for (const enemy of this.enemies) enemy.update(dt, this.speed)
    for (const obstacle of this.obstacles) obstacle.update(dt, this.speed)
    this.enemies = this.enemies.filter((enemy) => !enemy.fueraDePantalla())
    this.obstacles = this.obstacles.filter((obstacle) => !obstacle.fueraDePantalla())

    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt)
    if (this.ayuda) {
      this.ayuda.t -= dt
      if (this.ayuda.t <= 0) this.ayuda = null
    }
    this.detectCollisions()
    if (!this.gameOver && this.elapsed >= NOCHE.segundos) this.amanecer()
  }

  /** Cantó el gallo: se acabó la noche y ganas. */
  amanecer() {
    this.gameOver = true
    this.victoria = true
    this.progreso = 1
    this.score = Math.floor(this.distance) + NOCHE.bonoAmanecer + this.lives * NOCHE.bonoVida
    this.sound.amanecer()
    this.onScore?.(this.score)
    this.onGameOver?.({
      victoria: true,
      lives: this.lives,
      score: this.score,
      distance: Math.floor(this.distance),
      collisions: this.collisions,
      elapsed: this.elapsed,
    })
    this.render() // último cuadro con el sol ya salido
    this.stop()
  }

  detectCollisions() {
    if (this.gameOver || this.player.invulnerable > 0 || this.player.state === 'hit') return
    if (this.obstacles.some((obstacle) => colisionaJugador(this.player, obstacle))) {
      this.registerHit()
      return
    }
    if (this.enemies.some((enemy) => colisionaJugador(this.player, enemy))) {
      this.registerHit()
    }
  }

  registerHit() {
    this.player.hit()
    this.player.startInvulnerability(1.5)
    this.collisions++
    this.flash = 0.2

    this.lives = Math.max(0, this.lives - 1)
    this.onLivesChange?.(this.lives)

    if (this.lives === 0) {
      this.sound.derrota()
      this.gameOver = true
      this.score = Math.floor(this.distance)
      this.onScore?.(this.score)
      this.onGameOver?.({
        victoria: false,
        lives: 0,
        score: this.score,
        distance: this.score,
        collisions: this.collisions,
        elapsed: this.elapsed,
      })
      this.stop()
    } else {
      this.sound.golpe()
    }
  }

  setPremium(value) {
    const premium = Boolean(value)
    if (premium === this.premium) return
    const anterior = this.maxLives
    this.premium = premium
    this.maxLives = vidasMaximas(premium)
    if (!this.running) {
      this.lives = this.maxLives
    } else {
      // A media partida no se regalan ni se reinician vidas: solo se ajusta la diferencia.
      this.lives = Math.min(this.maxLives, Math.max(0, this.lives + (this.maxLives - anterior)))
    }
    this.onLivesChange?.(this.lives)
  }

  spawnEnemy() {
    const enemy = new Enemy()
    enemy.spawn({
      x: this.width,
      groundY: this.player.groundY,
      scale: this.player.scale,
      variant: Math.random() < 0.5 ? 0 : 1,
    })
    enemy.x += enemy.w
    this.enemies.push(enemy)
    return enemy
  }

  spawnObstacle(variant = Math.floor(Math.random() * 3)) {
    const obstacle = new Obstacle()
    obstacle.spawn({
      x: this.width,
      groundY: this.player.groundY,
      scale: this.player.scale,
      variant,
    })
    obstacle.x += obstacle.w
    this.obstacles.push(obstacle)
    if (variant === 3 && !this._ayudaVista) {
      this._ayudaVista = true
      this.ayuda = { texto: 'Una liana: agáchate con ↓ o S', t: 3.2 }
    }
    return obstacle
  }

  get activo() {
    return this.running && !this.paused && !this.gameOver
  }

  jump() {
    if (!this.activo) return false
    const salto = this.player.jump()
    if (salto) this.sound.salto()
    return salto
  }

  jumpRelease() {
    this.player.jumpRelease()
  }

  duck(on) {
    this.player.duck(on && this.activo)
  }

  render() {
    const ctx = this.ctx

    this.background.render(ctx, this.progreso)

    for (const obstacle of this.obstacles) obstacle.render(ctx)
    for (const enemy of this.enemies) enemy.render(ctx)
    this.player.render(ctx)
    this.dibujarProgreso(ctx)
    this.dibujarAyuda(ctx)

    if (this.flash > 0) {
      ctx.save()
      ctx.globalAlpha = Math.min(0.3, this.flash * 1.5)
      ctx.fillStyle = '#ff4d6d'
      ctx.fillRect(0, 0, this.width, this.height)
      ctx.restore()
    }
  }

  /** Barra superior: la luna avanza hacia el amanecer. */
  dibujarProgreso(ctx) {
    const ancho = Math.min(220, this.width * 0.34)
    const x = (this.width - ancho) / 2
    const y = 16
    const p = this.progreso

    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, ancho, 4)
    ctx.globalAlpha = 0.95
    const grad = ctx.createLinearGradient(x, 0, x + ancho, 0)
    grad.addColorStop(0, '#f1c66d')
    grad.addColorStop(1, '#ff9d5c')
    ctx.fillStyle = grad
    ctx.fillRect(x, y, ancho * p, 4)
    ctx.fillStyle = p > 0.85 ? '#ffb15c' : '#f1c66d'
    ctx.beginPath()
    ctx.arc(x + ancho * p, y + 2, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  dibujarAyuda(ctx) {
    if (!this.ayuda) return
    const alfa = Math.min(1, this.ayuda.t / 0.6)
    ctx.save()
    ctx.globalAlpha = alfa
    ctx.font = '600 15px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0, 10, 30, 0.65)'
    const ancho = ctx.measureText(this.ayuda.texto).width + 28
    ctx.fillRect(this.width / 2 - ancho / 2, 40, ancho, 30)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(this.ayuda.texto, this.width / 2, 60)
    ctx.restore()
  }

  destroy() {
    this.stop()
    this.input?.destroy()
    this.input = null
    this.background = null
    this.canvas = null
    this.ctx = null
  }
}
