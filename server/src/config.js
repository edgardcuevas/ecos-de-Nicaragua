import { config } from 'dotenv'

config({ path: new URL('../../.env', import.meta.url), quiet: true })

export const port = Number(process.env.PORT) || 3000

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecos_nicaragua',
  charset: 'utf8mb4',
}
