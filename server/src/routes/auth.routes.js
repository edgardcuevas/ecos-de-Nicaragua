import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { rateLimitEnabled } from '../config.js'
import { validate } from '../middleware/validate.js'
import { requiereAuth, requiereAuthConCodigo } from '../middleware/auth.js'
import {
  loginSchema,
  recuperarSchema,
  registroSchema,
  restablecerSchema,
} from '../schemas/auth.schema.js'
import * as authController from '../controllers/auth.controller.js'

function limitador({ max, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: () => !rateLimitEnabled,
    handler: (_req, res) =>
      res.status(429).json({
        error: {
          codigo: 'DEMASIADAS_PETICIONES',
          mensaje: 'Demasiadas peticiones. Intenta de nuevo más tarde.',
          detalles: [],
        },
      }),
  })
}

const limiteCredenciales = limitador({ max: 10, skipSuccessfulRequests: true })
const limiteRecuperacion = limitador({ max: 5 })

const router = Router()

router.get('/csrf', authController.obtenerCsrf)

router.post(
  '/registro',
  limiteCredenciales,
  validate({ body: registroSchema }),
  authController.registrar,
)

router.post(
  '/login',
  limiteCredenciales,
  validate({ body: loginSchema }),
  authController.login,
)

router.post('/logout', requiereAuth, authController.logout)

router.get('/me', requiereAuth, authController.me)

router.post(
  '/refresh',
  requiereAuthConCodigo('SESION_EXPIRADA', 'La sesión ha expirado'),
  authController.refresh,
)

router.post(
  '/recuperar',
  limiteRecuperacion,
  validate({ body: recuperarSchema }),
  authController.recuperar,
)

router.post(
  '/restablecer',
  limiteRecuperacion,
  validate({ body: restablecerSchema }),
  authController.restablecer,
)

export default router
