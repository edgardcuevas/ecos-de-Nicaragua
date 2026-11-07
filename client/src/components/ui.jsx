import { useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'

export function Luna({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M40 8a24 24 0 1 0 14 38A19 19 0 0 1 40 8z" fill="#F1C66D" />
      <circle cx="50" cy="16" r="2.4" fill="#F1C66D" />
      <circle cx="56" cy="27" r="1.4" fill="#F1C66D" />
    </svg>
  )
}

export function Candado({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="estado" role="status">
      <div className="giro" aria-hidden="true" />
      <p>{texto}</p>
    </div>
  )
}

export function ErrorCaja({ error, onReintentar, titulo = 'No pudimos cargar esta página' }) {
  return (
    <div className="estado" role="alert">
      <h2>{titulo}</h2>
      <p>{error?.message || 'Ocurrió un error inesperado.'}</p>
      {onReintentar && (
        <button type="button" className="btn btn--noche" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Vacio({ titulo, children, accion }) {
  return (
    <div className="estado">
      <h2>{titulo}</h2>
      {children && <p>{children}</p>}
      {accion}
    </div>
  )
}

const ETIQUETAS_VERIF = {
  verificado: ['✓', 'Verificado'],
  testimonio_oral: ['“', 'Testimonio oral'],
  pendiente: ['!', 'Pendiente de verificar'],
  sin_verificar: ['!', 'Sin verificar'],
}

export function Verificacion({ nivel }) {
  const [icono, texto] = ETIQUETAS_VERIF[nivel] || ['?', nivel]
  return (
    <span className={`verif verif--${nivel}`}>
      <span aria-hidden="true">{icono}</span>
      {texto}
    </span>
  )
}

export const necesitaAviso = (nivel) => nivel === 'pendiente' || nivel === 'sin_verificar'

export function Markdown({ children }) {
  // react-markdown no interpreta HTML crudo: el contenido no puede inyectar etiquetas.
  return <ReactMarkdown>{children || ''}</ReactMarkdown>
}

// Imagen de una leyenda: primero la que sirve la API; si no existe, la portada incluida en el cliente.
export function ImagenLeyenda({ slug, imagen, className, alt, eager = false }) {
  const local = `/img/portadas/${slug}.webp`
  const [src, setSrc] = useState(imagen?.url || local)
  return (
    <img
      className={className}
      src={src}
      alt={alt ?? imagen?.textoAlternativo ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      width="1100"
      height="620"
      onError={() => src !== local && setSrc(local)}
    />
  )
}

export function BloqueoPremium({ children, autenticado }) {
  return (
    <div className="caja caja--luna">
      <h3>
        <Candado /> Contenido premium
      </h3>
      <p>{children}</p>
      <Link className="btn btn--noche btn--chico" to="/planes">
        Ver planes
      </Link>
      {!autenticado && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.93rem' }}>
          ¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link>
        </p>
      )}
    </div>
  )
}

export const ALCANCE = { nacional: 'Todo el país', regional: 'Varias regiones', local: 'Local' }

export function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`
}
