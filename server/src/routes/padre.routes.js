import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { rateLimitEnabled } from '../config.js'
import { validate } from '../middleware/validate.js'
import { requiereAuth } from '../middleware/auth.js'
import {
  partidaBodySchema,
  partidasQuerySchema,
  rankingQuerySchema,
} from '../schemas/padre.schema.js'
import * as padreController from '../controllers/padre.controller.js'

const limitePartidas = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => !rateLimitEnabled,
  handler: (_req, res) =>
    res.status(429).json({
      error: {
        codigo: 'DEMASIADAS_PETICIONES',
        mensaje: 'Demasiadas partidas guardadas. Intenta de nuevo más tarde.',
        detalles: [],
      },
    }),
})

const router = Router()

router.get('/estado', padreController.obtenerEstado)

router.post(
  '/partidas',
  limitePartidas,
  requiereAuth,
  validate({ body: partidaBodySchema }),
  padreController.registrarPartida,
)

router.get(
  '/partidas',
  requiereAuth,
  validate({ query: partidasQuerySchema }),
  padreController.listarPartidas,
)

router.get('/ranking', validate({ query: rankingQuerySchema }), padreController.obtenerRanking)

export default router
