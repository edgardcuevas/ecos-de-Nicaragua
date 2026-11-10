// client/src/runner/RunnerGame.jsx
import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { useRunner } from './useRunner.js'
import { vidasMaximas } from './config.js'
import './styles/runner.css'

const corazones = (n, max) => '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, max - n))
const segundos = (n) => `${Math.max(0, Math.round(n))} s`

export default function RunnerGame() {
  const canvasRef = useRef(null)
  const { premium } = useAuth()
  const {
    running, paused, lives, score, gameOver, resultado, start, stop, togglePause,
    record, silencio, toggleSilencio, saltar, soltarSalto, agachar,
  } = useRunner(canvasRef, { premium })
  const victoria = Boolean(resultado?.victoria)

  const maxVidas = vidasMaximas(premium)
  const overlay = !running || paused || gameOver

  return (
    <div className="noche-pagina">
    <section className="runner-container">
      <nav className="juegos-selector" aria-label="Juegos">
        <NavLink to="/runner">Huir de las Ceguas</NavLink>
        <NavLink to="/padre-sin-cabeza">El Padre sin Cabeza</NavLink>
      </nav>
      <header className="runner-cabecera">
        <h1>Huir de las Ceguas</h1>
        <p>El Borracho corre entre las sombras. Resiste hasta que cante el gallo.</p>
      </header>

      <div className="runner-escenario">
        <canvas
          ref={canvasRef}
          className="runner-canvas"
          role="img"
          aria-label="Área de juego de Huir de las Ceguas"
        >
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
                <p className="runner-overlay__titulo">{victoria ? '¡Amaneció!' : 'Game Over'}</p>
                {victoria && <p className="runner-overlay__detalle">Cantó el gallo y la Cegua se esfumó.</p>}
                {resultado?.nuevoRecord && <p className="runner-overlay__record">¡Nuevo récord!</p>}
                <p className="runner-overlay__puntaje">
                  Puntaje final: <strong>{resultado?.score ?? score}</strong>
                </p>
                <p className="runner-overlay__detalle">
                  {resultado?.collisions ?? 0} golpes · {segundos(resultado?.elapsed ?? 0)} en fuga
                </p>
                <button type="button" className="btn btn--luna" onClick={start}>
                  Reintentar
                </button>
              </>
            ) : paused ? (
              <>
                <p className="runner-overlay__titulo">Pausado</p>
                <p className="runner-overlay__detalle">La Cegua espera. El Borracho también.</p>
                <button type="button" className="btn btn--luna" onClick={togglePause}>
                  Reanudar
                </button>
              </>
            ) : (
              <>
                <p className="runner-overlay__titulo">¿Listo para huir?</p>
                <p className="runner-overlay__detalle">
                  Salta con <kbd>Espacio</kbd> o <kbd>↑</kbd> (mantén para saltar más alto) y agáchate con <kbd>↓</kbd>.
                  Sobrevive 100 s hasta el amanecer.
                </p>
                <button type="button" className="btn btn--luna" onClick={start}>
                  Comenzar
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <p className="runner-ayuda">
        Salta con <kbd>Espacio</kbd> o <kbd>↑</kbd>, agáchate con <kbd>↓</kbd> o <kbd>S</kbd>. Las lianas colgantes exigen agacharse.
      </p>

      <div className="runner-tactil" aria-label="Controles táctiles">
        <button
          type="button"
          className="runner-tactil__btn"
          onPointerDown={(e) => { e.preventDefault(); agachar(true) }}
          onPointerUp={() => agachar(false)}
          onPointerCancel={() => agachar(false)}
          onPointerLeave={() => agachar(false)}
        >
          Agacharse
        </button>
        <button
          type="button"
          className="runner-tactil__btn runner-tactil__btn--salto"
          onPointerDown={(e) => { e.preventDefault(); saltar() }}
          onPointerUp={soltarSalto}
          onPointerCancel={soltarSalto}
        >
          Saltar
        </button>
      </div>

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
        <button
          type="button"
          className="btn btn--borde"
          onClick={toggleSilencio}
          aria-pressed={silencio}
        >
          {silencio ? 'Sonido: no' : 'Sonido: sí'}
        </button>
      </div>
    </section>
    </div>
  )
}
