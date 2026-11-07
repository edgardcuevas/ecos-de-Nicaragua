import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { bandejaSalida, limpiarBandeja } from '../../src/utils/mailer.js'
import { hmacToken } from '../../src/utils/tokens.js'

ensureTestDb()

const PREFIJO = 'auth-test-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

async function obtenerCsrf(agent) {
  const res = await agent.get('/api/auth/csrf')
  assert.equal(res.status, 200)
  return res.body.data.csrfToken
}

async function registrar(agent, datos) {
  const token = await obtenerCsrf(agent)
  return agent
    .post('/api/auth/registro')
    .set('X-CSRF-Token', token)
    .send(datos)
}

before(async () => {
  await limpiar()
  limpiarBandeja()
})

after(async () => {
  await limpiar()
  await sessionStore.close()
  await closePool()
})

test('GET /api/auth/csrf crea sesión y devuelve token', async () => {
  const agent = request.agent(app)
  const res = await agent.get('/api/auth/csrf')

  assert.equal(res.status, 200)
  assert.match(res.body.data.csrfToken, /^[a-f0-9]{64}$/)
  assert.ok(res.headers['set-cookie'])
})

test('logout y refresh sin sesión devuelven 401', async () => {
  const logout = await request(app).post('/api/auth/logout')
  assert.equal(logout.status, 401)
  assert.equal(logout.body.error.codigo, 'SESION_REQUERIDA')

  const refresh = await request(app).post('/api/auth/refresh')
  assert.equal(refresh.status, 401)
  assert.equal(refresh.body.error.codigo, 'SESION_EXPIRADA')
})

test('POST /api/auth/registro sin CSRF devuelve 403', async () => {
  const res = await request(app).post('/api/auth/registro').send({
    correo: `${PREFIJO}sin-csrf@ejemplo.com`,
    nombreUsuario: 'sin-csrf',
    password: 'ClaveSegura123',
  })

  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'CSRF_INVALIDO')
})

test('registro crea usuario público y cookie de sesión', async () => {
  const agent = request.agent(app)
  const res = await registrar(agent, {
    correo: `${PREFIJO}ana@ejemplo.com`,
    nombreUsuario: 'ana-auth',
    password: 'ClaveSegura123',
  })

  assert.equal(res.status, 201)
  assert.equal(res.body.data.usuario.correo, `${PREFIJO}ana@ejemplo.com`)
  assert.equal(res.body.data.usuario.rol, 'gratis')
  assert.equal(res.body.data.usuario.estadoSuscripcion, 'gratis')
  assert.equal(res.body.data.usuario.password_hash, undefined)
  assert.match(res.body.data.csrfToken, /^[a-f0-9]{64}$/)
  assert.ok(res.body.data.expiraEn)
  assert.ok(res.headers['set-cookie'].some((cookie) => cookie.startsWith('ecos.sid=')))

  const me = await agent.get('/api/auth/me')
  assert.equal(me.status, 200)
  assert.equal(me.body.data.accesoPremium, false)
  assert.equal(me.body.data.suscripcion, null)
})

test('registro duplicado devuelve 409 sin revelar el campo', async () => {
  const agent = request.agent(app)
  const res = await registrar(agent, {
    correo: `${PREFIJO}ana@ejemplo.com`,
    nombreUsuario: 'otra-ana',
    password: 'ClaveSegura123',
  })

  assert.equal(res.status, 409)
  assert.equal(res.body.error.codigo, 'CUENTA_DUPLICADA')
  assert.equal(res.body.error.detalles.length, 0)
})

test('login con contraseña incorrecta devuelve 401', async () => {
  const agent = request.agent(app)
  const token = await obtenerCsrf(agent)
  const res = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', token)
    .send({ correoOUsuario: `${PREFIJO}ana@ejemplo.com`, password: 'Incorrecta123' })

  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'CREDENCIALES_INVALIDAS')
})

test('login correcto, refresh y logout', async () => {
  const agent = request.agent(app)
  const token = await obtenerCsrf(agent)
  const login = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', token)
    .send({ correoOUsuario: 'ANA-AUTH', password: 'ClaveSegura123' })

  assert.equal(login.status, 200)
  assert.equal(login.body.data.usuario.nombreUsuario, 'ana-auth')

  const csrf = login.body.data.csrfToken
  const refresh = await agent.post('/api/auth/refresh').set('X-CSRF-Token', csrf)
  assert.equal(refresh.status, 200)
  assert.ok(refresh.body.data.expiraEn)
  assert.equal(refresh.body.data.csrfToken, csrf)

  const logout = await agent.post('/api/auth/logout').set('X-CSRF-Token', csrf)
  assert.equal(logout.status, 204)

  const me = await agent.get('/api/auth/me')
  assert.equal(me.status, 401)
  assert.equal(me.body.error.codigo, 'SESION_REQUERIDA')
})

test('cambiar sesion_version invalida la sesión anterior', async () => {
  const agent = request.agent(app)
  const res = await registrar(agent, {
    correo: `${PREFIJO}version@ejemplo.com`,
    nombreUsuario: 'version-auth',
    password: 'ClaveSegura123',
  })
  assert.equal(res.status, 201)

  await query(
    'UPDATE usuarios SET sesion_version = sesion_version + 1 WHERE correo = ?',
    [`${PREFIJO}version@ejemplo.com`],
  )

  const me = await agent.get('/api/auth/me')
  assert.equal(me.status, 401)
})

test('recuperación de contraseña usa token de un solo uso y cierra sesiones', async () => {
  const agent = request.agent(app)
  const registro = await registrar(agent, {
    correo: `${PREFIJO}recupera@ejemplo.com`,
    nombreUsuario: 'recupera-auth',
    password: 'ClaveSegura123',
  })
  assert.equal(registro.status, 201)

  limpiarBandeja()
  const recuperador = request.agent(app)
  const csrfRecuperar = await obtenerCsrf(recuperador)
  const solicitud = await recuperador
    .post('/api/auth/recuperar')
    .set('X-CSRF-Token', csrfRecuperar)
    .send({ correo: `${PREFIJO}recupera@ejemplo.com` })

  assert.equal(solicitud.status, 202)
  assert.equal(bandejaSalida.length, 1)
  const enlace = bandejaSalida[0].text.match(/restablecer\?token=([^\s"<]+)/)
  assert.ok(enlace, 'el correo debe incluir el enlace de recuperación')
  const tokenRecuperacion = enlace[1]

  const csrfRestablecer = await obtenerCsrf(recuperador)
  const restablecer = await recuperador
    .post('/api/auth/restablecer')
    .set('X-CSRF-Token', csrfRestablecer)
    .send({ token: tokenRecuperacion, password: 'NuevaClave456' })
  assert.equal(restablecer.status, 200)

  const meAnterior = await agent.get('/api/auth/me')
  assert.equal(meAnterior.status, 401)

  const reuso = await recuperador
    .post('/api/auth/restablecer')
    .set('X-CSRF-Token', csrfRestablecer)
    .send({ token: tokenRecuperacion, password: 'OtraClave789' })
  assert.equal(reuso.status, 400)
  assert.equal(reuso.body.error.codigo, 'TOKEN_INVALIDO')

  const nuevoLogin = request.agent(app)
  const csrfLogin = await obtenerCsrf(nuevoLogin)
  const login = await nuevoLogin
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrfLogin)
    .send({ correoOUsuario: `${PREFIJO}recupera@ejemplo.com`, password: 'NuevaClave456' })
  assert.equal(login.status, 200)
})

test('un token de recuperación vencido devuelve 400', async () => {
  const agent = request.agent(app)
  const res = await registrar(agent, {
    correo: `${PREFIJO}vencido@ejemplo.com`,
    nombreUsuario: 'vencido-auth',
    password: 'ClaveSegura123',
  })
  assert.equal(res.status, 201)

  const usuario = await query('SELECT id FROM usuarios WHERE correo = ?', [
    `${PREFIJO}vencido@ejemplo.com`,
  ])
  await query(
    `INSERT INTO recuperacion_password (usuario_id, token_hash, expira_en)
     VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 1 MINUTE))`,
    [usuario[0].id, hmacToken('token-vencido-de-prueba')],
  )

  const recuperador = request.agent(app)
  const csrf = await obtenerCsrf(recuperador)
  const restablecer = await recuperador
    .post('/api/auth/restablecer')
    .set('X-CSRF-Token', csrf)
    .send({ token: 'token-vencido-de-prueba', password: 'NuevaClave456' })

  assert.equal(restablecer.status, 400)
  assert.equal(restablecer.body.error.codigo, 'TOKEN_INVALIDO')
})
