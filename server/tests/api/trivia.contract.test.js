import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'

ensureTestDb()

test('Contrato: GET /api/trivia devuelve data array con campos obligatorios', async () => {
  const res = await request(app).get('/api/trivia')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.equal(res.body.data.length, 6)
  for (const item of res.body.data) {
    assert.ok(typeof item.slug === 'string')
    assert.ok(typeof item.titulo === 'string')
    assert.equal(typeof item.totalGratis, 'number')
    assert.equal(typeof item.totalPremium, 'number')
    assert.equal(typeof item.totalDisponible, 'number')
    assert.equal(typeof item.bloqueado, 'boolean')
  }
})

test('Contrato: GET /api/trivia/:slug devuelve preguntas sin respuestas correctas', async () => {
  const res = await request(app).get('/api/trivia/la-mocuana')
  assert.equal(res.status, 200)
  const data = res.body.data
  assert.equal(data.slug, 'la-mocuana')
  assert.ok(Array.isArray(data.preguntas))
  assert.ok(data.preguntas.length >= 1)
  for (const pregunta of data.preguntas) {
    assert.ok(Number.isInteger(pregunta.id))
    assert.ok(Number.isInteger(pregunta.orden))
    assert.ok(typeof pregunta.enunciado === 'string')
    assert.equal(typeof pregunta.esPremium, 'boolean')
    assert.ok(Array.isArray(pregunta.opciones))
    for (const opcion of pregunta.opciones) {
      assert.ok(Number.isInteger(opcion.id))
      assert.ok(Number.isInteger(opcion.orden))
      assert.ok(typeof opcion.texto === 'string')
      assert.equal(opcion.esCorrecta, undefined)
      assert.equal(opcion.correcta, undefined)
      assert.equal(opcion.explicacion, undefined)
    }
  }
})

test('Contrato: GET /api/trivia/:slug inexistente devuelve 404', async () => {
  const res = await request(app).get('/api/trivia/no-existe')
  assert.equal(res.status, 404)
  assert.equal(res.body.error.codigo, 'TRIVIA_NO_DISPONIBLE')
})

test('Contrato: POST /api/trivia/:slug/responder valida el cuerpo', async () => {
  const agent = request.agent(app)
  const csrfRes = await agent.get('/api/auth/csrf')
  const csrf = csrfRes.body.data.csrfToken
  const res = await agent
    .post('/api/trivia/la-mocuana/responder')
    .set('X-CSRF-Token', csrf)
    .send({ respuestas: [{ preguntaId: 1 }] })
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
  assert.ok(Array.isArray(res.body.error.detalles))
})

test('Contrato: POST /api/trivia/:slug/responder exige CSRF', async () => {
  const res = await request(app)
    .post('/api/trivia/la-mocuana/responder')
    .send({ respuestas: [{ preguntaId: 1, opcionId: 2 }] })
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'CSRF_INVALIDO')
})

test('Contrato: POST /api/trivia/:slug/responder devuelve puntaje y detalle', async (t) => {
  const correctas = await query(
    `SELECT p.id AS preguntaId, o.id AS opcionId
       FROM preguntas p
       JOIN opciones o ON o.pregunta_id = p.id
      WHERE p.leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana')
        AND p.es_premium = 0
        AND o.es_correcta = 1
      ORDER BY p.orden`,
  )
  const agent = request.agent(app)
  const csrfRes = await agent.get('/api/auth/csrf')
  const csrf = csrfRes.body.data.csrfToken
  const res = await agent
    .post('/api/trivia/la-mocuana/responder')
    .set('X-CSRF-Token', csrf)
    .send({ respuestas: correctas.map((r) => ({ preguntaId: r.preguntaId, opcionId: r.opcionId })) })

  assert.equal(res.status, 200)
  assert.equal(typeof res.body.data.puntaje, 'number')
  assert.equal(typeof res.body.data.total, 'number')
  assert.ok(Array.isArray(res.body.data.detalle))
  assert.equal(res.body.data.detalle.length, correctas.length)
  for (const item of res.body.data.detalle) {
    assert.ok(Number.isInteger(item.preguntaId))
    assert.ok(Number.isInteger(item.opcionId))
    assert.equal(typeof item.correcta, 'boolean')
    assert.ok(Number.isInteger(item.opcionCorrectaId))
    assert.ok(typeof item.explicacion === 'string')
  }
})

test.after(async () => {
  await closePool()
})
