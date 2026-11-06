import * as dbModule from '../db.js'
import { createReadStream, statSync, realpathSync, existsSync } from 'node:fs'
import path from 'node:path'

const pool = (dbModule && (dbModule.pool || dbModule.default)) || null

async function q(sql, params = []) {
  if (!pool) throw new Error('DB_NO_DISPONIBLE')
  const [rows] = await pool.execute(sql, params)
  return rows
}

function mediaRoot() {
  const raw = process.env.MEDIA_ROOT || './storage/media'
  return path.resolve(process.cwd(), raw)
}

const CONTENT_TYPES = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
}

function safeResolve(rutaRelativa) {
  const root = mediaRoot()
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep
  const full = path.resolve(root, rutaRelativa)
  if (!full.startsWith(rootWithSep)) {
    const err = new Error('RUTA_INVALIDA')
    err.codigo = 'RECURSO_NO_ENCONTRADO'
    err.status = 404
    throw err
  }
  // symlink check
  let real
  try {
    real = realpathSync(full)
  } catch {
    const err = new Error('ARCHIVO_NO_ENCONTRADO')
    err.codigo = 'ARCHIVO_NO_ENCONTRADO'
    err.status = 404
    throw err
  }
  if (!real.startsWith(rootWithSep)) {
    const err = new Error('RUTA_INVALIDA')
    err.codigo = 'RECURSO_NO_ENCONTRADO'
    err.status = 404
    throw err
  }
  if (!existsSync(full)) {
    const err = new Error('ARCHIVO_NO_ENCONTRADO')
    err.codigo = 'ARCHIVO_NO_ENCONTRADO'
    err.status = 404
    throw err
  }
  return { full, root: rootWithSep, real }
}

export async function obtenerImagen(id, premium = false) {
  let rows
  try {
    rows = await q('SELECT id, ruta, texto_alternativo, licencia, es_principal, es_premium FROM imagenes WHERE id = ?', [id])
  } catch (e) {
    rows = await q('SELECT id, ruta, texto_alternativo, licencia, es_principal FROM imagenes WHERE id = ?', [id])
    if (rows.length) rows[0].es_premium = rows[0].es_principal ? 0 : 1
  }
  if (rows.length === 0) {
    const err = new Error('RECURSO_NO_ENCONTRADO')
    err.codigo = 'RECURSO_NO_ENCONTRADO'
    err.status = 404
    throw err
  }
  const img = rows[0]
  const esPrincipal = Boolean(img.es_principal)
  const esPremium = Boolean(img.es_premium)
  const requierePremium = esPremium && !esPrincipal
  if (requierePremium && !premium) {
    const err = new Error('PREMIUM_REQUERIDO')
    err.codigo = 'PREMIUM_REQUERIDO'
    err.status = 403
    throw err
  }
  const { full } = safeResolve(img.ruta)
  const stat = statSync(full)
  const ext = path.extname(full).toLowerCase()
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'
  if (!CONTENT_TYPES[ext]) {
    const err = new Error('TIPO_NO_PERMITIDO')
    err.codigo = 'RECURSO_NO_ENCONTRADO'
    err.status = 404
    throw err
  }
  const cacheControl = esPrincipal
    ? 'public, max-age=31536000, immutable'
    : 'private, max-age=300'
  const vary = esPrincipal ? null : 'Cookie'
  const etag = `W/"${stat.mtimeMs}-${stat.size}"`
  return { id: img.id, filePath: full, stat, contentType, cacheControl, vary, etag, esPrincipal, esPremium: requierePremium }
}

export async function obtenerAudio(id, premium = false) {
  let rows
  try {
    rows = await q('SELECT id, ruta, titulo, licencia, es_premium FROM audios WHERE id = ?', [id])
  } catch (e) {
    rows = await q('SELECT id, ruta, titulo, licencia FROM audios WHERE id = ?', [id])
    if (rows.length) rows[0].es_premium = 1
  }
  if (rows.length === 0) {
    const err = new Error('RECURSO_NO_ENCONTRADO')
    err.codigo = 'RECURSO_NO_ENCONTRADO'
    err.status = 404
    throw err
  }
  const audio = rows[0]
  const esPremium = Boolean(audio.es_premium)
  if (esPremium && !premium) {
    const err = new Error('PREMIUM_REQUERIDO')
    err.codigo = 'PREMIUM_REQUERIDO'
    err.status = 403
    throw err
  }
  const { full } = safeResolve(audio.ruta)
  const stat = statSync(full)
  const ext = path.extname(full).toLowerCase()
  const contentType = CONTENT_TYPES[ext] || 'audio/mpeg'
  const cacheControl = esPremium ? 'private, max-age=300' : 'public, max-age=31536000, immutable'
  const vary = esPremium ? 'Cookie' : null
  const etag = `W/"${stat.mtimeMs}-${stat.size}"`
  return { id: audio.id, filePath: full, stat, contentType, cacheControl, vary, etag, esPremium }
}

export function abrirStream(filePath, start, end) {
  return createReadStream(filePath, start != null ? { start, end } : undefined)
}