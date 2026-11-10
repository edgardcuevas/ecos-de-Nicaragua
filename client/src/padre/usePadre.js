// padre/usePadre.js — puente entre el motor y React (mismo patrón que useRunner).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Game } from './engine/Game.js'
import { vidasMaximas } from './config.js'

const CLAVE_RECORD = 'ecos.padre.record'
const leerRecord = () => {
  try {
    return Number(localStorage.getItem(CLAVE_RECORD)) || 0
  } catch {
    return 0
  }
}
const guardarRecord = (v) => {
  try {
    localStorage.setItem(CLAVE_RECORD, String(v))
  } catch {
    /* solo esta visita */
  }
}
const leerSilencio = () => {
  try {
    return localStorage.getItem('ecos.padre.silencio') === '1'
  } catch {
    return false
  }
}

export function usePadre(canvasRef, { premium = false } = {}) {
  const gameRef = useRef(null)
  const premiumRef = useRef(premium)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [lives, setLives] = useState(vidasMaximas(premium))
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [record, setRecord] = useState(leerRecord)
  const [silencio, setSilencio] = useState(leerSilencio)

  const alGameOver = useCallback((info) => {
    const nuevo = info.score > leerRecord()
    if (nuevo) {
      guardarRecord(info.score)
      setRecord(info.score)
    }
    setGameOver(true)
    setResultado({ ...info, nuevoRecord: nuevo })
    setScore(info.score)
    setRunning(false)
    setPaused(false)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new Game(canvas, {
      premium: premiumRef.current,
      onLivesChange: setLives,
      onGameOver: alGameOver,
      onScore: setScore,
    })
    gameRef.current = game
    return () => {
      game.destroy()
      gameRef.current = null
    }
  }, [canvasRef, alGameOver])

  useEffect(() => {
    premiumRef.current = premium
    gameRef.current?.setPremium(premium)
  }, [premium])

  const start = useCallback(() => {
    gameRef.current?.start()
    setRunning(true)
    setPaused(false)
    setGameOver(false)
    setResultado(null)
    setScore(0)
  }, [])

  const stop = useCallback(() => {
    gameRef.current?.stop()
    setRunning(false)
    setPaused(false)
    setGameOver(false)
    setResultado(null)
    setScore(0)
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

  return { running, paused, lives, score, gameOver, resultado, record, silencio, start, stop, togglePause, toggleSilencio, mover, atacar }
}
