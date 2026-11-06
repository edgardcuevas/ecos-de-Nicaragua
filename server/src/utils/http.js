export function ok(res, data, meta, status = 200) {
  const body = { data }
  if (meta) body.meta = meta
  return res.status(status).json(body)
}

export function creado(res, data, meta) {
  return ok(res, data, meta, 201)
}

export function sinContenido(res) {
  return res.status(204).send()
}

export function errorJson(res, error) {
  const status = error?.status || 500
  const codigo = error?.codigo || 'ERROR_INTERNO'
  const mensaje = error?.message || 'Error interno del servidor'
  const detalles = Array.isArray(error?.detalles) ? error.detalles : []
  if (status >= 500) {
    res.set('Cache-Control', 'no-store')
  }
  return res.status(status).json({
    error: { codigo, mensaje, detalles },
  })
}
