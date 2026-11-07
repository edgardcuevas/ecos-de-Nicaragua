// Cliente de la API. Sesión por cookie HttpOnly + token CSRF en memoria
// (nunca en localStorage). Todas las respuestas válidas son { data, meta }.

let csrfToken = null

export class ApiError extends Error {
  constructor(status, codigo, mensaje, detalles = []) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.codigo = codigo
    this.detalles = detalles
  }
}

export function setCsrf(token) {
  csrfToken = token || null
}

async function asegurarCsrf() {
  if (csrfToken) return csrfToken
  const res = await fetch('/api/auth/csrf', { credentials: 'same-origin' })
  if (!res.ok) throw new ApiError(res.status, 'CSRF', 'No se pudo iniciar la sesión segura.')
  const json = await res.json()
  csrfToken = json.data.csrfToken
  return csrfToken
}

function armarQuery(query) {
  if (!query) return ''
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export async function api(path, { method = 'GET', body, query, signal, reintentar = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (method !== 'GET') headers['X-CSRF-Token'] = await asegurarCsrf()
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`/api${path}${armarQuery(query)}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError(0, 'RED', 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.')
  }

  if (res.status === 204) return { data: null }
  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const e = json?.error
    if (res.status === 403 && e?.codigo === 'CSRF_INVALIDO' && reintentar && method !== 'GET') {
      csrfToken = null
      return api(path, { method, body, query, signal, reintentar: false })
    }
    throw new ApiError(
      res.status,
      e?.codigo || 'ERROR',
      e?.mensaje || 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      e?.detalles || [],
    )
  }
  return json
}

export const get = (path, query, signal) => api(path, { query, signal })
export const post = (path, body) => api(path, { method: 'POST', body: body ?? {} })
export const patch = (path, body) => api(path, { method: 'PATCH', body })
export const del = (path) => api(path, { method: 'DELETE' })

// Mensaje legible a partir de un ApiError, incluyendo el detalle por campo.
export function mensajeError(error) {
  if (!error) return ''
  if (error.detalles?.length) {
    return error.detalles.map((d) => d.mensaje).join(' ')
  }
  return error.message
}
