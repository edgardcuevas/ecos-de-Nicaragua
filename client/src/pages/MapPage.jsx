import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApi, useTitulo } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import NicMap from '../components/NicMap.jsx'
import { Cargando, ErrorCaja, Verificacion, necesitaAviso } from '../components/ui.jsx'

export default function MapPage() {
  useTitulo('Mapa')
  const { premium } = useAuth()
  const [params, setParams] = useSearchParams()
  const [verLista, setVerLista] = useState(false)
  const { data, error, cargando, recargar } = useApi('/regiones')
  const sel = params.get('region') || ''

  if (cargando && !data) return <div className="noche-pagina"><Cargando /></div>
  if (error) return <div className="noche-pagina"><ErrorCaja error={error} onReintentar={recargar} /></div>
  if (!data) return null

  const unidad = data.find((r) => r.codigo === sel)
  const elegir = (c) => setParams(c === sel ? {} : { region: c }, { replace: true })

  return (
    <div className="noche-pagina">
      <div className="titulo-pagina">
        <div className="contenedor">
          <h1>Mapa de Nicaragua</h1>
          <p>Toca un departamento o región autónoma para ver las leyendas asociadas y de dónde sale esa relación.</p>
        </div>
      </div>
      <div className="contenedor mapa-diseno">
        <div>
          <NicMap
            regiones={data}
            seleccionada={sel}
            onElegir={elegir}
            claseUnidad={(c) => {
              const r = data.find((x) => x.codigo === c)
              return `${r?.totalLeyendas ? 'unidad--con' : ''}`
            }}
            hijosLeyenda={
              <div className="leyenda-mapa">
                <span><i style={{ background: '#a98438', borderColor: '#f1c66d' }} /> Con leyendas documentadas</span>
                <span><i style={{ background: '#26478c', borderColor: '#8fa6d6' }} /> Sin leyendas documentadas</span>
              </div>
            }
          />
          <p style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn--borde btn--chico" aria-expanded={verLista} onClick={() => setVerLista((v) => !v)}>
              {verLista ? 'Ocultar la lista' : 'Ver como lista'}
            </button>
          </p>
          {verLista && (
            <div className="tabla-scroll">
              <table className="tabla-regiones">
                <caption className="solo-lectores">Leyendas por departamento</caption>
                <thead>
                  <tr><th scope="col">Lugar</th><th scope="col">Leyendas documentadas</th></tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.codigo}>
                      <th scope="row"><button type="button" className="enlace-boton" onClick={() => elegir(r.codigo)}>{r.nombre}</button></th>
                      <td>{r.leyendas.length ? r.leyendas.map((l) => l.titulo).join(', ') : 'Sin leyendas documentadas'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <section className="panel" aria-live="polite">
          {!unidad ? (
            <>
              <h2>Elige un lugar</h2>
              <p>Los lugares en dorado tienen al menos una leyenda con fuente. Los demás todavía no tienen leyendas documentadas: no inventamos vínculos.</p>
            </>
          ) : (
            <>
              <h2>{unidad.nombre}</h2>
              <p>{unidad.tipo === 'region_autonoma' ? 'Región autónoma' : 'Departamento'}</p>
              {unidad.leyendas.length === 0 ? (
                <p>Sin leyendas documentadas.</p>
              ) : (
                <ul className="lista-leyendas-region">
                  {unidad.leyendas.map((l) => (
                    <li key={l.slug}>
                      <Link to={`/leyendas/${l.slug}`}>{l.titulo}</Link>{' '}
                      <Verificacion nivel={l.nivelVerificacion} />
                      {necesitaAviso(l.nivelVerificacion) && <p className="aviso" style={{ margin: '0.5rem 0 0' }}>Esta relación todavía no está verificada.</p>}
                      {premium && l.nota && <p style={{ margin: '0.4rem 0 0', fontSize: '0.95rem' }}>{l.nota}</p>}
                      <ul className="lista-limpia suave" style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>
                        {l.fuentes.map((f, i) => (
                          <li key={i}>
                            Fuente: {f.titulo}
                            {premium && f.referencia ? `, ${f.referencia}` : ''}
                            {premium && f.url && <> (<a href={f.url} target="_blank" rel="noreferrer noopener">enlace</a>)</>}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
              {!premium && unidad.leyendas.length > 0 && (
                <p style={{ marginTop: '1rem', fontSize: '0.93rem' }}>
                  Con <Link to="/planes">premium</Link> ves además las notas y referencias completas de cada fuente.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
