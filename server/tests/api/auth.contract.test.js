import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'

ensureTestDb()

const PREFIJO = 'auth-contract-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

test('Contrato: GET /api/auth/csrf crea sesión y devuelve token', async () => {
  const agent = request.agent(app)
  const res = await agent.get('/api/auth/csrf')
  assert.equal(res.status, 200)
  assert.match(res.body.data.csrfToken, /^[a-f0-9]{64}$/)
  assert.ok(res.headers['set-cookie'])
})

test('Contrato: POST /api/auth/registro exige CSRF', async () => {
  const res = await request(app).post('/api/auth/registro').send({
    correo: `${PREFIJO}sin-csrf@ejemplo.com`,
    nombreUsuario: `${PREFIJO}sin-csrf`,
    password: 'ClaveSegura123',
  })
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'CSRF_INVALIDO')
})

test('Contrato: POST /api/auth/registro valida el cuerpo', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  const res = await agent
    .post('/api/auth/registro')
    .set('X-CSRF-Token', csrf)
    .send({ correo: 'no-es-correo', password: 'corta' })
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
  assert.ok(Array.isArray(res.body.error.detalles))
})

test('Contrato: POST /api/auth/registro crea usuario y devuelve sesión', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  const res = await agent
    .post('/api/auth/registro')
    .set('X-CSRF-Token', csrf)
    .send({
      correo: `${PREFIJO}ana@ejemplo.com`,
      nombreUsuario: `${PREFIJO}ana`,
      password: 'ClaveSegura123',
    })
  assert.equal(res.status, 201)
  assert.ok(Number.isInteger(res.body.data.usuario.id))
  assert.equal(res.body.data.usuario.correo, `${PREFIJO}ana@ejemplo.com`)
  assert.equal(res.body.data.usuario.rol, 'gratis')
  assert.equal(res.body.data.usuario.estadoSuscripcion, 'gratis')
  assert.match(res.body.data.csrfToken, /^[a-f0-9]{64}$/)
  assert.ok(res.body.data.expiraEn)
  assert.ok(res.headers['set-cookie'])
})

test('Contrato: POST /api/auth/registro duplicado devuelve 409', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  const res = await agent
    .post('/api/auth/registro')
    .set('X-CSRF-Token', csrf)
    .send({
      correo: `${PREFIJO}ana@ejemplo.com`,
      nombreUsuario: `${PREFIJO}ana2`,
      password: 'ClaveSegura123',
    })
  assert.equal(res.status, 409)
  assert.equal(res.body.error.codigo, 'CUENTA_DUPLICADA')
})

test('Contrato: POST /api/auth/login con credenciales inválidas devuelve 401', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  const res = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ correoOUsuario: `${PREFIJO}ana@ejemplo.com`, password: 'Incorrecta123' })
  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'CREDENCIALES_INVALIDAS')
})

test('Contrato: POST /api/auth/login exige CSRF', async () => {
  const res = await request(app).post('/api/auth/login').send({
    correoOUsuario: `${PREFIJO}ana@ejemplo.com`,
    password: 'ClaveSegura123',
  })
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'CSRF_INVALIDO')
})

test('Contrato: GET /api/auth/me exige sesión', async () => {
  const res = await request(app).get('/api/auth/me')
  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'SESION_REQUERIDA')
})

test('Contrato: POST /api/auth/logout exige sesión', async () => {
  const res = await request(app).post('/api/auth/logout')
  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'SESION_REQUERIDA')
})

test('Contrato: POST /api/auth/refresh exige sesión', async () => {
  const res = await request(app).post('/api/auth/refresh')
  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'SESION_EXPIRADA')
})

test('Contrato: POST /api/auth/recuperar devuelve 202', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  const res = await agent
    .post('/api/auth/recuperar')
    .set('X-CSRF-Token', csrf)
    .send({ correo: `${PREFIJO}ana@ejemplo.com` })
  assert.equal(res.status, 202)
  assert.ok(res.body.data.mensaje)
})

test('Contrato: POST /api/auth/restablecer con token inválido devuelve 400', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  const res = await agent
    .post('/api/auth/restablecer')
    .set('X-CSRF-Token', csrf)
    .send({ token: 'token-invalido-de-prueba', password: 'NuevaClave456' })
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'TOKEN_INVALIDO')
})

test('Contrato: POST /api/auth/login correcto devuelve sesión', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  const res = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ correoOUsuario: `${PREFIJO}ana@ejemplo.com`, password: 'ClaveSegura123' })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.usuario.nombreUsuario, `${PREFIJO}ana`)
  assert.match(res.body.data.csrfToken, /^[a-f0-9]{64}$/)
  assert.ok(res.body.data.expiraEn)
})

test('Contrato: GET /api/auth/me con sesión devuelve usuario y acceso', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ correoOUsuario: `${PREFIJO}ana@ejemplo.com`, password: 'ClaveSegura123' })
  const res = await agent.get('/api/auth/me')
  assert.equal(res.status, 200)
  assert.ok(res.body.data.usuario)
  assert.equal(typeof res.body.data.accesoPremium, 'boolean')
  assert.ok('suscripcion' in res.body.data)
})

test('Contrato: POST /api/auth/refresh con sesión devuelve expiración', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  const login = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ correoOUsuario: `${PREFIJO}ana@ejemplo.com`, password: 'ClaveSegura123' })
  const res = await agent
    .post('/api/auth/refresh')
    .set('X-CSRF-Token', login.body.data.csrfToken)
  assert.equal(res.status, 200)
  assert.ok(res.body.data.expiraEn)
  assert.match(res.body.data.csrfToken, /^[a-f0-9]{64}$/)
})

test('Contrato: POST /api/auth/logout con sesión devuelve 204', async () => {
  const agent = request.agent(app)
  const csrf = (await agent.get('/api/auth/csrf')).body.data.csrfToken
  const login = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ correoOUsuario: `${PREFIJO}ana@ejemplo.com`, password: 'ClaveSegura123' })
  const res = await agent
    .post('/api/auth/logout')
    .set('X-CSRF-Token', login.body.data.csrfToken)
  assert.equal(res.status, 204)
})

test.after(async () => {
  await limpiar()
  await closePool()
})
