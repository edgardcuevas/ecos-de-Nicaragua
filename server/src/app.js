import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

import { requestId } from './middleware/requestId.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/error.js'
import { validate } from './middleware/validate.js'

import {
  corsEnabled,
  clientOrigin,
  rateLimitEnabled,
  trustProxy,
  version,
} from './config.js'

import routes from './routes/index.js'

const app = express()

if (trustProxy > 0) {
  app.set('trust proxy', trustProxy)
}

app.use(requestId)
app.use(helmet())
if (corsEnabled) {
  app.use(cors({ origin: clientOrigin, credentials: true }))
}
app.use(express.json({ limit: '1mb' }))

if (rateLimitEnabled) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use(limiter)
}

// Slot para sesion, CSRF, premium y auth (M06, M07, M09).
// Se montan aqui cuando esten disponibles.

app.use('/api', routes)

app.use(notFound)
app.use(errorHandler)

export { validate }
export default app
