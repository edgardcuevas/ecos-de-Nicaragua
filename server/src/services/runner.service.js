import { query, transaction } from '../db.js'
import { AppError } from '../utils/errors.js'
import {
  NIVELES,
  TOTAL_NIVELES,
  distanciaMaxima,
  obtenerNivel,
  puntajeEsperado,
  puntajeMaximo,
  vidasMaximas,
} from '../config/runner.js'

function serializarNivel(nivel) {
  return {
    id: nivel.id,
    nombre: nivel.nombre,
    descripcion: nivel.descripcion,
    duracionSegundos: nivel.duracion,
    cierreSegundos: nivel.cierre,
    lianasDesdeSegundos: nivel.lianasDesde,
    rampa: nivel.rampa,
    bonos: nivel.bonos,
    pesos: nivel.pesos,
  }
}

function serializarRecord(fila) {
  return {
    nivel: Number(fila.nivel),
    mejorPuntaje: Number(fila.mejor_puntaje),
    mejorDistancia: Number(fila.mejor_distancia),
    victorias: Number(fila.victorias),
    partidas: Number(fila.partidas),
  }
}

function serializarPartida(fila) {
  return {
    id: Number(fila.id),
    nivel: Number(fila.nivel),
    puntaje: Number(fila.puntaje),
    distancia: Number(fila.distancia),
    duracionSegundos: Number(fila.duracion_segundos),
    vidasRestantes: Number(fila.vidas_restantes),
    victoria: Boolean(fila.victoria),
    creadaEn: fila.creada_en instanceof Date ? fila.creada_en.toISOString() : String(fila.creada_en),
  }
}

export async function obtenerEstado(usuarioId) {
  const niveles = NIVELES.map((nivel) => ({
    ...serializarNivel(nivel),
    desbloqueado: nivel.id === 1,
    mejorPuntaje: 0,
    mejorDistancia: 0,
    victorias: 0,
    partidas: 0,
  }))

  if (!usuarioId) {
    return {
      autenticado: false,
      nivelMaxDesbloqueado: 1,
      totalNiveles: TOTAL_NIVELES,
      niveles,
    }
  }

  const [perfiles, records] = await Promise.all([
    query('SELECT nivel_max_desbloqueado FROM runner_perfiles WHERE usuario_id = ? LIMIT 1', [
      usuarioId,
    ]),
    query(
      `SELECT nivel, mejor_puntaje, mejor_distancia, victorias, partidas
       FROM runner_records
       WHERE usuario_id = ?`,
      [usuarioId],
    ),
  ])

  const nivelMax = perfiles[0]
    ? Math.min(TOTAL_NIVELES, Math.max(1, Number(perfiles[0].nivel_max_desbloqueado)))
    : 1
  const recordsPorNivel = new Map(records.map((fila) => [Number(fila.nivel), serializarRecord(fila)]))

  for (const nivel of niveles) {
    const record = recordsPorNivel.get(nivel.id)
    nivel.desbloqueado = nivel.id <= nivelMax
    if (record) {
      nivel.mejorPuntaje = record.mejorPuntaje
      nivel.mejorDistancia = record.mejorDistancia
      nivel.victorias = record.victorias
      nivel.partidas = record.partidas
    }
  }

  return {
    autenticado: true,
    nivelMaxDesbloqueado: nivelMax,
    totalNiveles: TOTAL_NIVELES,
    niveles,
  }
}

export function validarPartida(datos, nivel, premium) {
  const maxVidas = vidasMaximas(premium)

  if (datos.vidasRestantes > maxVidas) {
    throw new AppError(
      'PARTIDA_INVALIDA',
      'Las vidas restantes no pueden superar las vidas del plan',
      400,
    )
  }

  if (datos.duracionSegundos > nivel.duracion + 2) {
    throw new AppError('PARTIDA_INVALIDA', 'La duración supera la de la noche', 400)
  }

  if (datos.distancia > distanciaMaxima(nivel)) {
    throw new AppError('PARTIDA_INVALIDA', 'La distancia es imposible para esta noche', 400)
  }

  if (datos.puntaje > puntajeMaximo(nivel, premium)) {
    throw new AppError('PARTIDA_INVALIDA', 'El puntaje es imposible para esta noche', 400)
  }

  if (datos.victoria) {
    if (datos.vidasRestantes < 1) {
      throw new AppError('PARTIDA_INVALIDA', 'Una victoria exige al menos una vida restante', 400)
    }
    const esperado = puntajeEsperado(nivel, datos)
    if (datos.puntaje !== esperado) {
      throw new AppError(
        'PARTIDA_INVALIDA',
        'El puntaje no coincide con la distancia y los bonos de la noche',
        400,
      )
    }
    return
  }

  if (datos.vidasRestantes !== 0) {
    throw new AppError('PARTIDA_INVALIDA', 'Una derrota exige cero vidas restantes', 400)
  }

  if (datos.puntaje !== datos.distancia) {
    throw new AppError('PARTIDA_INVALIDA', 'En una derrota el puntaje debe ser la distancia', 400)
  }
}

export async function registrarPartida(usuarioId, datos, { premium = false } = {}) {
  const nivel = obtenerNivel(datos.nivel)
  if (!nivel) {
    throw new AppError('NIVEL_NO_ENCONTRADO', 'La noche solicitada no existe', 404)
  }

  validarPartida(datos, nivel, premium)

  return transaction(async (conexion) => {
    const [perfiles] = await conexion.execute(
      'SELECT nivel_max_desbloqueado FROM runner_perfiles WHERE usuario_id = ? FOR UPDATE',
      [usuarioId],
    )

    let nivelMax = perfiles[0] ? Number(perfiles[0].nivel_max_desbloqueado) : 1

    if (!perfiles[0]) {
      await conexion.execute(
        'INSERT INTO runner_perfiles (usuario_id, nivel_max_desbloqueado) VALUES (?, 1)',
        [usuarioId],
      )
    }

    if (datos.nivel > nivelMax) {
      throw new AppError('NIVEL_BLOQUEADO', 'La noche todavía no está desbloqueada', 403)
    }

    const [insertado] = await conexion.execute(
      `INSERT INTO runner_partidas
        (usuario_id, nivel, puntaje, distancia, duracion_segundos, vidas_restantes, victoria)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        datos.nivel,
        datos.puntaje,
        datos.distancia,
        datos.duracionSegundos,
        datos.vidasRestantes,
        datos.victoria ? 1 : 0,
      ],
    )

    const [records] = await conexion.execute(
      `SELECT mejor_puntaje, mejor_distancia, victorias, partidas
       FROM runner_records
       WHERE usuario_id = ? AND nivel = ?
       FOR UPDATE`,
      [usuarioId, datos.nivel],
    )

    const previo = records[0]
    const nuevoRecord = !previo || datos.puntaje > Number(previo.mejor_puntaje)

    if (previo) {
      await conexion.execute(
        `UPDATE runner_records
         SET mejor_puntaje = GREATEST(mejor_puntaje, ?),
             mejor_distancia = GREATEST(mejor_distancia, ?),
             victorias = victorias + ?,
             partidas = partidas + 1
         WHERE usuario_id = ? AND nivel = ?`,
        [
          datos.puntaje,
          datos.distancia,
          datos.victoria ? 1 : 0,
          usuarioId,
          datos.nivel,
        ],
      )
    } else {
      await conexion.execute(
        `INSERT INTO runner_records
          (usuario_id, nivel, mejor_puntaje, mejor_distancia, victorias, partidas)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          usuarioId,
          datos.nivel,
          datos.puntaje,
          datos.distancia,
          datos.victoria ? 1 : 0,
        ],
      )
    }

    let nivelDesbloqueado = null
    if (datos.victoria && datos.nivel === nivelMax && nivelMax < TOTAL_NIVELES) {
      nivelDesbloqueado = nivelMax + 1
      nivelMax = nivelDesbloqueado
      await conexion.execute(
        'UPDATE runner_perfiles SET nivel_max_desbloqueado = ? WHERE usuario_id = ?',
        [nivelMax, usuarioId],
      )
    }

    const [partidas] = await conexion.execute(
      `SELECT id, nivel, puntaje, distancia, duracion_segundos, vidas_restantes, victoria, creada_en
       FROM runner_partidas
       WHERE id = ?
       LIMIT 1`,
      [insertado.insertId],
    )

    const [recordActual] = await conexion.execute(
      `SELECT nivel, mejor_puntaje, mejor_distancia, victorias, partidas
       FROM runner_records
       WHERE usuario_id = ? AND nivel = ?
       LIMIT 1`,
      [usuarioId, datos.nivel],
    )

    return {
      partida: serializarPartida(partidas[0]),
      record: serializarRecord(recordActual[0]),
      nuevoRecord,
      nivelDesbloqueado,
      nivelMaxDesbloqueado: nivelMax,
    }
  })
}

export async function listarPartidas(usuarioId, { nivel, limit = 20, offset = 0 } = {}) {
  const filtroNivel = nivel ? ' AND nivel = ?' : ''
  const params = nivel ? [usuarioId, nivel] : [usuarioId]

  const [partidas, totales] = await Promise.all([
    query(
      `SELECT id, nivel, puntaje, distancia, duracion_segundos, vidas_restantes, victoria, creada_en
       FROM runner_partidas
       WHERE usuario_id = ?${filtroNivel}
       ORDER BY creada_en DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ),
    query(
      `SELECT COUNT(*) AS total
       FROM runner_partidas
       WHERE usuario_id = ?${filtroNivel}`,
      params,
    ),
  ])

  return {
    partidas: partidas.map(serializarPartida),
    total: Number(totales[0].total),
  }
}

export async function obtenerRanking(nivel, limit = 10) {
  const config = obtenerNivel(nivel)
  if (!config) {
    throw new AppError('NIVEL_NO_ENCONTRADO', 'La noche solicitada no existe', 404)
  }

  const filas = await query(
    `SELECT plan, nombre_usuario, mejor_puntaje, victorias, posicion
     FROM (
       SELECT plan, nombre_usuario, mejor_puntaje, victorias, actualizado_en,
              ROW_NUMBER() OVER (
                PARTITION BY plan
                ORDER BY mejor_puntaje DESC, actualizado_en ASC
              ) AS posicion
       FROM (
         SELECT u.nombre_usuario,
                r.mejor_puntaje,
                r.victorias,
                r.actualizado_en,
                CASE WHEN EXISTS (
                  SELECT 1
                  FROM suscripciones s
                  WHERE s.usuario_id = u.id
                    AND s.estado = 'activa'
                    AND s.fecha_inicio <= CURDATE()
                    AND s.fecha_fin >= CURDATE()
                ) THEN 'premium' ELSE 'gratis' END AS plan
         FROM runner_records r
         JOIN usuarios u ON u.id = r.usuario_id
         WHERE r.nivel = ?
       ) base
     ) ranked
     WHERE posicion <= ?
     ORDER BY plan ASC, posicion ASC`,
    [config.id, limit],
  )

  const gratis = []
  const premium = []

  for (const fila of filas) {
    const entrada = {
      posicion: Number(fila.posicion),
      nombreUsuario: fila.nombre_usuario,
      puntaje: Number(fila.mejor_puntaje),
      victorias: Number(fila.victorias),
    }
    if (fila.plan === 'premium') premium.push(entrada)
    else gratis.push(entrada)
  }

  return { nivel: config.id, gratis, premium }
}
