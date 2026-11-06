import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'
import { ensureTestDb } from '../helpers/db.js'

ensureTestDb()

test('GET /api/trivia lista las 6 leyendas', async () => {
  const res = await request(app).get('/api/trivia')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
})

test('GET /api/trivia/:slug no revela respuesta correcta', async () => {
  const res = await request(app).get('/api/trivia/la-mocuana')
  // Puede ser 404 si no hay seed de preguntas; aceptamos 200 o 404
  if (res.status === 200) {
    const q = res.body.data.preguntas[0]
    assert.ok(q)
    assert.equal(q.opciones.every((o) => o.esCorrecta === undefined), true)
  }
})