// client/src/runner/RunnerGame.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { mensajeError, post } from '../api.js'
import { useApi } from '../hooks.js'
import { useRunner } from './useRunner.js'
import { vidasMaximas } from './config.js'
import './styles/runner.css'

const CLAVE_RECORD_INVITADO = 'ecos.runner.record.invitado'

const leerRecordInvitado = () => {
  try {
    return Number(localStorage.getItem(CLAVE_RECORD_INVITADO)) || 0
  } catch {
    return 0
  }
}

const guardarRecordInvitado = (valor) => {
  try {
    localStorage.setItem(CLAVE_RECORD_INVITADO, String(valor))
  } catch {
    /* sin almacenamiento: el récord dura solo esta visita */
  }
}

const corazones = (n, max) => '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, max - n))
const segundos = (n) => `${Math.max(0, Math.round(n))} s`

export default function RunnerGame() {
  const canvasRef = useRef(null)
  const { usuario, premium, cargando: cargandoSesion } = useAuth()
  const {
    data: estado,
    error: errorEstado,
    cargando: cargandoEstado,
    recargar,
  } = useApi('/runner/estado')
  const [nivelId, setNivelId] = useState(1)
  const [recordInvitado, setRecordInvitado] = useState(leerRecordInvitado)
  const [guardado, setGuardado] = useState(null)
  const [verRanking, setVerRanking] = useState(false)

  const niveles = estado?.niveles ?? []
  const nivel = niveles.find((n) => n.id === nivelId) ?? niveles[0] ?? null
  const maxVidas = vidasMaximas(premium)

  const guardarPartida = useCallback(
    async (info) => {
      if (!info) return

      if (!usuario) {
        const nuevo = info.score > recordInvitado
        if (nuevo) {
          setRecordInvitado(info.score)
          guardarRecordInvitado(info.score)
        }
        setGuardado({ estado: 'invitado', nuevoRecord: nuevo })
        return
      }

      setGuardado({ estado: 'guardando' })
      try {
        const { data } = await post('/runner/partidas', {
          nivel: info.nivel,
          puntaje: info.score,
          distancia: info.distance,
          duracionSegundos: Math.max(1, Math.round(info.elapsed)),
          vidasRestantes: info.lives,
          victoria: Boolean(info.victoria),
        })
        setGuardado({
          estado: 'ok',
          nuevoRecord: data.nuevoRecord,
          nivelDesbloqueado: data.nivelDesbloqueado,
        })
        recargar()
      } catch (error) {
        setGuardado({ estado: 'error', mensaje: mensajeError(error) })
      }
    },
    [usuario, recordInvitado, recargar],
  )

  const {
    running, paused, lives, score, gameOver, resultado, start, stop, togglePause,
    silencio, toggleSilencio, saltar, soltarSalto, agachar,
  } = useRunner(canvasRef, { premium, onFinish: guardarPartida })

  const {
    data: ranking,
    error: errorRanking,
    cargando: cargandoRanking,
  } = useApi(verRanking && nivel ? '/runner/ranking' : null, {
    nivel: nivel?.id,
    limit: 10,
  })

  // Si la sesión cambia o se recarga el estado, mantener una noche válida.
  useEffect(() => {
    if (!niveles.length) return
    const actual = niveles.find((n) => n.id === nivelId)
    if (!actual || !actual.desbloqueado) {
      const masAvanzada = niveles.find(
        (n) => n.id === estado?.nivelMaxDesbloqueado && n.desbloqueado,
      )
      const elegida = masAvanzada ?? niveles.find((n) => n.desbloqueado) ?? niveles[0]
      setNivelId(elegida.id)
    }
  }, [estado, nivelId, niveles])

  const iniciar = useCallback(() => {
    if (!nivel?.desbloqueado) return
    setGuardado(null)
    start(nivel)
  }, [nivel, start])

  const recordNivel = (n) => (!usuario && n.id === 1 ? recordInvitado : n.mejorPuntaje)
  const recordMostrado = nivel ? recordNivel(nivel) : 0
  const victoria = Boolean(resultado?.victoria)
  const siguiente = guardado?.nivelDesbloqueado
    ? niveles.find((n) => n.id === guardado.nivelDesbloqueado)
    : null
  const overlay = !running || paused || gameOver
  const bloqueado = !nivel || !nivel.desbloqueado || cargandoEstado || cargandoSesion

  const jugarSiguiente = () => {
    if (!siguiente) return
    setNivelId(siguiente.id)
    setGuardado(null)
    start(siguiente)
  }

  return (
    <div className="noche-pagina">
      <section className="runner-container">
        <header className="runner-cabecera">
          <h1>Huir de las Ceguas</h1>
          <p>
            {nivel
              ? `Noche ${nivel.id}: ${nivel.nombre}`
              : 'El Borracho corre entre las sombras. Resiste hasta que cante el gallo.'}
          </p>
        </header>

        {niveles.length > 0 && (
          <div className="runner-niveles" role="group" aria-label="Noches de la campaña">
            {niveles.map((n) => {
              const activo = n.id === nivel?.id
              const record = recordNivel(n)
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`runner-nivel ${activo ? 'runner-nivel--activo' : ''} ${
                    n.desbloqueado ? '' : 'runner-nivel--bloqueado'
                  }`}
                  onClick={() => setNivelId(n.id)}
                  disabled={!n.desbloqueado || running}
                  aria-pressed={activo}
                >
                  <span className="runner-nivel__num">Noche {n.id}</span>
                  <span className="runner-nivel__nombre">{n.nombre}</span>
                  <span className="runner-nivel__meta">
                    {n.desbloqueado
                      ? record > 0
                        ? `Récord ${record}`
                        : 'Sin récord'
                      : usuario
                        ? 'Bloqueada'
                        : 'Inicia sesión'}
                  </span>
                </button>
              )
            })}
          </div>
        )}

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
                {recordMostrado > 0 && (
                  <small className="runner-hud__record"> · Récord {recordMostrado}</small>
                )}
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
                  {victoria && (
                    <p className="runner-overlay__detalle">
                      Cantó el gallo y la Cegua se esfumó.
                    </p>
                  )}
                  {guardado?.nuevoRecord && (
                    <p className="runner-overlay__record">¡Nuevo récord!</p>
                  )}
                  <p className="runner-overlay__puntaje">
                    Puntaje final: <strong>{resultado?.score ?? score}</strong>
                  </p>
                  <p className="runner-overlay__detalle">
                    {resultado?.collisions ?? 0} golpes · {segundos(resultado?.elapsed ?? 0)} en fuga
                  </p>

                  {guardado?.estado === 'guardando' && (
                    <p className="runner-overlay__detalle">Guardando progreso…</p>
                  )}

                  {guardado?.estado === 'error' && (
                    <>
                      <p className="runner-overlay__error">{guardado.mensaje}</p>
                      <button
                        type="button"
                        className="btn btn--borde"
                        onClick={() => guardarPartida(resultado)}
                      >
                        Reintentar guardado
                      </button>
                    </>
                  )}

                  {guardado?.nivelDesbloqueado && (
                    <p className="runner-overlay__record">
                      Se desbloqueó la noche {guardado.nivelDesbloqueado}
                      {siguiente ? `: ${siguiente.nombre}` : ''}
                    </p>
                  )}

                  {!usuario && (
                    <p className="runner-overlay__detalle">
                      <Link to="/ingresar">Inicia sesión</Link> para guardar tu progreso y
                      desbloquear más noches.
                    </p>
                  )}

                  <div className="runner-overlay__acciones">
                    <button
                      type="button"
                      className="btn btn--luna"
                      onClick={iniciar}
                      disabled={guardado?.estado === 'guardando'}
                    >
                      Reintentar
                    </button>
                    {siguiente && (
                      <button
                        type="button"
                        className="btn btn--borde"
                        onClick={jugarSiguiente}
                        disabled={guardado?.estado === 'guardando'}
                      >
                        Jugar noche {siguiente.id}
                      </button>
                    )}
                  </div>
                </>
              ) : paused ? (
                <>
                  <p className="runner-overlay__titulo">Pausado</p>
                  <p className="runner-overlay__detalle">La Cegua espera. El Borracho también.</p>
                  <button type="button" className="btn btn--luna" onClick={togglePause}>
                    Reanudar
                  </button>
                </>
              ) : errorEstado ? (
                <>
                  <p className="runner-overlay__titulo">No se pudieron cargar las noches</p>
                  <p className="runner-overlay__error">{mensajeError(errorEstado)}</p>
                  <button type="button" className="btn btn--luna" onClick={recargar}>
                    Reintentar
                  </button>
                </>
              ) : (
                <>
                  <p className="runner-overlay__titulo">
                    {nivel ? `Noche ${nivel.id}: ${nivel.nombre}` : '¿Listo para huir?'}
                  </p>
                  <p className="runner-overlay__detalle">
                    {nivel?.descripcion ??
                      'El Borracho corre entre las sombras. Resiste hasta que cante el gallo.'}
                  </p>
                  <p className="runner-overlay__detalle">
                    Salta con <kbd>Espacio</kbd> o <kbd>↑</kbd> (mantén para saltar más alto) y
                    agáchate con <kbd>↓</kbd>. Sobrevive {nivel?.duracionSegundos ?? 100} s hasta
                    el amanecer.
                  </p>
                  <button
                    type="button"
                    className="btn btn--luna"
                    onClick={iniciar}
                    disabled={bloqueado}
                  >
                    {cargandoEstado || cargandoSesion
                      ? 'Cargando noches…'
                      : nivel?.desbloqueado
                        ? 'Comenzar'
                        : 'Noche bloqueada'}
                  </button>
                  {!usuario && (
                    <p className="runner-overlay__detalle">
                      <Link to="/ingresar">Inicia sesión</Link> para desbloquear las demás noches.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <p className="runner-ayuda">
          Salta con <kbd>Espacio</kbd> o <kbd>↑</kbd>, agáchate con <kbd>↓</kbd> o <kbd>S</kbd>.
          Las lianas colgantes exigen agacharse.
        </p>

        <div className="runner-tactil" aria-label="Controles táctiles">
          <button
            type="button"
            className="runner-tactil__btn"
            onPointerDown={(e) => {
              e.preventDefault()
              agachar(true)
            }}
            onPointerUp={() => agachar(false)}
            onPointerCancel={() => agachar(false)}
            onPointerLeave={() => agachar(false)}
          >
            Agacharse
          </button>
          <button
            type="button"
            className="runner-tactil__btn runner-tactil__btn--salto"
            onPointerDown={(e) => {
              e.preventDefault()
              saltar()
            }}
            onPointerUp={soltarSalto}
            onPointerCancel={soltarSalto}
          >
            Saltar
          </button>
        </div>

        <div className="runner-controls">
          <button type="button" className="btn btn--noche" onClick={iniciar} disabled={running || bloqueado}>
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
          <button
            type="button"
            className="btn btn--borde"
            onClick={() => setVerRanking((v) => !v)}
            aria-expanded={verRanking}
          >
            {verRanking ? 'Ocultar ranking' : 'Ver ranking'}
          </button>
        </div>

        {verRanking && (
          <section className="runner-ranking" aria-label={`Ranking de la noche ${nivel?.id}`}>
            <h2>Mejores en la noche {nivel?.id}</h2>
            {cargandoRanking ? (
              <p className="runner-ranking__vacio">Cargando ranking…</p>
            ) : errorRanking ? (
              <p className="runner-ranking__vacio">{mensajeError(errorRanking)}</p>
            ) : (
              <div className="runner-ranking__columnas">
                <div>
                  <h3>Gratis</h3>
                  {ranking?.gratis?.length ? (
                    <ol>
                      {ranking.gratis.map((e) => (
                        <li key={`g-${e.posicion}`}>
                          <span>{e.nombreUsuario}</span>
                          <strong>{e.puntaje}</strong>
                          <small>{e.victorias} victorias</small>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="runner-ranking__vacio">Sin marcas todavía.</p>
                  )}
                </div>
                <div>
                  <h3>Premium</h3>
                  {ranking?.premium?.length ? (
                    <ol>
                      {ranking.premium.map((e) => (
                        <li key={`p-${e.posicion}`}>
                          <span>{e.nombreUsuario}</span>
                          <strong>{e.puntaje}</strong>
                          <small>{e.victorias} victorias</small>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="runner-ranking__vacio">Sin marcas todavía.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </section>
    </div>
  )
}
