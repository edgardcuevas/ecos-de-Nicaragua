import { timingSafeEqual } from 'node:crypto'
import { clientOrigin, corsEnabled } from '../config.js'
import { AppError } from '../utils/errors.js'

const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Rutas que exigen sesión: sin sesión no hay acción que proteger, así que
// dejamos que el middleware de auth responda 401 en lugar de 403 por CSRF.
const RUTAS_PROTEGIDAS = new Set([
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/premium/canjear',
  '/api/runner/partidas',
  '/api/padre/partidas',
])

function esRutaProtegida(path) {
  if (RUTAS_PROTEGIDAS.has(path)) return true
  // Las mutaciones de administración exigen sesión; sin ella, requiereRol
  // debe responder 401 SESION_REQUERIDA, no 403 CSRF_INVALIDO.
  return path.startsWith('/api/admin/')
}

export function csrf(req, _res, next) {
  if (!METODOS_MUTANTES.has(req.method)) {
    return next()
  }

  if (corsEnabled) {
    const origen = req.get('Origin')
    if (origen && origen !== clientOrigin) {
      return next(new AppError('CSRF_INVALIDO', 'Origen no permitido', 403))
    }
  }

  if (esRutaProtegida(req.path) && !req.session?.usuarioId) {
    return next()
  }

  const recibido = req.get('X-CSRF-Token') || ''
  const esperado = req.session?.csrfToken || ''

  if (!recibido || !esperado || recibido.length !== esperado.length) {
    return next(new AppError('CSRF_INVALIDO', 'Token CSRF inválido o ausente', 403))
  }

  if (!timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado))) {
    return next(new AppError('CSRF_INVALIDO', 'Token CSRF inválido o ausente', 403))
  }

  next()
}
