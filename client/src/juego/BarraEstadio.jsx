// juego/BarraEstadio.jsx — botones sobre el escenario: pausa y pantalla completa.
export function BarraEstadio({ activa, alternarPantalla, running, paused, alternarPausa }) {
  return (
    <div className="estadio-barra">
      {running && (
        <button type="button" onClick={alternarPausa} aria-label={paused ? 'Reanudar' : 'Pausar'}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {paused ? <path d="M8 5v14l11-7z" /> : <path d="M6 5h4v14H6zM14 5h4v14h-4z" />}
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={alternarPantalla}
        aria-label={activa ? 'Salir de pantalla completa' : 'Pantalla completa'}
        aria-pressed={activa}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {activa ? (
            <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
          ) : (
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          )}
        </svg>
      </button>
    </div>
  )
}

/** Solo se ve en un teléfono vertical dentro de pantalla completa. */
export function AvisoGirar() {
  return (
    <div className="estadio-girar" role="status">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M20 8a8 8 0 0 1-3 12M4 16a8 8 0 0 1 3-12" />
      </svg>
      <p>Gira tu teléfono para jugar</p>
    </div>
  )
}
