import * as regionesService from '../services/regiones.service.js'

function esPremium(req) {
  return req.acceso?.premium === true
}

export async function listarRegiones(req, res, next) {
  try {
    const { incluirNacionales, incluirRegionales } = req.query
    const { regiones, nacionales, regionales, meta } = await regionesService.listar({
      premium: esPremium(req),
      incluirNacionales,
      incluirRegionales,
    })

    res.json({ data: regiones, nacionales, regionales, meta })
  } catch (error) {
    next(error)
  }
}

export async function obtenerRegion(req, res, next) {
  try {
    const data = await regionesService.obtenerPorCodigo(req.params.codigo, esPremium(req))
    res.json({ data })
  } catch (error) {
    next(error)
  }
}
