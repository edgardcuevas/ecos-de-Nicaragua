import { config } from 'dotenv'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const envPath = new URL('../../.env', import.meta.url)
config({ path: envPath, quiet: true })

const isProd = process.env.NODE_ENV === 'production'

function env(key, fallback = '') {
  const value = process.env[key]
  return value === undefined || value === '' ? fallback : value
}

function generarSecreto() {
  return randomBytes(48).toString('hex')
}

const sessionSecretRaw = env('SESSION_SECRET', '')
const tokenPepperRaw = env('TOKEN_PEPPER', '')

let sessionSecret = sessionSecretRaw
let tokenPepper = tokenPepperRaw

if (!sessionSecret) {
  if (isProd) {
    throw new Error('SESSION_SECRET es obligatorio en produccion')
  }
  sessionSecret = generarSecreto()
}

if (!tokenPepper) {
  if (isProd) {
    throw new Error('TOKEN_PEPPER es obligatorio en produccion')
  }
  tokenPepper = generarSecreto()
}

if (isProd && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET debe tener al menos 32 caracteres')
}

export const nodeEnv = env('NODE_ENV', 'development')
export const isProduction = isProd
export const port = Number(env('PORT', '3000'))
export const appUrl = env('APP_URL', 'http://localhost:5173')
export const clientOrigin = env('CLIENT_ORIGIN', 'http://localhost:5173')
export const corsEnabled = env('CORS_ENABLED', 'false') === 'true'
export const trustProxy = Number(env('TRUST_PROXY', '0'))

export const dbConfig = {
  host: env('DB_HOST', 'localhost'),
  port: Number(env('DB_PORT', '3306')),
  user: env('DB_USER', ''),
  password: env('DB_PASSWORD', ''),
  database: env('DB_NAME', 'ecos_nicaragua'),
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

export const sessionConfig = {
  secret: sessionSecret,
  name: env('SESSION_NAME', 'ecos.sid'),
  ttlHoras: Number(env('SESSION_TTL_HORAS', '8')),
  // En produccion la cookie siempre es Secure, aunque el .env diga lo contrario.
  cookieSecure: isProd || env('COOKIE_SECURE', 'false') === 'true',
}

export const tokenPepperValue = tokenPepper
export const resetTokenMinutos = Number(env('RESET_TOKEN_MINUTOS', '60'))

const mediaRootRaw = env('MEDIA_ROOT', './storage/media')
export const mediaRoot = resolve(process.cwd(), mediaRootRaw.replace(/^\.\//, ''))
// Nota: MEDIA_ROOT se resuelve respecto al cwd del proceso (raíz del servidor en dev).

export const mediaUrl = env('MEDIA_URL', '/media')

export const mailConfig = {
  transport: env('MAIL_TRANSPORT', 'console'),
  host: env('SMTP_HOST', ''),
  port: Number(env('SMTP_PORT', '587')),
  user: env('SMTP_USER', ''),
  password: env('SMTP_PASSWORD', ''),
  from: env('MAIL_FROM', 'Ecos de Nicaragua <no-reply@ejemplo.com>'),
}

export const logLevel = env('LOG_LEVEL', 'info')
export const rateLimitEnabled = env('RATE_LIMIT_ENABLED', 'true') !== 'false'

export const version = '0.2.0'
