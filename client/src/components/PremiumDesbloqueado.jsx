import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import '../styles/premium.css'

// Pseudoaleatorio estable: las estrellas y luciérnagas no cambian entre renders.
const azar = (i, s) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const BENEFICIOS = [
  'Narraciones en audio de cada leyenda',
  'Las 5 preguntas de cada trivia',
  'Versiones ampliadas e ilustraciones completas',
  'Notas y referencias de cada lugar en el mapa',
]

// Se muestra una sola vez por navegador cada vez que el premium del usuario se activa.
// Al recargar la página (o volver a entrar) el servidor ya dice que es premium y aquí se detecta la novedad.
export default function PremiumDesbloqueado() {
  const { usuario, premium, suscripcion, cargando } = useAuth()
  const [visible, setVisible] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  const usuarioId = usuario?.id
  const marca = String(suscripcion?.id ?? suscripcion?.fechaInicio ?? 'activo')

  useEffect(() => {
    if (cargando || usuarioId == null) return
    const clave = `ecos:premium-visto:${usuarioId}`
    try {
      if (!premium) {
        // Si le quitan el premium, la próxima vez que se lo den volverá a celebrarse.
        localStorage.removeItem(clave)
        return
      }
      if (localStorage.getItem(clave) !== marca) {
        localStorage.setItem(clave, marca)
        setVisible(true)
      }
    } catch {
      /* sin almacenamiento disponible (modo privado): simplemente no se muestra */
    }
  }, [cargando, usuarioId, premium, marca])

  const cerrar = () => {
    setSaliendo(true)
    setTimeout(() => {
      setVisible(false)
      setSaliendo(false)
    }, 450)
  }

  const raiz = useRef(null)
  const botonRef = useRef(null)

  useEffect(() => {
    if (!visible) return
    const previo = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    botonRef.current?.focus()

    const teclas = (e) => {
      if (e.key === 'Escape') cerrar()
      if (e.key === 'Tab' && raiz.current) {
        const f = raiz.current.querySelectorAll('a[href], button:not([disabled])')
        if (!f.length) return
        const primero = f[0]
        const ultimo = f[f.length - 1]
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault()
          ultimo.focus()
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault()
          primero.focus()
        }
      }
    }
    document.addEventListener('keydown', teclas)
    return () => {
      document.removeEventListener('keydown', teclas)
      document.body.style.overflow = overflow
      previo?.focus?.()
    }
  }, [visible])

  const estrellas = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: `${azar(i, 1) * 100}%`,
        top: `${azar(i, 2) * 100}%`,
        tam: `${0.12 + azar(i, 3) * 0.2}rem`,
        dur: `${2.2 + azar(i, 4) * 3}s`,
        del: `${azar(i, 5) * 3}s`,
      })),
    [],
  )

  const luciernagas = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: `${4 + azar(i, 6) * 92}%`,
        tam: `${0.2 + azar(i, 7) * 0.32}rem`,
        dur: `${7 + azar(i, 8) * 7}s`,
        del: `${1.2 + azar(i, 9) * 6}s`,
        deriva: `${(azar(i, 10) - 0.5) * 9}rem`,
      })),
    [],
  )

  if (!visible) return null

  const dias = suscripcion?.diasRestantes
  const item = (n) => ({ '--d': `${1.5 + n * 0.18}s` })

  return (
    <div ref={raiz} className={`pd ${saliendo ? 'pd--sale' : ''}`} role="dialog" aria-modal="true" aria-labelledby="pd-titulo" aria-describedby="pd-desc">
      <div className="pd__niebla" aria-hidden="true" />
      <div className="pd__cielo" aria-hidden="true">
        {estrellas.map((e, i) => (
          <span key={i} className="pd__estrella" style={{ left: e.left, top: e.top, width: e.tam, height: e.tam, '--dur': e.dur, '--del': e.del }} />
        ))}
        {luciernagas.map((l, i) => (
          <span key={i} className="pd__luciernaga" style={{ left: l.left, width: l.tam, height: l.tam, '--dur': l.dur, '--del': l.del, '--deriva': l.deriva }} />
        ))}
      </div>

      <div className="pd__caja">
        <div className="pd__luna-zona" aria-hidden="true">
          <span className="pd__rayos" />
          <span className="pd__anillo" style={{ '--d': '1.1s' }} />
          <span className="pd__anillo" style={{ '--d': '2.1s' }} />
          <span className="pd__anillo" style={{ '--d': '3.1s' }} />
          <svg className="pd__luna" viewBox="0 0 64 64">
            <path d="M40 8a24 24 0 1 0 14 38A19 19 0 0 1 40 8z" fill="#F1C66D" />
            <circle cx="50" cy="16" r="2.4" fill="#F1C66D" />
            <circle cx="56" cy="27" r="1.4" fill="#F1C66D" />
          </svg>
        </div>

        <p className="pd__sobre pd__item" style={{ '--d': '1.1s' }}>
          Ecos de Nicaragua
        </p>
        <h2 id="pd-titulo" className="pd__titulo pd__item" style={{ '--d': '1.3s' }}>
          Has desbloqueado el acceso premium
        </h2>
        <p id="pd-desc" className="pd__sub pd__item" style={{ '--d': '1.5s' }}>
          Las leyendas ahora te hablan completas. Que la noche te sea larga y las historias, generosas.
        </p>

        <ul className="pd__lista">
          {BENEFICIOS.map((b, n) => (
            <li key={b} className="pd__item" style={item(n + 1)}>
              <span aria-hidden="true">✦</span> {b}
            </li>
          ))}
        </ul>

        {dias != null && (
          <p className="pd__dias pd__item" style={{ '--d': '2.5s' }}>
            Tu acceso está activo por {dias} {dias === 1 ? 'día' : 'días'}.
          </p>
        )}

        <div className="pd__botones pd__item" style={{ '--d': '2.7s' }}>
          <Link ref={botonRef} className="btn btn--noche" to="/leyendas" onClick={cerrar}>
            Explorar las leyendas
          </Link>
          <button type="button" className="btn btn--borde" onClick={cerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
