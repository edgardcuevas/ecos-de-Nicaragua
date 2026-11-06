import { Router } from 'express'
import * as triviaController from '../controllers/trivia.controller.js'

const router = Router()

router.get('/', triviaController.listarTrivias)
router.get('/:slug', triviaController.obtenerTrivia)
router.post('/:slug/responder', triviaController.responderTrivia)

export default router