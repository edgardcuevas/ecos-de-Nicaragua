import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { post, mensajeError } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useTitulo } from '../hooks.js'

function Campo({ id, etiqueta, ayuda, ...props }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} className="input" {...props} aria-describedby={ayuda ? `${id}-ayuda` : undefined} />
      {ayuda && <small id={`${id}-ayuda`}>{ayuda}</small>}
    </div>
  )
}

function Formulario({ titulo, intro, onEnviar, enviando, error, ok, children, boton, pie }) {
  return (
    <div className="tarjeta-form">
      <h1>{titulo}</h1>
      {intro && <p>{intro}</p>}
      {error && <div className="aviso aviso--error" role="alert"><p>{error}</p></div>}
      {ok && <div className="aviso aviso--ok" role="status"><p>{ok}</p></div>}
      <form className="form" onSubmit={onEnviar} noValidate style={{ maxWidth: 'none' }}>
        {children}
        <button className="btn btn--noche" type="submit" disabled={enviando}>{enviando ? 'Un momento…' : boton}</button>
      </form>
      {pie && <div className="pie-form">{pie}</div>}
    </div>
  )
}

function useEnvio(fn) {
  const [estado, setEstado] = useState({ enviando: false, error: '', ok: '' })
  const enviar = async (e) => {
    e.preventDefault()
    setEstado({ enviando: true, error: '', ok: '' })
    try {
      const ok = await fn()
      setEstado({ enviando: false, error: '', ok: ok || '' })
    } catch (err) {
      setEstado({ enviando: false, error: mensajeError(err), ok: '' })
    }
  }
  return [estado, enviar]
}

export function Login() {
  useTitulo('Ingresar')
  const { ingresar, usuario } = useAuth()
  const navegar = useNavigate()
  const { state } = useLocation()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [estado, enviar] = useEnvio(async () => {
    if (!id.trim() || !pw) throw new Error('Escribe tu correo o usuario y tu contraseña.')
    await ingresar(id.trim(), pw)
    navegar(state?.desde || '/cuenta', { replace: true })
  })
  if (usuario) return <Navigate to="/cuenta" replace />
  return (
    <Formulario titulo="Ingresar" onEnviar={enviar} {...estado} boton="Ingresar"
      pie={<><Link to="/recuperar">Olvidé mi contraseña</Link><span>¿Primera vez? <Link to="/registro">Crea tu cuenta</Link></span></>}>
      <Campo id="id" etiqueta="Correo o nombre de usuario" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="none" />
      <Campo id="pw" etiqueta="Contraseña" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
    </Formulario>
  )
}

export function Registro() {
  useTitulo('Crear cuenta')
  const { registrar, usuario } = useAuth()
  const navegar = useNavigate()
  const [f, setF] = useState({ correo: '', nombreUsuario: '', password: '' })
  const cambia = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const [estado, enviar] = useEnvio(async () => {
    await registrar({ ...f, correo: f.correo.trim(), nombreUsuario: f.nombreUsuario.trim() })
    navegar('/cuenta', { replace: true })
  })
  if (usuario) return <Navigate to="/cuenta" replace />
  return (
    <Formulario titulo="Crear cuenta" intro="Con una cuenta puedes activar el premium con un código." onEnviar={enviar} {...estado} boton="Crear cuenta"
      pie={<span>¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link></span>}>
      <Campo id="correo" etiqueta="Correo" type="email" value={f.correo} onChange={cambia('correo')} autoComplete="email" />
      <Campo id="usuario" etiqueta="Nombre de usuario" ayuda="3 a 50 caracteres: letras, números, punto, guion y guion bajo." value={f.nombreUsuario} onChange={cambia('nombreUsuario')} autoComplete="username" autoCapitalize="none" />
      <Campo id="pw" etiqueta="Contraseña" type="password" ayuda="Mínimo 10 caracteres, con al menos una letra y un número." value={f.password} onChange={cambia('password')} autoComplete="new-password" />
    </Formulario>
  )
}

export function Recuperar() {
  useTitulo('Recuperar contraseña')
  const [correo, setCorreo] = useState('')
  const [estado, enviar] = useEnvio(async () => {
    await post('/auth/recuperar', { correo: correo.trim() })
    return 'Si la cuenta existe, recibirás un enlace para elegir una contraseña nueva. Revisa también la carpeta de spam.'
  })
  return (
    <Formulario titulo="Recuperar contraseña" intro="Escribe el correo de tu cuenta y te enviaremos un enlace." onEnviar={enviar} {...estado} boton="Enviar enlace"
      pie={<Link to="/ingresar">Volver a ingresar</Link>}>
      <Campo id="correo" etiqueta="Correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" />
    </Formulario>
  )
}

export function Restablecer() {
  useTitulo('Nueva contraseña')
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [pw, setPw] = useState('')
  const [hecho, setHecho] = useState(false)
  const [estado, enviar] = useEnvio(async () => {
    await post('/auth/restablecer', { token, password: pw })
    setHecho(true)
    return 'Contraseña actualizada. Ya puedes ingresar con la nueva.'
  })
  if (!token)
    return (
      <div className="tarjeta-form">
        <h1>Enlace incompleto</h1>
        <p>Abre el enlace completo que te enviamos por correo o pide uno nuevo.</p>
        <Link className="btn btn--noche" to="/recuperar">Pedir un enlace nuevo</Link>
      </div>
    )
  return (
    <Formulario titulo="Nueva contraseña" onEnviar={enviar} {...estado} boton="Guardar contraseña"
      pie={hecho ? <Link className="btn btn--luna" to="/ingresar">Ingresar</Link> : null}>
      <Campo id="pw" etiqueta="Contraseña nueva" type="password" ayuda="Mínimo 10 caracteres, con al menos una letra y un número." value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
    </Formulario>
  )
}
