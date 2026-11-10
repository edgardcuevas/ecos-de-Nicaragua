// padre/PadreGame.jsx
import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { usePadre } from './usePadre.js'
import { vidasMaximas, NOCHE } from './config.js'
import '../runner/styles/runner.css'
import './styles/padre.css'

const corazones = (n, max) => '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, max - n))

function Palanca({ onMover }) {
  const base = useRef(null)
  const perilla = useRef(null)
  const actualizar = (e) => {
    const r = base.current.getBoundingClientRect()
    const radio = r.width / 2
    let dx = e.clientX - (r.left + radio)
    let dy = e.clientY - (r.top + radio)
    const l = Math.hypot(dx, dy)
    if (l > radio) {
      dx = (dx / l) * radio
      dy = (dy / l) * radio
    }
    perilla.current.style.transform = `translate(${dx}px, ${dy}px)`
    onMover(dx / radio, dy / radio)
  }
  const soltar = () => {
    if (perilla.current) perilla.current.style.transform = ''
    onMover(0, 0)
  }
  return (
    <div
      ref={base}
      className="padre-palanca"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        actualizar(e)
      }}
      onPointerMove={(e) => e.buttons && actualizar(e)}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      role="group"
      aria-label="Palanca de movimiento"
    >
      <div ref={perilla} className="padre-palanca__perilla" />
    </div>
  )
}

export default function PadreGame() {
  const canvasRef = useRef(null)
  const { premium } = useAuth()
  const { running, paused, lives, score, gameOver, resultado, record, silencio, start, stop, togglePause, toggleSilencio, mover, atacar } =
    usePadre(canvasRef, { premium })
  const maxVidas = vidasMaximas(premium)
  const victoria = Boolean(resultado?.victoria)
  const overlay = !running || paused || gameOver

  return (
    <div className="noche-pagina">
      <section className="runner-container">
        <nav className="juegos-selector" aria-label="Juegos">
          <NavLink to="/runner">Huir de las Ceguas</NavLink>
          <NavLink to="/padre-sin-cabeza">El Padre sin Cabeza</NavLink>
        </nav>
        <header className="runner-cabecera">
          <h1>El Padre sin Cabeza</h1>
          <p>Recorre el pueblo en la oscuridad. Que no te detengan antes de que cante el gallo.</p>
        </header>

        <div className="runner-escenario">
          <canvas ref={canvasRef} className="runner-canvas padre-canvas" role="img" aria-label="Área de juego de El Padre sin Cabeza">
            Tu navegador no permite dibujar el juego en canvas.
          </canvas>

          {(running || gameOver) && (
            <div className="runner-hud">
              <span className="runner-hud__puntaje">
                Puntaje <strong>{score}</strong>
                {record > 0 && <small className="runner-hud__record"> · Récord {record}</small>}
              </span>
              <span
                className={`runner-hud__vidas ${premium ? 'runner-hud__vidas--premium' : ''}`}
                role="img"
                aria-label={`Vidas: ${lives} de ${maxVidas}`}
              >
                <span aria-hidden="true">{corazones(lives, maxVidas)}</span>
              </span>
            </div>
          )}

          {overlay && (
            <div className={`runner-overlay ${gameOver ? 'runner-overlay--final' : ''}`}>
              {gameOver ? (
                <>
                  <p className="runner-overlay__titulo">{victoria ? 'Canta el gallo' : 'El pueblo te detuvo'}</p>
                  {victoria && <p className="runner-overlay__detalle">El Padre se desvanece con la primera luz.</p>}
                  {resultado?.nuevoRecord && <p className="runner-overlay__record">¡Nuevo récord!</p>}
                  <p className="runner-overlay__puntaje">
                    Puntaje final: <strong>{resultado?.score ?? score}</strong>
                  </p>
                  <p className="runner-overlay__detalle">
                    {resultado?.muertos ?? 0} víctimas · {resultado?.salvados ?? 0} se encerraron a salvo
                  </p>
                  <button type="button" className="btn btn--luna" onClick={start}>
                    Reintentar
                  </button>
                </>
              ) : paused ? (
                <>
                  <p className="runner-overlay__titulo">Pausado</p>
                  <button type="button" className="btn btn--luna" onClick={togglePause}>
                    Reanudar
                  </button>
                </>
              ) : (
                <>
                  <p className="runner-overlay__titulo">La noche es tuya</p>
                  <p className="runner-overlay__detalle">
                    Muévete con <kbd>WASD</kbd> o las flechas y da tajos con <kbd>Espacio</kbd>. Sobrevive {NOCHE.segundos} s hasta el
                    amanecer. Los aldeanos corren a esconderse: alcánzalos antes.
                  </p>
                  <button type="button" className="btn btn--luna" onClick={start}>
                    Comenzar
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="padre-tactil">
          <Palanca onMover={mover} />
          <button
            type="button"
            className="padre-tactil__tajo"
            onPointerDown={(e) => {
              e.preventDefault()
              atacar()
            }}
          >
            Tajo
          </button>
        </div>

        <p className="runner-ayuda">
          Mueve con <kbd>WASD</kbd> / flechas · Tajo con <kbd>Espacio</kbd>, <kbd>J</kbd> o clic. Cuidado: el perro ladra, la campana te frena y el agua bendita quema.
        </p>

        <div className="runner-controls">
          <button type="button" className="btn btn--noche" onClick={start} disabled={running}>
            {gameOver ? 'Reintentar' : 'Iniciar'}
          </button>
          <button type="button" className="btn btn--borde" onClick={togglePause} disabled={!running}>
            {paused ? 'Reanudar' : 'Pausar'}
          </button>
          <button type="button" className="btn btn--borde" onClick={stop} disabled={!running}>
            Detener
          </button>
          <button type="button" className="btn btn--borde" onClick={toggleSilencio} aria-pressed={silencio}>
            {silencio ? 'Sonido: no' : 'Sonido: sí'}
          </button>
        </div>
      </section>
    </div>
  )
}
