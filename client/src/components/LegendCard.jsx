import { Link } from 'react-router-dom'
import { ALCANCE, Candado, ImagenLeyenda } from './ui.jsx'

export function hayBloqueo(l) {
  const b = l.contenidoBloqueado
  return !!b && b.versiones + b.imagenes + b.audios + b.preguntas > 0
}

export default function LegendCard({ leyenda, premium, variante }) {
  const lugares = leyenda.regiones?.length
    ? leyenda.regiones.map((r) => r.nombre)
    : [ALCANCE[leyenda.alcance] || leyenda.alcance]
  return (
    <Link to={`/leyendas/${leyenda.slug}`} className={`tarjeta-ley ${variante ? `tarjeta-ley--${variante}` : ''}`}>
      <div className="tarjeta-ley__img">
        <ImagenLeyenda slug={leyenda.slug} imagen={leyenda.imagenPrincipal} alt="" />
        {!premium && hayBloqueo(leyenda) && (
          <span className="tarjeta-ley__candado">
            <Candado /> Más con premium
          </span>
        )}
      </div>
      <div className="tarjeta-ley__cuerpo">
        <h3>{leyenda.titulo}</h3>
        <p>{leyenda.resumen}</p>
        <ul className="chips" aria-label="Lugares">
          {lugares.map((n) => (
            <li key={n} className="chip">
              {n}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  )
}
