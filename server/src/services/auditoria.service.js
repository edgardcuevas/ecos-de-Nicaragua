import { query } from '../db.js'

function aISO(valor) {
  if (!valor) return null
  if (valor instanceof Date) return valor.toISOString()
  return String(valor)
}

function parsearDatos(valor) {
  if (valor == null) return null
  if (typeof valor !== 'string') return valor
  try {
    return JSON.parse(valor)
  } catch {
    return null
  }
}

function recortar(valor, maximo) {
  if (valor == null) return null
  return String(valor).slice(0, maximo)
}

export async function registrar({
  adminId,
  accion,
  entidad,
  entidadId = null,
  datos = null,
  ip = null,
  userAgent = null,
}) {
  await query(
    `INSERT INTO auditoria_admin
       (admin_id, accion, entidad, entidad_id, datos, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      adminId,
      accion,
      entidad,
      entidadId,
      datos == null ? null : JSON.stringify(datos),
      recortar(ip, 45),
      recortar(userAgent, 300),
    ],
  )
}

export async function listar({ accion, adminId, page = 1, limit = 20 }) {
  const condiciones = []
  const parametros = []

  if (accion) {
    condiciones.push('accion = ?')
    parametros.push(accion)
  }
  if (adminId) {
    condiciones.push('admin_id = ?')
    parametros.push(adminId)
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const totalFilas = await query(
    `SELECT COUNT(*) AS total FROM auditoria_admin ${where}`,
    parametros,
  )

  const offset = (page - 1) * limit
  const filas = await query(
    `SELECT id, admin_id, accion, entidad, entidad_id, datos, creada_en
     FROM auditoria_admin
     ${where}
     ORDER BY creada_en DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...parametros, limit, offset],
  )

  const total = Number(totalFilas[0]?.total || 0)

  return {
    data: filas.map((fila) => ({
      id: fila.id,
      adminId: fila.admin_id,
      accion: fila.accion,
      entidad: fila.entidad,
      entidadId: fila.entidad_id,
      datos: parsearDatos(fila.datos),
      creadaEn: aISO(fila.creada_en),
    })),
    meta: {
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
    },
  }
}
