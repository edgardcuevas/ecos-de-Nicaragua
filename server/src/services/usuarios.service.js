import { query } from '../db.js'

const CAMPOS_USUARIO = `id, correo, nombre_usuario, password_hash, rol,
  estado_suscripcion, sesion_version, fecha_registro`

export async function buscarPorId(id) {
  const filas = await query(
    `SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE id = ? LIMIT 1`,
    [id],
  )
  return filas[0] || null
}

export async function buscarPorCorreo(correo) {
  const filas = await query(
    `SELECT ${CAMPOS_USUARIO} FROM usuarios WHERE correo = ? LIMIT 1`,
    [correo],
  )
  return filas[0] || null
}

export async function buscarPorCorreoOUsuario(identificador) {
  const filas = await query(
    `SELECT ${CAMPOS_USUARIO}
     FROM usuarios
     WHERE correo = ? OR nombre_usuario = ?
     LIMIT 1`,
    [identificador, identificador],
  )
  return filas[0] || null
}

export async function existeCuenta(correo, nombreUsuario) {
  const filas = await query(
    `SELECT id FROM usuarios WHERE correo = ? OR nombre_usuario = ? LIMIT 1`,
    [correo, nombreUsuario],
  )
  return Boolean(filas[0])
}

export async function crear({ correo, nombreUsuario, passwordHash }) {
  const resultado = await query(
    `INSERT INTO usuarios (correo, nombre_usuario, password_hash, rol, estado_suscripcion)
     VALUES (?, ?, ?, 'gratis', 'gratis')`,
    [correo, nombreUsuario, passwordHash],
  )
  return buscarPorId(resultado.insertId)
}

export async function actualizarPasswordYVersion(usuarioId, passwordHash) {
  await query(
    `UPDATE usuarios
     SET password_hash = ?, sesion_version = sesion_version + 1
     WHERE id = ?`,
    [passwordHash, usuarioId],
  )
}

export async function actualizarRol(usuarioId, rol) {
  await query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, usuarioId])
  return buscarPorId(usuarioId)
}

export async function contarPorRol(rol) {
  const filas = await query('SELECT COUNT(*) AS total FROM usuarios WHERE rol = ?', [rol])
  return Number(filas[0]?.total || 0)
}

export function serializarUsuario(fila) {
  if (!fila) return null

  const fecha = fila.fecha_registro
  return {
    id: fila.id,
    correo: fila.correo,
    nombreUsuario: fila.nombre_usuario,
    rol: fila.rol,
    estadoSuscripcion: fila.estado_suscripcion,
    fechaRegistro: fecha instanceof Date ? fecha.toISOString() : fecha,
  }
}
