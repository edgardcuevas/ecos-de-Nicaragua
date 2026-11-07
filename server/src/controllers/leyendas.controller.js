import * as leyendasService from '../services/leyendas.service.js'
import * as categoriasService from '../services/categorias.service.js'

function esPremium(req) {
  return req.acceso?.premium === true
}

export async function listarLeyendas(req, res, next) {
  try {
    const { region, categoria, q, alcance, page, limit, orden } = req.query
    const { items, total } = await leyendasService.listar({
      region,
      categoria,
      q,
      alcance,
      page,
      limit,
      orden,
      premium: esPremium(req),
    })

    res.json({
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPaginas: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function obtenerLeyenda(req, res, next) {
  try {
    const data = await leyendasService.obtenerPorSlug(req.params.slug, esPremium(req))
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export async function listarCategorias(_req, res, next) {
  try {
    const data = await categoriasService.listar()
    res.json({ data })
  } catch (error) {
    next(error)
  }
}
