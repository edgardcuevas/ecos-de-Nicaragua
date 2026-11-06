import { Router } from 'express'
import { ping } from '../db.js'
import { version } from '../config.js'
import { errorJson } from '../utils/http.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    await ping()
    return res.status(200).json({ status: 'ok', db: 'ok', version })
  } catch (error) {
    return res.status(503).json({ status: 'error', db: 'error' })
  }
})

export default router
