import { readFile, writeFile, copyFile, access } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import mysql from 'mysql2/promise'
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootEnv = new URL('../../.env', import.meta.url)
const exampleEnv = new URL('../../.env.example', import.meta.url)
const serverDir = resolve(fileURLToPath(new URL('..', import.meta.url)))

config({ path: rootEnv, quiet: true })

const args = process.argv.slice(2)
const yes = args.includes('--yes')
const skipMedia = args.includes('--skip-media')

function log(msg) { console.log(msg) }
function err(msg) { console.error(msg) }

async function existe(ruta) { try { await access(ruta); return true } catch { return false } }

async function leerEnvTexto() {
  try { return await readFile(rootEnv, 'utf8') } catch { return '' }
}

function setEnvVar(texto, clave, valor) {
  const lineas = texto.split(/\r?\n/)
  let encontrado = false
  const nuevas = lineas.map((linea) => {
    if (new RegExp(`^\\s*${clave}\\s*=`).test(linea)) {
      encontrado = true
      return `${clave}=${valor}`
    }
    return linea
  })
  if (!encontrado) nuevas.push(`${clave}=${valor}`)
  return nuevas.join('\n')
}

async function generarSecretos() {
  let texto = await leerEnvTexto()
  const secretos = ['SESSION_SECRET', 'TOKEN_PEPPER']
  for (const clave of secretos) {
    const actual = process.env[clave]
    if (!actual) {
      const valor = randomBytes(48).toString('hex')
      texto = setEnvVar(texto, clave, valor)
      process.env[clave] = valor
      log(`Generado ${clave}`)
    }
  }
  await writeFile(rootEnv, texto, 'utf8')
}

async function probarConexion(cfg) {
  const conn = await mysql.createConnection({
    host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password,
  })
  await conn.ping()
  await conn.end()
}

async function preguntarCredenciales() {
  const rl = createInterface({ input, output })
  const host = await rl.question(`DB_HOST [${process.env.DB_HOST || 'localhost'}]: `)
  const port = await rl.question(`DB_PORT [${process.env.DB_PORT || '3306'}]: `)
  const user = await rl.question(`DB_USER [${process.env.DB_USER || 'root'}]: `)
  const password = await rl.question('DB_PASSWORD: ')
  const name = await rl.question(`DB_NAME [${process.env.DB_NAME || 'ecos_nicaragua_dev'}]: `)
  rl.close()

  const cfg = {
    host: host.trim() || process.env.DB_HOST || 'localhost',
    port: Number(port.trim() || process.env.DB_PORT || 3306),
    user: user.trim() || process.env.DB_USER || 'root',
    password: password,
    name: name.trim() || process.env.DB_NAME || 'ecos_nicaragua_dev',
  }

  let texto = await leerEnvTexto()
  texto = setEnvVar(texto, 'DB_HOST', cfg.host)
  texto = setEnvVar(texto, 'DB_PORT', String(cfg.port))
  texto = setEnvVar(texto, 'DB_USER', cfg.user)
  texto = setEnvVar(texto, 'DB_PASSWORD', cfg.password.includes('#') ? `"${cfg.password}"` : cfg.password)
  texto = setEnvVar(texto, 'DB_NAME', cfg.name)
  await writeFile(rootEnv, texto, 'utf8')

  process.env.DB_HOST = cfg.host
  process.env.DB_PORT = String(cfg.port)
  process.env.DB_USER = cfg.user
  process.env.DB_PASSWORD = cfg.password
  process.env.DB_NAME = cfg.name
  return cfg
}

function runScript(nombre, envExtra = {}) {
  const result = spawnSync(process.execPath, [resolve(serverDir, 'scripts', nombre)], {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env, ...envExtra },
  })
  if (result.status !== 0) {
    throw new Error(`Fallo ${nombre} (codigo ${result.status})`)
  }
}

async function main() {
  // 1. .env
  if (!(await existe(rootEnv))) {
    await copyFile(exampleEnv, rootEnv)
    log('Creado .env desde .env.example')
  }

  // cargar de nuevo por si se creo
  config({ path: rootEnv, quiet: true })

  // 2. secretos
  await generarSecretos()

  // 3. probar conexion
  const cfg = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
  }
  try {
    await probarConexion(cfg)
    log('Conexion a MySQL correcta')
  } catch (error) {
    log(`No se pudo conectar a MySQL: ${error.message || error.code}`)
    if (yes) {
      err('Ejecuta sin --yes para corregir credenciales interactivamente')
      process.exit(1)
    }
    try {
      await preguntarCredenciales()
      await probarConexion({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      })
      log('Conexion a MySQL correcta')
    } catch (error2) {
      err(`Sigue sin conectar: ${error2.message || error2.code}`)
      process.exit(1)
    }
  }

  // 4. migraciones + seed
  try {
    runScript('migrate.js')
    runScript('seed.js')
  } catch (error) {
    err(error.message)
    process.exit(1)
  }

  // 5. media
  if (!skipMedia) {
    try {
      runScript('media-import.js')
    } catch (error) {
      err(`Media import fallo: ${error.message}`)
      // no salir; el contenido puede importarse luego
    }
  }

  log('')
  log('Setup completado.')
  log(`API: http://localhost:${process.env.PORT || 3000}`)
  log('Cliente: http://localhost:5173')
  log('Siguiente: npm run dev')
}

main().catch((error) => {
  err(error?.message || error)
  process.exit(1)
})
