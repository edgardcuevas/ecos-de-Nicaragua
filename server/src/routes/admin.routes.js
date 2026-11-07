import { Router } from 'express'

import { validate } from '../middleware/validate.js'
import { requiereRol } from '../middleware/auth.js'
import {
  crearCodigosBodySchema,
  idParamSchema,
  listarAuditoriaQuerySchema,
  listarCodigosQuerySchema,
  listarUsuariosQuerySchema,
  rolBodySchema,
  suscripcionBodySchema,
} from '../schemas/admin.schema.js'
import * as adminController from '../controllers/admin.controller.js'

const router = Router()

router.use(requiereRol('admin'))

router.get(
  '/usuarios',
  validate({ query: listarUsuariosQuerySchema }),
  adminController.listarUsuarios,
)

router.get(
  '/usuarios/:id/suscripciones',
  validate({ params: idParamSchema }),
  adminController.listarSuscripciones,
)

router.patch(
  '/usuarios/:id/rol',
  validate({ params: idParamSchema, body: rolBodySchema }),
  adminController.cambiarRol,
)

router.post(
  '/usuarios/:id/suscripcion',
  validate({ params: idParamSchema, body: suscripcionBodySchema }),
  adminController.activarSuscripcion,
)

router.delete(
  '/usuarios/:id/suscripcion',
  validate({ params: idParamSchema }),
  adminController.quitarSuscripcion,
)

router.get(
  '/usuarios/:id',
  validate({ params: idParamSchema }),
  adminController.obtenerUsuario,
)

router.post(
  '/codigos',
  validate({ body: crearCodigosBodySchema }),
  adminController.crearCodigos,
)

router.get(
  '/codigos',
  validate({ query: listarCodigosQuerySchema }),
  adminController.listarCodigos,
)

router.get(
  '/auditoria',
  validate({ query: listarAuditoriaQuerySchema }),
  adminController.listarAuditoria,
)

export default router
