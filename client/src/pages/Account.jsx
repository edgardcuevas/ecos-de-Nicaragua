import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { post, mensajeError } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useTitulo } from '../hooks.js'
import { Cargando } from '../components/ui.jsx'

const fecha = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-NI', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function Account() {
  useTitulo('Mi cuenta')
  const { usuario, premium, suscripcion, cargando, refrescar, esAdmin } = useAuth()
  const ubicacion = useLocation()
  const [codigo, setCodigo] = useState('')
  const [estado, setEstado] = useState({ enviando: false, error: '', ok: '' })

  if (cargando) return <div className="noche-pagina"><Cargando /></div>
  if (!usuario) return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />

  const canjear = async (e) => {
    e.preventDefault()
    setEstado({ enviando: true, error: '', ok: '' })
    try {
      await post('/premium/canjear', { codigo: codigo.trim() })
      await refrescar()
      setCodigo('')
      setEstado({ enviando: false, error: '', ok: '¡Listo! Tu premium ya está activo.' })
    } catch (err) {
      setEstado({ enviando: false, error: mensajeError(err), ok: '' })
    }
  }

  return (
    <div className="noche-pagina">
      <div className="titulo-pagina">
        <div className="contenedor"><h1>Mi cuenta</h1></div>
      </div>
      <div className="contenedor dos-col">
        <section className="panel">
          <h2>Tus datos</h2>
          <dl className="datos">
            <dt>Usuario</dt><dd>{usuario.nombreUsuario}</dd>
            <dt>Correo</dt><dd>{usuario.correo}</dd>
            <dt>Plan</dt><dd>{premium ? 'Premium' : 'Gratis'}</dd>
            {premium && suscripcion && (
              <>
                <dt>Vence</dt><dd>{fecha(suscripcion.fechaFin)}{suscripcion.diasRestantes != null ? ` (${suscripcion.diasRestantes} ${suscripcion.diasRestantes === 1 ? 'día' : 'días'})` : ''}</dd>
              </>
            )}
          </dl>
          {esAdmin && <p style={{ marginTop: '1.25rem' }}><Link className="btn btn--borde" to="/admin">Ir a administración</Link></p>}
        </section>

        <section className="panel">
          <h2>{premium ? 'Extender el premium' : 'Activar el premium'}</h2>
          <p>Si tienes un código de activación, escríbelo aquí. {premium && 'Se suma a los días que te quedan.'}</p>
          {estado.error && <div className="aviso aviso--error" role="alert"><p>{estado.error}</p></div>}
          {estado.ok && <div className="aviso aviso--ok" role="status"><p>{estado.ok}</p></div>}
          <form className="form" onSubmit={canjear}>
            <div className="campo">
              <label htmlFor="codigo">Código de activación</label>
              <input id="codigo" className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck="false" />
            </div>
            <button className="btn btn--noche" type="submit" disabled={!codigo.trim() || estado.enviando}>{estado.enviando ? 'Canjeando…' : 'Canjear código'}</button>
          </form>
          <p style={{ marginTop: '1rem' }}><Link to="/planes">Ver qué incluye el premium</Link></p>
        </section>
      </div>
    </div>
  )
}
