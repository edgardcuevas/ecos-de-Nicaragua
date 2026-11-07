import { query } from '../db.js'
import { AppError } from '../utils/errors.js'

function serializarFuente(fila, premium) {
  if (!premium) {
    return { titulo: fila.fuente_titulo, tipo: fila.fuente_tipo }
  }
  return {
    titulo: fila.fuente_titulo,
    tipo: fila.fuente_tipo,
    referencia: fila.fuente_referencia,
    url: fila.fuente_url,
    licencia: fila.fuente_licencia,
  }
}

function agruparPorRegion(filas) {
  const mapa = new Map()

  for (const fila of filas) {
    if (!mapa.has(fila.region_id)) mapa.set(fila.region_id, new Map())
    const leyendas = mapa.get(fila.region_id)

    if (!leyendas.has(fila.slug)) {
      leyendas.set(fila.slug, {
        slug: fila.slug,
        titulo: fila.titulo,
        nivelVerificacion: fila.nivel_verificacion,
        nota: fila.nota,
        fuentes: [],
      })
    }

    leyendas.get(fila.slug).fuentes.push(fila)
  }

  return mapa
}

function serializarLeyendaRegion(leyenda, premium) {
  const salida = {
    slug: leyenda.slug,
    titulo: leyenda.titulo,
    nivelVerificacion: leyenda.nivelVerificacion,
    fuentes: leyenda.fuentes.map((fuente) => serializarFuente(fuente, premium)),
  }
  if (premium) salida.nota = leyenda.nota
  return salida
}

export function serializarRegion(fila, premium = false) {
  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    tipo: fila.tipo,
    totalLeyendas: fila.leyendas.length,
    leyendas: fila.leyendas.map((leyenda) => serializarLeyendaRegion(leyenda, premium)),
  }
}

export async function listar({ premium = false, incluirNacionales = true, incluirRegionales = true } = {}) {
  const [regionesFilas, vinculos] = await Promise.all([
    query('SELECT id, codigo, nombre, tipo FROM regiones ORDER BY nombre'),
    query(
      `SELECT lr.region_id, l.slug, l.titulo, lr.nivel_verificacion, lr.nota,
              f.titulo AS fuente_titulo, f.tipo AS fuente_tipo,
              f.referencia AS fuente_referencia, f.url AS fuente_url,
              f.licencia AS fuente_licencia
       FROM leyenda_regiones lr
       JOIN leyendas l ON l.id = lr.leyenda_id
       JOIN fuentes f ON f.id = lr.fuente_id
       ORDER BY l.titulo, f.id`,
    ),
  ])

  const porRegion = agruparPorRegion(vinculos)

  const regiones = regionesFilas.map((region) => {
    const leyendas = porRegion.get(region.id)
    return serializarRegion(
      {
        id: region.id,
        codigo: region.codigo,
        nombre: region.nombre,
        tipo: region.tipo,
        leyendas: leyendas ? [...leyendas.values()] : [],
      },
      premium,
    )
  })

  const nacionales = incluirNacionales
    ? (
        await query(
          `SELECT slug, titulo, alcance FROM leyendas WHERE alcance = 'nacional' ORDER BY titulo`,
        )
      ).map((leyenda) => ({
        slug: leyenda.slug,
        titulo: leyenda.titulo,
        alcance: leyenda.alcance,
      }))
    : []

  const regionales = incluirRegionales
    ? (
        await query(
          `SELECT l.slug, l.titulo, l.alcance
           FROM leyendas l
           WHERE l.alcance = 'regional'
             AND NOT EXISTS (
               SELECT 1 FROM leyenda_regiones lr WHERE lr.leyenda_id = l.id
             )
           ORDER BY l.titulo`,
        )
      ).map((leyenda) => ({
        slug: leyenda.slug,
        titulo: leyenda.titulo,
        alcance: leyenda.alcance,
      }))
    : []

  return {
    regiones,
    nacionales,
    regionales,
    meta: {
      total: regiones.length,
      nacionales: nacionales.length,
      regionales: regionales.length,
    },
  }
}

export async function obtenerPorCodigo(codigo, premium = false) {
  const regiones = await query(
    'SELECT id, codigo, nombre, tipo FROM regiones WHERE codigo = ? LIMIT 1',
    [codigo],
  )
  const region = regiones[0]

  if (!region) {
    throw new AppError('REGION_NO_ENCONTRADA', 'Región no encontrada', 404)
  }

  const filas = await query(
    `SELECT l.slug, l.titulo, lr.nivel_verificacion, lr.nota,
            f.titulo AS fuente_titulo, f.tipo AS fuente_tipo,
            f.referencia AS fuente_referencia, f.url AS fuente_url,
            f.licencia AS fuente_licencia
     FROM leyenda_regiones lr
     JOIN leyendas l ON l.id = lr.leyenda_id
     JOIN fuentes f ON f.id = lr.fuente_id
     WHERE lr.region_id = ?
     ORDER BY l.titulo, f.id`,
    [region.id],
  )

  const leyendas = []
  const indice = new Map()

  for (const fila of filas) {
    if (!indice.has(fila.slug)) {
      const leyenda = {
        slug: fila.slug,
        titulo: fila.titulo,
        nivelVerificacion: fila.nivel_verificacion,
        nota: fila.nota,
        fuentes: [],
      }
      indice.set(fila.slug, leyenda)
      leyendas.push(leyenda)
    }
    indice.get(fila.slug).fuentes.push(fila)
  }

  return {
    id: region.id,
    codigo: region.codigo,
    nombre: region.nombre,
    tipo: region.tipo,
    leyendas: leyendas.map((leyenda) => serializarLeyendaRegion(leyenda, premium)),
  }
}
