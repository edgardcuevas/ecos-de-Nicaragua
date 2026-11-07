import { Router } from 'express'

import { listarCategorias } from '../controllers/leyendas.controller.js'

const router = Router()

router.get('/', listarCategorias)

export default router
