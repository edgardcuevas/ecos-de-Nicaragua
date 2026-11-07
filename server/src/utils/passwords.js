import argon2 from 'argon2'
import { randomBytes } from 'node:crypto'

const OPCIONES_HASH = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
}

export function hashPassword(password) {
  return argon2.hash(password, OPCIONES_HASH)
}

export async function verificarPassword(hash, password) {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

let hashFicticio = null

// Se usa cuando la cuenta no existe para que el tiempo de respuesta sea similar.
export function obtenerHashFicticio() {
  if (!hashFicticio) {
    hashFicticio = hashPassword(randomBytes(32).toString('hex'))
  }
  return hashFicticio
}
