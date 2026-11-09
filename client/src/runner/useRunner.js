// client/src/runner/useRunner.js
import { useCallback, useEffect, useRef, useState } from 'react'
import { Game } from './engine/Game.js'
import { vidasMaximas } from './config.js'

function leerSilencioInicial() {
  try {
    return localStorage.getItem('ecos.runner.silencio') === '1'
  } catch {
    return false
  }
}

const CLAVE_RECORD = 'ecos.runner.record'

function leerRecord() {
  try {
    return Number(localStorage.getItem(CLAVE_RECORD)) || 0
  } catch {
    return 0
  }
}

function guardarRecord(valor) {
  try {
    localStorage.setItem(CLAVE_RECORD, String(valor))
  } catch {
    /* sin almacenamiento: el récord dura solo esta visita */
  }
}

export function useRunner(canvasRef, { premium = false } = {}) {
  const gameRef = useRef(null)
  const premiumRef = useRef(premium)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [fps, setFps] = useState(0)
  const [lives, setLives] = useState(vidasMaximas(premium))
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [record, setRecord] = useState(leerRecord)
  const [silencio, setSilencio] = useState(() => leerSilencioInicial())

  const alGameOver = useCallback((info) => {
    const previo = leerRecord()
    const nuevo = (info.score ?? 0) > previo
    if (nuevo) {
      guardarRecord(info.score)
      setRecord(info.score)
    }
    setGameOver(true)
    setResultado({ ...info, nuevoRecord: nuevo })
    setScore(info.score ?? 0)
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

    // Ajustar tamaño al contenedor
    const resize = () => {
      const parent = canvas.parentElement
      const rect = canvas.getBoundingClientRect()
      const w = Math.round(rect.width) || parent?.clientWidth || 640
      const h = Math.min(360, window.innerHeight * 0.5)
      game.resize(w, h)
    }
    resize()
    window.addEventListener('resize', resize)

    // Sincronizar FPS al estado de React (throttled)
    const fpsInterval = setInterval(() => {
      if (gameRef.current) setFps(gameRef.current.fps)
    }, 500)

    return () => {
      window.removeEventListener('resize', resize)
      clearInterval(fpsInterval)
      game.destroy()
      gameRef.current = null
    }
  }, [canvasRef, alGameOver])

  // El estado premium puede resolverse después del montaje (auth).
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
    setFps(0)
  }, [])

  const pause = useCallback(() => {
    const game = gameRef.current
    if (!game?.running) return
    game.pause()
    setPaused(game.paused)
  }, [])

  const resume = useCallback(() => {
    const game = gameRef.current
    if (!game?.running) return
    game.resume()
    setPaused(game.paused)
  }, [])

  const togglePause = useCallback(() => {
    const game = gameRef.current
    if (!game?.running) return
    game.togglePause()
    setPaused(game.paused)
  }, [])

  const toggleSilencio = useCallback(() => {
    const game = gameRef.current
    if (!game) return
    game.sound.setMuted(!game.sound.muted)
    setSilencio(game.sound.muted)
  }, [])

  // Controles táctiles
  const saltar = useCallback(() => gameRef.current?.jump(), [])
  const soltarSalto = useCallback(() => gameRef.current?.jumpRelease(), [])
  const agachar = useCallback((on) => gameRef.current?.duck(on), [])

  return {
    record,
    silencio,
    toggleSilencio,
    saltar,
    soltarSalto,
    agachar,
    running, paused, fps, lives,
    score,
    gameOver,
    resultado,
    start,
    stop,
    pause,
    resume,
    togglePause,
  }
}
