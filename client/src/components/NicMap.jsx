import mapa from '../data/nic-map.json'

// Mapa SVG propio de las 17 unidades. `estado(codigo)` devuelve clases extra.
export default function NicMap({ regiones, seleccionada, onElegir, claseUnidad, alSoltar, titulo = 'Mapa de Nicaragua por departamento y región autónoma', etiquetas = true, hijosLeyenda }) {
  const nombres = Object.fromEntries(regiones.map((r) => [r.codigo, r.nombre]))
  const codigos = Object.keys(mapa.paths)
  return (
    <div className="mapa-lienzo">
      <svg viewBox={mapa.viewBox} role="group" aria-label={titulo}>
        {codigos.map((c) => (
          <path
            key={c}
            d={mapa.paths[c]}
            fillRule="evenodd"
            className={`unidad ${claseUnidad?.(c) || ''}`}
            role="button"
            tabIndex={0}
            aria-label={nombres[c] || c}
            aria-pressed={seleccionada === c}
            onClick={() => onElegir?.(c)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onElegir?.(c)
              }
            }}
            onDragOver={alSoltar ? (e) => e.preventDefault() : undefined}
            onDrop={alSoltar ? (e) => { e.preventDefault(); alSoltar(c, e.dataTransfer.getData('text/plain')) } : undefined}
          >
            <title>{nombres[c] || c}</title>
          </path>
        ))}
        {etiquetas &&
          codigos.map((c) => {
            const [x, y] = mapa.centroids[c] || [0, 0]
            const nombre = nombres[c] || c
            return (
              <text key={`t-${c}`} className="etiqueta-unidad" x={x} y={y} aria-hidden="true" style={{ fontSize: nombre.length > 9 ? '14px' : '17px' }}>
                {nombre.replace('Costa Caribe ', 'Caribe ')}
              </text>
            )
          })}
      </svg>
      {hijosLeyenda}
    </div>
  )
}
