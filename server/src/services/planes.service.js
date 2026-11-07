import { query } from '../db.js'
import { AppError } from '../utils/errors.js'

export function serializarPlan(fila) {
  if (!fila) return null
  return {
    id: fila.id,
    nombre: fila.nombre,
    duracionDias: fila.duracion_dias,
    activo: Boolean(fila.activo),
  }
}

export async function listarActivos() {
  const filas = await query(
    `SELECT id, nombre, duracion_dias, activo
     FROM planes
     WHERE activo = 1
     ORDER BY duracion_dias ASC, id ASC`,
  )
  return filas.map(serializarPlan)
}

export async function obtenerPorId(planId) {
  const filas = await query(
    'SELECT id, nombre, duracion_dias, activo FROM planes WHERE id = ? LIMIT 1',
    [planId],
  )
  return filas[0] || null
}

export async function obtenerActivoPorId(planId) {
  const plan = await obtenerPorId(planId)
  if (!plan) {
    throw new AppError('PLAN_NO_ENCONTRADO', 'Plan no encontrado', 404)
  }
  if (!plan.activo) {
    throw new AppError('PLAN_INACTIVO', 'El plan no está activo', 409)
  }
  return plan
}
