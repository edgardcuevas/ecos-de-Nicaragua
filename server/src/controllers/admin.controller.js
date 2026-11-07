import { creado, ok, sinContenido } from '../utils/http.js'
import * as adminService from '../services/admin.service.js'
import * as auditoriaService from '../services/auditoria.service.js'

function contextoAuditoria(req) {
  return {
    adminId: req.usuario.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }
}

function resumenSuscripcion(suscripcion) {
  if (!suscripcion) return null
  return {
    planId: suscripcion.plan?.id ?? null,
    plan: suscripcion.plan?.nombre ?? null,
    fechaInicio: suscripcion.fechaInicio,
    fechaFin: suscripcion.fechaFin,
  }
}

export async function listarUsuarios(req, res) {
  const { data, meta } = await adminService.listarUsuarios(req.query)
  return ok(res, data, meta)
}

export async function obtenerUsuario(req, res) {
  const usuario = await adminService.obtenerDetalle(req.params.id)
  return ok(res, usuario)
}

export async function cambiarRol(req, res) {
  const resultado = await adminService.cambiarRol(
    req.usuario.id,
    req.params.id,
    req.body.rol,
  )

  await auditoriaService.registrar({
    ...contextoAuditoria(req),
    accion: 'USUARIO_ROL_ACTUALIZADO',
    entidad: 'usuarios',
    entidadId: resultado.id,
    datos: {
      antes: { rol: resultado.rolAnterior },
      despues: { rol: resultado.rol },
    },
  })

  const usuario = await adminService.obtenerUsuarioAdmin(resultado.id)
  return ok(res, usuario)
}

export async function activarSuscripcion(req, res) {
  const { suscripcion, anterior } = await adminService.activarSuscripcion(
    req.params.id,
    req.body,
  )

  await auditoriaService.registrar({
    ...contextoAuditoria(req),
    accion: 'SUSCRIPCION_ACTIVADA',
    entidad: 'usuarios',
    entidadId: req.params.id,
    datos: {
      antes: resumenSuscripcion(anterior),
      despues: resumenSuscripcion(suscripcion),
    },
  })

  return creado(res, suscripcion)
}

export async function quitarSuscripcion(req, res) {
  const { anterior } = await adminService.quitarSuscripcion(req.params.id)

  await auditoriaService.registrar({
    ...contextoAuditoria(req),
    accion: 'SUSCRIPCION_CANCELADA',
    entidad: 'usuarios',
    entidadId: req.params.id,
    datos: {
      antes: resumenSuscripcion(anterior),
      despues: null,
    },
  })

  return sinContenido(res)
}

export async function listarSuscripciones(req, res) {
  const suscripciones = await adminService.listarSuscripciones(req.params.id)
  return ok(res, suscripciones)
}

export async function crearCodigos(req, res) {
  const resultado = await adminService.generarCodigos(req.body)

  await auditoriaService.registrar({
    ...contextoAuditoria(req),
    accion: 'CODIGOS_GENERADOS',
    entidad: 'codigos_activacion',
    entidadId: null,
    datos: {
      planId: resultado.planId,
      cantidad: resultado.codigos.length,
    },
  })

  return creado(res, {
    ...resultado,
    fechaVencimiento: new Date(resultado.fechaVencimiento).toISOString(),
  })
}

export async function listarCodigos(req, res) {
  const { data, total } = await adminService.listarCodigos(req.query)
  const meta = adminService.metaPaginacion(total, req.query.page, req.query.limit)
  return ok(res, data, meta)
}

export async function listarAuditoria(req, res) {
  const { data, meta } = await auditoriaService.listar(req.query)
  return ok(res, data, meta)
}
