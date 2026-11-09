import { z } from 'zod'

import { TOTAL_NIVELES } from '../config/runner.js'

const nivel = z.coerce.number().int().min(1).max(TOTAL_NIVELES)

export const partidaBodySchema = z
  .object({
    nivel,
    puntaje: z.coerce.number().int().nonnegative().max(1_000_000),
    distancia: z.coerce.number().int().nonnegative().max(1_000_000),
    duracionSegundos: z.coerce.number().int().positive().max(600),
    vidasRestantes: z.coerce.number().int().min(0).max(20),
    victoria: z.boolean(),
  })
  .strict()

export const partidasQuerySchema = z
  .object({
    nivel: nivel.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict()

export const rankingQuerySchema = z
  .object({
    nivel,
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict()
