import { query } from '../../src/db.js'
import { hoyCalendario, reemplazarVigente, sumarDias } from '../../src/services/suscripciones.service.js'

export async function planActivo() {
  const filas = await query(
    'SELECT id, nombre, duracion_dias FROM planes WHERE activo = 1 ORDER BY id ASC LIMIT 1',
  )
  if (!filas || !filas[0]) throw new Error('el seed debe tener al menos un plan activo')
  return filas[0]
}

export async function concederPremium(usuarioId, dias = 10) {
  const plan = await planActivo()
  const hoy = hoyCalendario()
  await reemplazarVigente(usuarioId, {
    planId: plan.id,
    fechaInicio: hoy,
    fechaFin: sumarDias(hoy, dias - 1),
  })
  return plan
}

export async function revocarPremium(usuarioId) {
  await query("UPDATE suscripciones SET estado = 'cancelada' WHERE usuario_id = ? AND estado = 'activa'", [usuarioId])
  await query("UPDATE usuarios SET estado_suscripcion = 'gratis' WHERE id = ?", [usuarioId])
}

export { hoyCalendario, sumarDias }