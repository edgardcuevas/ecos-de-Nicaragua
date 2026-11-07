import { Link, useParams } from 'react-router-dom'
import { useApi, useTitulo } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import AudioPlayer from '../components/AudioPlayer.jsx'
import { ALCANCE, BloqueoPremium, Candado, Cargando, ErrorCaja, ImagenLeyenda, Markdown, Verificacion, necesitaAviso, plural } from '../components/ui.jsx'

const TIPO_FUENTE = { libro: 'Libro', articulo: 'Artículo', sitio_web: 'Sitio web', testimonio_oral: 'Testimonio oral', otro: 'Otra fuente' }

export default function Legend() {
  const { slug } = useParams()
  const { premium, usuario } = useAuth()
  const { data: l, error, cargando, recargar } = useApi(`/leyendas/${slug}`)
  useTitulo(l?.titulo)

  if (cargando && !l) return <Cargando />
  if (error?.status === 404)
    return (
      <div className="contenedor estado">
        <h1>No encontramos esa leyenda</h1>
        <Link className="btn btn--noche" to="/leyendas">Volver a la biblioteca</Link>
      </div>
    )
  if (error) return <ErrorCaja error={error} onReintentar={recargar} />
  if (!l) return null

  const principal = l.imagenes.find((i) => i.esPrincipal) || l.imagenes[0] || null
  const extras = l.imagenes.filter((i) => i !== principal)
  const bloq = l.contenidoBloqueado
  const hayBloqueo = !premium && bloq.versiones + bloq.imagenes + bloq.audios + bloq.preguntas > 0
  // Las versiones que repiten el texto principal no aportan nada al lector.
  const versiones = l.versiones.filter((v) => (v.contenido || '').trim() !== (l.historia || '').trim())
  const regionesSinVerificar = l.regiones.filter((r) => necesitaAviso(r.nivelVerificacion))
  const primeraRegion = l.regiones[0]?.codigo

  const faltantes = []
  if (bloq.audios) faltantes.push(plural(bloq.audios, 'narración en audio', 'narraciones en audio'))
  if (bloq.versiones) faltantes.push(plural(bloq.versiones, 'versión ampliada', 'versiones ampliadas'))
  if (bloq.imagenes) faltantes.push(plural(bloq.imagenes, 'ilustración más', 'ilustraciones más'))
  if (bloq.preguntas) faltantes.push(plural(bloq.preguntas, 'pregunta de trivia', 'preguntas de trivia'))

  return (
    <>
      <div className="cabecera-ficha">
        <div className="contenedor">
          <nav className="migas" aria-label="Ruta">
            <Link to="/leyendas">← Leyendas</Link>
          </nav>
          <div className="cabecera-ficha__rejilla">
            <div>
              <ul className="chips">
                {l.categoria && <li className="chip chip--luna">{l.categoria.nombre}</li>}
                {l.regiones.length > 0 ? (
                  l.regiones.map((r) => <li key={r.codigo} className="chip">{r.nombre}</li>)
                ) : (
                  <li className="chip">{ALCANCE[l.alcance] || l.alcance}</li>
                )}
              </ul>
              <h1>{l.titulo}</h1>
              <p>{l.resumen}</p>
            </div>
            <figure style={{ margin: 0 }}>
              <div className="lamina">
                <ImagenLeyenda className="lamina__img" slug={l.slug} imagen={principal} alt={principal?.textoAlternativo || `Ilustración de ${l.titulo}`} eager />
              </div>
              {principal?.licencia && <figcaption className="credito">Ilustración. Licencia: {principal.licencia.toLowerCase() === 'pendiente' ? 'pendiente de registrar' : principal.licencia}</figcaption>}
            </figure>
          </div>
        </div>
      </div>

      <div className="contenedor ficha">
        <div>
          <section className="bloque" aria-labelledby="h-historia">
            {l.audios.length > 0 ? (
              l.audios.map((a) => <AudioPlayer key={a.id} audio={a} />)
            ) : (
              !premium &&
              bloq.audios > 0 && (
                <div className="audio audio--bloqueado">
                  <strong>
                    <Candado /> Escuchar narración
                  </strong>
                  <Link to="/planes" className="btn btn--noche btn--chico">Disponible con premium</Link>
                </div>
              )
            )}
            <h2 id="h-historia">Historia</h2>
            <div className="historia">
              <Markdown>{l.historia}</Markdown>
            </div>
            {l.origen && <p className="nota-origen"><strong>Origen.</strong> {l.origen}</p>}
          </section>

          {extras.length > 0 && (
            <section className="bloque" aria-labelledby="h-img">
              <h2 id="h-img">Más ilustraciones</h2>
              <div className="galeria">
                {extras.map((im) => (
                  <figure key={im.id}>
                    <img src={im.url} alt={im.textoAlternativo || ''} loading="lazy" />
                    {im.licencia && <figcaption>Licencia: {im.licencia.toLowerCase() === 'pendiente' ? 'pendiente de registrar' : im.licencia}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {versiones.length > 0 && (
            <section className="bloque" aria-labelledby="h-ver">
              <h2 id="h-ver">Versiones</h2>
              {versiones.map((v) => (
                <details key={v.id} className="version">
                  <summary>
                    <span>{v.titulo}</span>
                    {v.fuente && <small style={{ fontWeight: 400, color: 'var(--tinta-suave)' }}>Fuente: {v.fuente.titulo}</small>}
                  </summary>
                  <div className="version__cuerpo historia" style={{ fontSize: '1rem' }}>
                    <Markdown>{v.contenido}</Markdown>
                  </div>
                </details>
              ))}
            </section>
          )}

          <div className="fila-botones">
            <Link className="btn btn--noche" to={`/trivias/${l.slug}`}>Jugar trivia</Link>
            <Link className="btn btn--borde sobre-papel" to={primeraRegion ? `/mapa?region=${primeraRegion}` : '/mapa'} style={{ color: 'var(--noche)' }}>
              Ubicar en el mapa
            </Link>
          </div>
        </div>

        <aside className="lateral" aria-label="Lugares y fuentes">
          {hayBloqueo && (
            <BloqueoPremium autenticado={!!usuario}>
              Con premium tienes {faltantes.join(', ')}.
            </BloqueoPremium>
          )}

          <section className="caja">
            <h3>Lugares asociados</h3>
            {l.regiones.length === 0 ? (
              <p>Esta leyenda no está documentada en un lugar concreto. {l.alcance === 'nacional' ? 'Se conoce en todo el país.' : 'Se conoce en varias regiones.'}</p>
            ) : (
              <ul className="lista-limpia">
                {l.regiones.map((r) => (
                  <li key={r.codigo} className="lugar">
                    <div className="lugar__cab">
                      <Link className="lugar__nombre" to={`/mapa?region=${r.codigo}`}>{r.nombre}</Link>
                      <Verificacion nivel={r.nivelVerificacion} />
                    </div>
                    {r.nota && <small>{r.nota}</small>}
                    {r.fuentes.map((f) => (
                      <small key={f.id}>Fuente: {f.titulo}</small>
                    ))}
                  </li>
                ))}
              </ul>
            )}
            {regionesSinVerificar.length > 0 && (
              <div className="aviso" style={{ marginTop: '1rem' }}>
                <p>La relación con {regionesSinVerificar.map((r) => r.nombre).join(', ')} todavía no está verificada.</p>
              </div>
            )}
          </section>

          <section className="caja">
            <h3>Fuentes y procedencia</h3>
            {l.fuentes.length === 0 ? (
              <p>Esta ficha aún no tiene fuentes registradas.</p>
            ) : (
              <ul className="lista-limpia">
                {l.fuentes.map((f) => (
                  <li key={f.id} className="fuente">
                    <strong>{f.titulo}</strong>
                    <small>
                      {[f.autor, TIPO_FUENTE[f.tipo] || f.tipo, f.referencia].filter(Boolean).join(', ')}
                    </small>
                    {f.url && (
                      <small>
                        <a href={f.url} target="_blank" rel="noreferrer noopener">Abrir enlace</a>
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}
