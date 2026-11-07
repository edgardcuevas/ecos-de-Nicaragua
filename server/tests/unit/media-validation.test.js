import test from 'node:test'
import assert from 'node:assert/strict'

import { idParamSchema } from '../../src/schemas/media.schema.js'

test('idParamSchema acepta ids positivos', () => {
  assert.equal(idParamSchema.safeParse({ id: 1 }).success, true)
  assert.equal(idParamSchema.safeParse({ id: '42' }).success, true)
})

test('idParamSchema rechaza ids inválidos o campos extra', () => {
  assert.equal(idParamSchema.safeParse({ id: 0 }).success, false)
  assert.equal(idParamSchema.safeParse({ id: -3 }).success, false)
  assert.equal(idParamSchema.safeParse({ id: 1.5 }).success, false)
  assert.equal(idParamSchema.safeParse({ id: 1, extra: true }).success, false)
})
