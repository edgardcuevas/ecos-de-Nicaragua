import pino from 'pino'
import { logLevel } from '../config.js'

export const logger = pino({
  level: logLevel,
  base: { servicio: 'ecos-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.headers["x-csrf-token"]',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.password_hash',
      '*.token',
      '*.tokenHash',
      '*.token_hash',
      '*.codigo',
      '*.codigoHash',
      '*.codigo_hash',
      '*.secret',
      '*.sessionSecret',
      '*.csrfToken',
      '*.csrf_token',
    ],
    remove: true,
  },
})

export function crearLoggerHijo(campos = {}) {
  return logger.child(campos)
}
