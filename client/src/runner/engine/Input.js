// engine/Input.js
// Teclado: Espacio / ↑ / W saltan (mantener = salto más alto); ↓ / S agachan.
// Puntero: tocar o hacer clic en el canvas salta.
// No conoce React: recibe callbacks y una función que indica si el juego está activo.

const TECLAS_SALTO = new Set(['Space', 'ArrowUp', 'KeyW'])
const TECLAS_AGACHAR = new Set(['ArrowDown', 'KeyS'])

function esCampoEditable(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true
}

export class Input {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{
   *   onJump: () => void,
   *   onJumpRelease: () => void,
   *   onDuck: (on: boolean) => void,
   *   isActive: () => boolean,
   * }} handlers
   */
  constructor(canvas, { onJump, onJumpRelease, onDuck, isActive }) {
    this.canvas = canvas
    this.onJump = onJump
    this.onJumpRelease = onJumpRelease
    this.onDuck = onDuck
    this.isActive = isActive

    this._onKeyDown = (event) => {
      if (event.repeat || !this.isActive() || esCampoEditable(event.target)) return
      if (TECLAS_SALTO.has(event.code)) {
        event.preventDefault()
        this.onJump()
      } else if (TECLAS_AGACHAR.has(event.code)) {
        event.preventDefault()
        this.onDuck(true)
      }
    }

    // Las teclas se sueltan aunque el juego ya no esté activo: así nada se queda "pegado".
    this._onKeyUp = (event) => {
      if (TECLAS_SALTO.has(event.code)) this.onJumpRelease()
      else if (TECLAS_AGACHAR.has(event.code)) this.onDuck(false)
    }

    this._onPointerDown = (event) => {
      if (!this.isActive()) return
      if (event.button !== undefined && event.button !== 0) return
      event.preventDefault()
      this.onJump()
    }

    this._onPointerUp = () => this.onJumpRelease()

    this._onBlur = () => {
      this.onJumpRelease()
      this.onDuck(false)
    }

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('blur', this._onBlur)
    canvas.addEventListener('pointerdown', this._onPointerDown)
    canvas.addEventListener('pointerup', this._onPointerUp)
    canvas.addEventListener('pointercancel', this._onPointerUp)
  }

  destroy() {
    if (!this.canvas) return
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('blur', this._onBlur)
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    this.canvas.removeEventListener('pointerup', this._onPointerUp)
    this.canvas.removeEventListener('pointercancel', this._onPointerUp)
    this.canvas = null
    this.onJump = null
    this.onJumpRelease = null
    this.onDuck = null
    this.isActive = null
  }
}
