import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { safeResolve } from '../../src/services/media.service.js'

const ROOT = join(tmpdir(), 'ecos-media-test')

test.before(() => {
  rmSync(ROOT, { recursive: true, force: true })
  mkdirSync(ROOT, { recursive: true })
  writeFileSync(join(ROOT, 'ok.txt'), 'hola')
})

test.after(() => {
  rmSync(ROOT, { recursive: true, force: true })
})

test('safeResolve permite archivos dentro de la raíz', () => {
  process.env.MEDIA_ROOT = ROOT
  const { full } = safeResolve('ok.txt')
  assert.equal(full, join(ROOT, 'ok.txt'))
})

test('safeResolve rechaza traversal con ..', () => {
  process.env.MEDIA_ROOT = ROOT
  assert.throws(() => safeResolve('../secreto.txt'), (err) => err?.codigo === 'RECURSO_NO_ENCONTRADO' || err?.codigo === 'RECURSO_NO_ENCONTRADO')
})

test('safeResolve rechaza rutas absolutas fuera de la raíz', () => {
  process.env.MEDIA_ROOT = ROOT
  assert.throws(() => safeResolve('/etc/passwd'))
})

test('safeResolve rechaza archivo inexistente', () => {
  process.env.MEDIA_ROOT = ROOT
  assert.throws(() => safeResolve('no-existe.txt'), (err) => err?.codigo === 'ARCHIVO_NO_ENCONTRADO')
})