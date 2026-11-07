import test from 'node:test'
import assert from 'node:assert/strict'

import {
  responderBodySchema,
  slugParamSchema,
} from '../../src/schemas/trivia.schema.js'

test('slugParamSchema acepta slugs válidos', () => {
  assert.equal(slugParamSchema.safeParse({ slug: 'la-mocuana' }).success, true)
  assert.equal(slugParamSchema.safeParse({ slug: 'el-cadejo' }).success, true)
})

test('slugParamSchema rechaza slugs inválidos o campos extra', () => {
  assert.equal(slugParamSchema.safeParse({ slug: 'La Mocuana' }).success, false)
  assert.equal(slugParamSchema.safeParse({ slug: 'la_mocuana' }).success, false)
  assert.equal(slugParamSchema.safeParse({ slug: 'la-mocuana', extra: true }).success, false)
})

test('responderBodySchema acepta respuestas válidas', () => {
  const resultado = responderBodySchema.safeParse({
    respuestas: [
      { preguntaId: 1, opcionId: 2 },
      { preguntaId: 2, opcionId: 5 },
    ],
  })
  assert.equal(resultado.success, true)
})

test('responderBodySchema rechaza arrays vacíos o fuera de rango', () => {
  assert.equal(responderBodySchema.safeParse({ respuestas: [] }).success, false)
  assert.equal(
    responderBodySchema.safeParse({
      respuestas: Array.from({ length: 6 }, (_, i) => ({ preguntaId: i + 1, opcionId: i + 1 })),
    }).success,
    false,
  )
})

test('responderBodySchema rechaza campos desconocidos', () => {
  const resultado = responderBodySchema.safeParse({
    respuestas: [{ preguntaId: 1, opcionId: 2 }],
    extra: true,
  })
  assert.equal(resultado.success, false)
})

test('responderBodySchema rechaza ids no positivos', () => {
  const resultado = responderBodySchema.safeParse({
    respuestas: [{ preguntaId: 0, opcionId: -1 }],
  })
  assert.equal(resultado.success, false)
})
