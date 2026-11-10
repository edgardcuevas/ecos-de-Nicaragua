// engine/Input.js
// WASD / flechas para moverse; Espacio, J o clic/toque en el lienzo para el tajo.
const MAPA = {
  KeyW: 'arriba', ArrowUp: 'arriba', KeyS: 'abajo', ArrowDown: 'abajo',
  KeyA: 'izq', ArrowLeft: 'izq', KeyD: 'der', ArrowRight: 'der',
}
const ATAQUE = new Set(['Space', 'KeyJ', 'KeyK'])

const editable = (t) => t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable === true)

export class Input {
  constructor(canvas, { onAtacar, isActive }) {
    this.canvas = canvas
    this.onAtacar = onAtacar
    this.isActive = isActive
    this.teclas = { arriba: false, abajo: false, izq: false, der: false }

    this._down = (e) => {
      if (!this.isActive() || editable(e.target)) return
      if (MAPA[e.code]) {
        e.preventDefault()
        this.teclas[MAPA[e.code]] = true
      } else if (ATAQUE.has(e.code)) {
        e.preventDefault()
        if (!e.repeat) this.onAtacar()
      }
    }
    this._up = (e) => {
      if (MAPA[e.code]) this.teclas[MAPA[e.code]] = false
    }
    this._limpiar = () => {
      for (const k in this.teclas) this.teclas[k] = false
    }
    this._puntero = (e) => {
      if (!this.isActive()) return
      if (e.button !== undefined && e.button !== 0) return
      e.preventDefault()
      this.onAtacar()
    }
    window.addEventListener('keydown', this._down)
    window.addEventListener('keyup', this._up)
    window.addEventListener('blur', this._limpiar)
    canvas.addEventListener('pointerdown', this._puntero)
  }

  vector() {
    const t = this.teclas
    const x = (t.der ? 1 : 0) - (t.izq ? 1 : 0)
    const y = (t.abajo ? 1 : 0) - (t.arriba ? 1 : 0)
    const l = Math.hypot(x, y)
    return l ? [x / l, y / l] : [0, 0]
  }

  destroy() {
    if (!this.canvas) return
    window.removeEventListener('keydown', this._down)
    window.removeEventListener('keyup', this._up)
    window.removeEventListener('blur', this._limpiar)
    this.canvas.removeEventListener('pointerdown', this._puntero)
    this.canvas = null
  }
}
