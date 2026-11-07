import { sessionConfig } from '../config.js'
import { creado, ok, sinContenido } from '../utils/http.js'
import { generarTokenCsrf } from '../utils/tokens.js'
import * as authService from '../services/auth.service.js'
import * as usuariosService from '../services/usuarios.service.js'
import * as suscripcionesService from '../services/suscripciones.service.js'

export function obtenerCsrf(req, res) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generarTokenCsrf()
  }
  return ok(res, { csrfToken: req.session.csrfToken })
}

export async function registrar(req, res) {
  const usuario = await authService.registrar(req.body)
  const sesion = await authService.iniciarSesion(req, usuario)

  return creado(res, {
    usuario: usuariosService.serializarUsuario(usuario),
    csrfToken: sesion.csrfToken,
    expiraEn: sesion.expiraEn,
  })
}

export async function login(req, res) {
  const usuario = await authService.autenticar(req.body)
  const sesion = await authService.iniciarSesion(req, usuario)

  return ok(res, {
    usuario: usuariosService.serializarUsuario(usuario),
    csrfToken: sesion.csrfToken,
    expiraEn: sesion.expiraEn,
  })
}

export async function logout(req, res) {
  await authService.destruirSesion(req)
  res.clearCookie(sessionConfig.name, { path: '/' })
  return sinContenido(res)
}

export async function me(req, res) {
  const suscripcion = await suscripcionesService.obtenerVigente(req.usuario.id)
  const estadoSuscripcion = suscripcion ? 'premium' : 'gratis'

  return ok(res, {
    usuario: usuariosService.serializarUsuario({
      ...req.usuario,
      estado_suscripcion: estadoSuscripcion,
    }),
    accesoPremium: Boolean(suscripcion),
    suscripcion,
  })
}

export async function refresh(req, res) {
  req.session.touch()
  await authService.guardarSesion(req)

  return ok(res, {
    expiraEn: authService.expiraSesion().toISOString(),
    csrfToken: req.session.csrfToken,
  })
}

export async function recuperar(req, res) {
  await authService.solicitarRecuperacion(req.body.correo)
  return ok(
    res,
    { mensaje: 'Si la cuenta existe, recibirás un enlace.' },
    undefined,
    202,
  )
}

export async function restablecer(req, res) {
  await authService.restablecer(req.body.token, req.body.password)
  return ok(res, { mensaje: 'Contraseña actualizada.' })
}
