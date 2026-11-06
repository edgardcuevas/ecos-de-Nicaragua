import { Router } from 'express'
import { Errores } from '../utils/errors.js'

const router = Router()
router.use((_req, _res, next) => next(Errores.noImplementado('Categorias no implementadas aun')))

export default router
