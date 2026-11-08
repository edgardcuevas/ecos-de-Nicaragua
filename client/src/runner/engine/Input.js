// engine/Input.js
// Teclado (Espacio / ↑ / W) y puntero (tap o clic) sobre el canvas.
// No conoce React: recibe callbacks y una función que indica si el juego está activo.

const TECLAS_SALTO = new Set(['Space', 'ArrowUp', 'KeyW'])

function esCampoEditable(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true
}

export class Input {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onJump: () => void, isActive: () => boolean }} handlers
   */
  constructor(canvas, { onJump, isActive }) {
    this.canvas = canvas
    this.onJump = onJump
    this.isActive = isActive

    this._onKeyDown = (event) => {
      if (event.repeat || !this.isActive() || esCampoEditable(event.target)) return
      if (!TECLAS_SALTO.has(event.code)) return
      event.preventDefault()
      this.onJump()
    }

    this._onPointerDown = (event) => {
      if (!this.isActive()) return
      if (event.button !== undefined && event.button !== 0) return
      event.preventDefault()
      this.onJump()
    }

    window.addEventListener('keydown', this._onKeyDown)
    canvas.addEventListener('pointerdown', this._onPointerDown)
  }

  destroy() {
    if (!this.canvas) return
    window.removeEventListener('keydown', this._onKeyDown)
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    this.canvas = null
    this.onJump = null
    this.isActive = null
  }
}
