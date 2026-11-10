import { z } from 'zod'

import { INFINITO, TOTAL_NIVELES } from '../config/padre.js'

const entero = (max) => z.coerce.number().int().nonnegative().max(max)

const estadisticasSchema = z
  .object({
    aldeanos: entero(1_000_000),
    perro: entero(1_000_000),
    monaguillo: entero(1_000_000),
    beata: entero(1_000_000),
    valiente: entero(1_000_000),
    salvados: entero(1_000_000),
  })
  .strict()

export const partidaBodySchema = z.discriminatedUnion('modo', [
  z
    .object({
      modo: z.literal('campana'),
      nivel: z.coerce.number().int().min(1).max(TOTAL_NIVELES),
      puntaje: entero(1_000_000),
      duracionSegundos: z.coerce.number().int().positive().max(600),
      rondas: z.literal(0).default(0),
      vidasRestantes: z.coerce.number().int().min(0).max(20),
      objetosUsados: z.coerce.number().int().min(0).max(20),
      estadisticas: estadisticasSchema,
      victoria: z.boolean(),
    })
    .strict(),
  z
    .object({
      modo: z.literal('infinita'),
      puntaje: entero(1_000_000),
      duracionSegundos: z.coerce.number().int().positive().max(INFINITO.maxDuracionSegundos),
      rondas: z.coerce.number().int().min(0).max(INFINITO.maxRondas),
      vidasRestantes: z.coerce.number().int().min(0).max(20),
      objetosUsados: z.coerce.number().int().min(0).max(20),
      estadisticas: estadisticasSchema,
      victoria: z.literal(false),
    })
    .strict(),
])

export const partidasQuerySchema = z
  .object({
    modo: z.enum(['campana', 'infinita']).optional(),
    nivel: z.coerce.number().int().min(1).max(TOTAL_NIVELES).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict()
  .refine((q) => !q.nivel || !q.modo || q.modo === 'campana', {
    message: 'El nivel solo aplica al modo campaña',
    path: ['nivel'],
  })

export const rankingQuerySchema = z
  .object({
    modo: z.enum(['campana', 'infinita']),
    nivel: z.coerce.number().int().min(1).max(TOTAL_NIVELES).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict()
  .refine((q) => q.modo === 'infinita' || q.nivel !== undefined, {
    message: 'El nivel es obligatorio en la campaña',
    path: ['nivel'],
  })
  .refine((q) => q.modo === 'campana' || q.nivel === undefined, {
    message: 'El modo infinito no lleva nivel',
    path: ['nivel'],
  })
