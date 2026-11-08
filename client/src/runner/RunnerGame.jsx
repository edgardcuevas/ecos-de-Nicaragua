// client/src/runner/RunnerGame.jsx
import { useRef } from 'react'
import { useAuth } from '../auth.jsx'
import { useRunner } from './useRunner.js'
import './styles/runner.css'

const MAX_VIDAS = 5
const corazones = (n) => '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, MAX_VIDAS - n))
const segundos = (n) => `${Math.max(0, Math.round(n))} s`

export default function RunnerGame() {
  const canvasRef = useRef(null)
  const { premium } = useAuth()
  const { running, paused, lives, score, gameOver, resultado, start, stop, togglePause } = useRunner(canvasRef, { premium })

  const overlay = !running || paused || gameOver

  return (
    <section className="runner-container">
      <header className="runner-cabecera">
        <h1>Huir de las Ceguas</h1>
        <p>El Borracho corre entre las sombras. Esquiva a las Ceguas y salta los obstáculos.</p>
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
            </span>
            <span
              className={`runner-hud__vidas ${premium ? 'runner-hud__vidas--premium' : ''}`}
              role="img"
              aria-label={premium ? 'Vidas ilimitadas (premium)' : `Vidas: ${lives} de ${MAX_VIDAS}`}
            >
              <span aria-hidden="true">{premium ? '∞' : corazones(lives)}</span>
            </span>
          </div>
        )}

        {overlay && (
          <div className={`runner-overlay ${gameOver ? 'runner-overlay--final' : ''}`}>
            {gameOver ? (
              <>
                <p className="runner-overlay__titulo">Game Over</p>
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
                  Salta con <kbd>Espacio</kbd> o <kbd>↑</kbd>, o toca la pantalla.
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
        Salta con <kbd>Espacio</kbd> o <kbd>↑</kbd>, o toca el canvas.
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
      </div>
    </section>
  )
}
