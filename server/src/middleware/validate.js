import { ZodError } from 'zod'
import { Errores } from '../utils/errors.js'

export function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params)
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query)
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body)
      }
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const detalles = error.issues.map((issue) => ({
          campo: issue.path.join('.'),
          mensaje: issue.message,
        }))
        return next(Errores.validacion(detalles))
      }
      next(error)
    }
  }
}
