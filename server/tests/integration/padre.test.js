import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'
import { configuracionNivel, puntajeBase } from '../../src/config/padre.js'

ensureTestDb()

const PREFIJO = 'padre-test-'

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

function victoria({
  nivel = 1,
  vidasRestantes = 2,
  objetosUsados = 0,
  estadisticas = ESTADISTICAS,
  duracionSegundos,
} = {}) {
  const config = configuracionNivel(nivel)
  const datos = {
    modo: 'campana',
    nivel,
    duracionSegundos: duracionSegundos ?? config.duracion,
    rondas: 0,
    vidasRestantes,
    objetosUsados,
    estadisticas,
    victoria: true,
  }
  datos.puntaje =
    puntajeBase(estadisticas) * 2 + config.bonos.amanecer + vidasRestantes * config.bonos.vida
  return datos
}

function derrota({ nivel = 1, estadisticas = ESTADISTICAS, duracionSegundos = 60 } = {}) {
  const config = configuracionNivel(nivel)
  return {
    modo: 'campana',
    nivel,
    puntaje: puntajeBase(estadisticas),
    duracionSegundos: Math.min(duracionSegundos, config.duracion),
    rondas: 0,
    vidasRestantes: 0,
    objetosUsados: 0,
    estadisticas,
    victoria: false,
  }
}

function infinita({
  rondas = 3,
  duracionSegundos = 100,
  objetosUsados = 1,
  estadisticas = ESTADISTICAS,
} = {}) {
  return {
    modo: 'infinita',
    puntaje: puntajeBase(estadisticas) * 2 + rondas * 150,
    duracionSegundos,
    rondas,
    vidasRestantes: 0,
    objetosUsados,
    estadisticas,
    victoria: false,
  }
}

async function guardar(ag, csrfToken, datos) {
  return ag.post('/api/padre/partidas').set('X-CSRF-Token', csrfToken).send(datos)
}

before(async () => {
  await limpiar()
})

after(async () => {
  await limpiar()
  await sessionStore.close()
  await closePool()
})

test('GET y POST /api/padre/partidas exigen sesión', async () => {
  const listado = await request(app).get('/api/padre/partidas')
  assert.equal(listado.status, 401)
  assert.equal(listado.body.error.codigo, 'SESION_REQUERIDA')

  const guardado = await request(app).post('/api/padre/partidas').send(derrota())
  assert.equal(guardado.status, 401)
  assert.equal(guardado.body.error.codigo, 'SESION_REQUERIDA')
})

test('GET /api/padre/estado de invitado solo abre el nivel 1', async () => {
  const res = await request(app).get('/api/padre/estado')

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
  assert.equal(res.body.data.infinito.desbloqueado, false)
  assert.equal(res.body.data.infinito.requiereCuenta, true)
})

test('un usuario nuevo arranca con solo el nivel 1 y el infinito abierto', async () => {
  const ag = crearAgent()
  await registrar(ag, 'nuevo', PREFIJO)

  const res = await ag.get('/api/padre/estado')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.autenticado, true)
  assert.equal(res.body.data.nivelMaxDesbloqueado, 1)
  assert.equal(res.body.data.niveles[0].desbloqueado, true)
  assert.equal(res.body.data.niveles[1].desbloqueado, false)
  assert.equal(res.body.data.niveles[0].mejorPuntaje, 0)
  assert.equal(res.body.data.infinito.desbloqueado, true)
  assert.equal(res.body.data.infinito.mejorRondas, 0)
})

test('ganar el nivel 1 desbloquea el nivel 2 y actualiza el récord', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'gana', PREFIJO)
  const datos = victoria()

  const res = await guardar(ag, csrfToken, datos)
  assert.equal(res.status, 201)
  assert.equal(res.body.data.partida.victoria, true)
  assert.equal(res.body.data.partida.modo, 'campana')
  assert.equal(res.body.data.nuevoRecord, true)
  assert.equal(res.body.data.nivelDesbloqueado, 2)
  assert.equal(res.body.data.nivelMaxDesbloqueado, 2)
  assert.equal(res.body.data.record.mejorPuntaje, datos.puntaje)
  assert.equal(res.body.data.record.victorias, 1)
  assert.equal(res.body.data.record.partidas, 1)

  const estado = await ag.get('/api/padre/estado')
  assert.equal(estado.body.data.nivelMaxDesbloqueado, 2)
  assert.equal(estado.body.data.niveles[1].desbloqueado, true)
  assert.equal(estado.body.data.niveles[0].mejorPuntaje, datos.puntaje)
})

test('perder no desbloquea el nivel siguiente', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'pierde', PREFIJO)

  const res = await guardar(ag, csrfToken, derrota())
  assert.equal(res.status, 201)
  assert.equal(res.body.data.partida.victoria, false)
  assert.equal(res.body.data.nivelDesbloqueado, null)
  assert.equal(res.body.data.nivelMaxDesbloqueado, 1)

  const estado = await ag.get('/api/padre/estado')
  assert.equal(estado.body.data.nivelMaxDesbloqueado, 1)
  assert.equal(estado.body.data.niveles[1].desbloqueado, false)
})

test('el récord solo sube y las partidas se acumulan', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'record', PREFIJO)

  const primera = victoria({ vidasRestantes: 2 })
  const alta = await guardar(ag, csrfToken, primera)
  assert.equal(alta.status, 201)
  assert.equal(alta.body.data.nuevoRecord, true)

  const segunda = victoria({ vidasRestantes: 4 })
  const mejor = await guardar(ag, csrfToken, segunda)
  assert.equal(mejor.status, 201)
  assert.equal(mejor.body.data.nuevoRecord, true)
  assert.equal(mejor.body.data.record.mejorPuntaje, segunda.puntaje)

  const tercera = derrota()
  const baja = await guardar(ag, csrfToken, tercera)
  assert.equal(baja.status, 201)
  assert.equal(baja.body.data.nuevoRecord, false)
  assert.equal(baja.body.data.record.mejorPuntaje, segunda.puntaje)
  assert.equal(baja.body.data.record.victorias, 2)
  assert.equal(baja.body.data.record.partidas, 3)
})

test('el servidor rechaza niveles bloqueados aunque el resultado sea coherente', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'bloqueado', PREFIJO)

  const res = await guardar(ag, csrfToken, victoria({ nivel: 2 }))
  assert.equal(res.status, 403)
  assert.equal(res.body.error.codigo, 'NIVEL_BLOQUEADO')
})

test('el servidor rechaza resultados incoherentes', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'incoherente', PREFIJO)

  const victoriaSinVidas = await guardar(ag, csrfToken, victoria({ vidasRestantes: 0 }))
  assert.equal(victoriaSinVidas.status, 400)
  assert.equal(victoriaSinVidas.body.error.codigo, 'PARTIDA_INVALIDA')

  const puntajeInflado = await guardar(ag, csrfToken, { ...derrota(), puntaje: 999_999 })
  assert.equal(puntajeInflado.status, 400)
  assert.equal(puntajeInflado.body.error.codigo, 'PARTIDA_INVALIDA')

  const duracionLarga = await guardar(ag, csrfToken, victoria({ duracionSegundos: 95 }))
  assert.equal(duracionLarga.status, 400)
  assert.equal(duracionLarga.body.error.codigo, 'PARTIDA_INVALIDA')

  const vidasSinRosario = await guardar(ag, csrfToken, victoria({ vidasRestantes: 6 }))
  assert.equal(vidasSinRosario.status, 400)
  assert.equal(vidasSinRosario.body.error.codigo, 'PARTIDA_INVALIDA')
})

test('el Rosario justifica vidas extra y respeta el máximo por noche', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'rosario', PREFIJO)

  const conRosario = await guardar(ag, csrfToken, victoria({ vidasRestantes: 6, objetosUsados: 1 }))
  assert.equal(conRosario.status, 201)
  assert.equal(conRosario.body.data.partida.vidasRestantes, 6)
  assert.equal(conRosario.body.data.partida.objetosUsados, 1)

  const demasiados = await guardar(ag, csrfToken, victoria({ objetosUsados: 4 }))
  assert.equal(demasiados.status, 400)
  assert.equal(demasiados.body.error.codigo, 'PARTIDA_INVALIDA')
})

test('dos cuentas tienen progreso, historial y desbloqueos independientes', async () => {
  const agA = crearAgent()
  const { usuario: usuarioA, csrfToken: csrfA } = await registrar(agA, 'aislado-a', PREFIJO)
  const agB = crearAgent()
  const { usuario: usuarioB } = await registrar(agB, 'aislado-b', PREFIJO)

  const guardado = await guardar(agA, csrfA, victoria())
  assert.equal(guardado.status, 201)
  assert.notEqual(usuarioA.id, usuarioB.id)

  const estadoB = await agB.get('/api/padre/estado')
  assert.equal(estadoB.body.data.nivelMaxDesbloqueado, 1)
  assert.equal(estadoB.body.data.niveles[0].mejorPuntaje, 0)
  assert.equal(estadoB.body.data.niveles[0].partidas, 0)

  const historialB = await agB.get('/api/padre/partidas')
  assert.equal(historialB.status, 200)
  assert.equal(historialB.body.meta.total, 0)
  assert.deepEqual(historialB.body.data, [])

  const historialA = await agA.get('/api/padre/partidas')
  assert.equal(historialA.status, 200)
  assert.equal(historialA.body.meta.total, 1)
  assert.equal(historialA.body.data[0].nivel, 1)

  const filas = await query(
    'SELECT usuario_id, nivel FROM padre_partidas WHERE usuario_id IN (?, ?)',
    [usuarioA.id, usuarioB.id],
  )
  assert.equal(filas.length, 1)
  assert.equal(Number(filas[0].usuario_id), usuarioA.id)
})

test('el historial pagina y filtra por modo y nivel', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'historial', PREFIJO)

  await guardar(ag, csrfToken, victoria({ nivel: 1 }))
  await guardar(ag, csrfToken, victoria({ nivel: 2 }))
  await guardar(ag, csrfToken, derrota({ nivel: 1 }))
  await guardar(ag, csrfToken, infinita())
  const primeraPagina = await ag.get('/api/padre/partidas').query({ limit: 2, offset: 0 })
  assert.equal(primeraPagina.status, 200)
  assert.equal(primeraPagina.body.data.length, 2)
  assert.equal(primeraPagina.body.meta.total, 4)
  assert.equal(primeraPagina.body.meta.limit, 2)
  assert.equal(primeraPagina.body.meta.offset, 0)

  const segundaPagina = await ag.get('/api/padre/partidas').query({ limit: 2, offset: 2 })
  assert.equal(segundaPagina.body.data.length, 2)

  const soloNivel1 = await ag.get('/api/padre/partidas').query({ nivel: 1 })
  assert.equal(soloNivel1.status, 200)
  assert.equal(soloNivel1.body.meta.total, 2)
  assert.equal(soloNivel1.body.data.every((partida) => partida.nivel === 1), true)

  const soloInfinito = await ag.get('/api/padre/partidas').query({ modo: 'infinita' })
  assert.equal(soloInfinito.status, 200)
  assert.equal(soloInfinito.body.meta.total, 1)
  assert.equal(soloInfinito.body.data[0].modo, 'infinita')
  assert.equal(soloInfinito.body.data[0].rondas, 3)
})

test('el plan decide el máximo de vidas aceptado', async () => {
  const agGratis = crearAgent()
  const { csrfToken: csrfGratis } = await registrar(agGratis, 'vidas-gratis', PREFIJO)
  const datosPremium = victoria({ vidasRestantes: 7, objetosUsados: 1 })

  const rechazada = await guardar(agGratis, csrfGratis, datosPremium)
  assert.equal(rechazada.status, 400)
  assert.equal(rechazada.body.error.codigo, 'PARTIDA_INVALIDA')

  const agPremium = crearAgent()
  const { usuario, csrfToken: csrfPremium } = await registrar(agPremium, 'vidas-premium', PREFIJO)
  await concederPremium(usuario.id)

  const aceptada = await guardar(agPremium, csrfPremium, datosPremium)
  assert.equal(aceptada.status, 201)
  assert.equal(aceptada.body.data.partida.vidasRestantes, 7)
})

test('el modo infinito guarda rondas y ordena el récord por rondas', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'infinito', PREFIJO)

  const primera = await guardar(ag, csrfToken, infinita({ rondas: 3, duracionSegundos: 100 }))
  assert.equal(primera.status, 201)
  assert.equal(primera.body.data.partida.modo, 'infinita')
  assert.equal(primera.body.data.partida.nivel, 0)
  assert.equal(primera.body.data.partida.rondas, 3)
  assert.equal(primera.body.data.partida.victoria, false)
  assert.equal(primera.body.data.nivelDesbloqueado, null)
  assert.equal(primera.body.data.record.mejorRondas, 3)
  assert.equal(primera.body.data.nuevoRecord, true)

  const segunda = await guardar(ag, csrfToken, infinita({ rondas: 5, duracionSegundos: 150 }))
  assert.equal(segunda.status, 201)
  assert.equal(segunda.body.data.record.mejorRondas, 5)
  assert.equal(segunda.body.data.record.partidas, 2)
  assert.equal(segunda.body.data.nuevoRecord, true)

  const estado = await ag.get('/api/padre/estado')
  assert.equal(estado.body.data.infinito.mejorRondas, 5)
  assert.equal(estado.body.data.infinito.partidas, 2)
})

test('el servidor rechaza partidas infinitas incoherentes', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'infinito-malo', PREFIJO)

  const conVictoria = await guardar(ag, csrfToken, { ...infinita(), victoria: true })
  assert.equal(conVictoria.status, 400)
  assert.equal(conVictoria.body.error.codigo, 'VALIDACION')

  const conNivel = await guardar(ag, csrfToken, { ...infinita(), nivel: 1 })
  assert.equal(conNivel.status, 400)
  assert.equal(conNivel.body.error.codigo, 'VALIDACION')

  const rondasImposibles = await guardar(
    ag,
    csrfToken,
    infinita({ rondas: 20, duracionSegundos: 100 }),
  )
  assert.equal(rondasImposibles.status, 400)
  assert.equal(rondasImposibles.body.error.codigo, 'PARTIDA_INVALIDA')

  const conVidas = await guardar(ag, csrfToken, { ...infinita(), vidasRestantes: 1 })
  assert.equal(conVidas.status, 400)
  assert.equal(conVidas.body.error.codigo, 'PARTIDA_INVALIDA')
})

test('el ranking separa gratis y premium por nivel', async () => {
  const agGratis = crearAgent()
  const { csrfToken: csrfGratis } = await registrar(agGratis, 'rank-gratis', PREFIJO)
  const agPremium = crearAgent()
  const { usuario: usuarioPremium, csrfToken: csrfPremium } = await registrar(
    agPremium,
    'rank-premium',
    PREFIJO,
  )
  await concederPremium(usuarioPremium.id)

  const gratis = victoria({ vidasRestantes: 2 })
  const premium = victoria({ vidasRestantes: 4 })

  assert.equal((await guardar(agGratis, csrfGratis, gratis)).status, 201)
  assert.equal((await guardar(agPremium, csrfPremium, premium)).status, 201)

  const res = await request(app).get('/api/padre/ranking').query({
    modo: 'campana',
    nivel: 1,
    limit: 50,
  })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.modo, 'campana')
  assert.equal(res.body.data.nivel, 1)

  const nombreGratis = `${PREFIJO}rank-gratis`
  const nombrePremium = `${PREFIJO}rank-premium`
  const entradaGratis = res.body.data.gratis.find((e) => e.nombreUsuario === nombreGratis)
  const entradaPremium = res.body.data.premium.find((e) => e.nombreUsuario === nombrePremium)

  assert.ok(entradaGratis)
  assert.ok(entradaPremium)
  assert.equal(entradaGratis.puntaje, gratis.puntaje)
  assert.equal(entradaPremium.puntaje, premium.puntaje)
  assert.equal(res.body.data.gratis.some((e) => e.nombreUsuario === nombrePremium), false)
  assert.equal(res.body.data.premium.some((e) => e.nombreUsuario === nombreGratis), false)
})

test('el ranking infinito ordena por rondas y exige un modo válido', async () => {
  const ag = crearAgent()
  const { csrfToken } = await registrar(ag, 'rank-infinito', PREFIJO)
  await guardar(ag, csrfToken, infinita({ rondas: 7, duracionSegundos: 220 }))

  const res = await request(app).get('/api/padre/ranking').query({
    modo: 'infinita',
    limit: 50,
  })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.modo, 'infinita')
  assert.equal(res.body.data.nivel, 0)

  const entrada = res.body.data.gratis.find(
    (e) => e.nombreUsuario === `${PREFIJO}rank-infinito`,
  )
  assert.ok(entrada)
  assert.equal(entrada.rondas, 7)
  assert.equal(typeof entrada.victorias, 'number')

  const infinitoConNivel = await request(app)
    .get('/api/padre/ranking')
    .query({ modo: 'infinita', nivel: 1 })
  assert.equal(infinitoConNivel.status, 400)
  assert.equal(infinitoConNivel.body.error.codigo, 'VALIDACION')

  const campanaSinNivel = await request(app).get('/api/padre/ranking').query({ modo: 'campana' })
  assert.equal(campanaSinNivel.status, 400)
  assert.equal(campanaSinNivel.body.error.codigo, 'VALIDACION')
})
