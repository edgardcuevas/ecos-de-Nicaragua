import { query, transaction } from '../db.js'
import { AppError } from '../utils/errors.js'
import {
  ALDEANOS,
  INFINITO,
  NIVELES,
  OBJETOS,
  TOTAL_NIVELES,
  configuracionNivel,
  configuracionPublica,
  configuracionRonda,
  puntajeMaximo,
  puntajeMinimo,
  vidasMaximas,
} from '../config/padre.js'

const invalida = (mensaje) => new AppError('PARTIDA_INVALIDA', mensaje, 400)

function serializarNivel(nivel) {
  return {
    id: nivel.id,
    nombre: nivel.nombre,
    descripcion: nivel.descripcion,
    duracionSegundos: nivel.duracion,
    aldeanos: nivel.aldeanos,
    maxEnemigos: nivel.maxEnemigos,
    esperaSpawn: nivel.esperaSpawn,
    velocidadEnemigos: nivel.velocidadEnemigos,
    enemigos: nivel.enemigos,
    bonos: nivel.bonos,
    objetos: nivel.objetos,
    desbloqueado: false,
    mejorPuntaje: 0,
    victorias: 0,
    partidas: 0,
  }
}

function serializarRecord(fila) {
  return {
    modo: fila.modo,
    nivel: Number(fila.nivel),
    mejorPuntaje: Number(fila.mejor_puntaje),
    mejorRondas: Number(fila.mejor_rondas),
    victorias: Number(fila.victorias),
    partidas: Number(fila.partidas),
  }
}

function serializarPartida(fila) {
  const creada = fila.creada_en instanceof Date ? fila.creada_en : new Date(fila.creada_en)
  return {
    id: Number(fila.id),
    modo: fila.modo,
    nivel: Number(fila.nivel),
    puntaje: Number(fila.puntaje),
    rondas: Number(fila.rondas),
    duracionSegundos: Number(fila.duracion_segundos),
    vidasRestantes: Number(fila.vidas_restantes),
    objetosUsados: Number(fila.objetos_usados),
    victoria: Boolean(fila.victoria),
    creadaEn: creada.toISOString(),
  }
}

function estadoInfinito(record) {
  return {
    desbloqueado: true,
    requiereCuenta: true,
    rondaSegundos: INFINITO.rondaSegundos,
    descansoSegundos: INFINITO.descansoSegundos,
    maxRondas: INFINITO.maxRondas,
    maxDuracionSegundos: INFINITO.maxDuracionSegundos,
    bonoRonda: INFINITO.bonoRonda,
    mejorPuntaje: record ? Number(record.mejor_puntaje) : 0,
    mejorRondas: record ? Number(record.mejor_rondas) : 0,
    partidas: record ? Number(record.partidas) : 0,
  }
}

export async function obtenerEstado(usuarioId) {
  const niveles = NIVELES.map(serializarNivel)

  if (!usuarioId) {
    for (const nivel of niveles) nivel.desbloqueado = nivel.id === 1
    return {
      autenticado: false,
      nivelMaxDesbloqueado: 1,
      totalNiveles: TOTAL_NIVELES,
      infinito: { ...estadoInfinito(null), desbloqueado: false },
      niveles,
      objetos: OBJETOS,
      constantes: configuracionPublica(),
    }
  }

  const [perfiles, records] = await Promise.all([
    query('SELECT nivel_max_desbloqueado FROM padre_perfiles WHERE usuario_id = ? LIMIT 1', [
      usuarioId,
    ]),
    query(
      `SELECT modo, nivel, mejor_puntaje, mejor_rondas, victorias, partidas
       FROM padre_records
       WHERE usuario_id = ?`,
      [usuarioId],
    ),
  ])

  const nivelMax = perfiles[0]
    ? Math.min(TOTAL_NIVELES, Math.max(1, Number(perfiles[0].nivel_max_desbloqueado)))
    : 1

  const recordsCampana = new Map()
  let recordInfinito = null
  for (const fila of records) {
    if (fila.modo === 'infinita') recordInfinito = fila
    else recordsCampana.set(Number(fila.nivel), fila)
  }

  for (const nivel of niveles) {
    const record = recordsCampana.get(nivel.id)
    nivel.desbloqueado = nivel.id <= nivelMax
    if (record) {
      nivel.mejorPuntaje = Number(record.mejor_puntaje)
      nivel.victorias = Number(record.victorias)
      nivel.partidas = Number(record.partidas)
    }
  }

  return {
    autenticado: true,
    nivelMaxDesbloqueado: nivelMax,
    totalNiveles: TOTAL_NIVELES,
    infinito: { ...estadoInfinito(recordInfinito), desbloqueado: true },
    niveles,
    objetos: OBJETOS,
    constantes: configuracionPublica(),
  }
}

export function validarPartida(datos, { config, premium = false } = {}) {
  const maxBase = vidasMaximas(premium)
  const maxConObjetos = maxBase + datos.objetosUsados
  const totalEnemigos =
    datos.estadisticas.perro +
    datos.estadisticas.monaguillo +
    datos.estadisticas.beata +
    datos.estadisticas.valiente

  // El motor reemplaza a cada aldeano asesinado o salvado tras 3–7 s. El tope
  // teórico evita rechazar partidas reales con muchos aldeanos en pantalla.
  const maxAldeanos =
    config.aldeanos * (1 + Math.ceil(datos.duracionSegundos / ALDEANOS.reaparicionMin))

  if (datos.vidasRestantes > maxConObjetos) {
    throw invalida('Las vidas restantes no coinciden con los rosarios usados')
  }

  if (datos.objetosUsados > 20) {
    throw invalida('Demasiados rosarios usados')
  }

  const min = puntajeMinimo(datos, config)
  const max = puntajeMaximo(datos, config)
  if (datos.puntaje < min || datos.puntaje > max) {
    throw invalida('El puntaje no es coherente con las estadísticas de la partida')
  }

  if (datos.modo === 'infinita') {
    if (datos.victoria) throw invalida('El modo infinito no tiene victoria')
    if (datos.rondas > INFINITO.maxRondas) throw invalida('Demasiadas rondas')
    if (datos.rondas > Math.floor(datos.duracionSegundos / INFINITO.rondaSegundos) + 1) {
      throw invalida('Las rondas no coinciden con la duración')
    }
    if (datos.rondas > 0 && datos.duracionSegundos < datos.rondas * INFINITO.rondaSegundos) {
      throw invalida('Las rondas no coinciden con la duración')
    }
    if (datos.vidasRestantes !== 0) throw invalida('La partida infinita termina sin vidas')
    const maxObjetos = Math.min(
      INFINITO.maxObjetos,
      Math.floor(datos.rondas / INFINITO.objetosCadaRondas) + 1,
    )
    if (datos.objetosUsados > maxObjetos) throw invalida('Demasiados rosarios para esas rondas')
    if (datos.estadisticas.aldeanos + datos.estadisticas.salvados > maxAldeanos) {
      throw invalida('Demasiados aldeanos para la duración de la partida')
    }
    const maxEnemigos = Math.ceil(datos.duracionSegundos / (INFINITO.spawnMin * 0.9)) + 1
    if (totalEnemigos > maxEnemigos) {
      throw invalida('Demasiados enemigos para la duración de la partida')
    }
    return
  }

  if (datos.duracionSegundos > config.duracion + 2) {
    throw invalida('La duración supera la de la noche')
  }

  if (datos.objetosUsados > config.objetos.max) {
    throw invalida('Demasiados rosarios para esta noche')
  }

  if (datos.objetosUsados > Math.ceil(datos.duracionSegundos / config.objetos.cada) + 1) {
    throw invalida('Los rosarios no coinciden con la duración de la noche')
  }

  if (datos.victoria) {
    if (datos.vidasRestantes < 1) throw invalida('Una victoria exige al menos una vida')
    if (datos.duracionSegundos < config.duracion - 1) {
      throw invalida('La noche no ha terminado todavía')
    }
  } else {
    if (datos.vidasRestantes !== 0) throw invalida('Una derrota exige cero vidas')
  }

  if (datos.estadisticas.aldeanos + datos.estadisticas.salvados > maxAldeanos) {
    throw invalida('Demasiados aldeanos para la duración de la noche')
  }

  const maxEnemigos = Math.ceil(datos.duracionSegundos / (config.esperaSpawn.min * 0.9)) + 1
  if (totalEnemigos > maxEnemigos) {
    throw invalida('Demasiados enemigos para la duración de la noche')
  }
}

export async function registrarPartida(usuarioId, datos, { premium = false } = {}) {
  const esInfinito = datos.modo === 'infinita'
  const config = esInfinito
    ? configuracionRonda(Math.max(1, datos.rondas || 1))
    : configuracionNivel(datos.nivel)

  if (!config) {
    throw new AppError('NIVEL_NO_ENCONTRADO', 'La noche solicitada no existe', 404)
  }

  const nivelPartida = esInfinito ? 0 : datos.nivel

  return transaction(async (conexion) => {
    const [perfiles] = await conexion.execute(
      'SELECT nivel_max_desbloqueado FROM padre_perfiles WHERE usuario_id = ? FOR UPDATE',
      [usuarioId],
    )

    let nivelMax = perfiles[0] ? Number(perfiles[0].nivel_max_desbloqueado) : 1

    if (!perfiles[0]) {
      await conexion.execute(
        'INSERT INTO padre_perfiles (usuario_id, nivel_max_desbloqueado) VALUES (?, 1)',
        [usuarioId],
      )
    }

    if (!esInfinito && datos.nivel > nivelMax) {
      throw new AppError('NIVEL_BLOQUEADO', 'La noche todavía no está desbloqueada', 403)
    }

    validarPartida(datos, { config, premium })

    const [insertado] = await conexion.execute(
      `INSERT INTO padre_partidas
        (usuario_id, modo, nivel, puntaje, rondas, duracion_segundos, vidas_restantes,
         objetos_usados, aldeanos, perro, monaguillo, beata, valiente, salvados, victoria)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        datos.modo,
        nivelPartida,
        datos.puntaje,
        datos.rondas,
        datos.duracionSegundos,
        datos.vidasRestantes,
        datos.objetosUsados,
        datos.estadisticas.aldeanos,
        datos.estadisticas.perro,
        datos.estadisticas.monaguillo,
        datos.estadisticas.beata,
        datos.estadisticas.valiente,
        datos.estadisticas.salvados,
        datos.victoria ? 1 : 0,
      ],
    )

    const [records] = await conexion.execute(
      `SELECT mejor_puntaje, mejor_rondas, victorias, partidas
       FROM padre_records
       WHERE usuario_id = ? AND modo = ? AND nivel = ?
       FOR UPDATE`,
      [usuarioId, datos.modo, nivelPartida],
    )

    const previo = records[0]
    const nuevoRecord = !previo
      ? true
      : esInfinito
        ? datos.rondas > Number(previo.mejor_rondas) ||
          (datos.rondas === Number(previo.mejor_rondas) &&
            datos.puntaje > Number(previo.mejor_puntaje))
        : datos.puntaje > Number(previo.mejor_puntaje)

    if (previo) {
      await conexion.execute(
        `UPDATE padre_records
         SET mejor_puntaje = GREATEST(mejor_puntaje, ?),
             mejor_rondas = GREATEST(mejor_rondas, ?),
             victorias = victorias + ?,
             partidas = partidas + 1
         WHERE usuario_id = ? AND modo = ? AND nivel = ?`,
        [datos.puntaje, datos.rondas, datos.victoria ? 1 : 0, usuarioId, datos.modo, nivelPartida],
      )
    } else {
      await conexion.execute(
        `INSERT INTO padre_records
          (usuario_id, modo, nivel, mejor_puntaje, mejor_rondas, victorias, partidas)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          usuarioId,
          datos.modo,
          nivelPartida,
          datos.puntaje,
          datos.rondas,
          datos.victoria ? 1 : 0,
        ],
      )
    }

    let nivelDesbloqueado = null
    if (!esInfinito && datos.victoria && datos.nivel === nivelMax && nivelMax < TOTAL_NIVELES) {
      nivelDesbloqueado = nivelMax + 1
      nivelMax = nivelDesbloqueado
      await conexion.execute(
        'UPDATE padre_perfiles SET nivel_max_desbloqueado = ? WHERE usuario_id = ?',
        [nivelMax, usuarioId],
      )
    }

    const [partidas] = await conexion.execute(
      `SELECT id, modo, nivel, puntaje, rondas, duracion_segundos, vidas_restantes,
              objetos_usados, victoria, creada_en
       FROM padre_partidas
       WHERE id = ?
       LIMIT 1`,
      [insertado.insertId],
    )

    const [recordActual] = await conexion.execute(
      `SELECT modo, nivel, mejor_puntaje, mejor_rondas, victorias, partidas
       FROM padre_records
       WHERE usuario_id = ? AND modo = ? AND nivel = ?
       LIMIT 1`,
      [usuarioId, datos.modo, nivelPartida],
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

export async function listarPartidas(usuarioId, { modo, nivel, limit = 20, offset = 0 } = {}) {
  const filtros = []
  const params = [usuarioId]
  if (modo) {
    filtros.push('AND modo = ?')
    params.push(modo)
  }
  if (nivel) {
    filtros.push('AND nivel = ?')
    params.push(nivel)
  }
  const where = filtros.join(' ')

  const [partidas, totales] = await Promise.all([
    query(
      `SELECT id, modo, nivel, puntaje, rondas, duracion_segundos, vidas_restantes,
              objetos_usados, victoria, creada_en
       FROM padre_partidas
       WHERE usuario_id = ? ${where}
       ORDER BY creada_en DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ),
    query(
      `SELECT COUNT(*) AS total
       FROM padre_partidas
       WHERE usuario_id = ? ${where}`,
      params,
    ),
  ])

  return {
    partidas: partidas.map(serializarPartida),
    total: Number(totales[0].total),
  }
}

export async function obtenerRanking({ modo, nivel, limit = 10 }) {
  const esInfinito = modo === 'infinita'

  if (!esInfinito) {
    const config = configuracionNivel(nivel)
    if (!config) {
      throw new AppError('NIVEL_NO_ENCONTRADO', 'La noche solicitada no existe', 404)
    }
  }

  const orden = esInfinito
    ? 'mejor_rondas DESC, mejor_puntaje DESC, actualizado_en ASC'
    : 'mejor_puntaje DESC, actualizado_en ASC'
  const filtroNivel = esInfinito ? 0 : Number(nivel)

  const filas = await query(
    `SELECT plan, nombre_usuario, mejor_puntaje, mejor_rondas, victorias, posicion
     FROM (
       SELECT plan, nombre_usuario, mejor_puntaje, mejor_rondas, victorias, actualizado_en,
              ROW_NUMBER() OVER (PARTITION BY plan ORDER BY ${orden}) AS posicion
       FROM (
         SELECT u.nombre_usuario,
                r.mejor_puntaje,
                r.mejor_rondas,
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
         FROM padre_records r
         JOIN usuarios u ON u.id = r.usuario_id
         WHERE r.modo = ? AND r.nivel = ?
       ) base
     ) ranked
     WHERE posicion <= ?
     ORDER BY plan ASC, posicion ASC`,
    [modo, filtroNivel, limit],
  )

  const gratis = []
  const premium = []

  for (const fila of filas) {
    const entrada = {
      posicion: Number(fila.posicion),
      nombreUsuario: fila.nombre_usuario,
      puntaje: Number(fila.mejor_puntaje),
      rondas: Number(fila.mejor_rondas),
      victorias: Number(fila.victorias),
    }
    if (fila.plan === 'premium') premium.push(entrada)
    else gratis.push(entrada)
  }

  return {
    modo,
    nivel: esInfinito ? 0 : Number(nivel),
    gratis,
    premium,
  }
}
