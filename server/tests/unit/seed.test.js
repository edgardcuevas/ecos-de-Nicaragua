import test from 'node:test'
import assert from 'node:assert/strict'
import mysql from 'mysql2/promise'
import { dbConfig } from '../../src/config.js'

test('seed: conteos del MVP', async () => {
  const conn = await mysql.createConnection(dbConfig)
  try {
    const esperados = {
      regiones: 17,
      categorias: 4,
      fuentes: 9,
      leyendas: 6,
      leyenda_versiones: 12,
      imagenes: 12,
      audios: 6,
      preguntas: 30,
      opciones: 120,
      planes: 1,
    }
    for (const [tabla, esperado] of Object.entries(esperados)) {
      const [rows] = await conn.query(`SELECT COUNT(*) AS n FROM ${tabla}`)
      assert.equal(rows[0].n, esperado, `${tabla}: ${rows[0].n} != ${esperado}`)
    }
  } finally {
    await conn.end()
  }
})
