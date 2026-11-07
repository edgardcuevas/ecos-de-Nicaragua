import { query } from '../db.js'
import { AppError } from '../utils/errors.js'

export async function cargarUsuario(req, _res, next) {
  req.usuario = null

  const usuarioId = req.session?.usuarioId
  if (!usuarioId) {
    return next()
  }

  const filas = await query(
    `SELECT id, correo, nombre_usuario, rol, estado_suscripcion, sesion_version, fecha_registro
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
    [usuarioId],
  )

  const usuario = filas[0]
  const versionSesion = Number(req.session.sesionVersion)

  if (!usuario || Number(usuario.sesion_version) !== versionSesion) {
    return req.session.destroy((error) => {
      if (error) return next(error)
      next()
    })
  }

  req.usuario = usuario
  next()
}

export function requiereAuth(req, _res, next) {
  if (!req.usuario) {
    return next(new AppError('SESION_REQUERIDA', 'Sesión requerida', 401))
  }
  next()
}

export function requiereAuthConCodigo(codigo, mensaje) {
  return (req, _res, next) => {
    if (!req.usuario) {
      return next(new AppError(codigo, mensaje, 401))
    }
    next()
  }
}

export function requiereRol(...roles) {
  return (req, _res, next) => {
    if (!req.usuario) {
      return next(new AppError('SESION_REQUERIDA', 'Sesión requerida', 401))
    }
    if (!roles.includes(req.usuario.rol)) {
      return next(new AppError('SIN_PERMISO', 'No tiene permiso para esta acción', 403))
    }
    next()
  }
}
