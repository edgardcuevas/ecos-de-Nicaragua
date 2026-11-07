import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'

ensureTestDb()

const PREFIJO = 'leyendas-contract-'

before(async () => {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
})

test('Contrato: GET /api/leyendas devuelve data y meta', async () => {
  const res = await request(app).get('/api/leyendas')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.equal(res.body.data.length, 6)
  assert.deepEqual(res.body.meta, { total: 6, page: 1, limit: 20, totalPaginas: 1 })
  for (const item of res.body.data) {
    assert.ok(Number.isInteger(item.id))
    assert.ok(typeof item.slug === 'string')
    assert.ok(typeof item.titulo === 'string')
    assert.ok(typeof item.resumen === 'string')
    assert.ok(item.categoria && typeof item.categoria.slug === 'string')
    assert.ok(['nacional', 'regional', 'local'].includes(item.alcance))
    assert.ok(Array.isArray(item.regiones))
    assert.ok(item.contenidoBloqueado)
    assert.equal(typeof item.contenidoBloqueado.versiones, 'number')
    assert.equal(typeof item.contenidoBloqueado.imagenes, 'number')
    assert.equal(typeof item.contenidoBloqueado.audios, 'number')
    assert.equal(typeof item.contenidoBloqueado.preguntas, 'number')
  }
})

test('Contrato: filtros de leyendas responden 200', async () => {
  const casos = [
    '/api/leyendas?region=matagalpa',
    '/api/leyendas?categoria=sobrenatural',
    '/api/leyendas?alcance=nacional',
    '/api/leyendas?q=mocuana',
    '/api/leyendas?page=2&limit=2',
    '/api/leyendas?orden=reciente',
  ]
  for (const url of casos) {
    const res = await request(app).get(url)
    assert.equal(res.status, 200, url)
    assert.ok(Array.isArray(res.body.data), url)
    assert.ok(res.body.meta, url)
  }
})

test('Contrato: GET /api/leyendas con query inválido devuelve 400', async () => {
  const res = await request(app).get('/api/leyendas?limit=51')
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
})

test('Contrato: GET /api/leyendas/:slug devuelve la ficha pública', async () => {
  const res = await request(app).get('/api/leyendas/la-mocuana')
  assert.equal(res.status, 200)
  const data = res.body.data
  assert.equal(data.slug, 'la-mocuana')
  assert.ok(typeof data.titulo === 'string')
  assert.ok(typeof data.historia === 'string')
  assert.ok(data.categoria)
  assert.ok(Array.isArray(data.regiones))
  assert.ok(Array.isArray(data.versiones))
  assert.ok(Array.isArray(data.imagenes))
  assert.ok(Array.isArray(data.audios))
})

test('Contrato: GET /api/leyendas/:slug inexistente devuelve 404', async () => {
  const res = await request(app).get('/api/leyendas/no-existe')
  assert.equal(res.status, 404)
  assert.equal(res.body.error.codigo, 'LEYENDA_NO_ENCONTRADA')
})

test('Contrato: un usuario premium recibe contenido completo', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'leyendas-premium', PREFIJO)
  await concederPremium(usuario.id)
  const res = await ag.get('/api/leyendas/la-mocuana')
  assert.equal(res.status, 200)
  assert.ok(res.body.data.versiones.length >= 1)
})

test('Contrato: GET /api/categorias devuelve 4 categorías con conteo', async () => {
  const res = await request(app).get('/api/categorias')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.equal(res.body.data.length, 4)
  for (const categoria of res.body.data) {
    assert.ok(typeof categoria.slug === 'string')
    assert.ok(typeof categoria.nombre === 'string')
    assert.equal(typeof categoria.totalLeyendas, 'number')
  }
})

test.after(async () => {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
  await closePool()
})
