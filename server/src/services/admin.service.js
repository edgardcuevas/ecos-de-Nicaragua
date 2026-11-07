import { query, transaction } from '../db.js'
import { AppError } from '../utils/errors.js'
import * as usuariosService from './usuarios.service.js'
import * as suscripcionesService from './suscripciones.service.js'
import * as codigosService from './codigos.service.js'

const SELECT_USUARIO_ADMIN = `
  SELECT u.id, u.correo, u.nombre_usuario, u.rol, u.estado_suscripcion,
         u.fecha_registro,
         (SELECT p.nombre
            FROM suscripciones s
            JOIN planes p ON p.id = s.plan_id
           WHERE s.usuario_id = u.id
             AND s.estado = 'activa'
             AND s.fecha_inicio <= CURDATE()
             AND s.fecha_fin >= CURDATE()
           ORDER BY s.fecha_fin DESC, s.id DESC
           LIMIT 1) AS plan_nombre,
         (SELECT s.fecha_fin
            FROM suscripciones s
           WHERE s.usuario_id = u.id
             AND s.estado = 'activa'
             AND s.fecha_inicio <= CURDATE()
             AND s.fecha_fin >= CURDATE()
           ORDER BY s.fecha_fin DESC, s.id DESC
           LIMIT 1) AS fecha_fin_actual
  FROM usuarios u`

function aISO(valor) {
  if (!valor) return null
  if (valor instanceof Date) return valor.toISOString()
  return String(valor)
}

function aFechaCalendario(valor) {
  if (!valor) return null
  if (typeof valor === 'string') return valor.slice(0, 10)
  const anio = valor.getFullYear()
  const mes = String(valor.getMonth() + 1).padStart(2, '0')
  const dia = String(valor.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function patronLike(texto) {
  return `%${texto.replace(/[!%_]/g, '!$&')}%`
}

function serializarUsuarioAdmin(fila) {
  const suscripcionActual = fila.plan_nombre
    ? { plan: fila.plan_nombre, fechaFin: aFechaCalendario(fila.fecha_fin_actual) }
    : null

  return {
    id: fila.id,
    correo: fila.correo,
    nombreUsuario: fila.nombre_usuario,
    rol: fila.rol,
    estadoSuscripcion: suscripcionActual ? 'premium' : 'gratis',
    fechaRegistro: aISO(fila.fecha_registro),
    suscripcionActual,
  }
}

export function metaPaginacion(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPaginas: Math.ceil(total / limit),
  }
}

export async function listarUsuarios({ q, rol, premium, page = 1, limit = 20 }) {
  const condiciones = []
  const parametros = []

  if (q) {
    const patron = patronLike(q)
    condiciones.push("(u.correo LIKE ? ESCAPE '!' OR u.nombre_usuario LIKE ? ESCAPE '!')")
    parametros.push(patron, patron)
  }

  if (rol) {
    condiciones.push('u.rol = ?')
    parametros.push(rol)
  }

  if (premium === true) {
    condiciones.push(`EXISTS (
      SELECT 1 FROM suscripciones s
       WHERE s.usuario_id = u.id
         AND s.estado = 'activa'
         AND s.fecha_inicio <= CURDATE()
         AND s.fecha_fin >= CURDATE()
    )`)
  } else if (premium === false) {
    condiciones.push(`NOT EXISTS (
      SELECT 1 FROM suscripciones s
       WHERE s.usuario_id = u.id
         AND s.estado = 'activa'
         AND s.fecha_inicio <= CURDATE()
         AND s.fecha_fin >= CURDATE()
    )`)
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''

  const totalFilas = await query(
    `SELECT COUNT(*) AS total FROM usuarios u ${where}`,
    parametros,
  )

  const offset = (page - 1) * limit
  const filas = await query(
    `${SELECT_USUARIO_ADMIN}
     ${where}
     ORDER BY u.fecha_registro DESC, u.id DESC
     LIMIT ? OFFSET ?`,
    [...parametros, limit, offset],
  )

  const total = Number(totalFilas[0]?.total || 0)

  return {
    data: filas.map(serializarUsuarioAdmin),
    meta: metaPaginacion(total, page, limit),
  }
}

export async function obtenerUsuarioAdmin(usuarioId) {
  const filas = await query(
    `${SELECT_USUARIO_ADMIN} WHERE u.id = ? LIMIT 1`,
    [usuarioId],
  )
  const fila = filas[0]
  if (!fila) {
    throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404)
  }
  return serializarUsuarioAdmin(fila)
}

export async function obtenerDetalle(usuarioId) {
  const usuario = await obtenerUsuarioAdmin(usuarioId)
  const suscripciones = await suscripcionesService.listarPorUsuario(usuarioId)
  return { ...usuario, suscripciones }
}

export async function cambiarRol(adminId, usuarioId, nuevoRol) {
  return transaction(async (conexion) => {
    const [filas] = await conexion.execute(
      `SELECT id, correo, nombre_usuario, rol, estado_suscripcion, fecha_registro
         FROM usuarios
        WHERE id = ?
        LIMIT 1
        FOR UPDATE`,
      [usuarioId],
    )

    const usuario = filas[0]
    if (!usuario) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404)
    }

    if (Number(usuario.id) === Number(adminId)) {
      throw new AppError('AUTO_ROL', 'No puedes cambiar tu propio rol', 409)
    }

    if (usuario.rol === 'admin' && nuevoRol !== 'admin') {
      const [admins] = await conexion.execute(
        "SELECT id FROM usuarios WHERE rol = 'admin' FOR UPDATE",
      )
      if (admins.length <= 1) {
        throw new AppError(
          'ULTIMO_ADMIN',
          'No se puede quitar el último administrador',
          409,
        )
      }
    }

    await conexion.execute('UPDATE usuarios SET rol = ? WHERE id = ?', [
      nuevoRol,
      usuarioId,
    ])

    return { id: usuario.id, rolAnterior: usuario.rol, rol: nuevoRol }
  })
}

export async function activarSuscripcion(usuarioId, datos) {
  const usuario = await usuariosService.buscarPorId(usuarioId)
  if (!usuario) {
    throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404)
  }

  const anterior = await suscripcionesService.buscarVigente(usuarioId)
  const suscripcion = await suscripcionesService.reemplazarVigente(usuarioId, datos)
  return { suscripcion, anterior }
}

export async function quitarSuscripcion(usuarioId) {
  const usuario = await usuariosService.buscarPorId(usuarioId)
  if (!usuario) {
    throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404)
  }

  const anterior = await suscripcionesService.buscarVigente(usuarioId)
  await suscripcionesService.cancelarVigentes(usuarioId)
  return { anterior }
}

export async function listarSuscripciones(usuarioId) {
  const usuario = await usuariosService.buscarPorId(usuarioId)
  if (!usuario) {
    throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404)
  }
  return suscripcionesService.listarPorUsuario(usuarioId)
}

export async function generarCodigos(datos) {
  return codigosService.generarCodigos(datos)
}

export async function listarCodigos(filtros) {
  return codigosService.listar(filtros)
}
