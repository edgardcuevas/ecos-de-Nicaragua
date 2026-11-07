import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, registrar } from '../helpers/auth.js'
import { concederPremium, planActivo } from '../helpers/premium.js'
import { generarCodigos } from '../../src/services/codigos.service.js'

ensureTestDb()

const PREFIJO = 'premium-contract-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM codigos_activacion')
  await query('DELETE FROM sesiones')
}

test('Contrato: GET /api/premium/planes devuelve planes activos', async () => {
  const res = await request(app).get('/api/premium/planes')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.ok(res.body.data.length >= 1)
  for (const plan of res.body.data) {
    assert.ok(Number.isInteger(plan.id))
    assert.ok(typeof plan.nombre === 'string')
    assert.equal(typeof plan.duracionDias, 'number')
    assert.equal(typeof plan.activo, 'boolean')
    assert.equal(plan.activo, true)
  }
})

test('Contrato: GET /api/premium/mi-suscripcion exige sesión', async () => {
  const res = await request(app).get('/api/premium/mi-suscripcion')
  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'SESION_REQUERIDA')
})

test('Contrato: GET /api/premium/mi-suscripcion sin premium devuelve acceso false', async () => {
  const ag = crearAgent()
  await registrar(ag, 'sin-premium', PREFIJO)
  const res = await ag.get('/api/premium/mi-suscripcion')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.accesoPremium, false)
  assert.equal(res.body.data.suscripcion, null)
})

test('Contrato: GET /api/premium/mi-suscripcion con premium devuelve acceso true', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'con-premium', PREFIJO)
  await concederPremium(usuario.id)
  const res = await ag.get('/api/premium/mi-suscripcion')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.accesoPremium, true)
  assert.ok(res.body.data.suscripcion)
  assert.ok(Number.isInteger(res.body.data.suscripcion.plan.id))
})

test('Contrato: POST /api/premium/canjear exige sesión', async () => {
  const res = await request(app).post('/api/premium/canjear').send({ codigo: 'ECOS-AAAA-BBBB-CCCC' })
  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'SESION_REQUERIDA')
})

test('Contrato: POST /api/premium/canjear exige CSRF', async () => {
  const ag = crearAgent()
  await registrar(ag, 'csrf-premium', PREFIJO)
  const res = await ag.post('/api/premium/canjear').send({ codigo: 'ECOS-AAAA-BBBB-CCCC' })
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'CSRF_INVALIDO')
})

test('Contrato: POST /api/premium/canjear con código válido activa premium', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'canje-ok', PREFIJO)
  const plan = await planActivo()
  const generados = await generarCodigos({
    planId: plan.id,
    cantidad: 1,
    fechaVencimiento: new Date(Date.now() + 30 * 86400000).toISOString(),
  })
  const res = await ag
    .post('/api/premium/canjear')
    .set('X-CSRF-Token', csrfToken)
    .send({ codigo: generados.codigos[0] })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.accesoPremium, true)
  assert.ok(res.body.data.suscripcion)
  assert.equal(res.body.data.suscripcion.plan.id, plan.id)
})

test('Contrato: POST /api/premium/canjear con código inválido devuelve 400', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'canje-invalido', PREFIJO)
  const res = await ag
    .post('/api/premium/canjear')
    .set('X-CSRF-Token', csrfToken)
    .send({ codigo: 'ECOS-AAAA-BBBB-CCCC' })
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'CODIGO_INVALIDO')
})

test.after(async () => {
  await limpiar()
  await closePool()
})
