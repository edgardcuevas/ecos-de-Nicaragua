import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, obtenerCsrf, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'
import { configuracionNivel, puntajeBase } from '../../src/config/padre.js'

ensureTestDb()

const PREFIJO = 'padre-contract-'

const ESTADISTICAS = {
  aldeanos: 20,
  perro: 2,
  monaguillo: 1,
  beata: 0,
  valiente: 0,
  salvados: 4,
}

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

function victoria(extra = {}) {
  const nivel = extra.nivel ?? 1
  const config = configuracionNivel(nivel)
  const vidasRestantes = extra.vidasRestantes ?? 2
  const datos = {
    modo: 'campana',
    nivel,
    duracionSegundos: config.duracion,
    rondas: 0,
    vidasRestantes,
    objetosUsados: 0,
    estadisticas: ESTADISTICAS,
    victoria: true,
    ...extra,
  }
  datos.puntaje =
    puntajeBase(ESTADISTICAS) * 2 + config.bonos.amanecer + vidasRestantes * config.bonos.vida
  return datos
}

function infinita(extra = {}) {
  const rondas = extra.rondas ?? 3
  return {
    modo: 'infinita',
    puntaje: puntajeBase(ESTADISTICAS) * 2 + rondas * 150,
    duracionSegundos: 100,
    rondas,
    vidasRestantes: 0,
    objetosUsados: 1,
    estadisticas: ESTADISTICAS,
    victoria: false,
    ...extra,
  }
}

async function guardar(ag, csrfToken, datos) {
  return ag.post('/api/padre/partidas').set('X-CSRF-Token', csrfToken).send(datos)
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

test('Contrato: GET /api/padre/estado devuelve la forma esperada para invitado', async () => {
  const res = await request(app).get('/api/padre/estado')

  assert.equal(res.status, 200)
  const data = res.body.data
  assert.equal(data.autenticado, false)
  assert.equal(typeof data.nivelMaxDesbloqueado, 'number')
  assert.equal(data.totalNiveles, 5)
  assert.ok(Array.isArray(data.niveles))
  assert.equal(data.niveles.length, 5)

  for (const nivel of data.niveles) {
    assert.equal(typeof nivel.id, 'number')
    assert.equal(typeof nivel.nombre, 'string')
    assert.equal(typeof nivel.descripcion, 'string')
    assert.equal(typeof nivel.duracionSegundos, 'number')
    assert.equal(typeof nivel.aldeanos, 'number')
    assert.equal(typeof nivel.maxEnemigos.inicial, 'number')
    assert.equal(typeof nivel.maxEnemigos.maximo, 'number')
    assert.equal(typeof nivel.esperaSpawn.inicial, 'number')
    assert.equal(typeof nivel.esperaSpawn.min, 'number')
    assert.equal(typeof nivel.velocidadEnemigos, 'number')
    assert.equal(typeof nivel.enemigos.perro.desde, 'number')
    assert.equal(typeof nivel.enemigos.valiente.puntos, 'number')
    assert.equal(typeof nivel.bonos.amanecer, 'number')
    assert.equal(typeof nivel.bonos.vida, 'number')
    assert.equal(typeof nivel.objetos.max, 'number')
    assert.equal(typeof nivel.objetos.cada, 'number')
    assert.equal(typeof nivel.desbloqueado, 'boolean')
    assert.equal(typeof nivel.mejorPuntaje, 'number')
    assert.equal(typeof nivel.victorias, 'number')
    assert.equal(typeof nivel.partidas, 'number')
  }

  assert.equal(data.infinito.desbloqueado, false)
  assert.equal(data.infinito.requiereCuenta, true)
  assert.equal(data.infinito.rondaSegundos, 30)
  assert.equal(data.infinito.descansoSegundos, 4)
  assert.equal(data.infinito.maxRondas, 120)
  assert.equal(typeof data.infinito.mejorRondas, 'number')

  assert.equal(data.objetos.rosario.nombre, 'El Rosario del Padre')
  assert.equal(data.objetos.rosario.vida, 1)

  assertSinDatosProhibidos(res.body)
})

test('Contrato: GET /api/padre/estado distingue usuario autenticado', async () => {
  const ag = crearAgent()
  await registrar(ag, 'estado', PREFIJO)

  const res = await ag.get('/api/padre/estado')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.autenticado, true)
  assert.equal(res.body.data.niveles.length, 5)
  assert.equal(res.body.data.niveles[0].desbloqueado, true)
  assert.equal(res.body.data.infinito.desbloqueado, true)
})

test('Contrato: POST /api/padre/partidas exige sesión y CSRF', async () => {
  const sinSesion = await request(app).post('/api/padre/partidas').send(victoria())
  assert.equal(sinSesion.status, 401)
  assert.equal(sinSesion.body.error.codigo, 'SESION_REQUERIDA')

  const ag = crearAgent()
  await registrar(ag, 'csrf', PREFIJO)
  const sinToken = await ag.post('/api/padre/partidas').send(victoria())
  assert.equal(sinToken.status, 403)
  assert.equal(sinToken.body.error.codigo, 'CSRF_INVALIDO')
})

test('Contrato: POST /api/padre/partidas responde 201 con partida y récord', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'post-ok', PREFIJO)
  const datos = victoria()

  const res = await guardar(ag, csrfToken, datos)
  assert.equal(res.status, 201)

  const { partida, record } = res.body.data
  assert.deepEqual(Object.keys(partida).sort(), [
    'creadaEn',
    'duracionSegundos',
    'id',
    'modo',
    'nivel',
    'objetosUsados',
    'puntaje',
    'rondas',
    'victoria',
    'vidasRestantes',
  ])
  assert.equal(partida.modo, 'campana')
  assert.equal(partida.nivel, datos.nivel)
  assert.equal(partida.puntaje, datos.puntaje)
  assert.equal(partida.duracionSegundos, datos.duracionSegundos)
  assert.equal(partida.vidasRestantes, datos.vidasRestantes)
  assert.equal(partida.objetosUsados, 0)
  assert.equal(partida.victoria, true)
  assert.equal(typeof partida.creadaEn, 'string')

  assert.deepEqual(Object.keys(record).sort(), [
    'mejorPuntaje',
    'mejorRondas',
    'modo',
    'nivel',
    'partidas',
    'victorias',
  ])
  assert.equal(record.modo, 'campana')
  assert.equal(record.mejorPuntaje, datos.puntaje)
  assert.equal(record.victorias, 1)
  assert.equal(record.partidas, 1)

  assert.equal(typeof res.body.data.nuevoRecord, 'boolean')
  assert.equal(res.body.data.nivelDesbloqueado, 2)
  assert.equal(res.body.data.nivelMaxDesbloqueado, 2)

  assertSinDatosProhibidos(res.body)
})

test('Contrato: POST /api/padre/partidas valida el cuerpo y rechaza datos ajenos', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'post-invalido', PREFIJO)

  const nivelFueraDeRango = await guardar(ag, csrfToken, { ...victoria(), nivel: 6 })
  assert.equal(nivelFueraDeRango.status, 400)
  assert.equal(nivelFueraDeRango.body.error.codigo, 'VALIDACION')

  const usuarioAjeno = await guardar(ag, csrfToken, { ...victoria(), usuarioId: 1 })
  assert.equal(usuarioAjeno.status, 400)
  assert.equal(usuarioAjeno.body.error.codigo, 'VALIDACION')

  const incoherente = await guardar(ag, csrfToken, { ...victoria(), puntaje: 99 })
  assert.equal(incoherente.status, 400)
  assert.equal(incoherente.body.error.codigo, 'PARTIDA_INVALIDA')

  const bloqueada = await guardar(ag, csrfToken, victoria({ nivel: 2 }))
  assert.equal(bloqueada.status, 403)
  assert.equal(bloqueada.body.error.codigo, 'NIVEL_BLOQUEADO')
})

test('Contrato: POST /api/padre/partidas guarda el modo infinito', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'post-infinito', PREFIJO)

  const res = await guardar(ag, csrfToken, infinita())
  assert.equal(res.status, 201)
  assert.equal(res.body.data.partida.modo, 'infinita')
  assert.equal(res.body.data.partida.nivel, 0)
  assert.equal(res.body.data.partida.rondas, 3)
  assert.equal(res.body.data.partida.victoria, false)
  assert.equal(res.body.data.record.modo, 'infinita')
  assert.equal(res.body.data.record.mejorRondas, 3)
  assert.equal(res.body.data.nivelDesbloqueado, null)
})

test('Contrato: GET /api/padre/partidas exige sesión y devuelve data + meta', async () => {
  const sinSesion = await request(app).get('/api/padre/partidas')
  assert.equal(sinSesion.status, 401)
  assert.equal(sinSesion.body.error.codigo, 'SESION_REQUERIDA')

  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'historial', PREFIJO)
  await guardar(ag, csrfToken, victoria())

  const res = await ag.get('/api/padre/partidas')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.equal(res.body.data.length, 1)
  assert.equal(typeof res.body.meta.total, 'number')
  assert.equal(res.body.meta.limit, 20)
  assert.equal(res.body.meta.offset, 0)

  assert.deepEqual(Object.keys(res.body.data[0]).sort(), [
    'creadaEn',
    'duracionSegundos',
    'id',
    'modo',
    'nivel',
    'objetosUsados',
    'puntaje',
    'rondas',
    'victoria',
    'vidasRestantes',
  ])
  assertSinDatosProhibidos(res.body)

  const limiteInvalido = await ag.get('/api/padre/partidas').query({ limit: 100 })
  assert.equal(limiteInvalido.status, 400)
  assert.equal(limiteInvalido.body.error.codigo, 'VALIDACION')
})

test('Contrato: GET /api/padre/ranking separa planes y no expone datos privados', async () => {
  const sinModo = await request(app).get('/api/padre/ranking')
  assert.equal(sinModo.status, 400)
  assert.equal(sinModo.body.error.codigo, 'VALIDACION')

  const agGratis = crearAgent()
  const { csrfToken: csrfGratis } = await registrar(agGratis, 'rank-gratis', PREFIJO)
  const agPremium = crearAgent()
  const { usuario: usuarioPremium, csrfToken: csrfPremium } = await registrar(
    agPremium,
    'rank-premium',
    PREFIJO,
  )
  await concederPremium(usuarioPremium.id)

  await guardar(agGratis, csrfGratis, victoria({ vidasRestantes: 2 }))
  await guardar(agPremium, csrfPremium, victoria({ vidasRestantes: 4 }))

  const res = await request(app)
    .get('/api/padre/ranking')
    .query({ modo: 'campana', nivel: 1, limit: 50 })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.modo, 'campana')
  assert.equal(res.body.data.nivel, 1)
  assert.ok(Array.isArray(res.body.data.gratis))
  assert.ok(Array.isArray(res.body.data.premium))
  assert.ok(res.body.data.gratis.length >= 1)
  assert.ok(res.body.data.premium.length >= 1)

  for (const entrada of [...res.body.data.gratis, ...res.body.data.premium]) {
    assert.deepEqual(Object.keys(entrada).sort(), [
      'nombreUsuario',
      'posicion',
      'puntaje',
      'rondas',
      'victorias',
    ])
  }

  assert.equal(
    res.body.data.gratis.some((e) => e.nombreUsuario === `${PREFIJO}rank-premium`),
    false,
  )
  assert.equal(
    res.body.data.premium.some((e) => e.nombreUsuario === `${PREFIJO}rank-gratis`),
    false,
  )
  assertSinDatosProhibidos(res.body)
})

test('Contrato: un invitado sin sesión no puede guardar aunque tenga CSRF', async () => {
  const token = await obtenerCsrf(request(app))
  assert.equal(typeof token, 'string')

  const res = await request(app)
    .post('/api/padre/partidas')
    .set('X-CSRF-Token', token)
    .send(victoria())
  assert.equal(res.status, 401)
  assert.equal(res.body.error.codigo, 'SESION_REQUERIDA')
})
