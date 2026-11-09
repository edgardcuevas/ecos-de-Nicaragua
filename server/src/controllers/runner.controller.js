import { creado, ok } from '../utils/http.js'
import * as runnerService from '../services/runner.service.js'

function premium(req) {
  return req.acceso?.premium === true
}

function sendError(res, err) {
  const status = err?.status || 500
  const codigo = err?.codigo || 'ERROR_INTERNO'
  res.status(status).json({
    error: {
      codigo,
      mensaje: err?.message || 'Error interno del servidor',
      detalles: Array.isArray(err?.detalles) ? err.detalles : [],
    },
  })
}

export async function obtenerEstado(req, res) {
  try {
    const data = await runnerService.obtenerEstado(req.usuario?.id ?? null)
    return ok(res, data)
  } catch (err) {
    return sendError(res, err)
  }
}

export async function registrarPartida(req, res) {
  try {
    const data = await runnerService.registrarPartida(req.usuario.id, req.body, {
      premium: premium(req),
    })
    return creado(res, data)
  } catch (err) {
    return sendError(res, err)
  }
}

export async function listarPartidas(req, res) {
  try {
    const { partidas, total } = await runnerService.listarPartidas(req.usuario.id, req.query)
    return ok(res, partidas, {
      total,
      limit: req.query.limit,
      offset: req.query.offset,
    })
  } catch (err) {
    return sendError(res, err)
  }
}

export async function obtenerRanking(req, res) {
  try {
    const data = await runnerService.obtenerRanking(req.query.nivel, req.query.limit)
    return ok(res, data)
  } catch (err) {
    return sendError(res, err)
  }
}
