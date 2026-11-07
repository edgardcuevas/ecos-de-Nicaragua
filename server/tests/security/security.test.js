import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { hashPassword } from '../../src/utils/passwords.js'

ensureTestDb()

const PREFIJO = 'sec-test-'

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

test('inyeccion SQL en login no rompe ni concede acceso', async () => {
  const agent = request.agent(app)
  const csrf = await agent.get('/api/auth/csrf')
  const res = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrf.body.data.csrfToken)
    .send({ correoOUsuario: "' OR 1=1 --", password: 'cualquiera123' })

  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'CREDENCIALES_INVALIDAS')
})

test('inyeccion SQL en filtros de leyendas no rompe', async () => {
  const res = await request(app).get("/api/leyendas?region=' OR 1=1 --&q='; DROP TABLE usuarios; --")
  assert.ok([200, 400, 404].includes(res.status))
  assert.ok(!res.body?.error?.mensaje?.includes('SQL'))
})

test('campos desconocidos se rechazan con 400 VALIDACION', async () => {
  const agent = request.agent(app)
  const csrf = await agent.get('/api/auth/csrf')
  const res = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrf.body.data.csrfToken)
    .send({ correoOUsuario: 'ana', password: 'ClaveSegura123', campoDesconocido: 'x' })

  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
})

test('rutas admin exigen sesion (401) y rol admin (403)', async () => {
  const sinSesion = await request(app).post('/api/admin/codigos').send({})
  assert.equal(sinSesion.status, 401)
  assert.equal(sinSesion.body.error.codigo, 'SESION_REQUERIDA')

  const agent = request.agent(app)
  const csrf = await agent.get('/api/auth/csrf')
  await agent
    .post('/api/auth/registro')
    .set('X-CSRF-Token', csrf.body.data.csrfToken)
    .send({
      correo: `${PREFIJO}normal@ejemplo.com`,
      nombreUsuario: 'sec-normal',
      password: 'ClaveSegura123',
    })

  const csrf2 = await agent.get('/api/auth/csrf')
  const comoNormal = await agent
    .post('/api/admin/codigos')
    .set('X-CSRF-Token', csrf2.body.data.csrfToken)
    .send({ planId: 1, cantidad: 1, fechaVencimiento: new Date(Date.now() + 86400000).toISOString() })
  assert.equal(comoNormal.status, 403)
  assert.equal(comoNormal.body.error.codigo, 'SIN_PERMISO')
})

test('cabeceras de seguridad presentes', async () => {
  const res = await request(app).get('/api/health')
  assert.equal(res.headers['x-content-type-options'], 'nosniff')
  assert.ok(res.headers['x-frame-options'])
  assert.ok(res.headers['referrer-policy'])
})
