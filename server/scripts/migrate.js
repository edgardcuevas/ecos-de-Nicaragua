import { readdir, readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { dbConfig } from '../src/config.js'

const migrationsDir = new URL('../db/migrations/', import.meta.url)

async function main() {
  const { database, ...connectionConfig } = dbConfig
  const connection = await mysql.createConnection({
    ...connectionConfig,
    multipleStatements: true,
  })

  try {
    await connection.query(
      'CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      [database],
    )
    await connection.changeUser({ database })
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre VARCHAR(255) NOT NULL,
        aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    const [aplicadas] = await connection.query('SELECT nombre FROM schema_migrations')
    const yaAplicadas = new Set(aplicadas.map((fila) => fila.nombre))
    const archivos = (await readdir(migrationsDir))
      .filter((archivo) => archivo.endsWith('.sql'))
      .sort()

    for (const archivo of archivos) {
      if (yaAplicadas.has(archivo)) continue

      const sql = await readFile(new URL(archivo, migrationsDir), 'utf8')
      await connection.query(sql)
      await connection.query('INSERT INTO schema_migrations (nombre) VALUES (?)', [archivo])
      console.log(`Migración aplicada: ${archivo}`)
    }

    if (archivos.every((archivo) => yaAplicadas.has(archivo))) {
      console.log('Base de datos al día.')
    }
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error('Error al migrar:', error.message || error.code || error)
  process.exit(1)
})
