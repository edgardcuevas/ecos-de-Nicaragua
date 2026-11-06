import { Errores } from '../utils/errors.js'
import { errorJson } from '../utils/http.js'

export function notFound(req, res) {
  const error = Errores.noEncontrado('RUTA_NO_ENCONTRADA', `Ruta no encontrada: ${req.method} ${req.originalUrl}`)
  errorJson(res, error)
}
