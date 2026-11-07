import { Router } from 'express'

import * as leyendasController from '../controllers/leyendas.controller.js'
import { validate } from '../middleware/validate.js'
import { listQuerySchema, slugParamSchema } from '../schemas/leyendas.schema.js'

const router = Router()

router.get('/', validate({ query: listQuerySchema }), leyendasController.listarLeyendas)
router.get('/:slug', validate({ params: slugParamSchema }), leyendasController.obtenerLeyenda)

export default router
