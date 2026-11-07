import { Router } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import { rateLimitEnabled } from '../config.js'
import { validate } from '../middleware/validate.js'
import { requiereAuth } from '../middleware/auth.js'
import { canjearBodySchema } from '../schemas/premium.schema.js'
import * as premiumController from '../controllers/premium.controller.js'

const limiteCanje = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => !rateLimitEnabled,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.usuario?.id ?? 'anonimo'}`,
  handler: (_req, res) =>
    res.status(429).json({
      error: {
        codigo: 'DEMASIADAS_PETICIONES',
        mensaje: 'Demasiados intentos de canje. Intenta de nuevo más tarde.',
        detalles: [],
      },
    }),
})

const router = Router()

router.get('/planes', premiumController.listarPlanes)

router.get('/mi-suscripcion', requiereAuth, premiumController.miSuscripcion)

router.post(
  '/canjear',
  requiereAuth,
  limiteCanje,
  validate({ body: canjearBodySchema }),
  premiumController.canjear,
)

export default router
