import { useCallback, useEffect, useState } from 'react'
import { get } from './api.js'
import { useAuth } from './auth.jsx'

// Carga un recurso GET. Se vuelve a pedir cuando cambia la sesión, porque
// el servidor decide qué contenido premium se envía.
export function useApi(path, query = null) {
  const { claveAcceso } = useAuth()
  const [estado, setEstado] = useState({ data: null, meta: null, error: null, cargando: true })
  const [intento, setIntento] = useState(0)
  const claveQuery = query ? JSON.stringify(query) : ''

  useEffect(() => {
    if (!path) return undefined
    const ctrl = new AbortController()
    setEstado((s) => ({ ...s, cargando: true, error: null }))
    get(path, query, ctrl.signal)
      .then((json) => setEstado({ data: json.data, meta: json.meta ?? null, error: null, cargando: false }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        setEstado({ data: null, meta: null, error, cargando: false })
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, claveQuery, claveAcceso, intento])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])
  return { ...estado, recargar }
}

export function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · Ecos de Nicaragua` : 'Ecos de Nicaragua'
  }, [titulo])
}
