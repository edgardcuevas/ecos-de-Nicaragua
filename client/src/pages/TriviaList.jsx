import { Link } from 'react-router-dom'
import { useApi, useTitulo } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import { Cargando, ErrorCaja, ImagenLeyenda, Vacio, plural } from '../components/ui.jsx'

export default function TriviaList() {
  useTitulo('Trivias')
  const { premium } = useAuth()
  const { data, error, cargando, recargar } = useApi('/trivia')
  return (
    <>
      <div className="titulo-pagina">
        <div className="contenedor">
          <h1>Trivias</h1>
          <p>Responde las preguntas de una leyenda y al final verás tu puntaje con la explicación de cada respuesta.</p>
        </div>
      </div>
      <div className="contenedor seccion" style={{ paddingTop: '2rem' }}>
        {cargando && <Cargando />}
        {error && <ErrorCaja error={error} onReintentar={recargar} />}
        {data?.length === 0 && <Vacio titulo="Todavía no hay trivias">Vuelve pronto: estamos preparando las preguntas.</Vacio>}
        {data?.length > 0 && (
          <div className="lista-trivias">
            {data.map((t) => (
              <Link key={t.slug} to={`/trivias/${t.slug}`} className="tarjeta-ley">
                <div className="tarjeta-ley__img"><ImagenLeyenda slug={t.slug} alt="" /></div>
                <div className="tarjeta-ley__cuerpo">
                  <h3>{t.titulo}</h3>
                  <p>
                    {premium || t.totalPremium === 0
                      ? plural(t.totalDisponible, 'pregunta', 'preguntas')
                      : `${plural(t.totalGratis, 'pregunta gratis', 'preguntas gratis')}, ${t.totalPremium} más con premium`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
