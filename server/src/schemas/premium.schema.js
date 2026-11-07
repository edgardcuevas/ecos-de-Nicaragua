import { z } from 'zod'

export const canjearBodySchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(1, 'El código es obligatorio')
      .max(40, 'El código es demasiado largo'),
  })
  .strict()
