import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { generarCodigos } from '../../src/services/codigos.service.js'
import {
  hoyCalendario,
  reemplazarVigente,
  sumarDias,
} from '../../src/services/suscripciones.service.js'
import { hashCodigoActivacion } from '../../src/utils/tokens.js'

ensureTestDb()

const PREFIJO = 'premium-test-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM codigos_activacion')
  await query('DELETE FROM sesiones')
}

async function obtenerCsrf(agent) {
  const res = await agent.get('/api/auth/csrf')
  assert.equal(res.status, 200)
  return res.body.data.csrfToken
}

async function registrar(agent, sufijo) {
  const token = await obtenerCsrf(agent)
  const res = await agent
    .post('/api/auth/registro')
    .set('X-CSRF-Token', token)
    .send({
      correo: `${PREFIJO}${sufijo}@ejemplo.com`,
      nombreUsuario: `premium-${sufijo}`,
      password: 'ClaveSegura123',
    })
  assert.equal(res.status, 201)
  return { usuario: res.body.data.usuario, csrfToken: res.body.data.csrfToken }
}

async function planActivo() {
  const filas = await query(
    'SELECT id, nombre, duracion_dias FROM planes WHERE activo = 1 ORDER BY id ASC LIMIT 1',
  )
  assert.ok(filas[0], 'el seed debe tener al menos un plan activo')
  return filas[0]
}

before(async () => {
  await limpiar()
})

after(async () => {
  await limpiar()
  await sessionStore.close()
  await closePool()
})

test('GET /api/premium/planes devuelve solo planes activos', async () => {
  const res = await request(app).get('/api/premium/planes')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.ok(res.body.data.length >= 1)
  assert.equal(res.body.data.every((plan) => plan.activo === true), true)
})

test('GET /api/premium/mi-suscripcion exige sesión', async () => {
  const res = await request(app).get('/api/premium/mi-suscripcion')
  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'SESION_REQUERIDA')
})

test('POST /api/premium/canjear sin sesión devuelve 401', async () => {
  const res = await request(app)
    .post('/api/premium/canjear')
    .send({ codigo: 'ECOS-AAAA-BBBB-CCCC' })

  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'SESION_REQUERIDA')
})

test('un usuario sin suscripción no tiene acceso premium', async () => {
  const agent = request.agent(app)
  await registrar(agent, 'sin-suscripcion')

  const res = await agent.get('/api/premium/mi-suscripcion')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.accesoPremium, false)
  assert.equal(res.body.data.suscripcion, null)
})

test('una suscripción activa concede acceso premium', async () => {
  const agent = request.agent(app)
  const { usuario } = await registrar(agent, 'activa')
  const plan = await planActivo()
  const hoy = hoyCalendario()

  await reemplazarVigente(usuario.id, {
    planId: plan.id,
    fechaInicio: hoy,
    fechaFin: sumarDias(hoy, 9),
  })

  const res = await agent.get('/api/premium/mi-suscripcion')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.accesoPremium, true)
  assert.equal(res.body.data.suscripcion.plan.id, plan.id)
  assert.equal(res.body.data.suscripcion.fechaFin, sumarDias(hoy, 9))
  assert.equal(res.body.data.suscripcion.diasRestantes, 9)
})

test('una suscripción vencida no concede acceso y se reconcilia', async () => {
  const agent = request.agent(app)
  const { usuario } = await registrar(agent, 'vencida')
  const plan = await planActivo()
  const hoy = hoyCalendario()

  await query(
    `INSERT INTO suscripciones (usuario_id, plan_id, fecha_inicio, fecha_fin, estado)
     VALUES (?, ?, ?, ?, 'activa')`,
    [usuario.id, plan.id, sumarDias(hoy, -20), sumarDias(hoy, -1)],
  )
  await query("UPDATE usuarios SET estado_suscripcion = 'premium' WHERE id = ?", [usuario.id])

  const res = await agent.get('/api/premium/mi-suscripcion')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.accesoPremium, false)
  assert.equal(res.body.data.suscripcion, null)

  const filas = await query(
    'SELECT estado FROM suscripciones WHERE usuario_id = ? ORDER BY id DESC LIMIT 1',
    [usuario.id],
  )
  assert.equal(filas[0].estado, 'vencida')

  const cache = await query('SELECT estado_suscripcion FROM usuarios WHERE id = ?', [usuario.id])
  assert.equal(cache[0].estado_suscripcion, 'gratis')
})

test('una suscripción cancelada no concede acceso', async () => {
  const agent = request.agent(app)
  const { usuario } = await registrar(agent, 'cancelada')
  const plan = await planActivo()
  const hoy = hoyCalendario()

  await query(
    `INSERT INTO suscripciones (usuario_id, plan_id, fecha_inicio, fecha_fin, estado)
     VALUES (?, ?, ?, ?, 'cancelada')`,
    [usuario.id, plan.id, hoy, sumarDias(hoy, 20)],
  )

  const res = await agent.get('/api/premium/mi-suscripcion')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.accesoPremium, false)
})

test('cambiar el rol a premium no concede acceso', async () => {
  const agent = request.agent(app)
  const { usuario } = await registrar(agent, 'rol-premium')
  await query("UPDATE usuarios SET rol = 'premium' WHERE id = ?", [usuario.id])

  const res = await agent.get('/api/premium/mi-suscripcion')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.accesoPremium, false)
  assert.equal(res.body.data.suscripcion, null)
})

test('canjear un código activa premium y no permite reutilizarlo', async () => {
  const agent = request.agent(app)
  const { usuario, csrfToken } = await registrar(agent, 'canje')
  const plan = await planActivo()

  const generados = await generarCodigos({
    planId: plan.id,
    cantidad: 1,
    fechaVencimiento: new Date(Date.now() + 30 * 86400000).toISOString(),
  })
  const codigo = generados.codigos[0]
  assert.match(codigo, /^ECOS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)

  const canje = await agent
    .post('/api/premium/canjear')
    .set('X-CSRF-Token', csrfToken)
    .send({ codigo })
  assert.equal(canje.status, 200)
  assert.equal(canje.body.data.accesoPremium, true)
  assert.equal(canje.body.data.suscripcion.plan.id, plan.id)
  assert.equal(canje.body.data.suscripcion.fechaInicio, hoyCalendario())

  const miSuscripcion = await agent.get('/api/premium/mi-suscripcion')
  assert.equal(miSuscripcion.body.data.accesoPremium, true)

  const reuso = await agent
    .post('/api/premium/canjear')
    .set('X-CSRF-Token', csrfToken)
    .send({ codigo })
  assert.equal(reuso.status, 400)
  assert.equal(reuso.body.error.codigo, 'CODIGO_INVALIDO')

  const usado = await query(
    'SELECT usado_por_usuario_id FROM codigos_activacion WHERE codigo_hash = ?',
    [hashCodigoActivacion(codigo)],
  )
  assert.equal(usado[0].usado_por_usuario_id, usuario.id)
})

test('un código vencido devuelve 400', async () => {
  const agent = request.agent(app)
  const { csrfToken } = await registrar(agent, 'codigo-vencido')
  const plan = await planActivo()
  const codigo = 'ECOS-AAAA-BBBB-CCCC'

  await query(
    `INSERT INTO codigos_activacion (codigo_hash, plan_id, fecha_vencimiento)
     VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 1 DAY))`,
    [hashCodigoActivacion(codigo), plan.id],
  )

  const res = await agent
    .post('/api/premium/canjear')
    .set('X-CSRF-Token', csrfToken)
    .send({ codigo })

  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'CODIGO_INVALIDO')
})

test('canjear con premium vigente extiende desde el día siguiente', async () => {
  const agent = request.agent(app)
  const { usuario, csrfToken } = await registrar(agent, 'extension')
  const plan = await planActivo()
  const hoy = hoyCalendario()
  const finActual = sumarDias(hoy, 10)

  await reemplazarVigente(usuario.id, {
    planId: plan.id,
    fechaInicio: hoy,
    fechaFin: finActual,
  })

  const generados = await generarCodigos({
    planId: plan.id,
    cantidad: 1,
    fechaVencimiento: new Date(Date.now() + 60 * 86400000).toISOString(),
  })

  const res = await agent
    .post('/api/premium/canjear')
    .set('X-CSRF-Token', csrfToken)
    .send({ codigo: generados.codigos[0] })

  assert.equal(res.status, 200)
  assert.equal(res.body.data.suscripcion.fechaInicio, sumarDias(finActual, 1))
  assert.equal(
    res.body.data.suscripcion.fechaFin,
    sumarDias(sumarDias(finActual, 1), Number(plan.duracion_dias) - 1),
  )
})

test('canjear sin CSRF devuelve 403', async () => {
  const agent = request.agent(app)
  await registrar(agent, 'canje-sin-csrf')

  const res = await agent
    .post('/api/premium/canjear')
    .send({ codigo: 'ECOS-AAAA-BBBB-CCCC' })

  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'CSRF_INVALIDO')
})
