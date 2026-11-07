import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app, { sessionStore } from '../../src/app.js'
import { closePool, query } from '../../src/db.js'
import { ensureTestDb } from '../helpers/db.js'
import { agent as crearAgent, registrar } from '../helpers/auth.js'
import { concederPremium } from '../helpers/premium.js'

ensureTestDb()

const PREFIJO = 'leyendas-test-'

async function limpiar() {
  await query('DELETE FROM usuarios WHERE correo LIKE ?', [`${PREFIJO}%`])
  await query('DELETE FROM sesiones')
}

before(async () => {
  await limpiar()
})

after(async () => {
  await limpiar()
  await sessionStore.close()
  await closePool()
})

test('GET /api/leyendas devuelve las 6 leyendas con metadatos de paginación', async () => {
  const res = await request(app).get('/api/leyendas')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 6)
  assert.deepEqual(res.body.meta, { total: 6, page: 1, limit: 20, totalPaginas: 1 })

  for (const leyenda of res.body.data) {
    assert.ok(leyenda.id)
    assert.ok(leyenda.slug)
    assert.ok(leyenda.titulo)
    assert.ok(leyenda.resumen)
    assert.ok(leyenda.categoria)
    assert.ok(['nacional', 'regional', 'local'].includes(leyenda.alcance))
    assert.ok(Array.isArray(leyenda.regiones))
    assert.deepEqual(Object.keys(leyenda.contenidoBloqueado).sort(), [
      'audios',
      'imagenes',
      'preguntas',
      'versiones',
    ])
  }
})

test('GET /api/leyendas?region=matagalpa devuelve solo las leyendas vinculadas', async () => {
  const res = await request(app).get('/api/leyendas?region=matagalpa')
  assert.equal(res.status, 200)
  assert.equal(res.body.meta.total, 1)
  assert.equal(res.body.data[0].slug, 'la-mocuana')
})

test('GET /api/leyendas?q=MOCUANA busca sin distinguir mayúsculas', async () => {
  const res = await request(app).get('/api/leyendas?q=MOCUANA')
  assert.equal(res.status, 200)
  assert.ok(res.body.data.some((leyenda) => leyenda.slug === 'la-mocuana'))
})

test('GET /api/leyendas?categoria=sobrenatural filtra por categoría', async () => {
  const res = await request(app).get('/api/leyendas?categoria=sobrenatural')
  assert.equal(res.status, 200)
  assert.deepEqual(
    res.body.data.map((leyenda) => leyenda.slug).sort(),
    ['el-cadejo', 'la-carreta-nagua', 'la-cegua'],
  )
})

test('GET /api/leyendas?alcance=nacional devuelve las leyendas nacionales', async () => {
  const res = await request(app).get('/api/leyendas?alcance=nacional')
  assert.equal(res.status, 200)
  assert.deepEqual(
    res.body.data.map((leyenda) => leyenda.slug).sort(),
    ['el-cadejo', 'la-carreta-nagua'],
  )
})

test('GET /api/leyendas pagina con page y limit', async () => {
  const res = await request(app).get('/api/leyendas?page=3&limit=2')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 2)
  assert.deepEqual(res.body.meta, { total: 6, page: 3, limit: 2, totalPaginas: 3 })
})

test('GET /api/leyendas?orden=reciente responde 200', async () => {
  const res = await request(app).get('/api/leyendas?orden=reciente')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 6)
})

test('GET /api/leyendas con query inválido devuelve 400 VALIDACION', async () => {
  for (const query of ['limit=51', 'page=0', 'orden=antiguo', 'desconocido=1', 'q=a']) {
    const res = await request(app).get(`/api/leyendas?${query}`)
    assert.equal(res.status, 400, query)
    assert.equal(res.body.error.codigo, 'VALIDACION', query)
  }
})

test('GET /api/leyendas/:slug devuelve la ficha pública sin contenido premium', async () => {
  const res = await request(app).get('/api/leyendas/la-mocuana')
  assert.equal(res.status, 200)

  const data = res.body.data
  assert.equal(data.slug, 'la-mocuana')
  assert.equal(data.formatoContenido, 'markdown')
  assert.deepEqual(data.categoria, { slug: 'tradicion-oral', nombre: 'Tradición oral' })
  assert.ok(data.historia)

  assert.equal(data.regiones.length, 2)
  for (const region of data.regiones) {
    assert.ok(region.codigo)
    assert.ok(region.tipo)
    assert.ok(region.nivelVerificacion)
    assert.ok(region.fuentes.length >= 1)
  }

  assert.equal(data.versiones.length, 1)
  assert.equal(data.versiones[0].esPremium, false)

  assert.equal(data.imagenes.length, 1)
  assert.equal(data.imagenes[0].esPrincipal, true)
  assert.ok(data.imagenes[0].url.startsWith('/api/media/imagenes/'))

  assert.deepEqual(data.audios, [])
  assert.ok(data.fuentes.length >= 1)
  assert.deepEqual(data.contenidoBloqueado, {
    versiones: 1,
    imagenes: 1,
    audios: 1,
    preguntas: 3,
  })

  const serializado = JSON.stringify(data)
  assert.equal(serializado.includes('"ruta"'), false)
  assert.equal(serializado.includes('password_hash'), false)
})

test('GET /api/leyendas/:slug inexistente devuelve 404', async () => {
  const res = await request(app).get('/api/leyendas/no-existe')
  assert.equal(res.status, 404)
  assert.equal(res.body.error.codigo, 'LEYENDA_NO_ENCONTRADA')
})

test('GET /api/leyendas/:slug con slug inválido devuelve 400', async () => {
  const res = await request(app).get('/api/leyendas/La_Mocuana')
  assert.equal(res.status, 400)
  assert.equal(res.body.error.codigo, 'VALIDACION')
})

test('Un usuario premium recibe versiones, imágenes y audios completos', async () => {
  const ag = crearAgent()
  const { usuario } = await registrar(ag, 'premium', PREFIJO)
  await concederPremium(usuario.id)

  const res = await ag.get('/api/leyendas/la-mocuana')
  assert.equal(res.status, 200)

  const data = res.body.data
  assert.equal(data.versiones.length, 2)
  assert.ok(data.versiones.some((version) => version.esPremium === true))
  assert.equal(data.imagenes.length, 2)
  assert.equal(data.audios.length, 1)
  assert.ok(data.audios[0].url.startsWith('/api/media/audios/'))
  assert.equal(data.audios[0].esPremium, true)
})

test('GET /api/categorias devuelve las 4 categorías con su conteo', async () => {
  const res = await request(app).get('/api/categorias')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 4)

  const porSlug = new Map(res.body.data.map((categoria) => [categoria.slug, categoria]))
  assert.equal(porSlug.get('tradicion-oral').totalLeyendas, 1)
  assert.equal(porSlug.get('sobrenatural').totalLeyendas, 3)
  assert.equal(porSlug.get('apariciones').totalLeyendas, 1)
  assert.equal(porSlug.get('historica-religiosa').totalLeyendas, 1)
})
