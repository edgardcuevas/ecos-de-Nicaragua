import mysql from 'mysql2/promise'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

config({ path: new URL('../../.env', import.meta.url), quiet: true })

const serverDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = process.argv.slice(2)
const force = args.includes('--force')
const skipMedia = args.includes('--skip-media')

const dbName = process.env.DB_NAME || 'ecos_nicaragua'
const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  console.error('reset-db no esta permitido en produccion')
  process.exit(1)
}

const seguro = dbName.endsWith('_dev') || dbName.endsWith('_test')
if (!seguro && !force) {
  console.error(`La base "${dbName}" no termina en _dev o _test. Usa --force para confirmar.`)
  process.exit(1)
}

async function main() {
  const { database, ...connCfg } = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  }

  const conn = await mysql.createConnection({ ...connCfg, multipleStatements: true })
  try {
    await conn.query(`DROP DATABASE IF EXISTS ??`, [database])
    await conn.query(`CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, [database])
    console.log(`Base recreada: ${database}`)
  } finally {
    await conn.end()
  }

  function runScript(nombre) {
    const result = spawnSync(process.execPath, [resolve(serverDir, 'scripts', nombre)], {
      cwd: serverDir,
      stdio: 'inherit',
      env: process.env,
    })
    if (result.status !== 0) throw new Error(`Fallo ${nombre}`)
  }

  runScript('migrate.js')
  runScript('seed.js')
  if (!skipMedia) {
    try { runScript('media-import.js') } catch (e) { console.warn('Media import fallo:', e.message) }
  }

  console.log('reset-db completado')
}

main().catch((error) => {
  console.error('Error en reset-db:', error.message || error.code || error)
  process.exit(1)
})
