import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'

ensureTestDb()

test('Contrato: GET /api/health devuelve status y db', async () => {
  const res = await request(app).get('/api/health')
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'ok')
  assert.equal(res.body.db, 'ok')
  assert.ok(res.body.version)
})

test.after(async () => {
  await closePool()
})
