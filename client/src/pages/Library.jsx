import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi, useTitulo } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import LegendCard from '../components/LegendCard.jsx'
import { Cargando, ErrorCaja, Vacio } from '../components/ui.jsx'

export default function Library() {
  useTitulo('Leyendas')
  const { premium } = useAuth()
  const [params, setParams] = useSearchParams()
  const region = params.get('region') || ''
  const categoria = params.get('categoria') || ''
  const qUrl = params.get('q') || ''
  const [texto, setTexto] = useState(qUrl)

  const cambiar = (clave, valor) => {
    const p = new URLSearchParams(params)
    if (valor) p.set(clave, valor)
    else p.delete(clave)
    setParams(p, { replace: true })
  }

  // La búsqueda espera a que se deje de escribir y exige 2 letras (regla del servidor).
  useEffect(() => {
    const t = setTimeout(() => {
      const limpio = texto.trim()
      if (limpio !== qUrl && (limpio.length >= 2 || limpio === '')) cambiar('q', limpio)
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto])

  const regiones = useApi('/regiones', { incluirNacionales: false, incluirRegionales: false })
  const categorias = useApi('/categorias')
  const { data, meta, error, cargando, recargar } = useApi('/leyendas', { region, categoria, q: qUrl, limit: 50 })

  const conLeyendas = (regiones.data || []).filter((r) => r.totalLeyendas > 0)
  const hayFiltro = region || categoria || qUrl

  return (
    <div className="noche-pagina">
      <div className="titulo-pagina">
        <div className="contenedor">
          <h1>Leyendas</h1>
          <p>Las leyendas se transmiten oralmente y cambian de lugar en lugar. Cada ficha indica de dónde viene lo que cuenta.</p>
        </div>
      </div>
      <div className="contenedor seccion" style={{ paddingTop: '2rem' }}>
        <div className="filtros" role="search">
          <div className="filtros__fila">
            <div className="campo-busca">
              <label className="solo-lectores" htmlFor="buscar">Buscar leyenda</label>
              <input id="buscar" className="input" type="search" placeholder="Buscar leyenda…" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" />
            </div>
            {categorias.data?.length > 0 && (
              <div>
                <label className="solo-lectores" htmlFor="cat">Categoría</label>
                <select id="cat" className="select" value={categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
                  <option value="">Todas las categorías</option>
                  {categorias.data.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {conLeyendas.length > 0 && (
            <div className="chips-scroll" role="group" aria-label="Filtrar por departamento">
              <button type="button" className="filtro-chip" aria-pressed={!region} onClick={() => cambiar('region', '')}>
                Todas
              </button>
              {conLeyendas.map((r) => (
                <button key={r.codigo} type="button" className="filtro-chip" aria-pressed={region === r.codigo} onClick={() => cambiar('region', region === r.codigo ? '' : r.codigo)}>
                  {r.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {cargando && <Cargando />}
        {error && <ErrorCaja error={error} onReintentar={recargar} />}
        {data && data.length === 0 && (
          <Vacio
            titulo="No encontramos leyendas con ese filtro"
            accion={
              <button
                type="button"
                className="btn btn--noche"
                onClick={() => {
                  setTexto('')
                  setParams({}, { replace: true })
                }}
              >
                Limpiar filtros
              </button>
            }
          >
            Prueba con otra palabra o quita algún filtro.
          </Vacio>
        )}
        {data && data.length > 0 && (
          <>
            <p aria-live="polite" className="resultados">
              {hayFiltro ? `${meta?.total ?? data.length} resultado${(meta?.total ?? data.length) === 1 ? '' : 's'}` : `${meta?.total ?? data.length} leyendas`}
            </p>
            <div className="rejilla">
              {data.map((l) => (
                <LegendCard key={l.slug} leyenda={l} premium={premium} variante="cartel" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
