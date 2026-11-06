import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../../src/app.js'
import { ensureTestDb } from '../helpers/db.js'

ensureTestDb()

test('GET /api/media/imagenes/:id inexistente devuelve 404', async () => {
  const res = await request(app).get('/api/media/imagenes/999999')
  assert.equal(res.status, 404)
})