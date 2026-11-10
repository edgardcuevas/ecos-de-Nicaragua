// engine/Sound.js — efectos sintetizados con Web Audio (sin archivos).
const CLAVE = 'ecos.padre.silencio'
const leer = () => {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}

export class Sonido {
  constructor() {
    this.ctx = null
    this.muted = leer()
  }

  activar() {
    if (this.muted) return null
    if (!this.ctx) {
      const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null
      if (!AC) return null
      try {
        this.ctx = new AC()
      } catch {
        return null
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume?.()
    return this.ctx
  }

  setMuted(v) {
    this.muted = Boolean(v)
    try {
      localStorage.setItem(CLAVE, this.muted ? '1' : '0')
    } catch {
      /* solo esta visita */
    }
  }

  _tono({ tipo = 'square', desde, hasta, dur = 0.12, vol = 0.05, retraso = 0 }) {
    const ctx = this.activar()
    if (!ctx) return
    const t0 = ctx.currentTime + retraso
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = tipo
    o.frequency.setValueAtTime(desde, t0)
    o.frequency.exponentialRampToValueAtTime(Math.max(1, hasta), t0 + dur)
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g).connect(ctx.destination)
    o.start(t0)
    o.stop(t0 + dur + 0.02)
  }

  _ruido({ dur = 0.15, vol = 0.06, filtro = 1800 }) {
    const ctx = this.activar()
    if (!ctx) return
    const n = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const src = ctx.createBufferSource()
    const f = ctx.createBiquadFilter()
    const g = ctx.createGain()
    f.type = 'lowpass'
    f.frequency.value = filtro
    g.gain.value = vol
    src.buffer = buf
    src.connect(f).connect(g).connect(ctx.destination)
    src.start()
  }

  tajo() { this._ruido({ dur: 0.12, vol: 0.05, filtro: 3000 }) }
  muerte() {
    this._tono({ tipo: 'sawtooth', desde: 180, hasta: 50, dur: 0.3, vol: 0.06 })
    this._ruido({ dur: 0.18, vol: 0.05, filtro: 700 })
  }
  grito() { this._tono({ tipo: 'triangle', desde: 700, hasta: 1100, dur: 0.18, vol: 0.03 }) }
  golpe() { this._tono({ tipo: 'sawtooth', desde: 260, hasta: 60, dur: 0.3, vol: 0.07 }) }
  ladrido() {
    this._tono({ tipo: 'square', desde: 420, hasta: 220, dur: 0.1, vol: 0.05 })
    this._tono({ tipo: 'square', desde: 440, hasta: 230, dur: 0.1, vol: 0.05, retraso: 0.16 })
  }
  campana() {
    this._tono({ tipo: 'sine', desde: 660, hasta: 640, dur: 0.9, vol: 0.07 })
    this._tono({ tipo: 'sine', desde: 1320, hasta: 1290, dur: 0.6, vol: 0.03 })
  }
  agua() { this._ruido({ dur: 0.2, vol: 0.04, filtro: 5000 }) }
  campanillaSuave() {
    this._tono({ tipo: 'sine', desde: 1760, hasta: 1700, dur: 0.35, vol: 0.025 })
  }
  campanilla() {
    this._tono({ tipo: 'sine', desde: 2093, hasta: 2060, dur: 0.5, vol: 0.05 })
    this._tono({ tipo: 'sine', desde: 2637, hasta: 2600, dur: 0.4, vol: 0.035, retraso: 0.08 })
    this._tono({ tipo: 'sine', desde: 3136, hasta: 3100, dur: 0.35, vol: 0.02, retraso: 0.16 })
  }
  derrota() { this._tono({ tipo: 'sawtooth', desde: 320, hasta: 60, dur: 0.8, vol: 0.07 }) }
  amanecer() {
    this._tono({ tipo: 'triangle', desde: 520, hasta: 980, dur: 0.14, vol: 0.08 })
    this._tono({ tipo: 'triangle', desde: 760, hasta: 1100, dur: 0.12, vol: 0.08, retraso: 0.16 })
    this._tono({ tipo: 'triangle', desde: 1000, hasta: 620, dur: 0.4, vol: 0.08, retraso: 0.32 })
  }
}
