import { config } from 'dotenv'

config({ path: new URL('../../.env', import.meta.url), quiet: true })

import app from './app.js'

const port = Number(process.env.PORT) || 3000

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`)
})
