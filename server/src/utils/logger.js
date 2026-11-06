import pino from 'pino'
import { logLevel } from '../config.js'

export const logger = pino({
  level: logLevel,
  base: { servicio: 'ecos-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export function crearLoggerHijo(campos = {}) {
  return logger.child(campos)
}
