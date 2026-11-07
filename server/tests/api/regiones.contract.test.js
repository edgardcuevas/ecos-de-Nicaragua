import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'

ensureTestDb()

const PREFIJO = 'regiones-contract-'

before(async () => {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
})

test('Contrato: GET /api/regiones devuelve 17 unidades y meta', async () => {
  const res = await request(app).get('/api/regiones')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(res.body.data))
  assert.equal(res.body.data.length, 17)
  assert.ok(res.body.meta)
  assert.equal(res.body.meta.total, 17)
  assert.equal(res.body.meta.nacionales, 2)
  assert.equal(res.body.meta.regionales, 1)
  assert.ok(Array.isArray(res.body.nacionales))
  assert.ok(Array.isArray(res.body.regionales))
  for (const item of res.body.data) {
    assert.ok(Number.isInteger(item.id))
    assert.ok(typeof item.codigo === 'string')
    assert.ok(typeof item.nombre === 'string')
    assert.ok(['departamento', 'region_autonoma'].includes(item.tipo))
    assert.equal(typeof item.totalLeyendas, 'number')
    assert.ok(Array.isArray(item.leyendas))
  }
})

test('Contrato: GET /api/regiones/:codigo devuelve la ficha', async () => {
  const res = await request(app).get('/api/regiones/matagalpa')
  assert.equal(res.status, 200)
  const data = res.body.data
  assert.equal(data.codigo, 'matagalpa')
  assert.ok(typeof data.nombre === 'string')
  assert.ok(Array.isArray(data.leyendas))
  for (const leyenda of data.leyendas) {
    assert.ok(typeof leyenda.slug === 'string')
    assert.ok(typeof leyenda.titulo === 'string')
    assert.ok(typeof leyenda.nivelVerificacion === 'string')
    assert.ok(Array.isArray(leyenda.fuentes))
    for (const fuente of leyenda.fuentes) {
      assert.ok(typeof fuente.titulo === 'string')
      assert.ok(typeof fuente.tipo === 'string')
    }
  }
})

test('Contrato: GET /api/regiones/:codigo inexistente devuelve 404', async () => {
  const res = await request(app).get('/api/regiones/no-existe')
  assert.equal(res.status, 404)
  assert.equal(res.body.error.codigo, 'REGION_NO_ENCONTRADA')
})

test('Contrato: GET /api/regiones/:codigo inválido devuelve 400', async () => {
  const res = await request(app).get('/api/regiones/!!!')
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
})

test('Contrato: acceso premium agrega notas y detalles de fuentes', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'regiones-premium', PREFIJO)
  await concederPremium(usuario.id)
  const res = await ag.get('/api/regiones/matagalpa')
  assert.equal(res.status, 200)
  const leyenda = res.body.data.leyendas.find((item) => item.slug === 'la-mocuana')
  assert.ok(leyenda)
  assert.ok('nota' in leyenda)
  for (const fuente of leyenda.fuentes) {
    assert.ok('referencia' in fuente)
    assert.ok('url' in fuente)
    assert.ok('licencia' in fuente)
  }
})

test('Contrato: acceso gratis omite notas y detalles ampliados', async () => {
  const res = await request(app).get('/api/regiones/matagalpa')
  assert.equal(res.status, 200)
  const leyenda = res.body.data.leyendas.find((item) => item.slug === 'la-mocuana')
  assert.ok(leyenda)
  assert.equal('nota' in leyenda, false)
  for (const fuente of leyenda.fuentes) {
    assert.equal('referencia' in fuente, false)
    assert.equal('url' in fuente, false)
    assert.equal('licencia' in fuente, false)
  }
})

test.after(async () => {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
  await closePool()
})
