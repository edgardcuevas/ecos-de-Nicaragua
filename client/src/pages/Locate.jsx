import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi, useTitulo } from '../hooks.js'
import NicMap from '../components/NicMap.jsx'
import { Cargando, ErrorCaja, ImagenLeyenda, Vacio } from '../components/ui.jsx'

const VALIDOS = new Set(['verificado', 'testimonio_oral'])

export default function Locate() {
  useTitulo('Ubica la leyenda')
  const { data, error, cargando, recargar } = useApi('/regiones', { incluirNacionales: false, incluirRegionales: false })
  const [elegida, setElegida] = useState(null) // slug
  const [hechas, setHechas] = useState({}) // slug -> codigo
  const [fallos, setFallos] = useState(0)
  const [mensaje, setMensaje] = useState('')

  // Solo entran leyendas con un lugar documentado y con fuente (verificado o testimonio oral).
  const fichas = useMemo(() => {
    const m = new Map()
    for (const r of data || []) {
      for (const l of r.leyendas) {
        if (!VALIDOS.has(l.nivelVerificacion)) continue
        if (!m.has(l.slug)) m.set(l.slug, { slug: l.slug, titulo: l.titulo, lugares: new Set(), fuentes: new Set() })
        const f = m.get(l.slug)
        f.lugares.add(r.codigo)
        l.fuentes.forEach((x) => f.fuentes.add(x.titulo))
      }
    }
    return [...m.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))
  }, [data])

  if (cargando && !data) return <div className="noche-pagina"><Cargando /></div>
  if (error) return <div className="noche-pagina"><ErrorCaja error={error} onReintentar={recargar} /></div>
  if (!data) return null

  const nombre = (c) => data.find((r) => r.codigo === c)?.nombre
  const terminado = fichas.length > 0 && fichas.every((f) => hechas[f.slug])

  const colocar = (codigo, slug = elegida) => {
    const ficha = fichas.find((f) => f.slug === slug)
    if (!ficha || hechas[slug]) {
      setMensaje('Primero elige una leyenda de la lista.')
      return
    }
    if (ficha.lugares.has(codigo)) {
      setHechas((h) => ({ ...h, [slug]: codigo }))
      setElegida(null)
      setMensaje(`Correcto: ${ficha.titulo} está documentada en ${nombre(codigo)}.`)
    } else {
      setFallos((n) => n + 1)
      setMensaje(`${nombre(codigo)} no es el lugar de ${ficha.titulo}. Prueba con otro.`)
    }
  }
  const reiniciar = () => {
    setHechas({})
    setElegida(null)
    setFallos(0)
    setMensaje('')
  }
  const colocados = new Set(Object.values(hechas))

  return (
    <div className="noche-pagina">
      <div className="titulo-pagina">
        <div className="contenedor">
          <h1>Ubica la leyenda</h1>
          <p>Elige una leyenda y toca el lugar del mapa donde está documentada, o arrástrala hasta allí.</p>
        </div>
      </div>
      {fichas.length === 0 ? (
        <Vacio titulo="Todavía no hay leyendas para jugar">Este juego usa solo leyendas con un lugar documentado y con fuente.</Vacio>
      ) : (
        <div className="contenedor juego">
          <div>
            <ul className="fichas" aria-label="Leyendas por ubicar">
              {fichas.map((f) => {
                const hecha = hechas[f.slug]
                return (
                  <li key={f.slug}>
                    <button
                      type="button"
                      className={`ficha-juego ${hecha ? 'ficha-juego--hecha' : ''}`}
                      aria-pressed={elegida === f.slug}
                      disabled={!!hecha}
                      draggable={!hecha}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', f.slug)
                        setElegida(f.slug)
                      }}
                      onClick={() => {
                        setElegida(elegida === f.slug ? null : f.slug)
                        setMensaje('')
                      }}
                    >
                      <ImagenLeyenda slug={f.slug} alt="" />
                      <span>
                        {f.titulo}
                        {hecha && <small>✓ {nombre(hecha)}</small>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div aria-live="polite" style={{ marginTop: '1rem', minHeight: '3.5rem' }}>
              {mensaje && <p className={`aviso ${mensaje.startsWith('Correcto') ? 'aviso--ok' : ''}`}>{mensaje}</p>}
            </div>
            <p className="tabla-aviso">Intentos fallidos: {fallos}</p>
          </div>
          <div>
            <NicMap
              regiones={data}
              onElegir={(c) => colocar(c)}
              alSoltar={(c, slug) => colocar(c, slug)}
              claseUnidad={(c) => (colocados.has(c) ? 'unidad--meta' : '')}
              hijosLeyenda={
                <div className="leyenda-mapa">
                  <span><i style={{ background: '#2f7a54', borderColor: '#bff0d3' }} /> Lugar ya descubierto</span>
                </div>
              }
            />
            {terminado && (
              <div className="aviso aviso--ok" style={{ marginTop: '1.25rem' }} role="status">
                <p><strong>¡Ubicaste las {fichas.length} leyendas!</strong> {fallos === 0 ? 'Sin ningún fallo.' : `Con ${fallos} intento${fallos === 1 ? '' : 's'} fallido${fallos === 1 ? '' : 's'}.`}</p>
                <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.2rem' }}>
                  {fichas.map((f) => (
                    <li key={f.slug}>
                      <Link to={`/leyendas/${f.slug}`}>{f.titulo}</Link>: {[...f.lugares].map(nombre).join(' y ')}. Fuente: {[...f.fuentes].join(', ')}.
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn btn--noche btn--chico" onClick={reiniciar}>Jugar otra vez</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
