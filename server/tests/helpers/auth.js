import request from 'supertest'
import app from '../../src/app.js'

export function agent() {
  return request.agent(app)
}

export async function obtenerCsrf(ag) {
  const res = await ag.get('/api/auth/csrf')
  if (res.status !== 200) throw new Error(`csrf ${res.status}: ${JSON.stringify(res.body)}`)
  return res.body.data.csrfToken
}

export async function registrar(ag, sufijo, prefijo = 'c-test-') {
  const token = await obtenerCsrf(ag)
  const res = await ag
    .post('/api/auth/registro')
    .set('X-CSRF-Token', token)
    .send({
      correo: `${prefijo}${sufijo}@ejemplo.com`,
      nombreUsuario: `${prefijo}${sufijo}`.replace(/[^a-zA-Z0-9._-]/g, ''),
      password: 'ClaveSegura123',
    })
  if (res.status !== 201) throw new Error(`registro ${res.status}: ${JSON.stringify(res.body)}`)
  return { usuario: res.body.data.usuario, csrfToken: res.body.data.csrfToken }
}

export async function login(ag, correoOUsuario, password = 'ClaveSegura123') {
  const token = await obtenerCsrf(ag)
  const res = await ag
    .post('/api/auth/login')
    .set('X-CSRF-Token', token)
    .send({ correoOUsuario, password })
  if (res.status !== 200) throw new Error(`login ${res.status}: ${JSON.stringify(res.body)}`)
  return { usuario: res.body.data.usuario, csrfToken: res.body.data.csrfToken }
}