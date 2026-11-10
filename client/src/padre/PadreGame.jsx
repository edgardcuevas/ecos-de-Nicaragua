// padre/PadreGame.jsx
// Interfaz de "El Padre sin Cabeza": campaña de 5 noches, modo infinito por
// rondas, progreso por usuario y ranking público separado por plan.
import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { usePadre } from './usePadre.js'
import { useTactil, usePantallaCompleta } from '../juego/pantallaCompleta.js'
import { BarraEstadio, AvisoGirar } from '../juego/BarraEstadio.jsx'
import RankingPadre from './components/RankingPadre.jsx'
import '../juego/juego.css'
import '../runner/styles/runner.css'
import './styles/padre.css'

const corazones = (n, max) => '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, max - n))
const numero = (n) => new Intl.NumberFormat('es-NI').format(Math.max(0, Math.round(n)))

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

function AvisoGuardado({ guardado, error, autenticado }) {
  if (!autenticado) {
    return (
      <p className="padre-guardado padre-guardado--invitado">
        Sin cuenta: este resultado queda solo en este navegador.{' '}
        <NavLink to="/ingresar">Inicia sesión</NavLink> para guardarlo y entrar al ranking.
      </p>
    )
  }
  if (guardado === 'guardando') {
    return (
      <p className="padre-guardado" role="status">
        Guardando tu partida…
      </p>
    )
  }
  if (guardado === 'guardado') {
    return (
      <p className="padre-guardado padre-guardado--ok" role="status">
        Partida guardada.
      </p>
    )
  }
  if (guardado === 'error') {
    return (
      <p className="padre-guardado padre-guardado--error" role="alert">
        No se pudo guardar la partida{error ? `: ${error}` : '.'}
      </p>
    )
  }
  return null
}

export default function PadreGame() {
  const canvasRef = useRef(null)
  const estadioRef = useRef(null)
  const tactil = useTactil()
  const { activa: fs, entrar, alternar } = usePantallaCompleta(estadioRef)
  const { usuario, premium } = useAuth()
  const autenticado = Boolean(usuario)

  const {
    estado,
    cargandoEstado,
    errorEstado,
    recargarEstado,
    modo,
    nivel,
    running,
    paused,
    lives,
    maxVidas,
    score,
    gameOver,
    resultado,
    objetos,
    ronda,
    record,
    guardado,
    errorGuardado,
    silencio,
    start,
    iniciar,
    seleccionar,
    stop,
    togglePause,
    toggleSilencio,
    mover,
    atacar,
  } = usePadre(canvasRef, { premium, autenticado })

  const niveles = estado?.niveles ?? []
  const infinito = estado?.infinito
  const enInfinito = modo === 'infinita'
  const nivelSeleccionado = enInfinito
    ? null
    : niveles.find((n) => n.id === Number(nivel)) ?? niveles[0] ?? null
  const duracion = enInfinito
    ? infinito?.rondaSegundos ?? 30
    : nivelSeleccionado?.duracionSegundos ?? nivelSeleccionado?.duracion ?? 90
  const puedeComenzar = enInfinito
    ? Boolean(infinito?.desbloqueado)
    : Boolean(nivelSeleccionado?.desbloqueado)
  const victoria = Boolean(resultado?.victoria)
  const mostrarSeleccion = !running && !gameOver
  const mostrarControles = running || gameOver
  const nombreRosario = estado?.objetos?.rosario?.nombre ?? 'El Rosario del Padre'

  const elegirModo = (nuevoModo) => {
    if (running) return
    if (nuevoModo === 'infinita') {
      seleccionar('infinita')
      return
    }
    const desbloqueado = Math.min(estado?.nivelMaxDesbloqueado ?? 1, niveles.length || 1)
    seleccionar('campana', desbloqueado)
  }

  const comenzarEnPantallaCompleta = async () => {
    if (!puedeComenzar) return
    await entrar()
    iniciar(enInfinito ? 'infinita' : 'campana', enInfinito ? 0 : nivelSeleccionado?.id ?? 1)
  }

  const controlesTactiles = (
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
  )

  return (
    <div className="noche-pagina">
      <section className="runner-container padre-pagina">
        <nav className="juegos-selector" aria-label="Juegos">
          <NavLink to="/runner">Huir de las Ceguas</NavLink>
          <NavLink to="/padre-sin-cabeza">El Padre sin Cabeza</NavLink>
        </nav>
        <header className="runner-cabecera">
          <h1>El Padre sin Cabeza</h1>
          <p>Recorre el pueblo en la oscuridad. Que no te detengan antes de que cante el gallo.</p>
        </header>

        {!autenticado && (
          <div className="padre-aviso" role="note">
            <strong>Modo invitado.</strong> Solo puedes jugar la Noche 1. Para desbloquear la
            campaña completa, el modo infinito y guardar tus marcas,{' '}
            <NavLink to="/ingresar">inicia sesión</NavLink> o{' '}
            <NavLink to="/registro">crea una cuenta</NavLink>.
          </div>
        )}

        {errorEstado && (
          <div className="aviso aviso--error" role="alert">
            No se pudo cargar tu progreso: {errorEstado}. Jugarás con la configuración local.{' '}
            <button type="button" className="enlace-boton" onClick={recargarEstado}>
              Reintentar
            </button>
          </div>
        )}

        {mostrarSeleccion && (
          <section className="padre-seleccion" aria-labelledby="padre-seleccion-titulo">
            <div className="padre-seleccion__cabecera">
              <h2 id="padre-seleccion-titulo">Elige tu noche</h2>
              {cargandoEstado && autenticado && (
                <span className="padre-seleccion__cargando">Cargando progreso…</span>
              )}
            </div>

            <div className="padre-modos" role="group" aria-label="Modo de juego">
              <button
                type="button"
                className="padre-tab"
                aria-pressed={!enInfinito}
                onClick={() => elegirModo('campana')}
              >
                Campaña
              </button>
              <button
                type="button"
                className="padre-tab"
                aria-pressed={enInfinito}
                onClick={() => elegirModo('infinita')}
              >
                Modo infinito
              </button>
            </div>

            {enInfinito ? (
              <button
                type="button"
                className={`padre-infinito ${
                  !infinito?.desbloqueado ? 'padre-infinito--bloqueado' : ''
                }`}
                aria-pressed={enInfinito}
                disabled={!infinito?.desbloqueado}
              >
                <span className="padre-infinito__marca" aria-hidden="true">
                  ∞
                </span>
                <span className="padre-infinito__cuerpo">
                  <span className="padre-infinito__nombre">La noche sin fin</span>
                  <span className="padre-infinito__meta">
                    Rondas de {infinito?.rondaSegundos ?? 30} s ·{' '}
                    {infinito?.descansoSegundos ?? 4} s de descanso
                  </span>
                  {infinito?.desbloqueado ? (
                    <span className="padre-infinito__record">
                      {infinito.mejorRondas > 0
                        ? `Mejor marca: ${infinito.mejorRondas} rondas`
                        : 'Sin marca todavía'}
                      {infinito.partidas > 0 ? ` · ${infinito.partidas} partidas` : ''}
                    </span>
                  ) : (
                    <span className="padre-infinito__candado">
                      Necesitas una cuenta para sobrevivir ronda tras ronda.
                    </span>
                  )}
                </span>
              </button>
            ) : (
              <div className="padre-niveles" role="group" aria-label="Noche de la campaña">
                {niveles.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`padre-nivel ${
                      Number(nivel) === n.id ? 'padre-nivel--activo' : ''
                    } ${n.desbloqueado ? '' : 'padre-nivel--bloqueado'}`}
                    aria-pressed={Number(nivel) === n.id}
                    disabled={!n.desbloqueado}
                    onClick={() => seleccionar('campana', n.id)}
                    title={n.nombre}
                  >
                    <span className="padre-nivel__numero" aria-hidden="true">
                      {n.id}
                    </span>
                    <span className="padre-nivel__nombre">{n.nombre}</span>
                    {!n.desbloqueado && (
                      <span className="padre-nivel__candado" aria-label="Bloqueada">
                        Bloqueada
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="padre-resumen">
              <div className="padre-resumen__texto">
                <h3>
                  {enInfinito
                    ? 'La noche sin fin'
                    : `Noche ${nivelSeleccionado?.id ?? 1}: ${
                        nivelSeleccionado?.nombre ?? 'El atrio de León Viejo'
                      }`}
                </h3>
                <p>
                  {enInfinito
                    ? 'Sobrevive ronda tras ronda. Cada ronda llega con más enemigos y más velocidad, y solo termina cuando te quedas sin vidas.'
                    : nivelSeleccionado?.descripcion}
                </p>
              </div>
              <dl className="padre-resumen__datos">
                {enInfinito ? (
                  <>
                    <div>
                      <dt>Ronda</dt>
                      <dd>{duracion} s</dd>
                    </div>
                    <div>
                      <dt>Descanso</dt>
                      <dd>{infinito?.descansoSegundos ?? 4} s</dd>
                    </div>
                    <div>
                      <dt>Mejor marca</dt>
                      <dd>{record > 0 ? `${record} rondas` : 'Sin marca'}</dd>
                    </div>
                    <div>
                      <dt>Partidas</dt>
                      <dd>{infinito?.partidas ?? 0}</dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt>Duración</dt>
                      <dd>{duracion} s</dd>
                    </div>
                    <div>
                      <dt>Aldeanos</dt>
                      <dd>{nivelSeleccionado?.aldeanos ?? 8}</dd>
                    </div>
                    <div>
                      <dt>Perseguidores</dt>
                      <dd>hasta {nivelSeleccionado?.maxEnemigos?.maximo ?? 4}</dd>
                    </div>
                    <div>
                      <dt>Récord</dt>
                      <dd>{record > 0 ? numero(record) : 'Sin marca'}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            <div className="padre-inicio">
              <p className="padre-inicio__nota">
                <strong>{nombreRosario}</strong>: recupera una vida y puede pasarte del máximo. Si
                aparece, el juego te indica hacia dónde está.
              </p>
              <p className="padre-inicio__nota">
                {tactil ? (
                  <>
                    Mueve con la <strong>palanca</strong> y toca <strong>Tajo</strong> para atacar.
                  </>
                ) : (
                  <>
                    Muévete con <kbd>WASD</kbd> / flechas y ataca con <kbd>Espacio</kbd>,{' '}
                    <kbd>J</kbd> o clic.
                  </>
                )}{' '}
                {enInfinito
                  ? 'Cada 3 rondas puede aparecer un rosario.'
                  : 'Cada noche tiene sus propios riesgos y recompensas.'}
              </p>

              {puedeComenzar ? (
                <div className="padre-inicio__acciones">
                  {tactil && !fs ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--luna"
                        onClick={comenzarEnPantallaCompleta}
                      >
                        Jugar en pantalla completa
                      </button>
                      <button type="button" className="btn btn--borde" onClick={start}>
                        Jugar aquí
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn--luna" onClick={start}>
                      Comenzar
                    </button>
                  )}
                </div>
              ) : (
                <div className="padre-bloqueo" role="note">
                  <p>
                    {!autenticado
                      ? 'El modo infinito y las noches 2 a 5 necesitan una cuenta. Como invitado solo puedes jugar la Noche 1.'
                      : 'Esta noche todavía está bloqueada. Supera la anterior para abrirla.'}
                  </p>
                  <div className="padre-inicio__acciones">
                    {!autenticado && (
                      <NavLink to="/ingresar" className="btn btn--luna">
                        Iniciar sesión
                      </NavLink>
                    )}
                    <button
                      type="button"
                      className="btn btn--borde"
                      onClick={() => seleccionar('campana', 1)}
                    >
                      Jugar la Noche 1
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <div ref={estadioRef} className={`runner-escenario estadio ${fs ? 'estadio--fs' : ''}`}>
          <canvas
            ref={canvasRef}
            className="runner-canvas padre-canvas"
            role="img"
            aria-label="Área de juego de El Padre sin Cabeza"
          >
            Tu navegador no permite dibujar el juego en canvas.
          </canvas>

          {(running || gameOver) && (
            <div className="runner-hud padre-hud">
              <span className="runner-hud__puntaje padre-hud__izquierda">
                <span className="padre-hud__modo">
                  {enInfinito ? (
                    <>
                      Ronda <strong>{ronda.ronda}</strong>
                      {ronda.descanso && <em className="padre-hud__descanso"> · descanso</em>}
                    </>
                  ) : (
                    <>
                      Noche <strong>{nivel}</strong>
                    </>
                  )}
                </span>
                <small className="padre-hud__puntaje">
                  {numero(score)} pts
                  {record > 0 && (
                    <span className="runner-hud__record">
                      {' '}
                      · {enInfinito ? 'Mejor ronda' : 'Récord'} {numero(record)}
                    </span>
                  )}
                </small>
              </span>
              <span className="padre-hud__derecha">
                {objetos > 0 && (
                  <span className="padre-hud__objetos" title={`${nombreRosario}: ${objetos}`}>
                    ✝ {objetos}
                  </span>
                )}
                <span
                  className={`runner-hud__vidas ${premium ? 'runner-hud__vidas--premium' : ''}`}
                  role="img"
                  aria-label={`Vidas: ${lives} de ${maxVidas}`}
                >
                  <span aria-hidden="true">{corazones(lives, maxVidas)}</span>
                </span>
              </span>
            </div>
          )}

          {paused && !gameOver && (
            <div className="runner-overlay padre-overlay">
              <p className="runner-overlay__titulo">Pausado</p>
              <p className="runner-overlay__detalle">La noche espera. El Padre también.</p>
              <button type="button" className="btn btn--luna" onClick={togglePause}>
                Reanudar
              </button>
            </div>
          )}

{gameOver && (
            <div className="runner-overlay padre-overlay">
              <p className="runner-overlay__titulo">
                {victoria ? 'Canta el gallo' : enInfinito ? 'La noche sin fin terminó' : 'El pueblo te detuvo'}
              </p>
              <p className="runner-overlay__detalle">
                {enInfinito
                  ? `Superaste ${resultado?.rondas ?? 0} ${resultado?.rondas === 1 ? 'ronda' : 'rondas'}.`
                  : victoria
                    ? 'El Padre se desvanece con la primera luz.'
                    : 'Aguanta un poco más y vuelve a intentarlo.'}
              </p>
              <div className="padre-inicio__acciones">
                <button type="button" className="btn btn--luna" onClick={start}>
                  Reintentar
                </button>
                <button type="button" className="btn btn--borde" onClick={stop}>
                  Elegir otra noche
                </button>
              </div>
            </div>
          )}

          <BarraEstadio
            activa={fs}
            alternarPantalla={alternar}
            running={running}
            paused={paused}
            alternarPausa={togglePause}
          />
          {fs && running && controlesTactiles}
          {fs && <AvisoGirar />}
        </div>

        {!fs && running && controlesTactiles}

        {gameOver && (
          <section className="padre-resultado" aria-labelledby="padre-resultado-titulo">
            <p className="padre-resultado__etiqueta">
              {enInfinito ? 'Modo infinito' : `Noche ${nivel}`}
            </p>
            <h2 id="padre-resultado-titulo">
              {victoria
                ? 'Canta el gallo'
                : enInfinito
                  ? 'La noche sin fin terminó'
                  : 'El pueblo te detuvo'}
            </h2>
            <p className="padre-resultado__detalle">
              {enInfinito ? (
                <>
                  Superaste <strong>{resultado?.rondas ?? 0}</strong>{' '}
                  {resultado?.rondas === 1 ? 'ronda' : 'rondas'}. La próxima noche puede ser más
                  larga.
                </>
              ) : victoria ? (
                'El Padre se desvanece con la primera luz.'
              ) : (
                'Aguanta un poco más y vuelve a intentarlo.'
              )}
            </p>
            {resultado?.nuevoRecord && <p className="padre-resultado__record">¡Nuevo récord!</p>}

            <dl className="padre-resultado__datos">
              <div>
                <dt>Puntaje</dt>
                <dd>{numero(resultado?.score ?? score)}</dd>
              </div>
              <div>
                <dt>Víctimas</dt>
                <dd>{resultado?.muertos ?? 0}</dd>
              </div>
              <div>
                <dt>Se salvaron</dt>
                <dd>{resultado?.salvados ?? 0}</dd>
              </div>
              <div>
                <dt>Rosarios</dt>
                <dd>{resultado?.objetosUsados ?? 0}</dd>
              </div>
            </dl>

            <AvisoGuardado guardado={guardado} error={errorGuardado} autenticado={autenticado} />

            <div className="padre-inicio__acciones">
              <button type="button" className="btn btn--luna" onClick={start}>
                Reintentar
              </button>
              <button type="button" className="btn btn--borde" onClick={stop}>
                Elegir otra noche
              </button>
            </div>
          </section>
        )}

        <details className="padre-ayuda">
          <summary>Cómo jugar</summary>
          <p>
            Cuidado: el perro ladra, la campana te frena y el agua bendita quema. El rosario te
            devuelve una vida. Mejor en pantalla completa y con el teléfono girado.
          </p>
        </details>

        {mostrarControles && (
          <div className="runner-controls">
            {running && (
              <button type="button" className="btn btn--noche" onClick={togglePause}>
                {paused ? 'Reanudar' : 'Pausar'}
              </button>
            )}
            {running && (
              <button type="button" className="btn btn--borde" onClick={stop}>
                Detener
              </button>
            )}
            {gameOver && (
              <button type="button" className="btn btn--noche" onClick={start}>
                Reintentar
              </button>
            )}
            {gameOver && (
              <button type="button" className="btn btn--borde" onClick={stop}>
                Elegir otra noche
              </button>
            )}
            <button type="button" className="btn btn--borde" onClick={alternar}>
              Pantalla completa
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
        )}

        <RankingPadre nivelInicial={enInfinito ? 1 : nivel || 1} nivelActual={enInfinito ? 0 : nivel} />
      </section>
    </div>
  )
}
