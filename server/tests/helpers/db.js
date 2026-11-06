export function ensureTestDb() {
  const name = process.env.DB_NAME || ''
  if (!name.endsWith('_test')) {
    throw new Error('La suite requiere DB_NAME terminando en _test')
  }
}