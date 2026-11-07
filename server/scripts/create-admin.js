import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import { closePool, query } from '../src/db.js'
import { hashPassword } from '../src/utils/passwords.js'

const args = process.argv.slice(2)

function valorArg(nombre) {
  const indice = args.indexOf(nombre)
  return indice >= 0 ? args[indice + 1] : undefined
}

function validar({ correo, usuario, password }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new Error('El correo no tiene un formato válido')
  }
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(usuario)) {
    throw new Error('El usuario debe tener 3-50 caracteres: letras, números, punto, guion o guion bajo')
  }
  if (password.length < 10 || password.length > 128) {
    throw new Error('La contraseña debe tener entre 10 y 128 caracteres')
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('La contraseña debe incluir al menos una letra y un número')
  }
}

// Lee la contraseña sin mostrarla en pantalla. Solo funciona con terminal
// interactiva; en CI se debe pasar --password.
function preguntarPassword(prompt) {
  if (!input.isTTY) {
    return Promise.reject(
      new Error('No hay terminal interactiva para pedir la contraseña; usa --password solo en CI'),
    )
  }

  return new Promise((resolve, reject) => {
    let valor = ''

    function terminar(error) {
      input.setRawMode(false)
      input.pause()
      input.removeListener('data', alEscribir)
      output.write('\n')
      if (error) reject(error)
      else resolve(valor)
    }

    function alEscribir(chunk) {
      for (const caracter of chunk) {
        if (caracter === '\u0003') {
          terminar(new Error('Cancelado por el usuario'))
          return
        }
        if (caracter === '\r' || caracter === '\n') {
          terminar()
          return
        }
        if (caracter === '\u007f' || caracter === '\b') {
          if (valor.length > 0) {
            valor = valor.slice(0, -1)
            output.write('\b \b')
          }
          continue
        }
        if (caracter >= ' ') {
          valor += caracter
          output.write('*')
        }
      }
    }

    output.write(prompt)
    input.setRawMode(true)
    input.setEncoding('utf8')
    input.resume()
    input.on('data', alEscribir)
  })
}

async function main() {
  const rl = createInterface({ input, output })
  let rlCerrado = false

  try {
    const correo = (valorArg('--correo') || (await rl.question('Correo del administrador: ')))
      .trim()
      .toLowerCase()
    const usuario = (valorArg('--usuario') || (await rl.question('Nombre de usuario: '))).trim()

    let password = valorArg('--password')
    if (!password) {
      rl.close()
      rlCerrado = true
      password = await preguntarPassword('Contraseña: ')
    }

    validar({ correo, usuario, password })

    const filas = await query(
      `SELECT id, correo, nombre_usuario
       FROM usuarios
       WHERE correo = ? OR nombre_usuario = ?
       LIMIT 1`,
      [correo, usuario],
    )

    const existente = filas[0]
    const passwordHash = await hashPassword(password)

    if (existente) {
      await query(
        `UPDATE usuarios
         SET rol = 'admin', password_hash = ?, sesion_version = sesion_version + 1
         WHERE id = ?`,
        [passwordHash, existente.id],
      )
      console.log(`Administrador promovido: ${existente.nombre_usuario} <${existente.correo}>`)
      return
    }

    const resultado = await query(
      `INSERT INTO usuarios (correo, nombre_usuario, password_hash, rol, estado_suscripcion)
       VALUES (?, ?, ?, 'admin', 'gratis')`,
      [correo, usuario, passwordHash],
    )
    console.log(`Administrador creado: ${usuario} <${correo}> (id ${resultado.insertId})`)
  } finally {
    if (!rlCerrado) rl.close()
  }
}

main()
  .catch((error) => {
    console.error('Error:', error.message)
    process.exitCode = 1
  })
  .finally(() => closePool())
