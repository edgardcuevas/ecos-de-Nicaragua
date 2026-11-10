// padre/usePadre.js — puente entre el motor, React y la API de progreso (M12).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Game } from './engine/Game.js'
import { get, post, mensajeError } from '../api.js'
import {
  INFINITO,
  NIVELES,
  OBJETOS,
  TOTAL_NIVELES,
  configuracionNivel,
  vidasMaximas,
} from './config.js'

const CLAVE_ANTIGUA = 'ecos.padre.record'

function leerJson(clave) {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? JSON.parse(crudo) : null
  } catch {
    return null
  }
}

function guardarJson(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    /* solo esta visita */
  }
}

function claveLocal(modo, nivel) {
  return modo === 'campana' ? `ecos.padre.record.campana.${nivel}` : 'ecos.padre.record.infinita'
}

function registroVacio(modo) {
  return modo === 'campana'
    ? { mejorPuntaje: 0, mejorRondas: 0, victorias: 0, partidas: 0 }
    : { mejorPuntaje: 0, mejorRondas: 0, victorias: 0, partidas: 0 }
}

function leerRegistroLocal(modo, nivel) {
  const guardado = leerJson(claveLocal(modo, nivel))
  if (guardado) return { ...registroVacio(modo), ...guardado }
  // Migración del récord antiguo (un único puntaje) al nivel 1 de la campaña.
  if (modo === 'campana' && Number(nivel) === 1) {
    const viejo = Number(localStorage.getItem(CLAVE_ANTIGUA)) || 0
    if (viejo > 0) {
      const migrado = { ...registroVacio(modo), mejorPuntaje: viejo, partidas: 1 }
      guardarJson(claveLocal(modo, nivel), migrado)
      return migrado
    }
  }
  return registroVacio(modo)
}

function estadoLocal(autenticado) {
  const niveles = NIVELES.map((nivel) => ({
    ...nivel,
    duracionSegundos: nivel.duracion,
    // Hasta que responda la API solo se ofrece la primera noche.
    desbloqueado: nivel.id === 1,
    mejorPuntaje: 0,
    victorias: 0,
    partidas: 0,
  }))
  return {
    autenticado: Boolean(autenticado),
    nivelMaxDesbloqueado: 1,
    totalNiveles: TOTAL_NIVELES,
    infinito: {
      desbloqueado: Boolean(autenticado),
      requiereCuenta: true,
      rondaSegundos: INFINITO.rondaSegundos,
      descansoSegundos: INFINITO.descansoSegundos,
      maxRondas: INFINITO.maxRondas,
      maxDuracionSegundos: INFINITO.maxDuracionSegundos,
      bonoRonda: INFINITO.bonoRonda,
      mejorPuntaje: 0,
      mejorRondas: 0,
      partidas: 0,
    },
    niveles,
    objetos: OBJETOS,
  }
}

function normalizarNivel(nivel) {
  if (!nivel) return null
  return { ...nivel, duracion: nivel.duracionSegundos ?? nivel.duracion }
}

function registroDeEstado(estado, modo, nivel) {
  if (!estado) return registroVacio(modo)
  if (modo === 'campana') {
    const fila = estado.niveles?.find((n) => n.id === Number(nivel))
    return fila
      ? {
          mejorPuntaje: fila.mejorPuntaje ?? 0,
          mejorRondas: 0,
          victorias: fila.victorias ?? 0,
          partidas: fila.partidas ?? 0,
        }
      : registroVacio('campana')
  }
  const info = estado.infinito ?? {}
  return {
    mejorPuntaje: info.mejorPuntaje ?? 0,
    mejorRondas: info.mejorRondas ?? 0,
    victorias: 0,
    partidas: info.partidas ?? 0,
  }
}

function mejorMarca(registro, modo) {
  return modo === 'campana' ? registro.mejorPuntaje : registro.mejorRondas
}

function supera(registro, info) {
  if (info.modo === 'campana') return info.score > (registro.mejorPuntaje ?? 0)
  return (
    info.rondas > (registro.mejorRondas ?? 0) ||
    (info.rondas === (registro.mejorRondas ?? 0) && info.score > (registro.mejorPuntaje ?? 0))
  )
}

export function usePadre(canvasRef, { premium = false, autenticado = false } = {}) {
  const gameRef = useRef(null)
  const premiumRef = useRef(premium)
  const authRef = useRef(autenticado)
  const estadoRef = useRef(null)
  const modoRef = useRef('campana')
  const nivelRef = useRef(1)

  const [estadoApi, setEstadoApi] = useState(null)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [errorEstado, setErrorEstado] = useState(null)
  const [modo, setModo] = useState('campana')
  const [nivel, setNivel] = useState(1)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [lives, setLives] = useState(vidasMaximas(premium))
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [objetos, setObjetos] = useState(0)
  const [ronda, setRonda] = useState({ ronda: 1, superadas: 0, descanso: false })
  const [record, setRecord] = useState(0)
  const [guardado, setGuardado] = useState(null)
  const [errorGuardado, setErrorGuardado] = useState(null)
  const [silencio, setSilencio] = useState(() => {
    try {
      return localStorage.getItem('ecos.padre.silencio') === '1'
    } catch {
      return false
    }
  })

  const estado = estadoApi ?? estadoLocal(authRef.current)
  estadoRef.current = estado

  const cargarEstado = useCallback(async () => {
    setCargandoEstado(true)
    try {
      const { data } = await get('/padre/estado')
      setEstadoApi(data)
      setErrorEstado(null)
      return data
    } catch (e) {
      setErrorEstado(mensajeError(e))
      setEstadoApi(null)
      return null
    } finally {
      setCargandoEstado(false)
    }
  }, [])

  useEffect(() => {
    cargarEstado()
  }, [cargarEstado, autenticado])

  useEffect(() => {
    authRef.current = autenticado
    if (!autenticado) {
      setEstadoApi(null)
      setCargandoEstado(false)
      setErrorEstado(null)
    }
  }, [autenticado])

  const actualizarRecord = useCallback((nuevoModo, nuevoNivel) => {
    const activo = estadoRef.current
    const info = registroDeEstado(activo?.autenticado ? activo : null, nuevoModo, nuevoNivel)
    const local = leerRegistroLocal(nuevoModo, nuevoNivel)
    const usado =
      activo?.autenticado && activo.autenticado
        ? info
        : {
            mejorPuntaje: Math.max(info.mejorPuntaje, local.mejorPuntaje),
            mejorRondas: Math.max(info.mejorRondas, local.mejorRondas),
            victorias: Math.max(info.victorias, local.victorias),
            partidas: Math.max(info.partidas, local.partidas),
          }
    setRecord(mejorMarca(usado, nuevoModo))
    return usado
  }, [])

  useEffect(() => {
    actualizarRecord(modoRef.current, nivelRef.current)
  }, [estadoApi, actualizarRecord])

  const guardarPartida = useCallback(async (info) => {
    if (!authRef.current) {
      setGuardado('invitado')
      return
    }
    setGuardado('guardando')
    setErrorGuardado(null)
    const cuerpo = {
      modo: info.modo,
      puntaje: info.score,
      duracionSegundos: Math.max(1, Math.round(info.elapsed)),
      rondas: info.modo === 'infinita' ? info.rondas : 0,
      vidasRestantes: info.lives,
      objetosUsados: info.objetosUsados,
      estadisticas: info.estadisticas,
      victoria: info.victoria,
    }
    if (info.modo === 'campana') cuerpo.nivel = info.nivel

    try {
      const { data } = await post('/padre/partidas', cuerpo)
      setGuardado('guardado')
      setResultado((previo) =>
        previo
          ? {
              ...previo,
              nuevoRecord: data.nuevoRecord,
              nivelDesbloqueado: data.nivelDesbloqueado,
            }
          : previo,
      )
      if (info.modo === 'campana') setRecord(data.record?.mejorPuntaje ?? 0)
      else setRecord(data.record?.mejorRondas ?? 0)
      await cargarEstado()
    } catch (e) {
      setGuardado('error')
      setErrorGuardado(mensajeError(e))
    }
  }, [cargarEstado])

  const alGameOver = useCallback(
    (info) => {
      const activoModo = info.modo
      const activoNivel = info.modo === 'campana' ? info.nivel : 0
      const registro = leerRegistroLocal(activoModo, activoNivel)
      const nuevoLocal = supera(registro, info)

      if (!authRef.current && nuevoLocal) {
        const actualizado = {
          mejorPuntaje: Math.max(registro.mejorPuntaje, info.score),
          mejorRondas: Math.max(registro.mejorRondas, info.rondas),
          victorias: registro.victorias + (info.victoria ? 1 : 0),
          partidas: registro.partidas + 1,
        }
        guardarJson(claveLocal(activoModo, activoNivel), actualizado)
        setRecord(mejorMarca(actualizado, activoModo))
      } else if (!authRef.current) {
        guardarJson(claveLocal(activoModo, activoNivel), {
          ...registro,
          partidas: registro.partidas + 1,
        })
      }

      setGameOver(true)
      setResultado({ ...info, nuevoRecord: nuevoLocal })
      setScore(info.score)
      setRunning(false)
      setPaused(false)
      guardarPartida(info)
    },
    [guardarPartida],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new Game(canvas, {
      premium: premiumRef.current,
      onLivesChange: setLives,
      onGameOver: alGameOver,
      onScore: setScore,
      onObjetos: setObjetos,
      onRonda: setRonda,
    })
    game.sound.setMuted(silencio)
    gameRef.current = game
    return () => {
      game.destroy()
      gameRef.current = null
    }
    // `silencio` solo se usa para el valor inicial; los cambios se aplican abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, alGameOver])

  useEffect(() => {
    premiumRef.current = premium
    gameRef.current?.setPremium(premium)
  }, [premium])

  const iniciar = useCallback(
    (nuevoModo = modoRef.current, nuevoNivel = nivelRef.current) => {
      const activo = estadoRef.current ?? estadoLocal(authRef.current)
      const esInvitado = !authRef.current
      if (esInvitado && (nuevoModo === 'infinita' || Number(nuevoNivel) !== 1)) return false
      if (!activo.autenticado && nuevoModo === 'infinita') return false

      const seleccionModo = nuevoModo === 'infinita' ? 'infinita' : 'campana'
      const seleccionNivel = seleccionModo === 'campana' ? Number(nuevoNivel) : 0

      if (seleccionModo === 'campana') {
        const fila = activo.niveles?.find((n) => n.id === seleccionNivel)
        if (fila && !fila.desbloqueado) return false
      } else if (activo.infinito && !activo.infinito.desbloqueado) {
        return false
      }

      let configuracion = null
      if (seleccionModo === 'campana') {
        configuracion = normalizarNivel(
          activo.niveles?.find((n) => n.id === seleccionNivel) ?? configuracionNivel(seleccionNivel),
        )
      }

      modoRef.current = seleccionModo
      nivelRef.current = seleccionNivel
      setModo(seleccionModo)
      setNivel(seleccionNivel)
      actualizarRecord(seleccionModo, seleccionNivel)

      gameRef.current?.start(seleccionModo, seleccionNivel, configuracion)
      setRunning(true)
      setPaused(false)
      setGameOver(false)
      setResultado(null)
      setScore(0)
      setObjetos(0)
      setGuardado(null)
      setErrorGuardado(null)
      setRonda({ ronda: 1, superadas: 0, descanso: false })
      return true
    },
    [actualizarRecord],
  )

  const start = useCallback(() => {
    iniciar(modoRef.current, nivelRef.current)
  }, [iniciar])

  const seleccionar = useCallback(
    (nuevoModo, nuevoNivel = 1) => {
      if (running) return
      const seleccionModo = nuevoModo === 'infinita' ? 'infinita' : 'campana'
      const seleccionNivel = seleccionModo === 'campana' ? Number(nuevoNivel) : 0
      modoRef.current = seleccionModo
      nivelRef.current = seleccionNivel
      setModo(seleccionModo)
      setNivel(seleccionNivel)
      actualizarRecord(seleccionModo, seleccionNivel)
    },
    [running, actualizarRecord],
  )

  const stop = useCallback(() => {
    gameRef.current?.stop()
    setRunning(false)
    setPaused(false)
    setGameOver(false)
    setResultado(null)
    setScore(0)
    setObjetos(0)
    setGuardado(null)
    setErrorGuardado(null)
  }, [])

  const togglePause = useCallback(() => {
    const g = gameRef.current
    if (!g?.running) return
    g.togglePause()
    setPaused(g.paused)
  }, [])

  const toggleSilencio = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    g.sound.setMuted(!g.sound.muted)
    setSilencio(g.sound.muted)
  }, [])

  const mover = useCallback((x, y) => gameRef.current?.setStick(x, y), [])
  const atacar = useCallback(() => gameRef.current?.atacar(), [])

  const maxVidas = vidasMaximas(premium) + objetos

  return {
    estado,
    cargandoEstado,
    errorEstado,
    recargarEstado: cargarEstado,
    modo,
    nivel,
    running,
    paused,
    lives,
    maxVidas,
    score,
    gameOver,
    resultado,
    objetos,
    ronda,
    record,
    guardado,
    errorGuardado,
    silencio,
    start,
    iniciar,
    seleccionar,
    stop,
    togglePause,
    toggleSilencio,
    mover,
    atacar,
  }
}
