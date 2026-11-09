// engine/Sound.js
// Efectos de sonido sintetizados con Web Audio: no hay archivos que cargar.
// El audio solo se activa tras una acción del jugador (start), como exigen los navegadores.

const CLAVE_SILENCIO = 'ecos.runner.silencio'

function leerSilencio() {
  try {
    return localStorage.getItem(CLAVE_SILENCIO) === '1'
  } catch {
    return false
  }
}

export class Sonido {
  constructor() {
    this.ctx = null
    this.muted = leerSilencio()
  }

  /** Crea o reanuda el contexto de audio. Llamar desde un gesto del usuario. */
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

  setMuted(valor) {
    this.muted = Boolean(valor)
    try {
      localStorage.setItem(CLAVE_SILENCIO, this.muted ? '1' : '0')
    } catch {
      /* sin almacenamiento: el ajuste dura solo esta visita */
    }
  }

  _tono({ tipo = 'square', desde, hasta, dur = 0.12, vol = 0.05, retraso = 0 }) {
    const ctx = this.activar()
    if (!ctx) return
    const t0 = ctx.currentTime + retraso
    const osc = ctx.createOscillator()
    const gan = ctx.createGain()
    osc.type = tipo
    osc.frequency.setValueAtTime(desde, t0)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, hasta), t0 + dur)
    gan.gain.setValueAtTime(vol, t0)
    gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gan).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  salto() {
    this._tono({ desde: 320, hasta: 640, dur: 0.11, vol: 0.035 })
  }

  golpe() {
    this._tono({ tipo: 'sawtooth', desde: 240, hasta: 60, dur: 0.25, vol: 0.07 })
  }

  derrota() {
    this._tono({ tipo: 'sawtooth', desde: 320, hasta: 70, dur: 0.7, vol: 0.07 })
  }

  /** El gallo: tres chillidos que suben y bajan. */
  amanecer() {
    this._tono({ tipo: 'triangle', desde: 520, hasta: 980, dur: 0.14, vol: 0.08 })
    this._tono({ tipo: 'triangle', desde: 760, hasta: 1100, dur: 0.12, vol: 0.08, retraso: 0.16 })
    this._tono({ tipo: 'triangle', desde: 1000, hasta: 620, dur: 0.4, vol: 0.08, retraso: 0.32 })
  }
}
