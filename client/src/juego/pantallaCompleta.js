// juego/pantallaCompleta.js
// Utilidades compartidas por los juegos: detectar táctil y pasar a pantalla completa.
// Pantalla completa nativa cuando existe; si no, "modo propio" (el escenario ocupa toda la
// ventana con position: fixed).
import { useCallback, useEffect, useRef, useState } from 'react'

export function useTactil() {
  const [tactil, setTactil] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches))
  useEffect(() => {
    const mq = window.matchMedia?.('(pointer: coarse)')
    if (!mq) return
    const cambio = () => setTactil(mq.matches)
    mq.addEventListener?.('change', cambio)
    return () => mq.removeEventListener?.('change', cambio)
  }, [])
  return tactil
}

const elementoNativo = () => document.fullscreenElement || document.webkitFullscreenElement || null

export function usePantallaCompleta(ref) {
  const [activa, setActiva] = useState(false)
  const nativa = useRef(false)

  const desbloquear = () => {
    try {
      screen.orientation?.unlock?.()
    } catch {
      /* sin soporte */
    }
  }

  const entrar = useCallback(async () => {
    const el = ref.current
    if (!el) return
    // Pantalla completa nativa: es la única forma de que la página oculte la barra del navegador.
    // Si el navegador no la permite (iPhone), se usa el modo propio.
    const pedir = el.requestFullscreen || el.webkitRequestFullscreen
    if (pedir) {
      try {
        await pedir.call(el)
        nativa.current = true
        setActiva(true)
        // En Android el navegador permite girar a horizontal estando en pantalla completa.
        try {
          await screen.orientation?.lock?.('landscape')
        } catch {
          /* escritorio o sin permiso: no pasa nada */
        }
        return
      } catch {
        /* cae al modo pseudo */
      }
    }
    nativa.current = false
    setActiva(true)
  }, [ref])

  const salir = useCallback(async () => {
    if (elementoNativo()) {
      try {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document)
      } catch {
        /* ya salió */
      }
    }
    desbloquear()
    nativa.current = false
    setActiva(false)
  }, [])

  const alternar = useCallback(() => (activa ? salir() : entrar()), [activa, entrar, salir])

  useEffect(() => {
    // Salida con Esc o con el gesto del sistema.
    const cambio = () => {
      if (nativa.current && !elementoNativo()) {
        nativa.current = false
        desbloquear()
        setActiva(false)
      }
    }
    const tecla = (e) => {
      if (e.key === 'Escape' && !nativa.current) setActiva(false)
    }
    document.addEventListener('fullscreenchange', cambio)
    document.addEventListener('webkitfullscreenchange', cambio)
    window.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('fullscreenchange', cambio)
      document.removeEventListener('webkitfullscreenchange', cambio)
      window.removeEventListener('keydown', tecla)
    }
  }, [])

  // Bloquea el scroll de la página mientras el juego ocupa la pantalla.
  useEffect(() => {
    document.documentElement.classList.toggle('juego-fs-activo', activa)
    return () => document.documentElement.classList.remove('juego-fs-activo')
  }, [activa])

  // Si se desmonta dentro de pantalla completa, salir.
  useEffect(
    () => () => {
      if (elementoNativo()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
      desbloquear()
    },
    [],
  )

  return { activa, entrar, salir, alternar }
}