import * as triviaService from '../services/trivia.service.js'
import { slugParamSchema, responderBodySchema } from '../schemas/trivia.schema.js'

function premium(req) {
  return req.acceso?.premium === true
}

function sendError(res, err) {
  const status = err?.status || 500
  const codigo = err?.codigo || 'ERROR_INTERNO'
  res.status(status).json({ error: { codigo, mensaje: err?.message || 'Error interno' } })
}

export async function listarTrivias(req, res) {
  try {
    const data = await triviaService.listar({ premium: premium(req) })
    res.json({ data })
  } catch (err) {
    sendError(res, err)
  }
}

export async function obtenerTrivia(req, res) {
  try {
    const parsed = slugParamSchema.safeParse(req.params)
    if (!parsed.success) {
      return res.status(400).json({ error: { codigo: 'VALIDACION', mensaje: 'Parámetros inválidos.' } })
    }
    const data = await triviaService.obtenerPorLeyenda(parsed.data.slug, premium(req))
    res.json({ data })
  } catch (err) {
    sendError(res, err)
  }
}

export async function responderTrivia(req, res) {
  try {
    const parsedParams = slugParamSchema.safeParse(req.params)
    if (!parsedParams.success) {
      return res.status(400).json({ error: { codigo: 'VALIDACION', mensaje: 'Parámetros inválidos.' } })
    }
    const parsedBody = responderBodySchema.safeParse(req.body)
    if (!parsedBody.success) {
      return res.status(400).json({ error: { codigo: 'VALIDACION', mensaje: 'Cuerpo inválido.', detalles: parsedBody.error.issues } })
    }
    const data = await triviaService.calcularPuntaje(parsedParams.data.slug, parsedBody.data.respuestas, premium(req))
    res.json({ data })
  } catch (err) {
    sendError(res, err)
  }
}