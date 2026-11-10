import test from 'node:test'
import assert from 'node:assert/strict'

import {
  INFINITO,
  NIVELES,
  TOTAL_NIVELES,
  configuracionNivel,
  configuracionRonda,
  puntajeBase,
  puntajeMaximo,
  puntajeMinimo,
  topeEnemigos,
  vidasMaximas,
} from '../../src/config/padre.js'
import { partidaBodySchema } from '../../src/schemas/padre.schema.js'
import { validarPartida } from '../../src/services/padre.service.js'

const estadisticas = {
  aldeanos: 20,
  perro: 2,
  monaguillo: 1,
  beata: 0,
  valiente: 0,
  salvados: 4,
}

function victoria(extra = {}) {
  const nivel = extra.nivel ?? 1
  const config = configuracionNivel(nivel)
  const datos = {
    modo: 'campana',
    nivel,
    duracionSegundos: config.duracion,
    rondas: 0,
    vidasRestantes: 3,
    objetosUsados: 0,
    estadisticas,
    victoria: true,
    ...extra,
  }
  if (datos.puntaje === undefined) {
    datos.puntaje = puntajeBase(datos.estadisticas) * 2 + puntajeMinimo(datos, config) - puntajeBase(datos.estadisticas)
  }
  return { datos, config }
}

function derrota(extra = {}) {
  const nivel = extra.nivel ?? 1
  const config = configuracionNivel(nivel)
  const datos = {
    modo: 'campana',
    nivel,
    duracionSegundos: 60,
    rondas: 0,
    vidasRestantes: 0,
    objetosUsados: 0,
    estadisticas,
    victoria: false,
    ...extra,
  }
  if (datos.puntaje === undefined) datos.puntaje = puntajeBase(datos.estadisticas)
  return { datos, config }
}

function infinita(extra = {}) {
  const rondas = extra.rondas ?? 3
  const datos = {
    modo: 'infinita',
    duracionSegundos: 100,
    rondas,
    vidasRestantes: 0,
    objetosUsados: 1,
    estadisticas,
    victoria: false,
    ...extra,
  }
  const config = configuracionRonda(rondas)
  if (datos.puntaje === undefined) {
    datos.puntaje =
      puntajeBase(datos.estadisticas) * 2 +
      (puntajeMinimo(datos, config) - puntajeBase(datos.estadisticas))
  }
  return { datos, config }
}

test('la campaña tiene 5 noches con dificultad creciente', () => {
  assert.equal(TOTAL_NIVELES, 5)
  assert.equal(NIVELES.length, 5)
  assert.equal(new Set(NIVELES.map((n) => n.id)).size, 5)

  for (let i = 1; i < NIVELES.length; i += 1) {
    assert.ok(NIVELES[i].duracion > NIVELES[i - 1].duracion)
    assert.ok(NIVELES[i].aldeanos >= NIVELES[i - 1].aldeanos)
    assert.ok(NIVELES[i].velocidadEnemigos > NIVELES[i - 1].velocidadEnemigos)
    assert.ok(NIVELES[i].maxEnemigos.maximo >= NIVELES[i - 1].maxEnemigos.maximo)
    assert.ok(NIVELES[i].esperaSpawn.min <= NIVELES[i - 1].esperaSpawn.min)
  }

  assert.equal(configuracionNivel(99), null)
  assert.equal(configuracionNivel(1).enemigos.perro.puntos, 25)
})

test('el tope de enemigos y la espera escalan dentro de la noche', () => {
  const nivel = configuracionNivel(1)
  assert.equal(topeEnemigos(nivel, 0), 1)
  assert.equal(topeEnemigos(nivel, 90), 4)
  assert.ok(topeEnemigos(nivel, 1000) <= nivel.maxEnemigos.maximo)
})

test('el modo infinito escala y respeta sus topes', () => {
  const ronda1 = configuracionRonda(1)
  assert.equal(ronda1.aldeanos, 8)
  assert.equal(ronda1.maxEnemigos.maximo, 4)
  assert.equal(ronda1.esperaSpawn.inicial, 7.5)
  assert.equal(ronda1.enemigos.perro.desde, 8)

  const ronda3 = configuracionRonda(3)
  assert.equal(ronda3.aldeanos, 8)
  assert.equal(ronda3.maxEnemigos.maximo, 5)

  // A partir de la ronda 6 todos los enemigos aparecen dentro de los 30 s.
  const ronda6 = configuracionRonda(6)
  assert.ok(ronda6.enemigos.perro.desde < 10)
  assert.ok(ronda6.enemigos.monaguillo.desde < 30)
  assert.ok(ronda6.enemigos.beata.desde < 30)
  assert.ok(ronda6.enemigos.valiente.desde < 30)

  const ronda100 = configuracionRonda(100)
  assert.equal(ronda100.aldeanos, INFINITO.aldeanosMax)
  assert.equal(ronda100.maxEnemigos.maximo, INFINITO.enemigosMax)
  assert.equal(ronda100.esperaSpawn.inicial, INFINITO.spawnMin)
  assert.equal(ronda100.velocidadEnemigos, INFINITO.velocidadMax)
  assert.equal(ronda100.objetos.max, INFINITO.maxObjetos)
})

test('el puntaje base y las cotas usan las estadísticas', () => {
  const config = configuracionNivel(1)
  const datos = victoria().datos

  assert.equal(puntajeBase(estadisticas), 20 * 10 + 2 * 25 + 1 * 30)
  const minimo = puntajeMinimo(datos, config)
  const maximo = puntajeMaximo(datos, config)
  assert.ok(minimo < maximo)
  assert.equal(minimo, puntajeBase(estadisticas) + 200 + 3 * 25)
  assert.equal(maximo, puntajeBase(estadisticas) * 5 + 200 + 3 * 25)
})

test('vidas máximas dependen del plan', () => {
  assert.equal(vidasMaximas(false), 5)
  assert.equal(vidasMaximas(true), 7)
})

test('partidaBodySchema acepta campaña e infinito coherentes', () => {
  assert.equal(partidaBodySchema.safeParse(victoria().datos).success, true)
  assert.equal(partidaBodySchema.safeParse(derrota().datos).success, true)
  assert.equal(partidaBodySchema.safeParse(infinita().datos).success, true)
})

test('partidaBodySchema rechaza campos desconocidos y datos ajenos', () => {
  const conUsuario = { ...victoria().datos, usuarioId: 1 }
  assert.equal(partidaBodySchema.safeParse(conUsuario).success, false)

  const conNivelEnInfinito = { ...infinita().datos, nivel: 1 }
  assert.equal(partidaBodySchema.safeParse(conNivelEnInfinito).success, false)

  const infinitoConVictoria = { ...infinita().datos, victoria: true }
  assert.equal(partidaBodySchema.safeParse(infinitoConVictoria).success, false)

  const campañaConRondas = { ...victoria().datos, rondas: 3 }
  assert.equal(partidaBodySchema.safeParse(campañaConRondas).success, false)

  const nivelFuera = { ...victoria().datos, nivel: 6 }
  assert.equal(partidaBodySchema.safeParse(nivelFuera).success, false)
})

test('validarPartida acepta resultados coherentes', () => {
  const campaña = victoria()
  assert.doesNotThrow(() =>
    validarPartida(campaña.datos, { config: campaña.config, premium: false }),
  )

  const derrotaOk = derrota()
  assert.doesNotThrow(() =>
    validarPartida(derrotaOk.datos, { config: derrotaOk.config, premium: false }),
  )

  const infinitoOk = infinita()
  assert.doesNotThrow(() =>
    validarPartida(infinitoOk.datos, { config: infinitoOk.config, premium: false }),
  )
})

test('validarPartida rechaza vidas extra sin rosarios', () => {
  const { datos, config } = victoria({ vidasRestantes: 6 })
  assert.throws(
    () => validarPartida(datos, { config, premium: false }),
    (err) => err.codigo === 'PARTIDA_INVALIDA',
  )
})

test('el rosario justifica vidas extra', () => {
  const { datos, config } = victoria({ vidasRestantes: 6, objetosUsados: 1 })
  assert.doesNotThrow(() => validarPartida(datos, { config, premium: false }))

  const premium = victoria({ vidasRestantes: 7, objetosUsados: 1 })
  assert.doesNotThrow(() =>
    validarPartida(premium.datos, { config: premium.config, premium: true }),
  )
})

test('validarPartida rechaza rosarios de más y duración excesiva', () => {
  const demasiados = victoria({ objetosUsados: 4 })
  assert.throws(
    () => validarPartida(demasiados.datos, { config: demasiados.config, premium: false }),
    (err) => err.codigo === 'PARTIDA_INVALIDA',
  )

  const larga = victoria({ duracionSegundos: 95 })
  assert.throws(
    () => validarPartida(larga.datos, { config: larga.config, premium: false }),
    (err) => err.codigo === 'PARTIDA_INVALIDA',
  )
})

test('validarPartida rechaza puntajes fuera de cota', () => {
  const bajo = victoria({ puntaje: 1 })
  assert.throws(
    () => validarPartida(bajo.datos, { config: bajo.config, premium: false }),
    (err) => err.codigo === 'PARTIDA_INVALIDA',
  )

  const alto = victoria({ puntaje: 999_999 })
  assert.throws(
    () => validarPartida(alto.datos, { config: alto.config, premium: false }),
    (err) => err.codigo === 'PARTIDA_INVALIDA',
  )
})

test('validarPartida rechaza estados finales incoherentes', () => {
  const victoriaSinVidas = victoria({ vidasRestantes: 0 })
  assert.throws(() =>
    validarPartida(victoriaSinVidas.datos, {
      config: victoriaSinVidas.config,
      premium: false,
    }),
  )

  const derrotaConVidas = derrota({ vidasRestantes: 2 })
  assert.throws(() =>
    validarPartida(derrotaConVidas.datos, {
      config: derrotaConVidas.config,
      premium: false,
    }),
  )
})

test('validarPartida rechaza estadísticas imposibles', () => {
  const aldeanos = victoria({
    estadisticas: { ...estadisticas, aldeanos: 500, salvados: 500 },
  })
  assert.throws(() =>
    validarPartida(aldeanos.datos, { config: aldeanos.config, premium: false }),
  )

  const enemigos = victoria({
    estadisticas: { ...estadisticas, perro: 500, monaguillo: 500 },
  })
  assert.throws(() =>
    validarPartida(enemigos.datos, { config: enemigos.config, premium: false }),
  )
})

test('validarPartida acepta recuentos altos de aldeanos dentro del tope del motor', () => {
  const campaña = victoria({
    estadisticas: { ...estadisticas, aldeanos: 120, salvados: 80 },
  })
  assert.doesNotThrow(() =>
    validarPartida(campaña.datos, { config: campaña.config, premium: false }),
  )

  const infinito = infinita({
    duracionSegundos: 100,
    rondas: 3,
    estadisticas: { ...estadisticas, aldeanos: 100, salvados: 50 },
  })
  assert.doesNotThrow(() =>
    validarPartida(infinito.datos, { config: infinito.config, premium: false }),
  )
})

test('validarPartida rechaza partidas infinitas incoherentes', () => {
  const conVidas = infinita({ vidasRestantes: 1 })
  assert.throws(() =>
    validarPartida(conVidas.datos, { config: conVidas.config, premium: false }),
  )

  const rondasImposibles = infinita({ rondas: 20, duracionSegundos: 100 })
  assert.throws(() =>
    validarPartida(rondasImposibles.datos, { config: rondasImposibles.config, premium: false }),
  )

  const objetosDeMas = infinita({ rondas: 3, objetosUsados: 6 })
  assert.throws(() =>
    validarPartida(objetosDeMas.datos, { config: objetosDeMas.config, premium: false }),
  )
})
