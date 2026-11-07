import { query, transaction } from '../db.js'
import { AppError } from '../utils/errors.js'

const SELECT_SUSCRIPCION = `
  SELECT s.id, s.fecha_inicio, s.fecha_fin, s.estado,
         p.id AS plan_id, p.nombre AS plan_nombre, p.duracion_dias
  FROM suscripciones s
  LEFT JOIN planes p ON p.id = s.plan_id`

function aFechaCalendario(valor) {
  if (!valor) return null
  if (typeof valor === 'string') return valor.slice(0, 10)
  const anio = valor.getFullYear()
  const mes = String(valor.getMonth() + 1).padStart(2, '0')
  const dia = String(valor.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function aMilisegundosUTC(fechaCalendario) {
  const [anio, mes, dia] = fechaCalendario.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

export function hoyCalendario() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

export function sumarDias(fechaCalendario, dias) {
  const fecha = new Date(aMilisegundosUTC(fechaCalendario))
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

export function diasHasta(fechaCalendario) {
  if (!fechaCalendario) return null
  const fin = aFechaCalendario(fechaCalendario)
  const hoy = hoyCalendario()
  return Math.round((aMilisegundosUTC(fin) - aMilisegundosUTC(hoy)) / 86400000)
}

export function serializarSuscripcion(fila) {
  if (!fila) return null
  return {
    id: fila.id,
    plan:
      fila.plan_id == null
        ? null
        : {
            id: fila.plan_id,
            nombre: fila.plan_nombre,
            duracionDias: fila.duracion_dias,
          },
    fechaInicio: aFechaCalendario(fila.fecha_inicio),
    fechaFin: aFechaCalendario(fila.fecha_fin),
    estado: fila.estado,
    diasRestantes: diasHasta(fila.fecha_fin),
  }
}

export async function buscarVigente(usuarioId) {
  const filas = await query(
    `${SELECT_SUSCRIPCION}
     WHERE s.usuario_id = ?
       AND s.estado = 'activa'
       AND s.fecha_inicio <= CURDATE()
       AND s.fecha_fin >= CURDATE()
     ORDER BY s.fecha_fin DESC, s.id DESC
     LIMIT 1`,
    [usuarioId],
  )
  return filas[0] ? serializarSuscripcion(filas[0]) : null
}

async function reconciliarVencidas(usuarioId) {
  await query(
    `UPDATE suscripciones
     SET estado = 'vencida'
     WHERE usuario_id = ? AND estado = 'activa' AND fecha_fin < CURDATE()`,
    [usuarioId],
  )
}

async function actualizarCacheEstado(conexion, usuarioId) {
  const [filas] = await conexion.execute(
    `SELECT 1
     FROM suscripciones
     WHERE usuario_id = ?
       AND estado = 'activa'
       AND fecha_inicio <= CURDATE()
       AND fecha_fin >= CURDATE()
     LIMIT 1`,
    [usuarioId],
  )
  const estado = filas.length > 0 ? 'premium' : 'gratis'
  await conexion.execute(
    'UPDATE usuarios SET estado_suscripcion = ? WHERE id = ?',
    [estado, usuarioId],
  )
}

export async function obtenerVigente(usuarioId) {
  await reconciliarVencidas(usuarioId)
  const suscripcion = await buscarVigente(usuarioId)
  const estado = suscripcion ? 'premium' : 'gratis'
  await query(
    'UPDATE usuarios SET estado_suscripcion = ? WHERE id = ? AND estado_suscripcion <> ?',
    [estado, usuarioId, estado],
  )
  return suscripcion
}

export async function listarPorUsuario(usuarioId) {
  const filas = await query(
    `${SELECT_SUSCRIPCION}
     WHERE s.usuario_id = ?
     ORDER BY s.fecha_inicio DESC, s.id DESC`,
    [usuarioId],
  )
  return filas.map(serializarSuscripcion)
}

export async function reemplazarVigente(usuarioId, { planId, fechaInicio, fechaFin }) {
  return transaction(async (conexion) => {
    const [planes] = await conexion.execute(
      'SELECT id, nombre, duracion_dias, activo FROM planes WHERE id = ? LIMIT 1',
      [planId],
    )
    const plan = planes[0]
    if (!plan) {
      throw new AppError('PLAN_NO_ENCONTRADO', 'Plan no encontrado', 404)
    }
    if (!plan.activo) {
      throw new AppError('PLAN_INACTIVO', 'El plan no está activo', 409)
    }

    const inicio = fechaInicio || hoyCalendario()
    const fin = fechaFin || sumarDias(inicio, Number(plan.duracion_dias) - 1)
    if (fin < inicio) {
      throw new AppError('VALIDACION', 'La fecha de fin no puede ser anterior al inicio', 400)
    }

    await conexion.execute(
      `UPDATE suscripciones SET estado = 'cancelada'
       WHERE usuario_id = ? AND estado = 'activa'`,
      [usuarioId],
    )

    const [resultado] = await conexion.execute(
      `INSERT INTO suscripciones (usuario_id, plan_id, fecha_inicio, fecha_fin, estado)
       VALUES (?, ?, ?, ?, 'activa')`,
      [usuarioId, planId, inicio, fin],
    )

    await actualizarCacheEstado(conexion, usuarioId)

    return {
      id: resultado.insertId,
      usuarioId,
      plan: {
        id: plan.id,
        nombre: plan.nombre,
        duracionDias: plan.duracion_dias,
      },
      fechaInicio: inicio,
      fechaFin: fin,
      estado: 'activa',
    }
  })
}

export async function cancelarVigentes(usuarioId) {
  await transaction(async (conexion) => {
    await conexion.execute(
      `UPDATE suscripciones SET estado = 'cancelada'
       WHERE usuario_id = ? AND estado = 'activa' AND fecha_fin >= CURDATE()`,
      [usuarioId],
    )
    await conexion.execute(
      "UPDATE usuarios SET estado_suscripcion = 'gratis' WHERE id = ?",
      [usuarioId],
    )
  })
}

export async function buscarVigenteParaCanje(conexion, usuarioId) {
  const [filas] = await conexion.execute(
    `SELECT fecha_fin
     FROM suscripciones
     WHERE usuario_id = ?
       AND estado = 'activa'
       AND fecha_fin >= CURDATE()
     ORDER BY fecha_fin DESC
     LIMIT 1
     FOR UPDATE`,
    [usuarioId],
  )
  return filas[0] ? aFechaCalendario(filas[0].fecha_fin) : null
}

export async function crearSuscripcionDesdeCanje(conexion, usuarioId, plan, inicio, fin) {
  const [resultado] = await conexion.execute(
    `INSERT INTO suscripciones (usuario_id, plan_id, fecha_inicio, fecha_fin, estado)
     VALUES (?, ?, ?, ?, 'activa')`,
    [usuarioId, plan.id, inicio, fin],
  )
  await actualizarCacheEstado(conexion, usuarioId)
  return resultado.insertId
}

export { actualizarCacheEstado }
