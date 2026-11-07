import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'

ensureTestDb()

const PREFIJO = 'regiones-test-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

function region(res, codigo) {
  return res.body.data.find((item) => item.codigo === codigo)
}

before(async () => {
  await limpiar()
})

after(async () => {
  await limpiar()
  await sessionStore.close()
  await closePool()
})

test('GET /api/regiones devuelve las 17 unidades y separa nacionales/regionales', async () => {
  const res = await request(app).get('/api/regiones')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 17)
  assert.deepEqual(res.body.meta, { total: 17, nacionales: 2, regionales: 1 })

  assert.deepEqual(
    res.body.nacionales.map((leyenda) => leyenda.slug).sort(),
    ['el-cadejo', 'la-carreta-nagua'],
  )
  assert.deepEqual(
    res.body.regionales.map((leyenda) => leyenda.slug),
    ['la-cegua'],
  )

  for (const item of res.body.data) {
    assert.ok(item.id)
    assert.ok(item.codigo)
    assert.ok(item.nombre)
    assert.ok(['departamento', 'region_autonoma'].includes(item.tipo))
    assert.equal(item.totalLeyendas, item.leyendas.length)
  }
})

test('Los vínculos canónicos aparecen en sus regiones', async () => {
  const res = await request(app).get('/api/regiones')

  const matagalpa = region(res, 'matagalpa')
  assert.ok(matagalpa.leyendas.some((leyenda) => leyenda.slug === 'la-mocuana'))

  const esteli = region(res, 'esteli')
  assert.ok(esteli.leyendas.some((leyenda) => leyenda.slug === 'la-mocuana'))

  for (const codigo of ['rivas', 'leon']) {
    const item = region(res, codigo)
    assert.ok(
      item.leyendas.some((leyenda) => leyenda.slug === 'la-llorona'),
      `La Llorona debe estar en ${codigo}`,
    )
  }

  const leon = region(res, 'leon')
  assert.ok(leon.leyendas.some((leyenda) => leyenda.slug === 'el-padre-sin-cabeza'))
})

test('El acceso gratis omite notas y detalles ampliados de fuentes', async () => {
  const res = await request(app).get('/api/regiones')
  const matagalpa = region(res, 'matagalpa')
  const leyenda = matagalpa.leyendas.find((item) => item.slug === 'la-mocuana')

  assert.equal('nota' in leyenda, false)
  assert.ok(leyenda.nivelVerificacion)
  assert.ok(leyenda.fuentes.length >= 1)

  for (const fuente of leyenda.fuentes) {
    assert.ok(fuente.titulo)
    assert.ok(fuente.tipo)
    assert.equal('referencia' in fuente, false)
    assert.equal('url' in fuente, false)
    assert.equal('licencia' in fuente, false)
  }
})

test('El acceso premium agrega notas y detalles de fuentes', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'premium', PREFIJO)
  await concederPremium(usuario.id)

  const res = await ag.get('/api/regiones')
  assert.equal(res.status, 200)

  const matagalpa = region(res, 'matagalpa')
  const leyenda = matagalpa.leyendas.find((item) => item.slug === 'la-mocuana')

  assert.equal(leyenda.nota, 'Sébaco')
  for (const fuente of leyenda.fuentes) {
    assert.ok('referencia' in fuente)
    assert.ok('url' in fuente)
    assert.ok('licencia' in fuente)
  }
})

test('GET /api/regiones/:codigo devuelve la ficha con fuentes y verificación', async () => {
  const res = await request(app).get('/api/regiones/matagalpa')
  assert.equal(res.status, 200)

  const data = res.body.data
  assert.equal(data.codigo, 'matagalpa')
  assert.equal(data.nombre, 'Matagalpa')
  assert.equal(data.tipo, 'departamento')

  const leyenda = data.leyendas.find((item) => item.slug === 'la-mocuana')
  assert.ok(leyenda)
  assert.equal(leyenda.nivelVerificacion, 'testimonio_oral')
  assert.equal('nota' in leyenda, false)
  assert.ok(leyenda.fuentes.length >= 1)
  for (const fuente of leyenda.fuentes) {
    assert.ok(fuente.titulo)
    assert.ok(fuente.tipo)
    assert.equal('referencia' in fuente, false)
  }
})

test('GET /api/regiones/:codigo con premium incluye nota y detalles de fuentes', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'premium-detalle', PREFIJO)
  await concederPremium(usuario.id)

  const res = await ag.get('/api/regiones/matagalpa')
  assert.equal(res.status, 200)

  const leyenda = res.body.data.leyendas.find((item) => item.slug === 'la-mocuana')
  assert.ok(leyenda)
  assert.equal(leyenda.nota, 'Sébaco')
  for (const fuente of leyenda.fuentes) {
    assert.ok('referencia' in fuente)
    assert.ok('url' in fuente)
    assert.ok('licencia' in fuente)
  }
})

test('GET /api/regiones/:codigo inexistente devuelve 404', async () => {
  const res = await request(app).get('/api/regiones/no-existe')
  assert.equal(res.status, 404)
  assert.equal(res.body.error.codigo, 'REGION_NO_ENCONTRADA')
})

test('GET /api/regiones/:codigo con código inválido devuelve 400', async () => {
  const res = await request(app).get('/api/regiones/Matagalpa')
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
})

test('incluirNacionales e incluirRegionales filtran los arreglos', async () => {
  const res = await request(app).get(
    '/api/regiones?incluirNacionales=false&incluirRegionales=false',
  )
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.nacionales, [])
  assert.deepEqual(res.body.regionales, [])
  assert.equal(res.body.meta.total, 17)
})

test('GET /api/regiones con booleano inválido devuelve 400', async () => {
  const res = await request(app).get('/api/regiones?incluirNacionales=quizas')
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
})
