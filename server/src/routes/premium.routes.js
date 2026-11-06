import { Router } from 'express'
import { Errores } from '../utils/errors.js'

const router = Router()
router.use((_req, _res, next) => next(Errores.noImplementado('Premium no implementado aun')))

export default router
