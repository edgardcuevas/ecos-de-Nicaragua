import mysql from 'mysql2/promise'
import { dbConfig } from './config.js'

export const pool = mysql.createPool(dbConfig)

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

export async function transaction(callback) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function ping() {
  const connection = await pool.getConnection()
  try {
    await connection.ping()
    return true
  } finally {
    connection.release()
  }
}

export async function closePool() {
  await pool.end()
}
