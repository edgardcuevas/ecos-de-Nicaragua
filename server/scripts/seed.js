import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { dbConfig } from '../src/config.js'

async function main() {
  const regiones = JSON.parse(
    await readFile(new URL('../db/seed/regiones.json', import.meta.url), 'utf8'),
  )
  const connection = await mysql.createConnection(dbConfig)

  try {
    const valores = regiones.map(({ codigo, nombre, tipo }) => [codigo, nombre, tipo])

    await connection.query(
      `INSERT INTO regiones (codigo, nombre, tipo) VALUES ?
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), tipo = VALUES(tipo)`,
      [valores],
    )

    console.log(`Regiones cargadas: ${regiones.length}`)
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error('Error al cargar el seed:', error.message || error.code || error)
  process.exit(1)
})
