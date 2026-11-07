import { ok } from '../utils/http.js'
import * as planesService from '../services/planes.service.js'
import * as suscripcionesService from '../services/suscripciones.service.js'
import * as codigosService from '../services/codigos.service.js'

export async function listarPlanes(_req, res) {
  const planes = await planesService.listarActivos()
  return ok(res, planes)
}

export async function miSuscripcion(req, res) {
  const suscripcion = await suscripcionesService.obtenerVigente(req.usuario.id)
  return ok(res, {
    accesoPremium: Boolean(suscripcion),
    suscripcion,
  })
}

export async function canjear(req, res) {
  const resultado = await codigosService.canjearCodigo(req.usuario.id, req.body.codigo)
  return ok(res, resultado)
}
