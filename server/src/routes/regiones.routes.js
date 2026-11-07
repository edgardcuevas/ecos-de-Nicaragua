import { Router } from 'express'

import * as regionesController from '../controllers/regiones.controller.js'
import { validate } from '../middleware/validate.js'
import { codigoParamSchema, listQuerySchema } from '../schemas/regiones.schema.js'

const router = Router()

router.get('/', validate({ query: listQuerySchema }), regionesController.listarRegiones)
router.get('/:codigo', validate({ params: codigoParamSchema }), regionesController.obtenerRegion)

export default router
