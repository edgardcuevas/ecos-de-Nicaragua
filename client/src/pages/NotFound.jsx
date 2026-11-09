import { Link } from 'react-router-dom'
import { useTitulo } from '../hooks.js'

export default function NotFound() {
  useTitulo('Página no encontrada')
  return (
    <div className="noche-pagina"><div className="contenedor estado" style={{ paddingBlock: '5rem' }}>
      <h1>Esta página no existe</h1>
      <p>Puede que el enlace esté mal escrito o que la página se haya movido.</p>
      <div className="fila-botones">
        <Link className="btn btn--noche" to="/">Ir al inicio</Link>
        <Link className="btn btn--borde" to="/leyendas">Ver leyendas</Link>
      </div>
    </div></div>
  )
}
