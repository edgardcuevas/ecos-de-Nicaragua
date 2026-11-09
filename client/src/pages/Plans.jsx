import { Link } from 'react-router-dom'
import { useApi, useTitulo } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import { Cargando, ErrorCaja } from '../components/ui.jsx'

const FILAS = [
  ['Biblioteca', 'Las 6 leyendas con 1 ilustración cada una', 'Contenido completo, versiones ampliadas y todas las ilustraciones'],
  ['Narraciones en audio', 'No incluidas', 'Incluidas'],
  ['Trivias', '2 de 5 preguntas por leyenda', 'Las 5 preguntas'],
  ['Ubica la leyenda', 'Completo', 'Completo'],
  ['Mapa', 'Leyendas y fuentes de cada lugar', 'Notas y referencias completas de cada fuente'],
]

export default function Plans() {
  useTitulo('Planes')
  const { premium, usuario } = useAuth()
  const { data, error, cargando, recargar } = useApi('/premium/planes')
  return (
    <div className="noche-pagina">
      <div className="titulo-pagina">
        <div className="contenedor">
          <h1>Planes</h1>
          <p>Ecos de Nicaragua es gratis para explorar. El premium agrega las narraciones y el contenido ampliado.</p>
        </div>
      </div>
      <div className="contenedor seccion" style={{ paddingTop: '2rem' }}>
        <div className="tabla-scroll">
          <table className="comparativa">
            <caption className="solo-lectores">Qué incluye cada plan</caption>
            <thead><tr><th scope="col">Función</th><th scope="col">Gratis</th><th scope="col">Premium</th></tr></thead>
            <tbody>
              {FILAS.map(([a, b, c]) => (
                <tr key={a}><th scope="row">{a}</th><td>{b}</td><td>{c}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ marginTop: '2.5rem' }}>Cómo activarlo</h2>
        {cargando && <Cargando />}
        {error && <ErrorCaja error={error} onReintentar={recargar} />}
        {data && (
          <ul className="lista-limpia" style={{ marginBottom: '1.5rem' }}>
            {data.map((p) => (
              <li key={p.id} className="caja" style={{ maxWidth: '34rem' }}>
                <h3>{p.nombre}</h3>
                <p>Acceso premium por {p.duracionDias} días, que empiezan a contar al canjear tu código.</p>
              </li>
            ))}
          </ul>
        )}
        <p className="lectura">El premium se activa con un código de activación. Si ya tienes uno, canjéalo en tu cuenta.</p>
        <div className="fila-botones">
          {usuario ? (
            <Link className="btn btn--noche" to="/cuenta">{premium ? 'Ir a mi cuenta' : 'Canjear un código'}</Link>
          ) : (
            <>
              <Link className="btn btn--noche" to="/registro">Crear cuenta</Link>
              <Link className="btn btn--borde" to="/ingresar">Ya tengo cuenta</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
