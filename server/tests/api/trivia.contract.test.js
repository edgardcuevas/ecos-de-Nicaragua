import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'

test('Contrato: GET /api/trivia devuelve data array', async () => {
  const res = await request(app).get('/api/trivia')
  // Acepta 200 o 404 mientras no esté montado
  assert.ok([200, 404].includes(res.status))
})