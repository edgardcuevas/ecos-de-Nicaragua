import { query } from '../db.js'
import { AppError } from '../utils/errors.js'

function urlImagen(id) {
  return `/api/media/imagenes/${id}`
}

function urlAudio(id) {
  return `/api/media/audios/${id}`
}

function escaparLike(texto) {
  return texto.replace(/[!%_]/g, (caracter) => `!${caracter}`)
}

function serializarImagenPrincipal(imagen) {
  return {
    id: imagen.id,
    url: urlImagen(imagen.id),
    textoAlternativo: imagen.texto_alternativo,
    licencia: imagen.licencia,
  }
}

function serializarImagenDetalle(imagen) {
  return {
    id: imagen.id,
    url: urlImagen(imagen.id),
    textoAlternativo: imagen.texto_alternativo,
    licencia: imagen.licencia,
    esPrincipal: Boolean(imagen.es_principal),
    esPremium: Boolean(imagen.es_premium),
  }
}

function serializarAudio(audio) {
  return {
    id: audio.id,
    titulo: audio.titulo,
    url: urlAudio(audio.id),
    duracionSegundos:
      audio.duracion_segundos === null || audio.duracion_segundos === undefined
        ? null
        : Number(audio.duracion_segundos),
    licencia: audio.licencia,
    esPremium: Boolean(audio.es_premium),
  }
}

function serializarBloqueo(fila) {
  return {
    versiones: Number(fila?.versiones || 0),
    imagenes: Number(fila?.imagenes || 0),
    audios: Number(fila?.audios || 0),
    preguntas: Number(fila?.preguntas || 0),
  }
}

function agruparRegionesLista(filas) {
  const mapa = new Map()

  for (const fila of filas) {
    if (!mapa.has(fila.leyenda_id)) mapa.set(fila.leyenda_id, [])
    const lista = mapa.get(fila.leyenda_id)
    if (lista.some((region) => region.codigo === fila.codigo)) continue
    lista.push({
      codigo: fila.codigo,
      nombre: fila.nombre,
      nivelVerificacion: fila.nivel_verificacion,
    })
  }

  return mapa
}

function agruparRegionesDetalle(filas) {
  const regiones = []
  const indice = new Map()

  for (const fila of filas) {
    let region = indice.get(fila.codigo)
    if (!region) {
      region = {
        codigo: fila.codigo,
        nombre: fila.nombre,
        tipo: fila.tipo,
        nivelVerificacion: fila.nivel_verificacion,
        nota: fila.nota,
        fuentes: [],
      }
      indice.set(fila.codigo, region)
      regiones.push(region)
    }
    region.fuentes.push({
      id: fila.fuente_id,
      titulo: fila.fuente_titulo,
      autor: fila.fuente_autor,
      tipo: fila.fuente_tipo,
      url: fila.fuente_url,
    })
  }

  return regiones
}

export function serializarResumen(fila, _premium = false) {
  return {
    id: fila.id,
    slug: fila.slug,
    titulo: fila.titulo,
    resumen: fila.resumen,
    categoria: fila.categoria,
    alcance: fila.alcance,
    imagenPrincipal: fila.imagenPrincipal,
    regiones: fila.regiones,
    contenidoBloqueado: fila.contenidoBloqueado,
  }
}

export function serializarDetalle(fila, _premium = false) {
  return {
    id: fila.id,
    slug: fila.slug,
    titulo: fila.titulo,
    resumen: fila.resumen,
    historia: fila.historia,
    origen: fila.origen,
    formatoContenido: fila.formatoContenido,
    categoria: fila.categoria,
    alcance: fila.alcance,
    regiones: fila.regiones,
    versiones: fila.versiones,
    imagenes: fila.imagenes,
    audios: fila.audios,
    fuentes: fila.fuentes,
    contenidoBloqueado: fila.contenidoBloqueado,
  }
}

export async function listar({
  region,
  categoria,
  q,
  alcance,
  page = 1,
  limit = 20,
  orden = 'titulo',
  premium = false,
} = {}) {
  const condiciones = []
  const parametros = []

  if (region) {
    condiciones.push(`EXISTS (
      SELECT 1 FROM leyenda_regiones lr
      JOIN regiones r ON r.id = lr.region_id
      WHERE lr.leyenda_id = l.id AND r.codigo = ?
    )`)
    parametros.push(region)
  }

  if (categoria) {
    condiciones.push('c.slug = ?')
    parametros.push(categoria)
  }

  if (alcance) {
    condiciones.push('l.alcance = ?')
    parametros.push(alcance)
  }

  if (q) {
    condiciones.push("(l.titulo LIKE ? ESCAPE '!' OR l.resumen LIKE ? ESCAPE '!')")
    const patron = `%${escaparLike(q)}%`
    parametros.push(patron, patron)
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''

  const conteo = await query(
    `SELECT COUNT(*) AS total
     FROM leyendas l
     LEFT JOIN categorias c ON c.id = l.categoria_id
     ${where}`,
    parametros,
  )
  const total = Number(conteo[0]?.total || 0)

  const ordenSql = orden === 'reciente' ? 'l.creada_en DESC, l.id DESC' : 'l.titulo ASC, l.id ASC'
  const offset = (page - 1) * limit

  const filas = await query(
    `SELECT l.id, l.slug, l.titulo, l.resumen, l.alcance,
            c.slug AS categoria_slug, c.nombre AS categoria_nombre
     FROM leyendas l
     LEFT JOIN categorias c ON c.id = l.categoria_id
     ${where}
     ORDER BY ${ordenSql}
     LIMIT ? OFFSET ?`,
    [...parametros, limit, offset],
  )

  if (filas.length === 0) {
    return { items: [], total }
  }

  const ids = filas.map((fila) => fila.id)
  const marcadores = ids.map(() => '?').join(', ')

  const [regionesFilas, imagenesFilas, bloqueoFilas] = await Promise.all([
    query(
      `SELECT lr.leyenda_id, r.codigo, r.nombre, lr.nivel_verificacion
       FROM leyenda_regiones lr
       JOIN regiones r ON r.id = lr.region_id
       WHERE lr.leyenda_id IN (${marcadores})
       ORDER BY r.nombre, lr.id`,
      ids,
    ),
    query(
      `SELECT id, leyenda_id, texto_alternativo, licencia
       FROM imagenes
       WHERE leyenda_id IN (${marcadores}) AND es_principal = 1
       ORDER BY id`,
      ids,
    ),
    query(
      `SELECT l.id,
              (SELECT COUNT(*) FROM leyenda_versiones v WHERE v.leyenda_id = l.id AND v.es_premium = 1) AS versiones,
              (SELECT COUNT(*) FROM imagenes i WHERE i.leyenda_id = l.id AND i.es_premium = 1) AS imagenes,
              (SELECT COUNT(*) FROM audios a WHERE a.leyenda_id = l.id AND a.es_premium = 1) AS audios,
              (SELECT COUNT(*) FROM preguntas p WHERE p.leyenda_id = l.id AND p.es_premium = 1) AS preguntas
       FROM leyendas l
       WHERE l.id IN (${marcadores})`,
      ids,
    ),
  ])

  const regionesPorLeyenda = agruparRegionesLista(regionesFilas)
  const imagenPorLeyenda = new Map(imagenesFilas.map((imagen) => [imagen.leyenda_id, imagen]))
  const bloqueoPorLeyenda = new Map(bloqueoFilas.map((fila) => [fila.id, fila]))

  const items = filas.map((fila) =>
    serializarResumen(
      {
        ...fila,
        categoria: fila.categoria_slug
          ? { slug: fila.categoria_slug, nombre: fila.categoria_nombre }
          : null,
        imagenPrincipal: imagenPorLeyenda.has(fila.id)
          ? serializarImagenPrincipal(imagenPorLeyenda.get(fila.id))
          : null,
        regiones: regionesPorLeyenda.get(fila.id) || [],
        contenidoBloqueado: serializarBloqueo(bloqueoPorLeyenda.get(fila.id)),
      },
      premium,
    ),
  )

  return { items, total }
}

export async function obtenerPorSlug(slug, premium = false) {
  const filas = await query(
    `SELECT l.id, l.slug, l.titulo, l.resumen, l.historia, l.origen, l.alcance,
            c.slug AS categoria_slug, c.nombre AS categoria_nombre
     FROM leyendas l
     LEFT JOIN categorias c ON c.id = l.categoria_id
     WHERE l.slug = ?
     LIMIT 1`,
    [slug],
  )

  const leyenda = filas[0]
  if (!leyenda) {
    throw new AppError('LEYENDA_NO_ENCONTRADA', 'Leyenda no encontrada', 404)
  }

  const imagenesSql = premium
    ? `SELECT id, texto_alternativo, licencia, es_principal, es_premium
       FROM imagenes
       WHERE leyenda_id = ?
       ORDER BY es_principal DESC, id`
    : `SELECT id, texto_alternativo, licencia, es_principal, es_premium
       FROM imagenes
       WHERE leyenda_id = ? AND es_principal = 1
       ORDER BY id`

  const [regionesFilas, versionesFilas, imagenesFilas, audiosFilas, fuentesFilas, bloqueoFilas] =
    await Promise.all([
      query(
        `SELECT r.codigo, r.nombre, r.tipo, lr.nivel_verificacion, lr.nota,
                f.id AS fuente_id, f.titulo AS fuente_titulo, f.autor AS fuente_autor,
                f.tipo AS fuente_tipo, f.url AS fuente_url
         FROM leyenda_regiones lr
         JOIN regiones r ON r.id = lr.region_id
         JOIN fuentes f ON f.id = lr.fuente_id
         WHERE lr.leyenda_id = ?
         ORDER BY r.nombre, f.id`,
        [leyenda.id],
      ),
      query(
        `SELECT v.id, v.titulo, v.contenido, v.es_premium, v.orden,
                f.id AS fuente_id, f.titulo AS fuente_titulo
         FROM leyenda_versiones v
         LEFT JOIN fuentes f ON f.id = v.fuente_id
         WHERE v.leyenda_id = ? AND (v.es_premium = 0 OR ? = 1)
         ORDER BY v.orden, v.id`,
        [leyenda.id, premium ? 1 : 0],
      ),
      query(imagenesSql, [leyenda.id]),
      premium
        ? query(
            `SELECT id, titulo, duracion_segundos, licencia, es_premium
             FROM audios
             WHERE leyenda_id = ?
             ORDER BY id`,
            [leyenda.id],
          )
        : Promise.resolve([]),
      query(
        `SELECT f.id, f.titulo, f.autor, f.tipo, f.referencia, f.url, f.licencia
         FROM fuentes f
         WHERE f.id IN (
           SELECT fuente_id FROM leyenda_regiones WHERE leyenda_id = ?
           UNION
           SELECT fuente_id FROM leyenda_versiones WHERE leyenda_id = ? AND fuente_id IS NOT NULL
         )
         ORDER BY f.id`,
        [leyenda.id, leyenda.id],
      ),
      query(
        `SELECT
           (SELECT COUNT(*) FROM leyenda_versiones v WHERE v.leyenda_id = ? AND v.es_premium = 1) AS versiones,
           (SELECT COUNT(*) FROM imagenes i WHERE i.leyenda_id = ? AND i.es_premium = 1) AS imagenes,
           (SELECT COUNT(*) FROM audios a WHERE a.leyenda_id = ? AND a.es_premium = 1) AS audios,
           (SELECT COUNT(*) FROM preguntas p WHERE p.leyenda_id = ? AND p.es_premium = 1) AS preguntas`,
        [leyenda.id, leyenda.id, leyenda.id, leyenda.id],
      ),
    ])

  return serializarDetalle(
    {
      id: leyenda.id,
      slug: leyenda.slug,
      titulo: leyenda.titulo,
      resumen: leyenda.resumen,
      historia: leyenda.historia,
      origen: leyenda.origen,
      formatoContenido: 'markdown',
      categoria: leyenda.categoria_slug
        ? { slug: leyenda.categoria_slug, nombre: leyenda.categoria_nombre }
        : null,
      alcance: leyenda.alcance,
      regiones: agruparRegionesDetalle(regionesFilas),
      versiones: versionesFilas.map((version) => ({
        id: version.id,
        titulo: version.titulo,
        contenido: version.contenido,
        esPremium: Boolean(version.es_premium),
        orden: version.orden,
        fuente: version.fuente_id
          ? { id: version.fuente_id, titulo: version.fuente_titulo }
          : null,
      })),
      imagenes: imagenesFilas.map(serializarImagenDetalle),
      audios: audiosFilas.map(serializarAudio),
      fuentes: fuentesFilas.map((fuente) => ({
        id: fuente.id,
        titulo: fuente.titulo,
        autor: fuente.autor,
        tipo: fuente.tipo,
        referencia: fuente.referencia,
        url: fuente.url,
        licencia: fuente.licencia,
      })),
      contenidoBloqueado: serializarBloqueo(bloqueoFilas[0]),
    },
    premium,
  )
}
