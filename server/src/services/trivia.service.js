import * as dbModule from '../db.js'

const pool = (dbModule && (dbModule.pool || dbModule.default)) || null

async function q(sql, params = []) {
  if (!pool) throw new Error('DB_NO_DISPONIBLE')
  const [rows] = await pool.execute(sql, params)
  return rows
}

export async function listar({ premium = false } = {}) {
  // Lista las 6 leyendas que tienen trivia, con conteos.
  const rows = await q(
    `SELECT l.slug, l.titulo,
            (SELECT COUNT(*) FROM preguntas p WHERE p.leyenda_id = l.id AND p.es_premium = 0) AS totalGratis,
            (SELECT COUNT(*) FROM preguntas p WHERE p.leyenda_id = l.id AND p.es_premium = 1) AS totalPremium
     FROM leyendas l
     WHERE EXISTS (SELECT 1 FROM preguntas p WHERE p.leyenda_id = l.id)
     ORDER BY l.titulo`,
  )
  return rows.map((r) => ({
    slug: r.slug,
    titulo: r.titulo,
    totalGratis: Number(r.totalGratis),
    totalPremium: Number(r.totalPremium),
    totalDisponible: premium ? Number(r.totalGratis) + Number(r.totalPremium) : Number(r.totalGratis),
    bloqueado: !premium && Number(r.totalPremium) > 0,
  }))
}

export async function obtenerPorLeyenda(slug, premium = false) {
  const leyendas = await q('SELECT id, slug, titulo FROM leyendas WHERE slug = ?', [slug])
  if (leyendas.length === 0) {
    const err = new Error('TRIVIA_NO_DISPONIBLE')
    err.codigo = 'TRIVIA_NO_DISPONIBLE'
    err.status = 404
    throw err
  }
  const leyenda = leyendas[0]
  const preguntas = await q(
    `SELECT id, enunciado, es_premium, orden
     FROM preguntas
     WHERE leyenda_id = ? AND (es_premium = 0 OR ? = 1)
     ORDER BY orden`,
    [leyenda.id, premium ? 1 : 0],
  )
  if (preguntas.length === 0) {
    const err = new Error('TRIVIA_NO_DISPONIBLE')
    err.codigo = 'TRIVIA_NO_DISPONIBLE'
    err.status = 404
    throw err
  }
  const preguntaIds = preguntas.map((p) => p.id)
  const opciones = preguntaIds.length
    ? await q(
        `SELECT id, pregunta_id, texto, orden
         FROM opciones
         WHERE pregunta_id IN (${preguntaIds.map(() => '?').join(',')})
         ORDER BY pregunta_id, orden`,
        preguntaIds,
      )
    : []

  const totalGratis = await q(
    'SELECT COUNT(*) AS c FROM preguntas WHERE leyenda_id = ? AND es_premium = 0',
    [leyenda.id],
  )
  const totalPremium = await q(
    'SELECT COUNT(*) AS c FROM preguntas WHERE leyenda_id = ? AND es_premium = 1',
    [leyenda.id],
  )

  return {
    slug: leyenda.slug,
    titulo: leyenda.titulo,
    preguntas: preguntas.map((p) => ({
      id: p.id,
      orden: p.orden,
      enunciado: p.enunciado,
      esPremium: Boolean(p.es_premium),
      opciones: opciones
        .filter((o) => o.pregunta_id === p.id)
        .map((o) => ({ id: o.id, orden: o.orden, texto: o.texto })),
    })),
    totalGratis: Number(totalGratis[0].c),
    totalPremium: Number(totalPremium[0].c),
    totalDisponible: premium
      ? Number(totalGratis[0].c) + Number(totalPremium[0].c)
      : Number(totalGratis[0].c),
  }
}

export async function calcularPuntaje(slug, respuestas, premium = false) {
  const leyendas = await q('SELECT id, slug, titulo FROM leyendas WHERE slug = ?', [slug])
  if (leyendas.length === 0) {
    const err = new Error('TRIVIA_NO_DISPONIBLE')
    err.codigo = 'TRIVIA_NO_DISPONIBLE'
    err.status = 404
    throw err
  }
  const leyenda = leyendas[0]

  // Todas las preguntas de la leyenda (para validar pertenencia y premium)
  const todasPreguntas = await q(
    'SELECT id, es_premium, explicacion, orden FROM preguntas WHERE leyenda_id = ?',
    [leyenda.id],
  )
  if (todasPreguntas.length === 0) {
    const err = new Error('TRIVIA_NO_DISPONIBLE')
    err.codigo = 'TRIVIA_NO_DISPONIBLE'
    err.status = 404
    throw err
  }

  const accesibles = premium ? todasPreguntas : todasPreguntas.filter((p) => !p.es_premium)
  const accesiblesIds = new Set(accesibles.map((p) => p.id))

  // Validar cantidad exacta (una por pregunta accesible)
  if (respuestas.length !== accesibles.length) {
    const err = new Error('RESPUESTAS_INCOMPLETAS')
    err.codigo = 'RESPUESTAS_INCOMPLETAS'
    err.status = 400
    throw err
  }

  // Duplicados
  const ids = respuestas.map((r) => r.preguntaId)
  if (new Set(ids).size !== ids.length) {
    const err = new Error('RESPUESTA_DUPLICADA')
    err.codigo = 'RESPUESTA_DUPLICADA'
    err.status = 400
    throw err
  }

  const preguntaIds = accesibles.map((p) => p.id)
  const opcionesDb = preguntaIds.length
    ? await q(
        `SELECT id, pregunta_id, es_correcta FROM opciones WHERE pregunta_id IN (${preguntaIds.map(() => '?').join(',')})`,
        preguntaIds,
      )
    : []
  const opcionPorId = new Map(opcionesDb.map((o) => [o.id, o]))

  const explicacionPorPregunta = new Map(todasPreguntas.map((p) => [p.id, p.explicacion]))

  const detalle = []
  let puntaje = 0

  for (const r of respuestas) {
    const preguntaInfo = todasPreguntas.find((p) => p.id === r.preguntaId)

    if (!preguntaInfo) {
      // no pertenece a esta leyenda
      const err = new Error('OPCION_INVALIDA')
      err.codigo = 'OPCION_INVALIDA'
      err.status = 400
      throw err
    }
    // verificar pertenencia a leyenda
    const pertenece = await q('SELECT 1 FROM preguntas WHERE id = ? AND leyenda_id = ?', [r.preguntaId, leyenda.id])
    if (pertenece.length === 0) {
      const err = new Error('OPCION_INVALIDA')
      err.codigo = 'OPCION_INVALIDA'
      err.status = 400
      throw err
    }

    if (preguntaInfo.es_premium && !premium) {
      const err = new Error('PREGUNTA_PREMIUM')
      err.codigo = 'PREGUNTA_PREMIUM'
      err.status = 403
      throw err
    }

    if (!accesiblesIds.has(r.preguntaId)) {
      const err = new Error('OPCION_INVALIDA')
      err.codigo = 'OPCION_INVALIDA'
      err.status = 400
      throw err
    }

    const opcion = opcionPorId.get(r.opcionId)
    if (!opcion || opcion.pregunta_id !== r.preguntaId) {
      const err = new Error('OPCION_INVALIDA')
      err.codigo = 'OPCION_INVALIDA'
      err.status = 400
      throw err
    }

    const correcta = Boolean(opcion.es_correcta)
    if (correcta) puntaje += 1

    const correctaOpcion = opcionesDb.find((o) => o.pregunta_id === r.preguntaId && o.es_correcta)
    detalle.push({
      preguntaId: r.preguntaId,
      opcionId: r.opcionId,
      correcta,
      opcionCorrectaId: correctaOpcion ? correctaOpcion.id : null,
      explicacion: explicacionPorPregunta.get(r.preguntaId) || '',
    })
  }

  return { puntaje, total: respuestas.length, detalle }
}