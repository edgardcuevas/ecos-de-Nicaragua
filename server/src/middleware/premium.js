import { AppError } from '../utils/errors.js'
import { buscarVigente } from '../services/suscripciones.service.js'

export async function resolverAccesoPremium(req, _res, next) {
  if (!req.usuario) {
    req.acceso = { autenticado: false, premium: false, suscripcion: null }
    return next()
  }

  const suscripcion = await buscarVigente(req.usuario.id)
  req.acceso = {
    autenticado: true,
    premium: Boolean(suscripcion),
    suscripcion,
  }
  next()
}

export function requierePremium(req, _res, next) {
  if (!req.acceso?.premium) {
    return next(
      new AppError('PREMIUM_REQUERIDO', 'Se requiere una suscripción premium activa', 403),
    )
  }
  next()
}
