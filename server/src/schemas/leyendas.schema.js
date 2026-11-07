import { z } from 'zod'

function vacioComoUndefined(valor) {
  if (typeof valor === 'string' && valor.trim() === '') return undefined
  return valor
}

export const listQuerySchema = z
  .object({
    region: z.preprocess(
      vacioComoUndefined,
      z.string().regex(/^[a-z0-9-]{1,20}$/).optional(),
    ),
    categoria: z.preprocess(
      vacioComoUndefined,
      z.string().regex(/^[a-z0-9-]{1,50}$/).optional(),
    ),
    q: z.preprocess(vacioComoUndefined, z.string().trim().min(2).max(60).optional()),
    alcance: z.preprocess(
      vacioComoUndefined,
      z.enum(['nacional', 'regional', 'local']).optional(),
    ),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    orden: z.preprocess(
      vacioComoUndefined,
      z.enum(['titulo', 'reciente']).default('titulo'),
    ),
  })
  .strict()

export const slugParamSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,100}$/),
})
