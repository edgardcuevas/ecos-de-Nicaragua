import * as mediaService from '../services/media.service.js'
import { idParamSchema } from '../schemas/media.schema.js'

function premium(req) {
  return req.acceso?.premium === true
}

function sendError(res, err) {
  const status = err?.status || 500
  const codigo = err?.codigo || 'ERROR_INTERNO'
  res.status(status).json({ error: { codigo, mensaje: err?.message || 'Error interno' } })
}

export async function obtenerImagen(req, res) {
  try {
    const parsed = idParamSchema.safeParse(req.params)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          codigo: 'VALIDACION',
          mensaje: 'La solicitud contiene campos inválidos.',
          detalles: parsed.error.issues.map((issue) => ({
            campo: issue.path.join('.'),
            mensaje: issue.message,
          })),
        },
      })
    }
    const info = await mediaService.obtenerImagen(parsed.data.id, premium(req))

    if (req.headers['if-none-match'] === info.etag) {
      res.status(304).set('ETag', info.etag).end()
      return
    }

    res
      .status(200)
      .set('Content-Type', info.contentType)
      .set('Content-Length', info.stat.size)
      .set('Cache-Control', info.cacheControl)
      .set('ETag', info.etag)
      .set('X-Content-Type-Options', 'nosniff')
      .set('Content-Disposition', 'inline')
    if (info.vary) res.set('Vary', info.vary)
    mediaService.abrirStream(info.filePath).pipe(res)
  } catch (err) {
    sendError(res, err)
  }
}

export async function obtenerAudio(req, res) {
  try {
    const parsed = idParamSchema.safeParse(req.params)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          codigo: 'VALIDACION',
          mensaje: 'La solicitud contiene campos inválidos.',
          detalles: parsed.error.issues.map((issue) => ({
            campo: issue.path.join('.'),
            mensaje: issue.message,
          })),
        },
      })
    }
    const info = await mediaService.obtenerAudio(parsed.data.id, premium(req))

    if (req.headers['if-none-match'] === info.etag) {
      res.status(304).set('ETag', info.etag).end()
      return
    }

    const total = info.stat.size
    const range = req.headers.range

    res.set('Content-Type', info.contentType)
    res.set('Accept-Ranges', 'bytes')
    res.set('Cache-Control', info.cacheControl)
    res.set('ETag', info.etag)
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('Content-Disposition', 'inline')
    if (info.vary) res.set('Vary', info.vary)

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (!match) {
        return res.status(416).set('Content-Range', `bytes */${total}`).end()
      }
      let start = match[1] === '' ? null : Number(match[1])
      let end = match[2] === '' ? null : Number(match[2])
      if (start === null && end === null) {
        return res.status(416).set('Content-Range', `bytes */${total}`).end()
      }
      if (start === null) {
        // suffix range
        const suffix = end
        start = Math.max(total - suffix, 0)
        end = total - 1
      } else {
        if (end === null) end = total - 1
      }
      if (isNaN(start) || isNaN(end) || start > end || start >= total) {
        return res.status(416).set('Content-Range', `bytes */${total}`).end()
      }
      end = Math.min(end, total - 1)
      const chunkSize = end - start + 1
      res.status(206)
      res.set('Content-Range', `bytes ${start}-${end}/${total}`)
      res.set('Content-Length', chunkSize)
      mediaService.abrirStream(info.filePath, start, end).pipe(res)
    } else {
      res.status(200)
      res.set('Content-Length', total)
      mediaService.abrirStream(info.filePath).pipe(res)
    }
  } catch (err) {
    sendError(res, err)
  }
}