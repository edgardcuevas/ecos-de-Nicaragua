import { query } from '../db.js'

export async function listar() {
  const filas = await query(
    `SELECT c.slug, c.nombre, COUNT(l.id) AS totalLeyendas
     FROM categorias c
     LEFT JOIN leyendas l ON l.categoria_id = c.id
     GROUP BY c.id, c.slug, c.nombre
     ORDER BY c.nombre`,
  )

  return filas.map((fila) => ({
    slug: fila.slug,
    nombre: fila.nombre,
    totalLeyendas: Number(fila.totalLeyendas),
  }))
}
