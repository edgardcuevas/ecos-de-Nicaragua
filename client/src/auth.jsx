import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, get, post, setCsrf } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState({ cargando: true, usuario: null, premium: false, suscripcion: null })

  const refrescar = useCallback(async () => {
    try {
      const { data } = await get('/auth/me')
      setSesion({ cargando: false, usuario: data.usuario, premium: data.accesoPremium, suscripcion: data.suscripcion })
      return data
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) console.error(e)
      setSesion({ cargando: false, usuario: null, premium: false, suscripcion: null })
      return null
    }
  }, [])

  useEffect(() => {
    refrescar()
  }, [refrescar])

  const ingresar = useCallback(
    async (correoOUsuario, password) => {
      const { data } = await post('/auth/login', { correoOUsuario, password })
      setCsrf(data.csrfToken)
      return refrescar()
    },
    [refrescar],
  )

  const registrar = useCallback(
    async ({ correo, nombreUsuario, password }) => {
      const { data } = await post('/auth/registro', { correo, nombreUsuario, password })
      setCsrf(data.csrfToken)
      return refrescar()
    },
    [refrescar],
  )

  const salir = useCallback(async () => {
    try {
      await post('/auth/logout')
    } catch {
      /* si la sesión ya expiró, el resultado es el mismo */
    }
    setCsrf(null)
    setSesion({ cargando: false, usuario: null, premium: false, suscripcion: null })
  }, [])

  const valor = useMemo(
    () => ({
      ...sesion,
      esAdmin: sesion.usuario?.rol === 'admin',
      // Cambia cuando cambia lo que el servidor deja ver.
      claveAcceso: `${sesion.usuario?.id ?? 'anon'}:${sesion.premium ? 'p' : 'g'}`,
      ingresar,
      registrar,
      salir,
      refrescar,
    }),
    [sesion, ingresar, registrar, salir, refrescar],
  )
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
