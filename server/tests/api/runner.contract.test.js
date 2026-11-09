import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, obtenerCsrf, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'

ensureTestDb()

const PREFIJO = 'runner-contract-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

function victoria({ nivel = 1, distancia = 1000, vidasRestantes = 2, duracionSegundos = 100 }) {
  const bonos = { 1: [200, 25], 2: [250, 25], 3: [300, 30], 4: [350, 30], 5: [400, 35] }[nivel]
  return {
    nivel,
    puntaje: distancia + bonos[0] + vidasRestantes * bonos[1],
    distancia,
    duracionSegundos,
    vidasRestantes,
    victoria: true,
  }
}

async function guardar(ag, csrfToken, datos) {
  return ag.post('/api/runner/partidas').set('X-CSRF-Token', csrfToken).send(datos)
}

function assertSinDatosProhibidos(payload) {
  const texto = JSON.stringify(payload)
  for (const campo of ['correo', 'usuarioId', 'usuario_id', 'password', 'fechaSuscripcion']) {
    assert.equal(texto.includes(campo), false, `la respuesta no debe incluir ${campo}`)
  }
}

before(async () => {
  await limpiar()
})

after(async () => {
  await limpiar()
  await closePool()
})

test('Contrato: GET /api/runner/estado devuelve la forma esperada para invitado', async () => {
  const res = await request(app).get('/api/runner/estado')

  assert.equal(res.status, 200)
  assert.ok(res.body.data)
  assert.equal(res.body.data.autenticado, false)
  assert.equal(typeof res.body.data.nivelMaxDesbloqueado, 'number')
  assert.equal(res.body.data.totalNiveles, 5)
  assert.ok(Array.isArray(res.body.data.niveles))
  assert.equal(res.body.data.niveles.length, 5)

  for (const nivel of res.body.data.niveles) {
    assert.equal(typeof nivel.id, 'number')
    assert.equal(typeof nivel.nombre, 'string')
    assert.equal(typeof nivel.descripcion, 'string')
    assert.equal(typeof nivel.duracionSegundos, 'number')
    assert.equal(typeof nivel.cierreSegundos, 'number')
    assert.equal(typeof nivel.lianasDesdeSegundos, 'number')
    assert.equal(typeof nivel.rampa.porSegundo, 'number')
    assert.equal(typeof nivel.rampa.max, 'number')
    assert.equal(typeof nivel.bonos.amanecer, 'number')
    assert.equal(typeof nivel.bonos.vida, 'number')
    assert.equal(typeof nivel.pesos.enemigo, 'number')
    assert.equal(typeof nivel.pesos.obstaculo, 'number')
    assert.equal(typeof nivel.pesos.liana, 'number')
    assert.equal(typeof nivel.desbloqueado, 'boolean')
    assert.equal(typeof nivel.mejorPuntaje, 'number')
    assert.equal(typeof nivel.mejorDistancia, 'number')
    assert.equal(typeof nivel.victorias, 'number')
    assert.equal(typeof nivel.partidas, 'number')
  }

  assertSinDatosProhibidos(res.body)
})

test('Contrato: GET /api/runner/estado distingue usuario autenticado', async () => {
  const ag = crearAgent()
  await registrar(ag, 'estado', PREFIJO)

  const res = await ag.get('/api/runner/estado')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.autenticado, true)
  assert.equal(res.body.data.niveles.length, 5)
  assert.equal(res.body.data.niveles[0].desbloqueado, true)
})

test('Contrato: POST /api/runner/partidas exige sesión y CSRF', async () => {
  const sinSesion = await request(app).post('/api/runner/partidas').send(victoria({}))
  assert.equal(sinSesion.status, 401)
  assert.equal(sinSesion.body.error.codigo, 'SESION_REQUERIDA')

  const ag = crearAgent()
  await registrar(ag, 'csrf', PREFIJO)
  const sinToken = await ag.post('/api/runner/partidas').send(victoria({}))
  assert.equal(sinToken.status, 403)
  assert.equal(sinToken.body.error.codigo, 'CSRF_INVALIDO')
})

test('Contrato: POST /api/runner/partidas responde 201 con partida y récord', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'post-ok', PREFIJO)
  const datos = victoria({})

  const res = await guardar(ag, csrfToken, datos)
  assert.equal(res.status, 201)

  assert.equal(typeof res.body.data.partida.id, 'number')
  assert.equal(res.body.data.partida.nivel, datos.nivel)
  assert.equal(res.body.data.partida.puntaje, datos.puntaje)
  assert.equal(res.body.data.partida.distancia, datos.distancia)
  assert.equal(res.body.data.partida.duracionSegundos, datos.duracionSegundos)
  assert.equal(res.body.data.partida.vidasRestantes, datos.vidasRestantes)
  assert.equal(res.body.data.partida.victoria, true)
  assert.equal(typeof res.body.data.partida.creadaEn, 'string')

  assert.equal(res.body.data.record.nivel, 1)
  assert.equal(res.body.data.record.mejorPuntaje, datos.puntaje)
  assert.equal(res.body.data.record.victorias, 1)
  assert.equal(res.body.data.record.partidas, 1)
  assert.equal(typeof res.body.data.nuevoRecord, 'boolean')
  assert.equal(res.body.data.nivelDesbloqueado, 2)
  assert.equal(res.body.data.nivelMaxDesbloqueado, 2)

  assertSinDatosProhibidos(res.body)
})

test('Contrato: POST /api/runner/partidas valida el cuerpo y rechaza datos ajenos', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'post-invalido', PREFIJO)

  const nivelFueraDeRango = await guardar(ag, csrfToken, { ...victoria({}), nivel: 6 })
  assert.equal(nivelFueraDeRango.status, 400)
  assert.equal(nivelFueraDeRango.body.error.codigo, 'VALIDACION')

  const usuarioAjeno = await guardar(ag, csrfToken, { ...victoria({}), usuarioId: 1 })
  assert.equal(usuarioAjeno.status, 400)
  assert.equal(usuarioAjeno.body.error.codigo, 'VALIDACION')

  const incoherente = await guardar(ag, csrfToken, { ...victoria({}), puntaje: 99 })
  assert.equal(incoherente.status, 400)
  assert.equal(incoherente.body.error.codigo, 'PARTIDA_INVALIDA')

  const bloqueada = await guardar(
    ag,
    csrfToken,
    victoria({ nivel: 2, distancia: 800, duracionSegundos: 110 }),
  )
  assert.equal(bloqueada.status, 403)
  assert.equal(bloqueada.body.error.codigo, 'NIVEL_BLOQUEADO')
})

test('Contrato: GET /api/runner/partidas exige sesión y devuelve data + meta', async () => {
  const sinSesion = await request(app).get('/api/runner/partidas')
  assert.equal(sinSesion.status, 401)
  assert.equal(sinSesion.body.error.codigo, 'SESION_REQUERIDA')

  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'historial', PREFIJO)
  await guardar(ag, csrfToken, victoria({}))

  const res = await ag.get('/api/runner/partidas')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.equal(res.body.data.length, 1)
  assert.equal(typeof res.body.meta.total, 'number')
  assert.equal(res.body.meta.limit, 20)
  assert.equal(res.body.meta.offset, 0)

  const partida = res.body.data[0]
  assert.deepEqual(Object.keys(partida).sort(), [
    'creadaEn',
    'distancia',
    'duracionSegundos',
    'id',
    'nivel',
    'puntaje',
    'victoria',
    'vidasRestantes',
  ])
  assertSinDatosProhibidos(res.body)

  const limiteInvalido = await ag.get('/api/runner/partidas').query({ limit: 100 })
  assert.equal(limiteInvalido.status, 400)
  assert.equal(limiteInvalido.body.error.codigo, 'VALIDACION')
})

test('Contrato: GET /api/runner/ranking exige nivel válido y separa los planes', async () => {
  const sinNivel = await request(app).get('/api/runner/ranking')
  assert.equal(sinNivel.status, 400)
  assert.equal(sinNivel.body.error.codigo, 'VALIDACION')

  const nivelInvalido = await request(app).get('/api/runner/ranking').query({ nivel: 99 })
  assert.equal(nivelInvalido.status, 400)
  assert.equal(nivelInvalido.body.error.codigo, 'VALIDACION')

  const agGratis = crearAgent()
  const { csrfToken: csrfGratis } = await registrar(agGratis, 'rank-gratis', PREFIJO)
  const agPremium = crearAgent()
  const { usuario: usuarioPremium, csrfToken: csrfPremium } = await registrar(
    agPremium,
    'rank-premium',
    PREFIJO,
  )
  await concederPremium(usuarioPremium.id)

  await guardar(agGratis, csrfGratis, victoria({ distancia: 900 }))
  await guardar(agPremium, csrfPremium, victoria({ distancia: 1200 }))

  const res = await request(app).get('/api/runner/ranking').query({ nivel: 1 })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.nivel, 1)
  assert.ok(Array.isArray(res.body.data.gratis))
  assert.ok(Array.isArray(res.body.data.premium))
  assert.ok(res.body.data.gratis.length >= 1)
  assert.ok(res.body.data.premium.length >= 1)

  for (const entrada of [...res.body.data.gratis, ...res.body.data.premium]) {
    assert.equal(typeof entrada.posicion, 'number')
    assert.equal(typeof entrada.nombreUsuario, 'string')
    assert.equal(typeof entrada.puntaje, 'number')
    assert.equal(typeof entrada.victorias, 'number')
  }

  assert.equal(res.body.data.gratis.some((e) => e.nombreUsuario === `${PREFIJO}rank-premium`), false)
  assert.equal(res.body.data.premium.some((e) => e.nombreUsuario === `${PREFIJO}rank-gratis`), false)
  assertSinDatosProhibidos(res.body)
})

test('Contrato: un invitado sin token CSRF no puede guardar partidas', async () => {
  const token = await obtenerCsrf(request(app))
  assert.equal(typeof token, 'string')

  const res = await request(app)
    .post('/api/runner/partidas')
    .set('X-CSRF-Token', token)
    .send(victoria({}))
  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'SESION_REQUERIDA')
})
