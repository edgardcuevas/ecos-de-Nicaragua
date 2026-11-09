import test from 'node:test'
import assert from 'node:assert/strict'

import {
  NIVELES,
  TOTAL_NIVELES,
  distanciaMaxima,
  obtenerNivel,
  puntajeEsperado,
  vidasMaximas,
} from '../../src/config/runner.js'
import {
  partidaBodySchema,
  partidasQuerySchema,
  rankingQuerySchema,
} from '../../src/schemas/runner.schema.js'
import { validarPartida } from '../../src/services/runner.service.js'

const base = {
  nivel: 1,
  puntaje: 100,
  distancia: 100,
  duracionSegundos: 50,
  vidasRestantes: 0,
  victoria: false,
}

test('la campaña tiene 5 noches con ids únicos y duración creciente', () => {
  assert.equal(TOTAL_NIVELES, 5)
  const ids = new Set(NIVELES.map((n) => n.id))
  assert.equal(ids.size, NIVELES.length)
  for (let i = 1; i < NIVELES.length; i += 1) {
    assert.ok(NIVELES[i].duracion > NIVELES[i - 1].duracion)
    assert.ok(NIVELES[i].rampa.max >= NIVELES[i - 1].rampa.max)
  }
  assert.equal(obtenerNivel(99), null)
})

test('partidaBodySchema acepta una derrota coherente', () => {
  assert.equal(partidaBodySchema.safeParse(base).success, true)
})

test('partidaBodySchema acepta una victoria coherente', () => {
  const res = partidaBodySchema.safeParse({
    ...base,
    puntaje: 350,
    duracionSegundos: 100,
    vidasRestantes: 2,
    victoria: true,
  })
  assert.equal(res.success, true)
})

test('partidaBodySchema rechaza niveles, tipos y campos desconocidos', () => {
  assert.equal(partidaBodySchema.safeParse({ ...base, nivel: 0 }).success, false)
  assert.equal(partidaBodySchema.safeParse({ ...base, nivel: 6 }).success, false)
  assert.equal(partidaBodySchema.safeParse({ ...base, puntaje: -1 }).success, false)
  assert.equal(partidaBodySchema.safeParse({ ...base, victoria: 'si' }).success, false)
  assert.equal(partidaBodySchema.safeParse({ ...base, extra: true }).success, false)
  assert.equal(partidaBodySchema.safeParse({ ...base, nivel: 1.5 }).success, false)
})

test('query schemas aplican límites y valores por defecto', () => {
  assert.deepEqual(partidasQuerySchema.parse({}), { limit: 20, offset: 0 })
  assert.deepEqual(partidasQuerySchema.parse({ nivel: '2', limit: '5', offset: '3' }), {
    nivel: 2,
    limit: 5,
    offset: 3,
  })
  assert.equal(partidasQuerySchema.safeParse({ limit: 0 }).success, false)
  assert.equal(partidasQuerySchema.safeParse({ offset: -1 }).success, false)
  assert.equal(rankingQuerySchema.safeParse({}).success, false)
  assert.deepEqual(rankingQuerySchema.parse({ nivel: '3' }), { nivel: 3, limit: 10 })
})

test('validarPartida acepta derrota y victoria coherentes', () => {
  const nivel = obtenerNivel(1)
  assert.doesNotThrow(() => validarPartida(base, nivel, false))

  const victoria = {
    ...base,
    puntaje: puntajeEsperado(nivel, {
      distancia: 100,
      vidasRestantes: 2,
      victoria: true,
    }),
    duracionSegundos: nivel.duracion,
    vidasRestantes: 2,
    victoria: true,
  }
  assert.doesNotThrow(() => validarPartida(victoria, nivel, false))
})

test('validarPartida aplica el máximo de vidas del plan', () => {
  const nivel = obtenerNivel(1)
  const victoriaPremium = {
    ...base,
    distancia: 1000,
    vidasRestantes: 6,
    duracionSegundos: nivel.duracion,
    victoria: true,
  }
  victoriaPremium.puntaje = puntajeEsperado(nivel, victoriaPremium)

  assert.throws(
    () => validarPartida(victoriaPremium, nivel, false),
    (error) => error.codigo === 'PARTIDA_INVALIDA',
  )
  assert.doesNotThrow(() => validarPartida(victoriaPremium, nivel, true))
})

test('validarPartida rechaza puntajes, vidas y duraciones imposibles', () => {
  const nivel = obtenerNivel(1)

  assert.throws(
    () => validarPartida({ ...base, puntaje: 101 }, nivel, false),
    (error) => error.codigo === 'PARTIDA_INVALIDA',
  )
  assert.throws(
    () => validarPartida({ ...base, vidasRestantes: vidasMaximas(false) + 1 }, nivel, false),
    (error) => error.codigo === 'PARTIDA_INVALIDA',
  )
  assert.throws(
    () => validarPartida({ ...base, duracionSegundos: nivel.duracion + 3 }, nivel, false),
    (error) => error.codigo === 'PARTIDA_INVALIDA',
  )
  assert.throws(
    () => validarPartida({ ...base, distancia: distanciaMaxima(nivel) + 1 }, nivel, false),
    (error) => error.codigo === 'PARTIDA_INVALIDA',
  )
  assert.throws(
    () =>
      validarPartida(
        { ...base, vidasRestantes: 1, puntaje: base.distancia, victoria: false },
        nivel,
        false,
      ),
    (error) => error.codigo === 'PARTIDA_INVALIDA',
  )
  assert.throws(
    () =>
      validarPartida(
        { ...base, vidasRestantes: 0, puntaje: base.distancia, victoria: true },
        nivel,
        false,
      ),
    (error) => error.codigo === 'PARTIDA_INVALIDA',
  )
})
