import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import session from 'express-session'
import MySQLStoreFactory from 'express-mysql-session'

import { requestId } from './middleware/requestId.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/error.js'
import { validate } from './middleware/validate.js'
import { cargarUsuario } from './middleware/auth.js'
import { csrf } from './middleware/csrf.js'
import { resolverAccesoPremium } from './middleware/premium.js'

import {
  clientOrigin,
  corsEnabled,
  dbConfig,
  nodeEnv,
  rateLimitEnabled,
  sessionConfig,
  trustProxy,
} from './config.js'

import routes from './routes/index.js'

const MySQLStore = MySQLStoreFactory(session)

const sessionStore = new MySQLStore({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  createDatabaseTable: false,
  clearExpired: nodeEnv !== 'test',
  schema: {
    tableName: 'sesiones',
    columnNames: {
      session_id: 'session_id',
      expires: 'expira_en',
      data: 'datos',
    },
  },
})

const app = express()

if (trustProxy > 0) {
  app.set('trust proxy', trustProxy)
}

app.use(requestId)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
if (corsEnabled) {
  app.use(cors({ origin: clientOrigin, credentials: true }))
}
app.use(express.json({ limit: '1mb' }))

app.use(
  session({
    name: sessionConfig.name,
    secret: sessionConfig.secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: sessionConfig.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: sessionConfig.ttlHoras * 60 * 60 * 1000,
    },
  }),
)

app.use(csrf)

if (rateLimitEnabled) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use(limiter)
}

app.use(cargarUsuario)
app.use(resolverAccesoPremium)

app.use('/api', routes)

app.use(notFound)
app.use(errorHandler)

export { validate, sessionStore }
export default app
