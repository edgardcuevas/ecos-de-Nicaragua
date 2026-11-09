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

export function useRunner(canvasRef, { premium = false, onFinish = null } = {}) {
  const gameRef = useRef(null)
  const premiumRef = useRef(premium)
  const finishRef = useRef(onFinish)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [fps, setFps] = useState(0)
  const [lives, setLives] = useState(vidasMaximas(premium))
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [silencio, setSilencio] = useState(() => leerSilencioInicial())

  useEffect(() => {
    finishRef.current = onFinish
  }, [onFinish])

  const alGameOver = useCallback((info) => {
    setGameOver(true)
    setResultado(info)
    setScore(info.score ?? 0)
    setRunning(false)
    setPaused(false)
    finishRef.current?.(info)
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

  const start = useCallback((nivel) => {
    if (!nivel) return
    gameRef.current?.start(nivel)
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
