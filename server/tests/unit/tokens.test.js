import test from 'node:test'
import assert from 'node:assert/strict'

import {
  esFormatoCodigoValido,
  generarCodigoActivacion,
  hashCodigoActivacion,
  normalizarCodigo,
} from '../../src/utils/tokens.js'

test('normalizarCodigo limpia espacios y pone mayúsculas', () => {
  assert.equal(normalizarCodigo('  ecos-ab12-cd34-ef56  '), 'ECOS-AB12-CD34-EF56')
  assert.equal(normalizarCodigo(null), '')
})

test('esFormatoCodigoValido acepta el formato correcto', () => {
  assert.equal(esFormatoCodigoValido('ECOS-AB12-CD34-EF56'), true)
  assert.equal(esFormatoCodigoValido('ecos-ab12-cd34-ef56'), true)
})

test('esFormatoCodigoValido rechaza formatos inválidos', () => {
  assert.equal(esFormatoCodigoValido('ECOS-AB12-CD34'), false)
  assert.equal(esFormatoCodigoValido('ECOS-AB12-CD34-EF56-XX'), false)
  assert.equal(esFormatoCodigoValido('ECOS-AB12-CD34-EF5!'), false)
})

test('generarCodigoActivacion cumple el formato y usa alfabeto Crockford', () => {
  const codigo = generarCodigoActivacion()
  assert.match(codigo, /^ECOS-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/)
})

test('hashCodigoActivacion es determinista y sensible a cambios', () => {
  const a = hashCodigoActivacion('ECOS-AB12-CD34-EF56')
  const b = hashCodigoActivacion('ECOS-AB12-CD34-EF56')
  const c = hashCodigoActivacion('ECOS-AB12-CD34-EF57')
  assert.equal(a, b)
  assert.notEqual(a, c)
  assert.match(a, /^[a-f0-9]{64}$/)
})
