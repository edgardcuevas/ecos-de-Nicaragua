import { ZodError } from 'zod'
import { Errores } from '../utils/errors.js'

export function validate(schemas = {}) {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params)
      }
      if (schemas.query) {
        // En Express 5 req.query es un getter sin setter; se define una
        // propiedad propia en la petición para conservar el valor validado.
        Object.defineProperty(req, 'query', {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
          enumerable: true,
        })
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
