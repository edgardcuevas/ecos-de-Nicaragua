import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { tokenPepperValue } from '../config.js'

const ALFABETO_CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const FORMATO_CODIGO = /^ECOS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

export function generarToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function generarTokenCsrf() {
  return randomBytes(32).toString('hex')
}

export function hmacToken(token, pepper = tokenPepperValue) {
  return createHmac('sha256', pepper).update(token).digest('hex')
}

export function normalizarCodigo(codigo) {
  return String(codigo ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function esFormatoCodigoValido(codigo) {
  return FORMATO_CODIGO.test(normalizarCodigo(codigo))
}

export function generarCodigoActivacion() {
  const grupos = []
  for (let grupo = 0; grupo < 3; grupo += 1) {
    let caracteres = ''
    for (let i = 0; i < 4; i += 1) {
      caracteres += ALFABETO_CROCKFORD[randomInt(0, ALFABETO_CROCKFORD.length)]
    }
    grupos.push(caracteres)
  }
  return `ECOS-${grupos.join('-')}`
}

export function hashCodigoActivacion(codigo) {
  return hmacToken(normalizarCodigo(codigo))
}

export function compararSeguro(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
