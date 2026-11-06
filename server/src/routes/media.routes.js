import { Router } from 'express'
import * as mediaController from '../controllers/media.controller.js'

const router = Router()

router.get('/imagenes/:id', mediaController.obtenerImagen)
router.get('/audios/:id', mediaController.obtenerAudio)

export default router