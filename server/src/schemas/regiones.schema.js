import { z } from 'zod'

function aBooleano(valor) {
  if (valor === undefined) return undefined
  if (valor === true || valor === 'true' || valor === '1') return true
  if (valor === false || valor === 'false' || valor === '0') return false
  return valor
}

export const listQuerySchema = z
  .object({
    incluirNacionales: z.preprocess(aBooleano, z.boolean().default(true)),
    incluirRegionales: z.preprocess(aBooleano, z.boolean().default(true)),
  })
  .strict()

export const codigoParamSchema = z.object({
  codigo: z.string().regex(/^[a-z0-9-]{1,20}$/),
})
