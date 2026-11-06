import app from './app.js'
import { port, nodeEnv } from './config.js'
import { logger } from './utils/logger.js'
import { closePool } from './db.js'

const server = app.listen(port, () => {
  logger.info({ port, nodeEnv }, 'API escuchando')
})

function apagar() {
  logger.info('Cerrando servidor...')
  server.close(() => {
    closePool().finally(() => process.exit(0))
  })
}

process.on('SIGINT', apagar)
process.on('SIGTERM', apagar)

export default app
