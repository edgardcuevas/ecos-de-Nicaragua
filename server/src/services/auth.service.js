import { transaction } from '../db.js'
import { resetTokenMinutos, sessionConfig } from '../config.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { construirEnlaceRecuperacion, enviarCorreo } from '../utils/mailer.js'
import {
  hashPassword,
  obtenerHashFicticio,
  verificarPassword,
} from '../utils/passwords.js'
import { generarToken, generarTokenCsrf, hmacToken } from '../utils/tokens.js'
import * as usuariosService from './usuarios.service.js'

const TTL_MS = sessionConfig.ttlHoras * 60 * 60 * 1000

export function expiraSesion() {
  return new Date(Date.now() + TTL_MS)
}

function regenerarSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()))
  })
}

export function guardarSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()))
  })
}

export async function registrar({ correo, nombreUsuario, password }) {
  const correoNormalizado = correo.trim().toLowerCase()
  const nombreNormalizado = nombreUsuario.trim()

  const existe = await usuariosService.existeCuenta(correoNormalizado, nombreNormalizado)
  if (existe) {
    throw new AppError('CUENTA_DUPLICADA', 'Ya existe una cuenta con esos datos', 409)
  }

  const passwordHash = await hashPassword(password)

  try {
    return await usuariosService.crear({
      correo: correoNormalizado,
      nombreUsuario: nombreNormalizado,
      passwordHash,
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError('CUENTA_DUPLICADA', 'Ya existe una cuenta con esos datos', 409)
    }
    throw error
  }
}

export async function autenticar({ correoOUsuario, password }) {
  const usuario = await usuariosService.buscarPorCorreoOUsuario(correoOUsuario.trim())

  if (!usuario) {
    await verificarPassword(await obtenerHashFicticio(), password)
    throw new AppError(
      'CREDENCIALES_INVALIDAS',
      'Correo, usuario o contraseña incorrectos',
      401,
    )
  }

  const valida = await verificarPassword(usuario.password_hash, password)
  if (!valida) {
    throw new AppError(
      'CREDENCIALES_INVALIDAS',
      'Correo, usuario o contraseña incorrectos',
      401,
    )
  }

  return usuario
}

export async function iniciarSesion(req, usuario) {
  await regenerarSesion(req)

  req.session.usuarioId = usuario.id
  req.session.sesionVersion = Number(usuario.sesion_version)
  req.session.csrfToken = generarTokenCsrf()

  await guardarSesion(req)

  return {
    csrfToken: req.session.csrfToken,
    expiraEn: expiraSesion().toISOString(),
  }
}

export function destruirSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()))
  })
}

export async function solicitarRecuperacion(correo) {
  const usuario = await usuariosService.buscarPorCorreo(correo.trim().toLowerCase())
  if (!usuario) return

  const token = generarToken(32)
  const tokenHash = hmacToken(token)

  await transaction(async (conexion) => {
    await conexion.execute(
      `UPDATE recuperacion_password SET usado_en = NOW()
       WHERE usuario_id = ? AND usado_en IS NULL`,
      [usuario.id],
    )
    await conexion.execute(
      `INSERT INTO recuperacion_password (usuario_id, token_hash, expira_en)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [usuario.id, tokenHash, resetTokenMinutos],
    )
  })

  const enlace = construirEnlaceRecuperacion(token)
  const texto = [
    'Recibimos una solicitud para restablecer tu contraseña en Ecos de Nicaragua.',
    '',
    `Abre este enlace para crear una nueva contraseña: ${enlace}`,
    '',
    `El enlace vence en ${resetTokenMinutos} minutos y solo puede usarse una vez.`,
    'Si no solicitaste este cambio, puedes ignorar este correo.',
  ].join('\n')

  try {
    await enviarCorreo({
      to: usuario.correo,
      subject: 'Restablecer contraseña — Ecos de Nicaragua',
      text: texto,
      html: `<p>Recibimos una solicitud para restablecer tu contraseña en Ecos de Nicaragua.</p>
<p><a href="${enlace}">Crear una nueva contraseña</a></p>
<p>El enlace vence en ${resetTokenMinutos} minutos y solo puede usarse una vez.</p>
<p>Si no solicitaste este cambio, puedes ignorar este correo.</p>`,
    })
  } catch (error) {
    logger.error({ err: error }, 'No se pudo enviar el correo de recuperación')
  }
}

export async function restablecer(token, password) {
  const tokenHash = hmacToken(token)
  const passwordHash = await hashPassword(password)

  await transaction(async (conexion) => {
    const [filas] = await conexion.execute(
      `SELECT id, usuario_id
       FROM recuperacion_password
       WHERE token_hash = ? AND usado_en IS NULL AND expira_en > NOW()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash],
    )

    const fila = filas[0]
    if (!fila) {
      throw new AppError('TOKEN_INVALIDO', 'El enlace no es válido o ha vencido', 400)
    }

    await conexion.execute(
      `UPDATE usuarios
       SET password_hash = ?, sesion_version = sesion_version + 1
       WHERE id = ?`,
      [passwordHash, fila.usuario_id],
    )
    await conexion.execute(
      'UPDATE recuperacion_password SET usado_en = NOW() WHERE id = ?',
      [fila.id],
    )
    await conexion.execute(
      `UPDATE recuperacion_password SET usado_en = NOW()
       WHERE usuario_id = ? AND usado_en IS NULL`,
      [fila.usuario_id],
    )
  })
}
