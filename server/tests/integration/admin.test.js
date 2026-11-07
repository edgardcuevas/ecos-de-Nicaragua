import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { cambiarRol } from '../../src/services/admin.service.js'
import {
  hoyCalendario,
  sumarDias,
} from '../../src/services/suscripciones.service.js'

ensureTestDb()

const PREFIJO = 'admin-test-'
const servidor = http.createServer(app)

async function limpiar() {
  await query(
    'DELETE FROM auditoria_admin WHERE admin_id IN (SELECT id FROM usuarios WHERE correo LIKE ?)',
    [`${PREFIJO}%`],
  )
  await query('DELETE FROM codigos_activacion')
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

async function obtenerCsrf(agent) {
  const res = await agent.get('/api/auth/csrf')
  assert.equal(res.status, 200)
  return res.body.data.csrfToken
}

async function crearUsuario(sufijo, rol = 'gratis') {
  const agent = request.agent(servidor)
  const csrfToken = await obtenerCsrf(agent)
  const res = await agent
    .post('/api/auth/registro')
    .set('X-CSRF-Token', csrfToken)
    .send({
      correo: `${PREFIJO}${sufijo}@ejemplo.com`,
      nombreUsuario: `${PREFIJO}${sufijo}`,
      password: 'ClaveSegura123',
    })

  assert.equal(res.status, 201)
  const usuario = res.body.data.usuario

  if (rol !== 'gratis') {
    await query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, usuario.id])
    usuario.rol = rol
  }

  return { agent, csrfToken, usuario }
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
  await new Promise((resolve, reject) => {
    servidor.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve()))
  })
})

after(async () => {
  await limpiar()
  await new Promise((resolve, reject) => {
    servidor.close((error) => (error ? reject(error) : resolve()))
  })
  await sessionStore.close()
  await closePool()
})

test('las rutas de administración exigen sesión y rol admin', async () => {
  const sinSesion = await request(servidor).get('/api/admin/usuarios')
  assert.equal(sinSesion.status, 401)
  assert.equal(sinSesion.body.error.codigo, 'SESION_REQUERIDA')

  const { agent } = await crearUsuario('solo-gratis')
  const sinRol = await agent.get('/api/admin/usuarios')
  assert.equal(sinRol.status, 403)
  assert.equal(sinRol.body.error.codigo, 'SIN_PERMISO')
})

test('un admin busca por correo y nombre de usuario sin exponer hashes', async () => {
  const { agent: admin } = await crearUsuario('admin-busqueda', 'admin')
  const { usuario: ana } = await crearUsuario('ana-busqueda')
  await crearUsuario('beto-busqueda')

  const porCorreo = await admin.get(
    `/api/admin/usuarios?q=${encodeURIComponent(`${PREFIJO}ana-busqueda`)}`,
  )
  assert.equal(porCorreo.status, 200)
  assert.equal(porCorreo.body.data.length, 1)
  assert.equal(porCorreo.body.data[0].id, ana.id)
  assert.equal(porCorreo.body.data[0].password_hash, undefined)
  assert.equal(porCorreo.body.data[0].suscripcionActual, null)
  assert.equal(porCorreo.body.meta.total, 1)

  const porUsuario = await admin.get('/api/admin/usuarios?q=ana-busqueda')
  assert.equal(porUsuario.status, 200)
  assert.equal(porUsuario.body.data.length, 1)
  assert.equal(porUsuario.body.data[0].nombreUsuario, `${PREFIJO}ana-busqueda`)

  const porRol = await admin.get('/api/admin/usuarios?rol=gratis&limit=50')
  assert.equal(porRol.status, 200)
  assert.ok(porRol.body.data.every((fila) => fila.rol === 'gratis'))
})

test('la búsqueda escapa comodines y rechaza parámetros desconocidos', async () => {
  const { agent: admin } = await crearUsuario('admin-comodines', 'admin')
  await crearUsuario('comodines-uno')

  const comodin = await admin.get('/api/admin/usuarios?q=%25')
  assert.equal(comodin.status, 200)
  assert.equal(comodin.body.data.length, 0)

  const inyeccion = await admin.get(
    `/api/admin/usuarios?q=${encodeURIComponent("' OR 1=1 --")}`,
  )
  assert.equal(inyeccion.status, 200)
  assert.equal(inyeccion.body.data.length, 0)

  const desconocido = await admin.get('/api/admin/usuarios?foo=bar')
  assert.equal(desconocido.status, 400)
  assert.equal(desconocido.body.error.codigo, 'VALIDACION')
})

test('el detalle incluye suscripciones y devuelve 404 si no existe', async () => {
  const { agent: admin } = await crearUsuario('admin-detalle', 'admin')
  const { usuario: objetivo } = await crearUsuario('detalle-objetivo')
  const plan = await planActivo()
  const hoy = hoyCalendario()

  const activacion = await admin
    .post(`/api/admin/usuarios/${objetivo.id}/suscripcion`)
    .set('X-CSRF-Token', await obtenerCsrf(admin))
    .send({ planId: plan.id, fechaInicio: hoy, fechaFin: sumarDias(hoy, 9) })
  assert.equal(activacion.status, 201)

  const detalle = await admin.get(`/api/admin/usuarios/${objetivo.id}`)
  assert.equal(detalle.status, 200)
  assert.equal(detalle.body.data.id, objetivo.id)
  assert.equal(detalle.body.data.estadoSuscripcion, 'premium')
  assert.equal(detalle.body.data.suscripcionActual.plan, plan.nombre)
  assert.equal(detalle.body.data.suscripcionActual.fechaFin, sumarDias(hoy, 9))
  assert.equal(detalle.body.data.suscripciones.length, 1)
  assert.equal(detalle.body.data.password_hash, undefined)

  const soloPremium = await admin.get('/api/admin/usuarios?premium=true&limit=50')
  assert.equal(soloPremium.status, 200)
  assert.ok(soloPremium.body.data.some((fila) => fila.id === objetivo.id))

  const soloGratis = await admin.get('/api/admin/usuarios?premium=false&limit=50')
  assert.equal(soloGratis.status, 200)
  assert.equal(soloGratis.body.data.some((fila) => fila.id === objetivo.id), false)

  const historial = await admin.get(
    `/api/admin/usuarios/${objetivo.id}/suscripciones`,
  )
  assert.equal(historial.status, 200)
  assert.equal(historial.body.data.length, 1)
  assert.equal(historial.body.data[0].plan.id, plan.id)

  const inexistente = await admin.get('/api/admin/usuarios/999999')
  assert.equal(inexistente.status, 404)
  assert.equal(inexistente.body.error.codigo, 'USUARIO_NO_ENCONTRADO')
})

test('cambiar rol se refleja en la siguiente petición y deja auditoría', async () => {
  const { agent: admin, usuario: adminUsuario } = await crearUsuario(
    'admin-rol',
    'admin',
  )
  const { agent: objetivo, usuario: objetivoUsuario } = await crearUsuario(
    'rol-objetivo',
  )
  const csrf = await obtenerCsrf(admin)

  const cambio = await admin
    .patch(`/api/admin/usuarios/${objetivoUsuario.id}/rol`)
    .set('X-CSRF-Token', csrf)
    .send({ rol: 'premium' })
  assert.equal(cambio.status, 200)
  assert.equal(cambio.body.data.rol, 'premium')

  const me = await objetivo.get('/api/auth/me')
  assert.equal(me.status, 200)
  assert.equal(me.body.data.usuario.rol, 'premium')

  const auditoria = await admin.get(
    '/api/admin/auditoria?accion=USUARIO_ROL_ACTUALIZADO',
  )
  assert.equal(auditoria.status, 200)
  const fila = auditoria.body.data.find((item) => item.entidadId === objetivoUsuario.id)
  assert.ok(fila)
  assert.deepEqual(fila.datos.antes, { rol: 'gratis' })
  assert.deepEqual(fila.datos.despues, { rol: 'premium' })

  const autoRol = await admin
    .patch(`/api/admin/usuarios/${adminUsuario.id}/rol`)
    .set('X-CSRF-Token', csrf)
    .send({ rol: 'gratis' })
  assert.equal(autoRol.status, 409)
  assert.equal(autoRol.body.error.codigo, 'AUTO_ROL')

  const invalido = await admin
    .patch(`/api/admin/usuarios/${objetivoUsuario.id}/rol`)
    .set('X-CSRF-Token', csrf)
    .send({ rol: 'superadmin' })
  assert.equal(invalido.status, 400)
  assert.equal(invalido.body.error.codigo, 'VALIDACION')

  const extra = await admin
    .patch(`/api/admin/usuarios/${objetivoUsuario.id}/rol`)
    .set('X-CSRF-Token', csrf)
    .send({ rol: 'gratis', extra: true })
  assert.equal(extra.status, 400)
  assert.equal(extra.body.error.codigo, 'VALIDACION')
})

test('no se puede quitar el último administrador', async () => {
  const { usuario: unicoAdmin } = await crearUsuario('admin-unico', 'admin')
  const otros = await query(
    "SELECT id FROM usuarios WHERE rol = 'admin' AND id <> ?",
    [unicoAdmin.id],
  )
  for (const otro of otros) {
    await query("UPDATE usuarios SET rol = 'gratis' WHERE id = ?", [otro.id])
  }

  await assert.rejects(
    () => cambiarRol(999999, unicoAdmin.id, 'gratis'),
    (error) => {
      assert.equal(error.codigo, 'ULTIMO_ADMIN')
      assert.equal(error.status, 409)
      return true
    },
  )
})

test('activar y quitar premium actualiza el acceso en la siguiente petición', async () => {
  const { agent: admin, usuario: adminUsuario } = await crearUsuario(
    'admin-premium',
    'admin',
  )
  const { agent: objetivo, usuario: objetivoUsuario } = await crearUsuario(
    'premium-objetivo',
  )
  const plan = await planActivo()
  const hoy = hoyCalendario()
  const csrf = await obtenerCsrf(admin)

  const activacion = await admin
    .post(`/api/admin/usuarios/${objetivoUsuario.id}/suscripcion`)
    .set('X-CSRF-Token', csrf)
    .send({ planId: plan.id, fechaInicio: hoy, fechaFin: sumarDias(hoy, 9) })
  assert.equal(activacion.status, 201)
  assert.equal(activacion.body.data.plan.id, plan.id)
  assert.equal(activacion.body.data.fechaInicio, hoy)
  assert.equal(activacion.body.data.fechaFin, sumarDias(hoy, 9))
  assert.equal(activacion.body.data.estado, 'activa')

  const mePremium = await objetivo.get('/api/auth/me')
  assert.equal(mePremium.body.data.accesoPremium, true)
  assert.equal(mePremium.body.data.suscripcion.fechaFin, sumarDias(hoy, 9))

  const eliminacion = await admin
    .delete(`/api/admin/usuarios/${objetivoUsuario.id}/suscripcion`)
    .set('X-CSRF-Token', csrf)
  assert.equal(eliminacion.status, 204)

  const meGratis = await objetivo.get('/api/auth/me')
  assert.equal(meGratis.body.data.accesoPremium, false)
  assert.equal(meGratis.body.data.suscripcion, null)

  const auditoria = await admin.get(
    `/api/admin/auditoria?adminId=${adminUsuario.id}`,
  )
  assert.equal(auditoria.status, 200)
  assert.ok(auditoria.body.data.length >= 2)
})

test('valida plan, fechas y usuario al activar premium', async () => {
  const { agent: admin } = await crearUsuario('admin-fechas', 'admin')
  const { usuario: objetivo } = await crearUsuario('fechas-objetivo')
  const plan = await planActivo()
  const csrf = await obtenerCsrf(admin)
  const hoy = hoyCalendario()

  const planInexistente = await admin
    .post(`/api/admin/usuarios/${objetivo.id}/suscripcion`)
    .set('X-CSRF-Token', csrf)
    .send({ planId: 999999 })
  assert.equal(planInexistente.status, 404)
  assert.equal(planInexistente.body.error.codigo, 'PLAN_NO_ENCONTRADO')

  const fechaInvertida = await admin
    .post(`/api/admin/usuarios/${objetivo.id}/suscripcion`)
    .set('X-CSRF-Token', csrf)
    .send({
      planId: plan.id,
      fechaInicio: sumarDias(hoy, 10),
      fechaFin: sumarDias(hoy, 1),
    })
  assert.equal(fechaInvertida.status, 400)
  assert.equal(fechaInvertida.body.error.codigo, 'VALIDACION')

  const usuarioInexistente = await admin
    .post('/api/admin/usuarios/999999/suscripcion')
    .set('X-CSRF-Token', csrf)
    .send({ planId: plan.id })
  assert.equal(usuarioInexistente.status, 404)
  assert.equal(usuarioInexistente.body.error.codigo, 'USUARIO_NO_ENCONTRADO')

  await query(
    "INSERT INTO planes (nombre, duracion_dias, activo) VALUES ('Admin inactivo', 15, 0)",
  )
  const [inactivo] = await query(
    "SELECT id FROM planes WHERE nombre = 'Admin inactivo' LIMIT 1",
  )
  const planInactivo = await admin
    .post(`/api/admin/usuarios/${objetivo.id}/suscripcion`)
    .set('X-CSRF-Token', csrf)
    .send({ planId: inactivo.id })
  assert.equal(planInactivo.status, 409)
  assert.equal(planInactivo.body.error.codigo, 'PLAN_INACTIVO')
  await query("DELETE FROM planes WHERE nombre = 'Admin inactivo'")
})

test('genera códigos una sola vez, no expone hashes y deja auditoría sin códigos', async () => {
  const { agent: admin } = await crearUsuario('admin-codigos', 'admin')
  const plan = await planActivo()
  const csrf = await obtenerCsrf(admin)
  const vencimiento = new Date(Date.now() + 30 * 86400000).toISOString()

  const generacion = await admin
    .post('/api/admin/codigos')
    .set('X-CSRF-Token', csrf)
    .send({ planId: plan.id, cantidad: 2, fechaVencimiento: vencimiento })
  assert.equal(generacion.status, 201)
  assert.equal(generacion.body.data.planId, plan.id)
  assert.equal(generacion.body.data.codigos.length, 2)
  for (const codigo of generacion.body.data.codigos) {
    assert.match(codigo, /^ECOS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  }

  const listado = await admin.get(
    `/api/admin/codigos?planId=${plan.id}&usado=false`,
  )
  assert.equal(listado.status, 200)
  assert.equal(listado.body.meta.total, 2)
  assert.equal(listado.body.data.length, 2)
  for (const fila of listado.body.data) {
    assert.equal(fila.codigo_hash, undefined)
    assert.equal(fila.usadoPor, null)
  }

  const auditoria = await admin.get(
    '/api/admin/auditoria?accion=CODIGOS_GENERADOS',
  )
  assert.equal(auditoria.status, 200)
  assert.ok(auditoria.body.data.length >= 1)
  const fila = auditoria.body.data[0]
  assert.deepEqual(fila.datos, { planId: plan.id, cantidad: 2 })
  const textoAuditoria = JSON.stringify(fila)
  for (const codigo of generacion.body.data.codigos) {
    assert.equal(textoAuditoria.includes(codigo), false)
  }

  const cantidadInvalida = await admin
    .post('/api/admin/codigos')
    .set('X-CSRF-Token', csrf)
    .send({ planId: plan.id, cantidad: 0, fechaVencimiento: vencimiento })
  assert.equal(cantidadInvalida.status, 400)
  assert.equal(cantidadInvalida.body.error.codigo, 'VALIDACION')

  const fechaPasada = await admin
    .post('/api/admin/codigos')
    .set('X-CSRF-Token', csrf)
    .send({
      planId: plan.id,
      cantidad: 1,
      fechaVencimiento: new Date(Date.now() - 86400000).toISOString(),
    })
  assert.equal(fechaPasada.status, 400)
  assert.equal(fechaPasada.body.error.codigo, 'VALIDACION')
})

test('las mutaciones exigen CSRF y la auditoría no expone secretos', async () => {
  const { agent: admin } = await crearUsuario('admin-csrf', 'admin')
  const plan = await planActivo()

  const sinCsrf = await admin
    .post('/api/admin/codigos')
    .send({
      planId: plan.id,
      cantidad: 1,
      fechaVencimiento: new Date(Date.now() + 86400000).toISOString(),
    })
  assert.equal(sinCsrf.status, 403)
  assert.equal(sinCsrf.body.error.codigo, 'CSRF_INVALIDO')

  const auditoria = await admin.get('/api/admin/auditoria')
  assert.equal(auditoria.status, 200)
  assert.ok(Array.isArray(auditoria.body.data))
  assert.ok(auditoria.body.meta)
  for (const fila of auditoria.body.data) {
    const texto = JSON.stringify(fila)
    assert.equal(texto.includes('password_hash'), false)
    assert.equal(texto.includes('codigo_hash'), false)
    assert.equal(texto.includes('token_hash'), false)
  }
})
