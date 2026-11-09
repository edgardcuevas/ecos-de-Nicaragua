import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'

ensureTestDb()

const PREFIJO = 'runner-test-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

function partidaGanada({ nivel = 1, distancia = 1000, vidasRestantes = 2, duracionSegundos = 100 }) {
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

function partidaPerdida({ nivel = 1, distancia = 900, duracionSegundos = 40 }) {
  return {
    nivel,
    puntaje: distancia,
    distancia,
    duracionSegundos,
    vidasRestantes: 0,
    victoria: false,
  }
}

async function guardar(ag, csrfToken, datos) {
  return ag.post('/api/runner/partidas').set('X-CSRF-Token', csrfToken).send(datos)
}

before(async () => {
  await limpiar()
})

after(async () => {
  await limpiar()
  await sessionStore.close()
  await closePool()
})

test('GET /api/runner/partidas y POST /api/runner/partidas exigen sesión', async () => {
  const listado = await request(app).get('/api/runner/partidas')
  assert.equal(listado.status, 401)
  assert.equal(listado.body.error.codigo, 'SESION_REQUERIDA')

  const guardado = await request(app).post('/api/runner/partidas').send(partidaPerdida({}))
  assert.equal(guardado.status, 401)
  assert.equal(guardado.body.error.codigo, 'SESION_REQUERIDA')
})

test('GET /api/runner/estado responde al invitado con la noche 1 desbloqueada', async () => {
  const res = await request(app).get('/api/runner/estado')

  assert.equal(res.status, 200)
  assert.equal(res.body.data.autenticado, false)
  assert.equal(res.body.data.nivelMaxDesbloqueado, 1)
  assert.equal(res.body.data.totalNiveles, 5)
  assert.equal(res.body.data.niveles.length, 5)
  for (const nivel of res.body.data.niveles) {
    assert.equal(nivel.desbloqueado, nivel.id === 1)
    assert.equal(nivel.mejorPuntaje, 0)
    assert.equal(nivel.victorias, 0)
    assert.equal(nivel.partidas, 0)
  }
})

test('un usuario nuevo arranca sin récords y con solo la noche 1', async () => {
  const ag = crearAgent()
  await registrar(ag, 'nuevo', PREFIJO)

  const res = await ag.get('/api/runner/estado')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.autenticado, true)
  assert.equal(res.body.data.nivelMaxDesbloqueado, 1)
  assert.equal(res.body.data.niveles[0].desbloqueado, true)
  assert.equal(res.body.data.niveles[1].desbloqueado, false)
  assert.equal(res.body.data.niveles[0].mejorPuntaje, 0)
})

test('ganar la noche 1 desbloquea la noche 2 y actualiza el récord', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'gana', PREFIJO)
  const datos = partidaGanada({})

  const res = await guardar(ag, csrfToken, datos)
  assert.equal(res.status, 201)
  assert.equal(res.body.data.partida.victoria, true)
  assert.equal(res.body.data.nuevoRecord, true)
  assert.equal(res.body.data.nivelDesbloqueado, 2)
  assert.equal(res.body.data.nivelMaxDesbloqueado, 2)
  assert.equal(res.body.data.record.mejorPuntaje, datos.puntaje)
  assert.equal(res.body.data.record.victorias, 1)
  assert.equal(res.body.data.record.partidas, 1)

  const estado = await ag.get('/api/runner/estado')
  assert.equal(estado.body.data.nivelMaxDesbloqueado, 2)
  assert.equal(estado.body.data.niveles[1].desbloqueado, true)
  assert.equal(estado.body.data.niveles[0].mejorPuntaje, datos.puntaje)
})

test('perder no desbloquea la noche siguiente', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'pierde', PREFIJO)

  const res = await guardar(ag, csrfToken, partidaPerdida({}))
  assert.equal(res.status, 201)
  assert.equal(res.body.data.partida.victoria, false)
  assert.equal(res.body.data.nivelDesbloqueado, null)
  assert.equal(res.body.data.nivelMaxDesbloqueado, 1)

  const estado = await ag.get('/api/runner/estado')
  assert.equal(estado.body.data.nivelMaxDesbloqueado, 1)
  assert.equal(estado.body.data.niveles[1].desbloqueado, false)
})

test('el récord solo sube y las partidas se acumulan', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'record', PREFIJO)

  const primera = partidaGanada({ distancia: 1000, vidasRestantes: 2 })
  const alta = await guardar(ag, csrfToken, primera)
  assert.equal(alta.status, 201)
  assert.equal(alta.body.data.nuevoRecord, true)

  const segunda = partidaGanada({ distancia: 1200, vidasRestantes: 1 })
  const mejor = await guardar(ag, csrfToken, segunda)
  assert.equal(mejor.status, 201)
  assert.equal(mejor.body.data.nuevoRecord, true)
  assert.equal(mejor.body.data.record.mejorPuntaje, segunda.puntaje)

  const tercera = partidaPerdida({ distancia: 500 })
  const baja = await guardar(ag, csrfToken, tercera)
  assert.equal(baja.status, 201)
  assert.equal(baja.body.data.nuevoRecord, false)
  assert.equal(baja.body.data.record.mejorPuntaje, segunda.puntaje)
  assert.equal(baja.body.data.record.mejorDistancia, 1200)
  assert.equal(baja.body.data.record.victorias, 2)
  assert.equal(baja.body.data.record.partidas, 3)
})

test('el servidor rechaza noches bloqueadas aunque el resultado sea coherente', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'bloqueado', PREFIJO)

  const res = await guardar(ag, csrfToken, partidaGanada({ nivel: 2, duracionSegundos: 110 }))
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'NIVEL_BLOQUEADO')
})

test('el servidor rechaza resultados incoherentes', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'incoherente', PREFIJO)

  const victoriaSinVidas = await guardar(
    ag,
    csrfToken,
    partidaGanada({ vidasRestantes: 0 }),
  )
  assert.equal(victoriaSinVidas.status, 400)
  assert.equal(victoriaSinVidas.body.error.codigo, 'PARTIDA_INVALIDA')

  const puntajeInflado = await guardar(ag, csrfToken, {
    ...partidaPerdida({}),
    puntaje: 999999,
  })
  assert.equal(puntajeInflado.status, 400)
  assert.equal(puntajeInflado.body.error.codigo, 'PARTIDA_INVALIDA')

  const duracionLarga = await guardar(ag, csrfToken, partidaPerdida({ duracionSegundos: 103 }))
  assert.equal(duracionLarga.status, 400)
  assert.equal(duracionLarga.body.error.codigo, 'PARTIDA_INVALIDA')
})

test('dos cuentas tienen progreso, historial y desbloqueos independientes', async () => {
  const agA = crearAgent()
  const { usuario: usuarioA, csrfToken: csrfA } = await registrar(agA, 'aislado-a', PREFIJO)
  const agB = crearAgent()
  const { usuario: usuarioB } = await registrar(agB, 'aislado-b', PREFIJO)

  const guardado = await guardar(agA, csrfA, partidaGanada({ distancia: 1500 }))
  assert.equal(guardado.status, 201)
  assert.notEqual(usuarioA.id, usuarioB.id)

  const estadoB = await agB.get('/api/runner/estado')
  assert.equal(estadoB.body.data.nivelMaxDesbloqueado, 1)
  assert.equal(estadoB.body.data.niveles[0].mejorPuntaje, 0)
  assert.equal(estadoB.body.data.niveles[0].partidas, 0)

  const historialB = await agB.get('/api/runner/partidas')
  assert.equal(historialB.status, 200)
  assert.equal(historialB.body.meta.total, 0)
  assert.deepEqual(historialB.body.data, [])

  const historialA = await agA.get('/api/runner/partidas')
  assert.equal(historialA.status, 200)
  assert.equal(historialA.body.meta.total, 1)
  assert.equal(historialA.body.data[0].nivel, 1)

  const filas = await query('SELECT usuario_id, nivel FROM runner_partidas WHERE usuario_id IN (?, ?)', [
    usuarioA.id,
    usuarioB.id,
  ])
  assert.equal(filas.length, 1)
  assert.equal(Number(filas[0].usuario_id), usuarioA.id)
})

test('el historial pagina y filtra por noche', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'historial', PREFIJO)

  await guardar(ag, csrfToken, partidaGanada({ nivel: 1, distancia: 1000 }))
  await guardar(ag, csrfToken, partidaGanada({ nivel: 2, distancia: 800, duracionSegundos: 110 }))
  await guardar(ag, csrfToken, partidaPerdida({ nivel: 1 }))

  const primeraPagina = await ag.get('/api/runner/partidas').query({ limit: 2, offset: 0 })
  assert.equal(primeraPagina.status, 200)
  assert.equal(primeraPagina.body.data.length, 2)
  assert.equal(primeraPagina.body.meta.total, 3)
  assert.equal(primeraPagina.body.meta.limit, 2)
  assert.equal(primeraPagina.body.meta.offset, 0)

  const segundaPagina = await ag.get('/api/runner/partidas').query({ limit: 2, offset: 2 })
  assert.equal(segundaPagina.status, 200)
  assert.equal(segundaPagina.body.data.length, 1)

  const soloNivel1 = await ag.get('/api/runner/partidas').query({ nivel: 1 })
  assert.equal(soloNivel1.status, 200)
  assert.equal(soloNivel1.body.meta.total, 2)
  assert.equal(soloNivel1.body.data.every((partida) => partida.nivel === 1), true)
})

test('el plan decide el máximo de vidas aceptado', async () => {
  const agGratis = crearAgent()
  const { csrfToken: csrfGratis } = await registrar(agGratis, 'vidas-gratis', PREFIJO)
  const datosPremium = partidaGanada({ distancia: 1000, vidasRestantes: 6 })

  const rechazada = await guardar(agGratis, csrfGratis, datosPremium)
  assert.equal(rechazada.status, 400)
  assert.equal(rechazada.body.error.codigo, 'PARTIDA_INVALIDA')

  const agPremium = crearAgent()
  const { usuario, csrfToken: csrfPremium } = await registrar(agPremium, 'vidas-premium', PREFIJO)
  await concederPremium(usuario.id)

  const aceptada = await guardar(agPremium, csrfPremium, datosPremium)
  assert.equal(aceptada.status, 201)
  assert.equal(aceptada.body.data.partida.vidasRestantes, 6)
})

test('el ranking separa gratis y premium por noche', async () => {
  const agGratis = crearAgent()
  const { csrfToken: csrfGratis } = await registrar(agGratis, 'ranking-gratis', PREFIJO)
  const agPremium = crearAgent()
  const { usuario: usuarioPremium, csrfToken: csrfPremium } = await registrar(
    agPremium,
    'ranking-premium',
    PREFIJO,
  )
  await concederPremium(usuarioPremium.id)

  const gratis = partidaGanada({ distancia: 900, vidasRestantes: 2 })
  const premium = partidaGanada({ distancia: 1100, vidasRestantes: 4 })

  assert.equal((await guardar(agGratis, csrfGratis, gratis)).status, 201)
  assert.equal((await guardar(agPremium, csrfPremium, premium)).status, 201)

  const res = await request(app).get('/api/runner/ranking').query({ nivel: 1, limit: 50 })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.nivel, 1)
  assert.ok(Array.isArray(res.body.data.gratis))
  assert.ok(Array.isArray(res.body.data.premium))

  const nombreGratis = `${PREFIJO}ranking-gratis`
  const nombrePremium = `${PREFIJO}ranking-premium`

  const entradaGratis = res.body.data.gratis.find((e) => e.nombreUsuario === nombreGratis)
  const entradaPremium = res.body.data.premium.find((e) => e.nombreUsuario === nombrePremium)

  assert.ok(entradaGratis, 'el usuario gratis debe aparecer en la lista gratis')
  assert.ok(entradaPremium, 'el usuario premium debe aparecer en la lista premium')
  assert.equal(entradaGratis.puntaje, gratis.puntaje)
  assert.equal(entradaPremium.puntaje, premium.puntaje)
  assert.equal(res.body.data.gratis.some((e) => e.nombreUsuario === nombrePremium), false)
  assert.equal(res.body.data.premium.some((e) => e.nombreUsuario === nombreGratis), false)

  for (const entrada of [...res.body.data.gratis, ...res.body.data.premium]) {
    assert.deepEqual(Object.keys(entrada).sort(), ['nombreUsuario', 'posicion', 'puntaje', 'victorias'])
  }
})
