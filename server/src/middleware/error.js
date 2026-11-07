import { logger } from '../utils/logger.js'
import { errorJson } from '../utils/http.js'

export function errorHandler(err, req, res, _next) {
  const status = err?.status || 500
  if (status >= 500) {
    logger.error({ err, requestId: req?.id }, 'Error interno')
  } else {
    logger.warn({ codigo: err?.codigo, status, requestId: req?.id }, err?.message)
  }
  // No revelar detalles internos en la respuesta, ni en desarrollo.
  if (status >= 500) {
    err = { status: 500, codigo: 'ERROR_INTERNO', message: 'Error interno del servidor', detalles: [] }
  }
  return errorJson(res, err)
}
