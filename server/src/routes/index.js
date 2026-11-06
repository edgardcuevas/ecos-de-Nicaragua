import { Router } from 'express'

import healthRoutes from './health.routes.js'
import leyendasRoutes from './leyendas.routes.js'
import categoriasRoutes from './categorias.routes.js'
import regionesRoutes from './regiones.routes.js'
import triviaRoutes from './trivia.routes.js'
import mediaRoutes from './media.routes.js'
import authRoutes from './auth.routes.js'
import premiumRoutes from './premium.routes.js'
import adminRoutes from './admin.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/leyendas', leyendasRoutes)
router.use('/categorias', categoriasRoutes)
router.use('/regiones', regionesRoutes)
router.use('/trivia', triviaRoutes)
router.use('/media', mediaRoutes)
router.use('/auth', authRoutes)
router.use('/premium', premiumRoutes)
router.use('/admin', adminRoutes)

export default router
