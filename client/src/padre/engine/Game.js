// engine/Game.js
// El Padre sin Cabeza recorre el pueblo de noche. Vista cenital en píxeles, 120 s hasta el alba.
import { Input } from './Input.js'
import { Sonido } from './Sound.js'
import { Mundo } from './Mundo.js'
import * as S from './Sprites.js'
import { VISTA, MUNDO, NOCHE, JUGADOR, ALDEANOS, ENEMIGOS, vidasMaximas, maxEnemigos, esperaSpawn } from '../config.js'

const rand = (a, b) => a + Math.random() * (b - a)
const suave = (t) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export class Game {
  constructor(canvas, { premium = false, onLivesChange = null, onGameOver = null, onScore = null } = {}) {
    this.canvas = canvas
    canvas.width = VISTA.w
    canvas.height = VISTA.h
    this.ctx = canvas.getContext('2d')
    this.ctx.imageSmoothingEnabled = false
    this.onLivesChange = onLivesChange
    this.onGameOver = onGameOver
    this.onScore = onScore

    this.premium = premium
    this.maxLives = vidasMaximas(premium)
    this.lives = this.maxLives
    this.running = false
    this.paused = false
    this.gameOver = false
    this.victoria = false
    this.rafId = null
    this.lastTime = 0
    this.elapsed = 0
    this.fps = 0
    this._fpsFrames = 0
    this._fpsAccum = 0
    this.tiempo = 0 // reloj de animación

    this.mundo = new Mundo()
    this.mundo.construirFondo()
    this.oscuro = document.createElement('canvas')
    this.oscuro.width = VISTA.w
    this.oscuro.height = VISTA.h
    this.octx = this.oscuro.getContext('2d')

    this.sound = new Sonido()
    this.stick = [0, 0]
    this.input = new Input(canvas, { onAtacar: () => this.atacar(), isActive: () => this.activo })
    this.reiniciar()
    this.render()
  }

  get activo() {
    return this.running && !this.paused && !this.gameOver
  }

  reiniciar() {
    this.player = {
      x: 320, y: 230, r: JUGADOR.r, facing: { x: 0, y: 1 }, moviendo: false,
      atk: 0, atkAng: 0, cd: 0, inv: 0, lento: 0, kx: 0, ky: 0, knock: 0,
    }
    this.aldeanos = []
    this.enemigos = []
    this.proyectiles = []
    this.particulas = []
    this.manchas = []
    this.cuerpos = []
    this.textos = []
    this.ondas = []
    this.colaAldeanos = []
    this.cam = { x: 320 - VISTA.w / 2, y: 230 - VISTA.h / 2 }
    this.progreso = 0
    this.alba = 0
    this.score = 0
    this.muertos = 0
    this.salvados = 0
    this.combo = 0
    this.comboT = 0
    this.flash = 0
    this.shake = 0
    this.spawnT = 4
    this.espectro = 0
    this.ayuda = null
    this.avisados = new Set()
    this.victoria = false
    this.gameOver = false
    for (let i = 0; i < ALDEANOS.cantidad; i++) this.crearAldeano(this.mundo.puntoDeCamino())
  }

  // ---------------------------------------------------------------- ciclo de vida
  start() {
    if (this.running) return
    this.running = true
    this.paused = false
    this.lastTime = 0
    this.elapsed = 0
    this.fps = 0
    this.maxLives = vidasMaximas(this.premium)
    this.lives = this.maxLives
    this.reiniciar()
    this.mostrarAyuda(window.matchMedia?.('(pointer: coarse)').matches ? 'Toca Tajo para atacar. ¡Que no te vea el pueblo!' : 'Tajo: Espacio, J o clic. ¡Que no te vea el pueblo!', 4)
    this.sound.activar()
    this.onLivesChange?.(this.lives)
    this.onScore?.(0)
    this.rafId = requestAnimationFrame((t) => this.loop(t))
  }

  stop() {
    this.running = false
    this.paused = false
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.lastTime = 0
    this.fps = 0
    for (const k in this.input.teclas) this.input.teclas[k] = false
    this.stick = [0, 0]
  }

  pause() { if (this.running) this.paused = true }
  resume() { if (this.running) this.paused = false }
  togglePause() { if (this.paused) this.resume(); else this.pause() }

  loop(ts) {
    if (!this.running) return
    if (this.lastTime === 0) this.lastTime = ts
    const dt = Math.min((ts - this.lastTime) / 1000, 0.05)
    this.lastTime = ts
    if (!this.paused) {
      this.elapsed += dt
      this.tiempo += dt
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

  setPremium(v) {
    const antes = this.maxLives
    this.premium = Boolean(v)
    this.maxLives = vidasMaximas(this.premium)
    if (this.running && !this.gameOver) this.lives = Math.min(this.maxLives, Math.max(1, this.lives + this.maxLives - antes))
    else this.lives = this.maxLives
    this.onLivesChange?.(this.lives)
  }

  setStick(x, y) { this.stick = [x, y] }

  mostrarAyuda(texto, t = 3) { this.ayuda = { texto, t } }

  // ---------------------------------------------------------------- actualización
  update(dt) {
    if (this.gameOver) return
    this.progreso = Math.min(1, this.elapsed / NOCHE.segundos)
    this.alba = suave((this.progreso - 0.8) / 0.2)

    this.tickJugador(dt)
    this.tickAldeanos(dt)
    this.tickEnemigos(dt)
    this.tickProyectiles(dt)
    this.tickEfectos(dt)
    this.tickSpawn(dt)

    if (this.comboT > 0) {
      this.comboT -= dt
      if (this.comboT <= 0) this.combo = 0
    }
    if (this.flash > 0) this.flash -= dt
    if (this.shake > 0) this.shake -= dt
    if (this.ayuda && (this.ayuda.t -= dt) <= 0) this.ayuda = null

    const p = this.player
    const tx = Math.min(MUNDO.w - VISTA.w, Math.max(0, p.x - VISTA.w / 2))
    const ty = Math.min(MUNDO.h - VISTA.h, Math.max(0, p.y - VISTA.h / 2 - 6))
    const k = Math.min(1, dt * 7)
    this.cam.x += (tx - this.cam.x) * k
    this.cam.y += (ty - this.cam.y) * k

    if (!this.gameOver && this.elapsed >= NOCHE.segundos) this.amanecer()
  }

  vectorEntrada() {
    const [sx, sy] = this.stick
    const l = Math.hypot(sx, sy)
    if (l > 0.15) return [sx / Math.max(1, l) * Math.min(1, l), sy / Math.max(1, l) * Math.min(1, l)]
    return this.input.vector()
  }

  tickJugador(dt) {
    const p = this.player
    p.atk = Math.max(0, p.atk - dt)
    p.cd = Math.max(0, p.cd - dt)
    p.inv = Math.max(0, p.inv - dt)
    p.lento = Math.max(0, p.lento - dt)
    if (p.knock > 0) {
      p.knock -= dt
      this.mundo.mover(p, p.kx * dt, p.ky * dt)
      p.moviendo = false
    } else {
      const [ix, iy] = this.vectorEntrada()
      p.moviendo = Boolean(ix || iy)
      if (p.moviendo) {
        const l = Math.hypot(ix, iy)
        p.facing = { x: ix / l, y: iy / l }
        const vel = JUGADOR.vel * (p.lento > 0 ? 0.45 : 1) * Math.min(1, l)
        this.mundo.mover(p, ix * vel * dt, iy * vel * dt)
      }
    }
    // Espectro violeta; al acercarse el alba, humo: la luz lo consume.
    this.espectro -= dt
    if (this.espectro <= 0) {
      this.espectro = this.alba > 0.05 ? 0.06 : 0.14
      const humo = this.alba > 0.05
      this.particulas.push({
        x: p.x + rand(-3, 3), y: p.y - 14, vx: rand(-4, 4), vy: rand(-14, -8),
        t: 0, max: 0.9, c: humo ? '#b9b2c8' : '#8a6bd6', s: humo ? 2 : 1, g: 0,
      })
    }
  }

  atacar() {
    if (!this.activo) return false
    const p = this.player
    if (p.cd > 0) return false
    p.cd = JUGADOR.enfriamiento
    p.atk = 0.18
    p.atkAng = Math.atan2(p.facing.y, p.facing.x)
    this.sound.tajo()
    const { x: fx, y: fy } = p.facing
    const alcanza = (t) => {
      const dx = t.x - p.x
      const dy = t.y - (p.y)
      const d = Math.hypot(dx, dy)
      return d < JUGADOR.alcance + t.r && (d < 10 || (dx * fx + dy * fy) / d > 0.2)
    }
    for (const a of [...this.aldeanos]) if (alcanza(a)) this.matarAldeano(a)
    for (const e of [...this.enemigos]) if (alcanza(e)) this.golpearEnemigo(e)
    return true
  }

  // ---------------------------------------------------------------- aldeanos
  crearAldeano(pos) {
    this.aldeanos.push({
      x: pos.x, y: pos.y, r: 3, estado: 'vagar', objetivo: this.mundo.puntoDeCamino(),
      vel: rand(28, 38), color: Math.floor(rand(0, 4)), sombrero: Math.random() < 0.45,
      vela: Math.random() < 0.55, espera: rand(0, 2), alerta: 0, atasco: 0, fase: rand(0, 6), puerta: null,
    })
  }

  alertar(x, y, radio) {
    for (const a of this.aldeanos) if (Math.hypot(a.x - x, a.y - y) < radio) a.alerta = 4
  }

  tickAldeanos(dt) {
    const p = this.player
    for (const a of [...this.aldeanos]) {
      a.alerta = Math.max(0, a.alerta - dt)
      const d = dist(a, p)
      if (a.estado === 'vagar' && (d < ALDEANOS.miedo || a.alerta > 0)) {
        a.estado = 'huir'
        a.puerta = this.mundo.puertaCercana(a.x, a.y)
        a.atasco = 0
        if (d < ALDEANOS.miedo && Math.random() < 0.5) this.sound.grito()
      }
      if (a.estado === 'huir' && d > 120 && a.alerta <= 0) {
        a.estado = 'vagar'
        a.espera = 1
      }
      const meta = a.estado === 'huir' ? a.puerta : a.objetivo
      let mueve = false
      if (a.estado === 'vagar' && a.espera > 0) a.espera -= dt
      else {
        const dx = meta.x - a.x
        const dy = meta.y - a.y
        const l = Math.hypot(dx, dy)
        const vel = a.vel * (a.estado === 'huir' ? 1.7 : 1)
        if (l > 4) mueve = this.mundo.mover(a, (dx / l) * vel * dt, (dy / l) * vel * dt)
        if (a.estado === 'huir' && l < 6) {
          this.aldeanos.splice(this.aldeanos.indexOf(a), 1)
          this.salvados++
          this.colaAldeanos.push(rand(3, 6))
          continue
        }
        if (a.estado === 'vagar' && l <= 4) {
          a.espera = rand(0.6, 2.6)
          a.objetivo = this.mundo.puntoDeCamino()
        }
        if (!mueve && l > 4) a.atasco += dt
        else a.atasco = 0
        if (a.atasco > 0.5) {
          a.atasco = 0
          if (a.estado === 'huir') a.puerta = this.mundo.puertaAlAzar()
          else a.objetivo = this.mundo.puntoDeCamino()
        }
      }
    }
    for (let i = this.colaAldeanos.length - 1; i >= 0; i--) {
      this.colaAldeanos[i] -= dt
      if (this.colaAldeanos[i] <= 0) {
        this.colaAldeanos.splice(i, 1)
        if (this.aldeanos.length < ALDEANOS.cantidad) this.crearAldeano(this.mundo.puertaAlAzar())
      }
    }
  }

  matarAldeano(a) {
    this.aldeanos.splice(this.aldeanos.indexOf(a), 1)
    this.muertos++
    this.colaAldeanos.push(rand(4, 7))
    this.sangre(a.x, a.y - 5, 14)
    this.cuerpos.push({ x: a.x, y: a.y, color: a.color })
    if (this.cuerpos.length > 30) this.cuerpos.shift()
    this.puntuar(ALDEANOS.puntos, a.x, a.y - 14)
    this.sound.muerte()
    this.alertar(a.x, a.y, 90) // los testigos echan a correr
    this.shake = Math.max(this.shake, 0.08)
  }

  puntuar(base, x, y) {
    this.combo = this.comboT > 0 ? Math.min(ALDEANOS.comboMax, this.combo + 1) : 1
    this.comboT = ALDEANOS.comboVentana
    const pts = base * this.combo
    this.score += pts
    this.textos.push({ x, y, txt: `+${pts}`, t: 0, c: this.combo > 1 ? '#f1c66d' : '#ffffff' })
    this.onScore?.(this.score)
  }

  sangre(x, y, n) {
    for (let i = 0; i < n; i++) {
      const ang = rand(0, Math.PI * 2)
      const v = rand(20, 70)
      this.particulas.push({
        x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 10, t: 0, max: rand(0.3, 0.7),
        c: Math.random() < 0.5 ? '#b0141f' : '#7a0d16', s: Math.random() < 0.3 ? 2 : 1, g: 120, mancha: true,
      })
    }
    this.manchas.push({ x: x - 4, y: y + 4, w: 8, h: 3, c: '#4a0810' }, { x: x - 2, y: y + 5, w: 4, h: 1, c: '#8a0f1a' })
    for (let i = 0; i < 4; i++) {
      this.manchas.push({ x: x + rand(-6, 6), y: y + rand(3, 9), w: Math.floor(rand(2, 5)), h: Math.floor(rand(1, 3)), c: '#5e0a12' })
    }
    while (this.manchas.length > 240) this.manchas.shift()
  }

  // ---------------------------------------------------------------- enemigos
  tickSpawn(dt) {
    this.spawnT -= dt
    if (this.spawnT > 0 || this.enemigos.length >= maxEnemigos(this.elapsed)) return
    const disp = Object.entries(ENEMIGOS).filter(([, d]) => this.elapsed >= d.desde)
    if (!disp.length) return
    let r = Math.random() * disp.reduce((s, [, d]) => s + d.peso, 0)
    let tipo = disp[0][0]
    for (const [k, d] of disp) {
      r -= d.peso
      if (r <= 0) {
        tipo = k
        break
      }
    }
    this.crearEnemigo(tipo)
    this.spawnT = esperaSpawn(this.elapsed) * rand(0.9, 1.3)
  }

  puntoFueraDePantalla() {
    const c = this.cam
    let mejor = null
    let md = -1
    for (let i = 0; i < 40; i++) {
      const x = rand(10, MUNDO.w - 10)
      const y = rand(10, MUNDO.h - 10)
      if (this.mundo.choca(x, y, 7)) continue
      const fuera = x < c.x - 14 || x > c.x + VISTA.w + 14 || y < c.y - 14 || y > c.y + VISTA.h + 14
      const d = Math.hypot(x - this.player.x, y - this.player.y)
      if (fuera && d > 150) return { x, y }
      if (d > md) {
        md = d
        mejor = { x, y }
      }
    }
    return mejor ?? { x: 40, y: 190 }
  }

  crearEnemigo(tipo) {
    const def = ENEMIGOS[tipo]
    const pos = this.puntoFueraDePantalla()
    this.enemigos.push({
      tipo, x: pos.x, y: pos.y, r: def.r, hp: def.hp, vel: def.vel, dir: 1,
      t: rand(1.2, 2.2), ladro: 0, toca: 0, carga: 0, kx: 0, ky: 0, kn: 0, stun: 0, atasco: 0,
    })
    if (!this.avisados.has(tipo)) {
      this.avisados.add(tipo)
      this.mostrarAyuda(def.aviso, 3.5)
    }
  }

  /** Avanza hacia (o se aleja de) un punto, rodeando obstáculos si está bloqueado. */
  caminar(e, tx, ty, vel, dt) {
    const dx = tx - e.x
    const dy = ty - e.y
    const l = Math.hypot(dx, dy) || 1
    const ux = dx / l
    const uy = dy / l
    if (this.mundo.mover(e, ux * vel * dt, uy * vel * dt)) return
    const lado = e.lado ?? (e.lado = Math.random() < 0.5 ? 1 : -1)
    if (!this.mundo.mover(e, -uy * lado * vel * dt, ux * lado * vel * dt)) e.lado = -lado
  }

  tickEnemigos(dt) {
    const p = this.player
    for (const e of [...this.enemigos]) {
      if (e.kn > 0) {
        e.kn -= dt
        this.mundo.mover(e, e.kx * dt, e.ky * dt)
        continue
      }
      if (e.stun > 0) {
        e.stun -= dt
        continue
      }
      const d = dist(e, p)
      e.dir = p.x >= e.x ? 1 : -1
      if (e.tipo === 'perro') {
        this.caminar(e, p.x, p.y, e.vel * (1 + this.progreso * 0.25), dt)
        e.ladro -= dt
        if (d < 110 && e.ladro <= 0) {
          e.ladro = 5
          this.sound.ladrido()
          this.alertar(e.x, e.y, 140)
          this.textos.push({ x: e.x, y: e.y - 12, txt: '¡guau!', t: 0, c: '#d8c8a0' })
        }
        if (d < e.r + p.r + 1) this.danar(e)
      } else if (e.tipo === 'valiente') {
        this.caminar(e, p.x, p.y, e.vel, dt)
        if (d < e.r + p.r + 1) this.danar(e)
      } else if (e.tipo === 'monaguillo') {
        if (d > 90) this.caminar(e, p.x, p.y, e.vel, dt)
        else if (d < 62) this.caminar(e, e.x * 2 - p.x, e.y * 2 - p.y, e.vel, dt)
        e.t -= dt
        e.toca = Math.max(0, e.toca - dt)
        if (e.t <= 0) {
          e.t = 3.6
          e.toca = 0.5
          this.sound.campana()
          this.ondas.push({ x: e.x, y: e.y - 8, t: 0 })
          if (d < 80) {
            p.lento = 1.6
            this.textos.push({ x: p.x, y: p.y - 22, txt: '¡la campana!', t: 0, c: '#e0b43a' })
          }
          this.alertar(e.x, e.y, 130)
        }
      } else if (e.tipo === 'beata') {
        if (d > 125) this.caminar(e, p.x, p.y, e.vel, dt)
        else if (d < 90) this.caminar(e, e.x * 2 - p.x, e.y * 2 - p.y, e.vel, dt)
        e.t -= dt
        if (e.t <= 0.5 && e.carga <= 0) e.carga = 0.5
        if (e.carga > 0) {
          e.carga -= dt
          if (e.carga <= 0) {
            e.t = 2.8
            const a = Math.atan2(p.y - 6 - e.y, p.x - e.x)
            this.proyectiles.push({ x: e.x, y: e.y - 8, vx: Math.cos(a) * 88, vy: Math.sin(a) * 88, t: 3, r: 3 })
            this.sound.agua()
          }
        }
      }
    }
  }

  golpearEnemigo(e) {
    e.hp--
    const dx = e.x - this.player.x
    const dy = e.y - this.player.y
    const l = Math.hypot(dx, dy) || 1
    this.sangre(e.x, e.y - 5, 8)
    if (e.hp <= 0) {
      this.enemigos.splice(this.enemigos.indexOf(e), 1)
      this.puntuar(ENEMIGOS[e.tipo].puntos, e.x, e.y - 16)
      this.sound.muerte()
      this.sangre(e.x, e.y - 5, 10)
      this.cuerpos.push({ x: e.x, y: e.y, color: 1 })
      if (this.cuerpos.length > 30) this.cuerpos.shift()
    } else {
      e.kx = (dx / l) * 110
      e.ky = (dy / l) * 110
      e.kn = 0.16
      e.stun = 0.4
      this.sound.golpe()
    }
  }

  tickProyectiles(dt) {
    const p = this.player
    for (const q of [...this.proyectiles]) {
      q.t -= dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      if (q.t <= 0 || this.mundo.choca(q.x, q.y, 1)) {
        this.proyectiles.splice(this.proyectiles.indexOf(q), 1)
        continue
      }
      if (Math.hypot(q.x - p.x, q.y - (p.y - 6)) < p.r + q.r) {
        this.proyectiles.splice(this.proyectiles.indexOf(q), 1)
        this.danar(q)
      }
    }
  }

  tickEfectos(dt) {
    for (const f of this.particulas) {
      f.t += dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.vy += (f.g ?? 0) * dt
      f.vx *= 0.96
    }
    // Las gotas de sangre que terminan su vuelo manchan el suelo.
    this.particulas = this.particulas.filter((f) => {
      if (f.t < f.max) return true
      if (f.mancha && this.manchas.length < 240) this.manchas.push({ x: f.x, y: f.y + 6, w: f.s, h: 1, c: f.c })
      return false
    })
    for (const t of this.textos) {
      t.t += dt
      t.y -= 10 * dt
    }
    this.textos = this.textos.filter((t) => t.t < 0.9)
    for (const o of this.ondas) o.t += dt
    this.ondas = this.ondas.filter((o) => o.t < 0.5)
  }

  // ---------------------------------------------------------------- daño y fin
  danar(origen) {
    const p = this.player
    if (p.inv > 0 || this.gameOver) return
    this.lives = Math.max(0, this.lives - 1)
    p.inv = JUGADOR.invulnerable
    const dx = p.x - origen.x
    const dy = p.y - origen.y
    const l = Math.hypot(dx, dy) || 1
    p.kx = (dx / l) * 130
    p.ky = (dy / l) * 130
    p.knock = 0.18
    this.flash = 0.25
    this.shake = 0.3
    this.combo = 0
    this.comboT = 0
    for (let i = 0; i < 10; i++) {
      this.particulas.push({
        x: p.x, y: p.y - 7, vx: rand(-50, 50), vy: rand(-60, 10), t: 0, max: 0.5, c: '#9a7bff', s: 1, g: 100,
      })
    }
    this.sound.golpe()
    this.onLivesChange?.(this.lives)
    if (this.lives === 0) this.derrota()
  }

  derrota() {
    this.gameOver = true
    this.victoria = false
    this.sound.derrota()
    this.onGameOver?.(this.resultado())
    this.render()
    this.stop()
  }

  amanecer() {
    this.gameOver = true
    this.victoria = true
    this.progreso = 1
    this.alba = 1
    this.score += NOCHE.bonoAmanecer + this.lives * NOCHE.bonoVida
    this.sound.amanecer()
    this.onScore?.(this.score)
    this.onGameOver?.(this.resultado())
    this.render()
    this.stop()
  }

  resultado() {
    return {
      victoria: this.victoria, lives: this.lives, score: this.score, muertos: this.muertos,
      salvados: this.salvados, elapsed: this.elapsed,
    }
  }

  // ---------------------------------------------------------------- dibujo
  render() {
    const ctx = this.ctx
    const t = this.tiempo
    const sx = this.shake > 0 ? Math.round(rand(-1, 1)) : 0
    const sy = this.shake > 0 ? Math.round(rand(-1, 1)) : 0
    const cx = Math.round(this.cam.x) + sx
    const cy = Math.round(this.cam.y) + sy

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, VISTA.w, VISTA.h)
    ctx.save()
    ctx.translate(-cx, -cy)
    ctx.drawImage(this.mundo.fondo, 0, 0)

    for (const m of this.manchas) {
      ctx.fillStyle = m.c
      ctx.fillRect(Math.round(m.x), Math.round(m.y), m.w, m.h)
    }
    for (const c of this.cuerpos) S.cuerpo(ctx, c)

    const lista = [...this.mundo.dibujables]
    for (const a of this.aldeanos) lista.push({ y: a.y, dibujar: () => S.aldeano(ctx, a, t) })
    for (const e of this.enemigos) {
      const fn = { perro: S.perro, monaguillo: S.monaguillo, beata: S.beata, valiente: S.valiente }[e.tipo]
      lista.push({ y: e.y, dibujar: () => fn(ctx, e, t) })
    }
    lista.push({ y: this.player.y, dibujar: () => S.jugador(ctx, { ...this.player }, t, this.alba) })
    lista.sort((a, b) => a.y - b.y)
    for (const o of lista) o.dibujar(ctx, t)

    for (const q of this.proyectiles) S.aguaBendita(ctx, q, t)
    for (const o of this.ondas) {
      ctx.strokeStyle = `rgba(224,180,58,${0.6 * (1 - o.t / 0.5)})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(o.x, o.y, 8 + (o.t / 0.5) * 72, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (this.player.atk > 0) this.dibujarTajo(ctx)
    for (const f of this.particulas) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / f.max)
      ctx.fillStyle = f.c
      ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s)
    }
    ctx.globalAlpha = 1
    ctx.restore()

    this.dibujarOscuridad(ctx, cx, cy, t)

    // Amanecer: el cielo se tiñe de naranja por arriba y todo se aclara.
    if (this.alba > 0) {
      const g = ctx.createLinearGradient(0, 0, 0, VISTA.h)
      g.addColorStop(0, `rgba(255,150,70,${0.4 * this.alba})`)
      g.addColorStop(1, `rgba(255,200,120,${0.12 * this.alba})`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, VISTA.w, VISTA.h)
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(154,123,255,${this.flash * 0.9})`
      ctx.fillRect(0, 0, VISTA.w, VISTA.h)
    }

    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    for (const tx of this.textos) {
      ctx.globalAlpha = Math.max(0, 1 - tx.t / 0.9)
      ctx.fillStyle = '#000'
      ctx.fillText(tx.txt, Math.round(tx.x - cx) + 1, Math.round(tx.y - cy) + 1)
      ctx.fillStyle = tx.c
      ctx.fillText(tx.txt, Math.round(tx.x - cx), Math.round(tx.y - cy))
    }
    ctx.globalAlpha = 1
    this.dibujarInterfaz(ctx)
  }

  dibujarTajo(ctx) {
    const p = this.player
    const prog = 1 - p.atk / 0.18
    const ang = p.atkAng - 1 + prog * 2
    ctx.strokeStyle = `rgba(230,215,255,${1 - prog * 0.6})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(p.x, p.y - 6, JUGADOR.alcance - 4, ang - 0.5, ang + 0.5)
    ctx.stroke()
  }

  dibujarOscuridad(ctx, cx, cy, t) {
    const d = this.octx
    d.globalCompositeOperation = 'source-over'
    d.clearRect(0, 0, VISTA.w, VISTA.h)
    const nivel = 0.88 * (1 - this.alba)
    if (nivel <= 0.01) return
    d.fillStyle = `rgba(3,5,16,${nivel})`
    d.fillRect(0, 0, VISTA.w, VISTA.h)
    d.globalCompositeOperation = 'destination-out'
    const luz = (x, y, r, f = 1) => {
      const px = x - cx
      const py = y - cy
      if (px < -r || py < -r || px > VISTA.w + r || py > VISTA.h + r) return
      const g = d.createRadialGradient(px, py, 0, px, py, r)
      g.addColorStop(0, `rgba(0,0,0,${f})`)
      g.addColorStop(0.6, `rgba(0,0,0,${f * 0.45})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      d.fillStyle = g
      d.fillRect(px - r, py - r, r * 2, r * 2)
    }
    const p = this.player
    luz(p.x, p.y - 6, 50 + Math.sin(t * 5) * 2, 0.95)
    for (const l of this.mundo.luces) luz(l.x, l.y, l.r + Math.sin(t * 6 + l.x) * 1.5, 0.9)
    for (const a of this.aldeanos) if (a.vela) luz(a.x + 4, a.y - 7, 20, 0.85)
    for (const e of this.enemigos) luz(e.x, e.y - 6, e.tipo === 'valiente' ? 30 : 17, 0.7)
    for (const q of this.proyectiles) luz(q.x, q.y, 14, 0.8)
    for (const c of this.cuerpos) luz(c.x, c.y, 8, 0.25)
    ctx.drawImage(this.oscuro, 0, 0)
  }

  dibujarInterfaz(ctx) {
    const ancho = 90
    const x = (VISTA.w - ancho) / 2
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(x, 6, ancho, 2)
    ctx.fillStyle = this.progreso > 0.8 ? '#ffb15c' : '#f1c66d'
    ctx.fillRect(x, 6, Math.round(ancho * this.progreso), 2)
    ctx.fillRect(Math.round(x + ancho * this.progreso) - 1, 4, 3, 6)

    ctx.textAlign = 'center'
    ctx.font = 'bold 8px monospace'
    if (this.combo >= 2) {
      ctx.globalAlpha = Math.min(1, this.comboT / 0.6)
      ctx.fillStyle = '#000'
      ctx.fillText(`COMBO x${this.combo}`, VISTA.w / 2 + 1, 23)
      ctx.fillStyle = '#f1c66d'
      ctx.fillText(`COMBO x${this.combo}`, VISTA.w / 2, 22)
      ctx.globalAlpha = 1
    }
    if (this.ayuda) {
      ctx.globalAlpha = Math.min(1, this.ayuda.t / 0.5)
      const w = ctx.measureText(this.ayuda.texto).width + 12
      ctx.fillStyle = 'rgba(0,0,10,0.75)'
      ctx.fillRect(Math.round(VISTA.w / 2 - w / 2), VISTA.h - 22, Math.round(w), 14)
      ctx.fillStyle = '#fff'
      ctx.fillText(this.ayuda.texto, VISTA.w / 2, VISTA.h - 12)
      ctx.globalAlpha = 1
    }
  }

  destroy() {
    this.stop()
    this.input?.destroy()
    this.input = null
  }
}
