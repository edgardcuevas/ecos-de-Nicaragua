import { z } from 'zod'

export const slugParamSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,100}$/),
})

export const responderBodySchema = z.object({
  respuestas: z
    .array(
      z.object({
        preguntaId: z.coerce.number().int().positive(),
        opcionId: z.coerce.number().int().positive(),
      }),
    )
    .min(1)
    .max(5),
})

export const triviaListQuerySchema = z.object({}).strict()