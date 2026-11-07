import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, registrar } from '../helpers/auth.js'
import { planActivo } from '../helpers/premium.js'

ensureTestDb()

const PREFIJO = 'admin-contract-'

async function limpiar() {
  await query(
    'DELETE FROM auditoria_admin WHERE admin_id IN (SELECT id FROM usuarios WHERE correo LIKE ?)',
    [`${PREFIJO}%`],
  )
  await query('DELETE FROM codigos_activacion')
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

async function crearAdmin(ag, sufijo) {
  const { usuario, csrfToken } = await registrar(ag, sufijo, PREFIJO)
  await query('UPDATE usuarios SET rol = ? WHERE id = ?', ['admin', usuario.id])
  usuario.rol = 'admin'
  return { usuario, csrfToken }
}

test('Contrato: rutas admin exigen sesión y rol admin', async () => {
  const sinSesion = await request(app).get('/api/admin/usuarios')
  assert.equal(sinSesion.status, 401)
  assert.equal(sinSesion.body.error.codigo, 'SESION_REQUERIDA')

  const ag = crearAgent()
  await registrar(ag, 'normal', PREFIJO)
  const sinRol = await ag.get('/api/admin/usuarios')
  assert.equal(sinRol.status, 403)
  assert.equal(sinRol.body.error.codigo, 'SIN_PERMISO')
})

test('Contrato: GET /api/admin/usuarios devuelve data y meta', async () => {
  const ag = crearAgent()
  await crearAdmin(ag, 'admin-lista')
  const res = await ag.get('/api/admin/usuarios')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.ok(res.body.meta)
  assert.equal(typeof res.body.meta.total, 'number')
  for (const item of res.body.data) {
    assert.ok(Number.isInteger(item.id))
    assert.ok(typeof item.correo === 'string')
    assert.ok(typeof item.nombreUsuario === 'string')
    assert.ok(['gratis', 'premium', 'admin'].includes(item.rol))
    assert.ok(['gratis', 'premium'].includes(item.estadoSuscripcion))
    assert.ok(typeof item.fechaRegistro === 'string')
    assert.ok('suscripcionActual' in item)
  }
})

test('Contrato: GET /api/admin/usuarios/:id devuelve 404 si no existe', async () => {
  const ag = crearAgent()
  await crearAdmin(ag, 'admin-404')
  const res = await ag.get('/api/admin/usuarios/999999')
  assert.equal(res.status, 404)
  assert.equal(res.body.error.codigo, 'USUARIO_NO_ENCONTRADO')
})

test('Contrato: PATCH rol propio devuelve 409 AUTO_ROL', async () => {
  const ag = crearAgent()
  const { usuario, csrfToken } = await crearAdmin(ag, 'admin-self')
  const res = await ag
    .patch(`/api/admin/usuarios/${usuario.id}/rol`)
    .set('X-CSRF-Token', csrfToken)
    .send({ rol: 'gratis' })
  assert.equal(res.status, 409)
  assert.equal(res.body.error.codigo, 'AUTO_ROL')
})

test('Contrato: POST suscripción devuelve 201 y GET suscripciones devuelve historial', async () => {
  const ag = crearAgent()
  const { csrfToken } = await crearAdmin(ag, 'admin-sub')
  const ag2 = crearAgent()
  const { usuario: objetivo } = await registrar(ag2, 'objetivo-sub', PREFIJO)
  const plan = await planActivo()

  const activacion = await ag
    .post(`/api/admin/usuarios/${objetivo.id}/suscripcion`)
    .set('X-CSRF-Token', csrfToken)
    .send({ planId: plan.id })
  assert.equal(activacion.status, 201)
  assert.ok(activacion.body.data.id)
  assert.equal(activacion.body.data.plan.id, plan.id)
  assert.equal(activacion.body.data.estado, 'activa')

  const historial = await ag.get(`/api/admin/usuarios/${objetivo.id}/suscripciones`)
  assert.equal(historial.status, 200)
  assert.ok(Array.isArray(historial.body.data))
  assert.ok(historial.body.data.length >= 1)

  const eliminacion = await ag
    .delete(`/api/admin/usuarios/${objetivo.id}/suscripcion`)
    .set('X-CSRF-Token', csrfToken)
  assert.equal(eliminacion.status, 204)
})

test('Contrato: POST códigos devuelve 201 y GET códigos devuelve meta', async () => {
  const ag = crearAgent()
  const { csrfToken } = await crearAdmin(ag, 'admin-codigos')
  const plan = await planActivo()
  const vencimiento = new Date(Date.now() + 30 * 86400000).toISOString()

  const generacion = await ag
    .post('/api/admin/codigos')
    .set('X-CSRF-Token', csrfToken)
    .send({ planId: plan.id, cantidad: 2, fechaVencimiento: vencimiento })
  assert.equal(generacion.status, 201)
  assert.equal(generacion.body.data.codigos.length, 2)
  assert.equal(generacion.body.data.planId, plan.id)

  const listado = await ag.get(`/api/admin/codigos?planId=${plan.id}`)
  assert.equal(listado.status, 200)
  assert.ok(Array.isArray(listado.body.data))
  assert.ok(listado.body.meta)
  for (const fila of listado.body.data) {
    assert.equal(fila.codigo_hash, undefined)
  }
})

test('Contrato: GET /api/admin/auditoria devuelve data y meta', async () => {
  const ag = crearAgent()
  await crearAdmin(ag, 'admin-auditoria')
  const res = await ag.get('/api/admin/auditoria')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.ok(res.body.meta)
})

test('Contrato: mutaciones admin exigen CSRF', async () => {
  const ag = crearAgent()
  const { usuario } = await crearAdmin(ag, 'admin-csrf')
  const res = await ag.patch(`/api/admin/usuarios/${usuario.id}/rol`).send({ rol: 'gratis' })
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'CSRF_INVALIDO')
})

test.after(async () => {
  await limpiar()
  await closePool()
})
