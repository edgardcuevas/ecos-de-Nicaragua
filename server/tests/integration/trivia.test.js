import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, obtenerCsrf, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'

ensureTestDb()

const PREFIJO = 'trivia-test-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

before(async () => {
  await limpiar()
})

after(async () => {
  await limpiar()
  await sessionStore.close()
  await closePool()
})

test('GET /api/trivia lista las 6 leyendas con conteos', async () => {
  const res = await request(app).get('/api/trivia')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.equal(res.body.data.length, 6)
  for (const item of res.body.data) {
    assert.equal(item.totalGratis, 2)
    assert.equal(item.totalPremium, 3)
    assert.equal(item.totalDisponible, 2)
  }
})

test('GET /api/trivia/:slug anónimo no revela la respuesta correcta', async () => {
  const res = await request(app).get('/api/trivia/la-mocuana')
  assert.equal(res.status, 200)
  const data = res.body.data
  assert.equal(data.preguntas.length, 2)
  assert.equal(data.totalGratis, 2)
  assert.equal(data.totalPremium, 3)
  assert.equal(data.totalDisponible, 2)
  for (const p of data.preguntas) {
    assert.ok(p.id)
    assert.ok(p.enunciado)
    assert.equal(p.esPremium, false)
    assert.equal(p.opciones.length, 4)
    for (const o of p.opciones) {
      assert.equal(o.esCorrecta, undefined)
      assert.equal(o.correcta, undefined)
      assert.equal(o.explicacion, undefined)
    }
  }
})

test('GET /api/trivia/:slug inexistente devuelve 404', async () => {
  const res = await request(app).get('/api/trivia/no-existe')
  assert.equal(res.status, 404)
  assert.equal(res.body.error.codigo, 'TRIVIA_NO_DISPONIBLE')
})

test('POST con 2 respuestas correctas devuelve puntaje 2', async () => {
  const correctas = await query(
    `SELECT p.id AS preguntaId, o.id AS opcionId FROM preguntas p JOIN opciones o ON o.pregunta_id = p.id
     WHERE p.leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana') AND p.es_premium = 0 AND o.es_correcta = 1 ORDER BY p.orden`,
  )
  const ag = crearAgent()
  const csrf = await obtenerCsrf(ag)
  const body = {
    respuestas: correctas.map((r) => ({ preguntaId: r.preguntaId, opcionId: r.opcionId })),
  }
  const res = await ag
    .post('/api/trivia/la-mocuana/responder')
    .set('X-CSRF-Token', csrf)
    .send(body)
  assert.equal(res.status, 200)
  assert.equal(res.body.data.puntaje, 2)
  assert.equal(res.body.data.total, 2)
  assert.equal(res.body.data.detalle.length, 2)
  for (const d of res.body.data.detalle) {
    assert.equal(d.correcta, true)
    assert.ok(d.opcionCorrectaId)
    assert.ok(d.explicacion)
  }
})

test('POST con respuesta incorrecta devuelve puntaje 0', async () => {
  // tomar la primera opción incorrecta de cada pregunta
  const porPregunta = await query(
    `SELECT p.id AS preguntaId, MIN(o.id) AS opcionId FROM preguntas p JOIN opciones o ON o.pregunta_id = p.id
     WHERE p.leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana') AND p.es_premium = 0 AND o.es_correcta = 0
     GROUP BY p.id, p.orden ORDER BY p.orden`,
  )
  const ag = crearAgent()
  const csrf = await obtenerCsrf(ag)
  const body = {
    respuestas: porPregunta.map((r) => ({ preguntaId: r.preguntaId, opcionId: r.opcionId })),
  }
  const res = await ag
    .post('/api/trivia/la-mocuana/responder')
    .set('X-CSRF-Token', csrf)
    .send(body)
  assert.equal(res.status, 200)
  assert.equal(res.body.data.puntaje, 0)
  assert.equal(res.body.data.total, 2)
})

test('POST con pregunta premium como anónimo devuelve 403 PREGUNTA_PREMIUM', async () => {
  const premiumPregunta = await query(
    `SELECT p.id AS preguntaId, o.id AS opcionId FROM preguntas p JOIN opciones o ON o.pregunta_id = p.id
     WHERE p.leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana') AND p.es_premium = 1
     ORDER BY p.orden, o.orden LIMIT 1`,
  )
  const freeCorrecta = await query(
    `SELECT p.id AS preguntaId, o.id AS opcionId FROM preguntas p JOIN opciones o ON o.pregunta_id = p.id
     WHERE p.leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana') AND p.es_premium = 0 AND o.es_correcta = 1 ORDER BY p.orden LIMIT 1`,
  )
  const ag = crearAgent()
  const csrf = await obtenerCsrf(ag)
  const body = {
    respuestas: [
      { preguntaId: premiumPregunta[0].preguntaId, opcionId: premiumPregunta[0].opcionId },
      { preguntaId: freeCorrecta[0].preguntaId, opcionId: freeCorrecta[0].opcionId },
    ],
  }
  const res = await ag
    .post('/api/trivia/la-mocuana/responder')
    .set('X-CSRF-Token', csrf)
    .send(body)
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'PREGUNTA_PREMIUM')
})

test('POST con opción de otra pregunta devuelve 400 OPCION_INVALIDA', async () => {
  const freePreguntas = await query(
    `SELECT p.id AS preguntaId FROM preguntas p
     WHERE p.leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana') AND p.es_premium = 0 ORDER BY p.orden`,
  )
  const opcionDeOtra = await query(
    `SELECT o.id AS opcionId FROM opciones o WHERE o.pregunta_id = ? ORDER BY o.orden LIMIT 1`,
    [freePreguntas[1].preguntaId],
  )
  const correctaSegunda = await query(
    `SELECT o.id AS opcionId FROM opciones o JOIN preguntas p ON p.id = o.pregunta_id
     WHERE p.id = ? AND o.es_correcta = 1 LIMIT 1`,
    [freePreguntas[1].preguntaId],
  )
  const ag = crearAgent()
  const csrf = await obtenerCsrf(ag)
  const body = {
    respuestas: [
      { preguntaId: freePreguntas[0].preguntaId, opcionId: opcionDeOtra[0].opcionId },
      { preguntaId: freePreguntas[1].preguntaId, opcionId: correctaSegunda[0].opcionId },
    ],
  }
  const res = await ag
    .post('/api/trivia/la-mocuana/responder')
    .set('X-CSRF-Token', csrf)
    .send(body)
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'OPCION_INVALIDA')
})

test('POST con pregunta duplicada devuelve 400 RESPUESTA_DUPLICADA', async () => {
  const freePreguntas = await query(
    `SELECT p.id AS preguntaId FROM preguntas p
     WHERE p.leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana') AND p.es_premium = 0 ORDER BY p.orden`,
  )
  const opciones = await query(
    `SELECT o.id AS opcionId FROM opciones o WHERE o.pregunta_id = ? ORDER BY o.orden LIMIT 2`,
    [freePreguntas[0].preguntaId],
  )
  const ag = crearAgent()
  const csrf = await obtenerCsrf(ag)
  const body = {
    respuestas: [
      { preguntaId: freePreguntas[0].preguntaId, opcionId: opciones[0].opcionId },
      { preguntaId: freePreguntas[0].preguntaId, opcionId: opciones[1].opcionId },
    ],
  }
  const res = await ag
    .post('/api/trivia/la-mocuana/responder')
    .set('X-CSRF-Token', csrf)
    .send(body)
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'RESPUESTA_DUPLICADA')
})

test('POST con cantidad incorrecta devuelve 400 RESPUESTAS_INCOMPLETAS', async () => {
  const freePreguntas = await query(
    `SELECT p.id AS preguntaId FROM preguntas p
     WHERE p.leyenda_id = (SELECT id FROM leyendas WHERE slug = 'la-mocuana') AND p.es_premium = 0 ORDER BY p.orden`,
  )
  const opcion = await query(
    `SELECT o.id AS opcionId FROM opciones o WHERE o.pregunta_id = ? ORDER BY o.orden LIMIT 1`,
    [freePreguntas[0].preguntaId],
  )
  const ag = crearAgent()
  const csrf = await obtenerCsrf(ag)
  const body = {
    respuestas: [{ preguntaId: freePreguntas[0].preguntaId, opcionId: opcion[0].opcionId }],
  }
  const res = await ag
    .post('/api/trivia/la-mocuana/responder')
    .set('X-CSRF-Token', csrf)
    .send(body)
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'RESPUESTAS_INCOMPLETAS')
})

test('usuario premium obtiene 5 preguntas y puede responder las 5', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'premium-user', PREFIJO)
  await concederPremium(usuario.id)

  const get = await ag.get('/api/trivia/la-mocuana')
  assert.equal(get.status, 200)
  assert.equal(get.body.data.preguntas.length, 5)
  assert.equal(get.body.data.totalPremium, 3)
  assert.equal(get.body.data.totalDisponible, 5)

  const preguntas = get.body.data.preguntas
  const respuestas = preguntas.map((p) => ({
    preguntaId: p.id,
    opcionId: p.opciones[0].id,
  }))
  const csrf = await obtenerCsrf(ag)
  const post = await ag
    .post('/api/trivia/la-mocuana/responder')
    .set('X-CSRF-Token', csrf)
    .send({ respuestas })
  assert.equal(post.status, 200)
  assert.equal(post.body.data.total, 5)
  assert.equal(post.body.data.detalle.length, 5)
})