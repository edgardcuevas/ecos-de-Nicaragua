import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, obtenerCsrf, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'

ensureTestDb()

const PREFIJO = 'media-test-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

before(async () => {
  await limpiar()
  const imgs = await query(
    `SELECT id, es_principal, es_premium FROM imagenes WHERE leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana') ORDER BY id`,
  )
  const principal = imgs.find((i) => i.es_principal)
  const premium = imgs.find((i) => i.es_premium && !i.es_principal)
  IMG_PRINCIPAL = principal.id
  IMG_PREMIUM = premium.id
  const auds = await query(
    `SELECT id FROM audios WHERE leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana') ORDER BY id LIMIT 1`,
  )
  AUDIO_PREMIUM = auds[0].id
})

after(async () => {
  await limpiar()
  await sessionStore.close()
  await closePool()
})

// ids reales del seed
let IMG_PRINCIPAL
let IMG_PREMIUM
let AUDIO_PREMIUM

test('GET imagen principal devuelve 200 con cache público e ETag', async () => {
  const res = await request(app).get(`/api/media/imagenes/${IMG_PRINCIPAL}`)
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'image/webp')
  assert.equal(res.headers['cache-control'], 'public, max-age=31536000, immutable')
  assert.ok(res.headers.etag)
  assert.equal(res.headers['x-content-type-options'], 'nosniff')
  assert.equal(res.headers['content-disposition'], 'inline')
})

test('GET imagen principal con If-None-Match devuelve 304', async () => {
  const first = await request(app).get(`/api/media/imagenes/${IMG_PRINCIPAL}`)
  const etag = first.headers.etag
  const res = await request(app)
    .get(`/api/media/imagenes/${IMG_PRINCIPAL}`)
    .set('If-None-Match', etag)
  assert.equal(res.status, 304)
})

test('GET imagen premium anónimo devuelve 403 PREMIUM_REQUERIDO', async () => {
  const res = await request(app).get(`/api/media/imagenes/${IMG_PREMIUM}`)
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'PREMIUM_REQUERIDO')
})

test('GET imagen premium con suscripción devuelve 200 con cache privado', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'img-premium', PREFIJO)
  await concederPremium(usuario.id)

  const res = await ag.get(`/api/media/imagenes/${IMG_PREMIUM}`)
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'image/webp')
  assert.equal(res.headers['cache-control'], 'private, max-age=300')
  assert.equal(res.headers.vary, 'Cookie')
})

test('GET audio premium anónimo devuelve 403 PREMIUM_REQUERIDO', async () => {
  const res = await request(app).get(`/api/media/audios/${AUDIO_PREMIUM}`)
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'PREMIUM_REQUERIDO')
})

test('GET audio premium con suscripción devuelve 200 con Accept-Ranges', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'audio-premium', PREFIJO)
  await concederPremium(usuario.id)

  const res = await ag.get(`/api/media/audios/${AUDIO_PREMIUM}`)
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'audio/mpeg')
  assert.equal(res.headers['accept-ranges'], 'bytes')
  assert.equal(res.headers['cache-control'], 'private, max-age=300')
  assert.equal(res.headers.vary, 'Cookie')
})

test('GET audio premium con Range devuelve 206 y Content-Range', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'audio-range', PREFIJO)
  await concederPremium(usuario.id)

  const res = await ag
    .get(`/api/media/audios/${AUDIO_PREMIUM}`)
    .set('Range', 'bytes=0-1023')
  assert.equal(res.status, 206)
  assert.match(res.headers['content-range'], /^bytes 0-1023\//)
  assert.equal(res.headers['accept-ranges'], 'bytes')
  assert.equal(Number(res.headers['content-length']), 1024)
})

test('GET audio con rango inválido devuelve 416', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'audio-range-bad', PREFIJO)
  await concederPremium(usuario.id)

  const res = await ag
    .get(`/api/media/audios/${AUDIO_PREMIUM}`)
    .set('Range', 'bytes=5-2')
  assert.equal(res.status, 416)
})

test('GET recurso inexistente devuelve 404 RECURSO_NO_ENCONTRADO', async () => {
  const res = await request(app).get('/api/media/imagenes/999999')
  assert.equal(res.status, 404)
  assert.equal(res.body.error.codigo, 'RECURSO_NO_ENCONTRADO')
})

test('GET imagen con id inválido devuelve 400', async () => {
  const res = await request(app).get('/api/media/imagenes/abc')
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
})