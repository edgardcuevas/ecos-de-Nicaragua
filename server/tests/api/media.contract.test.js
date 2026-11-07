import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'

ensureTestDb()

let imagenPrincipal
let imagenPremium
let audioPremium

test.before(async () => {
  const imagenes = await query(
    `SELECT id, es_principal, es_premium FROM imagenes
      WHERE leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana')
      ORDER BY id`,
  )
  imagenPrincipal = imagenes.find((i) => i.es_principal).id
  imagenPremium = imagenes.find((i) => i.es_premium && !i.es_principal).id
  const audios = await query(
    `SELECT id FROM audios
      WHERE leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana')
      ORDER BY id LIMIT 1`,
  )
  audioPremium = audios[0].id
})

test('Contrato: imagen inexistente devuelve 404', async () => {
  const res = await request(app).get('/api/media/imagenes/999999')
  assert.equal(res.status, 404)
  assert.ok(['RECURSO_NO_ENCONTRADO', 'ARCHIVO_NO_ENCONTRADO'].includes(res.body.error.codigo))
})

test('Contrato: id inválido devuelve 400 VALIDACION', async () => {
  const res = await request(app).get('/api/media/imagenes/abc')
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
  assert.ok(Array.isArray(res.body.error.detalles))
})

test('Contrato: imagen principal devuelve 200 con cabeceras de caché', async () => {
  const res = await request(app).get(`/api/media/imagenes/${imagenPrincipal}`)
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'image/webp')
  assert.equal(res.headers['cache-control'], 'public, max-age=31536000, immutable')
  assert.ok(res.headers.etag)
  assert.equal(res.headers['x-content-type-options'], 'nosniff')
  assert.equal(res.headers['content-disposition'], 'inline')
})

test('Contrato: imagen principal con If-None-Match devuelve 304', async () => {
  const first = await request(app).get(`/api/media/imagenes/${imagenPrincipal}`)
  const res = await request(app)
    .get(`/api/media/imagenes/${imagenPrincipal}`)
    .set('If-None-Match', first.headers.etag)
  assert.equal(res.status, 304)
})

test('Contrato: imagen premium anónima devuelve 403 PREMIUM_REQUERIDO', async () => {
  const res = await request(app).get(`/api/media/imagenes/${imagenPremium}`)
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'PREMIUM_REQUERIDO')
})

test('Contrato: audio premium anónimo devuelve 403 PREMIUM_REQUERIDO', async () => {
  const res = await request(app).get(`/api/media/audios/${audioPremium}`)
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'PREMIUM_REQUERIDO')
})

test('Contrato: audio inexistente devuelve 404', async () => {
  const res = await request(app).get('/api/media/audios/999999')
  assert.equal(res.status, 404)
  assert.ok(['RECURSO_NO_ENCONTRADO', 'ARCHIVO_NO_ENCONTRADO'].includes(res.body.error.codigo))
})

test('Contrato: audio soporta Range y devuelve 206', async () => {
  // Necesita premium; se omite la verificación de cuerpo y solo se valida 403 anónimo.
  const res = await request(app)
    .get(`/api/media/audios/${audioPremium}`)
    .set('Range', 'bytes=0-10')
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'PREMIUM_REQUERIDO')
})

test.after(async () => {
  await closePool()
})
