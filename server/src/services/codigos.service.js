import { query, transaction } from '../db.js'
import { AppError } from '../utils/errors.js'
import {
  esFormatoCodigoValido,
  generarCodigoActivacion,
  hashCodigoActivacion,
  normalizarCodigo,
} from '../utils/tokens.js'
import * as planesService from './planes.service.js'
import * as suscripcionesService from './suscripciones.service.js'

function codigoInvalido() {
  return new AppError('CODIGO_INVALIDO', 'El código no es válido, ya fue usado o está vencido', 400)
}

function aDatetimeMySQL(valor) {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) {
    throw new AppError('VALIDACION', 'La fecha de vencimiento no es válida', 400)
  }
  return fecha.toISOString().slice(0, 19).replace('T', ' ')
}

function aISO(valor) {
  if (!valor) return null
  if (valor instanceof Date) return valor.toISOString()
  return String(valor)
}

export async function generarCodigos({ planId, cantidad, fechaVencimiento }) {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
    throw new AppError('VALIDACION', 'La cantidad debe ser un entero entre 1 y 100', 400)
  }

  await planesService.obtenerActivoPorId(planId)
  const fechaMySQL = aDatetimeMySQL(fechaVencimiento)
  if (new Date(fechaVencimiento).getTime() <= Date.now()) {
    throw new AppError('VALIDACION', 'La fecha de vencimiento debe ser futura', 400)
  }

  const codigos = []

  await transaction(async (conexion) => {
    for (let i = 0; i < cantidad; i += 1) {
      const codigo = generarCodigoActivacion()
      await conexion.execute(
        `INSERT INTO codigos_activacion (codigo_hash, plan_id, fecha_vencimiento)
         VALUES (?, ?, ?)`,
        [hashCodigoActivacion(codigo), planId, fechaMySQL],
      )
      codigos.push(codigo)
    }
  })

  return { planId, fechaVencimiento, codigos }
}

export async function canjearCodigo(usuarioId, codigoIngresado) {
  const codigoNormalizado = normalizarCodigo(codigoIngresado)
  if (!esFormatoCodigoValido(codigoNormalizado)) {
    throw codigoInvalido()
  }

  const hash = hashCodigoActivacion(codigoNormalizado)

  const suscripcion = await transaction(async (conexion) => {
    const [codigos] = await conexion.execute(
      `SELECT c.id, c.plan_id, c.usado_por_usuario_id,
              (c.fecha_vencimiento > NOW()) AS vigente,
              p.nombre AS plan_nombre, p.duracion_dias, p.activo AS plan_activo
       FROM codigos_activacion c
       JOIN planes p ON p.id = c.plan_id
       WHERE c.codigo_hash = ?
       LIMIT 1
       FOR UPDATE`,
      [hash],
    )

    const codigo = codigos[0]
    if (
      !codigo ||
      codigo.usado_por_usuario_id ||
      !Number(codigo.vigente) ||
      !codigo.plan_activo
    ) {
      throw codigoInvalido()
    }

    const [usuarios] = await conexion.execute(
      'SELECT id FROM usuarios WHERE id = ? FOR UPDATE',
      [usuarioId],
    )
    if (!usuarios[0]) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404)
    }

    await conexion.execute(
      `UPDATE suscripciones SET estado = 'vencida'
       WHERE usuario_id = ? AND estado = 'activa' AND fecha_fin < CURDATE()`,
      [usuarioId],
    )

    const finActual = await suscripcionesService.buscarVigenteParaCanje(conexion, usuarioId)
    const inicio = finActual
      ? suscripcionesService.sumarDias(finActual, 1)
      : suscripcionesService.hoyCalendario()
    const fin = suscripcionesService.sumarDias(inicio, Number(codigo.duracion_dias) - 1)

    const suscripcionId = await suscripcionesService.crearSuscripcionDesdeCanje(
      conexion,
      usuarioId,
      { id: codigo.plan_id },
      inicio,
      fin,
    )

    const [uso] = await conexion.execute(
      `UPDATE codigos_activacion
       SET usado_por_usuario_id = ?, usado_en = NOW()
       WHERE id = ? AND usado_por_usuario_id IS NULL`,
      [usuarioId, codigo.id],
    )
    if (uso.affectedRows !== 1) {
      throw codigoInvalido()
    }

    return {
      id: suscripcionId,
      plan: {
        id: codigo.plan_id,
        nombre: codigo.plan_nombre,
        duracionDias: codigo.duracion_dias,
      },
      fechaInicio: inicio,
      fechaFin: fin,
      estado: 'activa',
      diasRestantes: suscripcionesService.diasHasta(fin),
    }
  })

  return { accesoPremium: true, suscripcion }
}

export async function listar({ usado, planId, page = 1, limit = 20 }) {
  const condiciones = []
  const parametros = []

  if (typeof usado === 'boolean') {
    condiciones.push(usado ? 'c.usado_por_usuario_id IS NOT NULL' : 'c.usado_por_usuario_id IS NULL')
  }
  if (planId) {
    condiciones.push('c.plan_id = ?')
    parametros.push(planId)
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''

  const totalFilas = await query(
    `SELECT COUNT(*) AS total FROM codigos_activacion c ${where}`,
    parametros,
  )

  const offset = (page - 1) * limit
  const filas = await query(
    `SELECT c.id, c.plan_id, p.nombre AS plan_nombre, c.fecha_vencimiento,
            c.usado_por_usuario_id, u.nombre_usuario AS usado_por_nombre,
            c.usado_en, c.creado_en
     FROM codigos_activacion c
     LEFT JOIN planes p ON p.id = c.plan_id
     LEFT JOIN usuarios u ON u.id = c.usado_por_usuario_id
     ${where}
     ORDER BY c.creado_en DESC, c.id DESC
     LIMIT ? OFFSET ?`,
    [...parametros, limit, offset],
  )

  return {
    data: filas.map((fila) => ({
      id: fila.id,
      plan: { id: fila.plan_id, nombre: fila.plan_nombre },
      fechaVencimiento: aISO(fila.fecha_vencimiento),
      usadoPor: fila.usado_por_usuario_id
        ? { id: fila.usado_por_usuario_id, nombreUsuario: fila.usado_por_nombre }
        : null,
      usadoEn: aISO(fila.usado_en),
      creadoEn: aISO(fila.creado_en),
    })),
    total: Number(totalFilas[0]?.total || 0),
  }
}
