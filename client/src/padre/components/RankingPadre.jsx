// padre/components/RankingPadre.jsx
// Tabla pública de marcas. El servidor separa gratis y premium y nunca
// devuelve correo ni identificadores de usuario.
import { useCallback, useEffect, useState } from 'react'
import { get, mensajeError } from '../../api.js'
import { NIVELES } from '../config.js'

const MEDALLAS = ['', 'I', 'II', 'III']

function Tabla({ titulo, filas, modo, cargando }) {
  return (
    <div className="padre-ranking__bloque">
      <h4 className="padre-ranking__titulo">{titulo}</h4>
      {cargando ? (
        <p className="padre-ranking__vacio">Cargando marcas…</p>
      ) : filas.length === 0 ? (
        <p className="padre-ranking__vacio">Aún no hay marcas en esta tabla.</p>
      ) : (
        <table className="padre-ranking__tabla">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Jugador</th>
              <th scope="col">{modo === 'infinita' ? 'Rondas' : 'Puntaje'}</th>
              <th scope="col">Victorias</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={`${titulo}-${fila.posicion}-${fila.nombreUsuario}`}>
                <td className="padre-ranking__posicion" aria-label={`Posición ${fila.posicion}`}>
                  {MEDALLAS[fila.posicion] ?? fila.posicion}
                </td>
                <th scope="row" className="padre-ranking__jugador">
                  {fila.nombreUsuario}
                </th>
                <td className="padre-ranking__marca">
                  {modo === 'infinita' ? fila.rondas : fila.puntaje}
                </td>
                <td>{fila.victorias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function RankingPadre({ nivelInicial = 1, nivelActual = 0 }) {
  const [modo, setModo] = useState('campana')
  const [nivel, setNivel] = useState(Number(nivelInicial) || 1)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (Number(nivelActual) >= 1 && Number(nivelActual) <= NIVELES.length) {
      setNivel(Number(nivelActual))
    }
  }, [nivelActual])

  const cargar = useCallback(
    (signal) => {
      const query =
        modo === 'infinita' ? { modo, limit: 10 } : { modo, nivel: Number(nivel), limit: 10 }
      return get('/padre/ranking', query, signal)
    },
    [modo, nivel],
  )

  useEffect(() => {
    const control = new AbortController()
    let vivo = true
    setCargando(true)
    setError(null)
    cargar(control.signal)
      .then(({ data }) => {
        if (vivo) setDatos(data)
      })
      .catch((e) => {
        if (!vivo || e?.name === 'AbortError') return
        setError(mensajeError(e))
        setDatos(null)
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
      control.abort()
    }
  }, [cargar])

  const cambiarModo = (nuevo) => {
    setModo(nuevo)
    setDatos(null)
  }

  return (
    <section className="padre-ranking" aria-labelledby="padre-ranking-titulo">
      <header className="padre-ranking__cabecera">
        <div>
          <h2 id="padre-ranking-titulo">Ranking del pueblo</h2>
          <p>Las mejores marcas, separadas por plan. Solo se muestra el nombre de usuario.</p>
        </div>
        <div className="padre-ranking__tabs" role="group" aria-label="Modo del ranking">
          <button
            type="button"
            className="padre-tab"
            aria-pressed={modo === 'campana'}
            onClick={() => cambiarModo('campana')}
          >
            Campaña
          </button>
          <button
            type="button"
            className="padre-tab"
            aria-pressed={modo === 'infinita'}
            onClick={() => cambiarModo('infinita')}
          >
            Infinito
          </button>
        </div>
      </header>

      {modo === 'campana' && (
        <div className="padre-ranking__niveles" role="group" aria-label="Noche del ranking">
          {NIVELES.map((n) => (
            <button
              key={n.id}
              type="button"
              className="padre-tab padre-tab--nivel"
              aria-pressed={Number(nivel) === n.id}
              onClick={() => setNivel(n.id)}
              title={n.nombre}
            >
              Noche {n.id}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="padre-ranking__vacio padre-ranking__error" role="alert">
          No se pudo cargar el ranking: {error}
        </p>
      ) : (
        <div className="padre-ranking__tablas">
          <Tabla
            titulo="Jugadores gratis"
            filas={datos?.gratis ?? []}
            modo={modo}
            cargando={cargando}
          />
          <Tabla
            titulo="Jugadores premium"
            filas={datos?.premium ?? []}
            modo={modo}
            cargando={cargando}
          />
        </div>
      )}

      <p className="padre-ranking__nota">
        {modo === 'infinita'
          ? 'El modo infinito ordena por rondas superadas.'
          : `Noche ${nivel}: ordenado por puntaje.`}{' '}
        Las tablas se actualizan cada vez que se guarda una partida terminada.
      </p>
    </section>
  )
}
