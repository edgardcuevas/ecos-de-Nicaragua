// engine/Game.js
// Motor del runner: loop, estado, ciclo de vida y orquestación de entidades.
// R02+ añade enemigos, obstáculos, fondo y colisiones.

import { Player } from './Player.js'
import { Enemy } from './Enemy.js'
import { Obstacle } from './Obstacle.js'
import { Background } from './Background.js'
import { Input } from './Input.js'
import { colisionaJugador } from './Collision.js'

export class Game {
  constructor(canvas, { premium = false, maxLives = 5, onLivesChange = null, onGameOver = null, onScore = null } = {}) {
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
    this.maxLives = maxLives
    this.lives = this.premium ? Infinity : maxLives
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
    this.spawnTimer = 1.2
    this.obstacleTimer = 2.2
    this.collisions = 0
    this.flash = 0

    this.input = new Input(canvas, {
      onJump: () => this.jump(),
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
    this.spawnTimer = 1.2
    this.obstacleTimer = 2.2
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
    this.spawnTimer = 1.2
    this.obstacleTimer = 2.2
    this.collisions = 0
    this.flash = 0
    this.lives = this.premium ? Infinity : this.maxLives
    this.gameOver = false
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
    this.speed = 230 * this.player.scale
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

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0 && this.enemies.length < 3) {
      this.spawnEnemy()
      this.spawnTimer = 1.4 + Math.random() * 1.1
      if (this.obstacleTimer < 0.6) this.obstacleTimer = 0.6
    }

    this.obstacleTimer -= dt
    if (this.obstacleTimer <= 0 && this.obstacles.length < 2) {
      this.spawnObstacle()
      this.obstacleTimer = 1.8 + Math.random() * 1.2
      if (this.spawnTimer < 0.6) this.spawnTimer = 0.6
    }

    for (const enemy of this.enemies) enemy.update(dt, this.speed)
    for (const obstacle of this.obstacles) obstacle.update(dt, this.speed)
    this.enemies = this.enemies.filter((enemy) => !enemy.fueraDePantalla())
    this.obstacles = this.obstacles.filter((obstacle) => !obstacle.fueraDePantalla())

    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt)
    this.detectCollisions()
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

    if (this.premium) return

    this.lives = Math.max(0, this.lives - 1)
    this.onLivesChange?.(this.lives)

    if (this.lives === 0) {
      this.gameOver = true
      this.score = Math.floor(this.distance)
      this.onScore?.(this.score)
      this.onGameOver?.({
        lives: 0,
        score: this.score,
        distance: this.score,
        collisions: this.collisions,
        elapsed: this.elapsed,
      })
      this.stop()
    }
  }

  setPremium(value) {
    const premium = Boolean(value)
    if (premium === this.premium) return
    this.premium = premium
    this.lives = premium ? Infinity : this.maxLives
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
  }

  spawnObstacle() {
    const obstacle = new Obstacle()
    obstacle.spawn({
      x: this.width,
      groundY: this.player.groundY,
      scale: this.player.scale,
      variant: Math.floor(Math.random() * 3),
    })
    obstacle.x += obstacle.w
    this.obstacles.push(obstacle)
  }

  jump() {
    if (this.gameOver) return false
    return this.player.jump()
  }

  render() {
    const ctx = this.ctx

    this.background.render(ctx)

    for (const obstacle of this.obstacles) obstacle.render(ctx)
    for (const enemy of this.enemies) enemy.render(ctx)
    this.player.render(ctx)

    if (this.flash > 0) {
      ctx.save()
      ctx.globalAlpha = Math.min(0.3, this.flash * 1.5)
      ctx.fillStyle = '#ff4d6d'
      ctx.fillRect(0, 0, this.width, this.height)
      ctx.restore()
    }
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
