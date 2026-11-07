import { z } from 'zod'

const ROLES = ['gratis', 'premium', 'admin']

const fechaCalendarioSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD')
  .refine((valor) => {
    const fecha = new Date(`${valor}T00:00:00.000Z`)
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  }, 'La fecha no es válida')

const fechaHoraSchema = z
  .string()
  .min(1, 'La fecha de vencimiento es obligatoria')
  .refine((valor) => !Number.isNaN(new Date(valor).getTime()), 'La fecha de vencimiento no es válida')

function convertirBooleano(valor) {
  if (valor === undefined) return undefined
  if (valor === 'true') return true
  if (valor === 'false') return false
  return valor
}

const booleanoQuerySchema = z.preprocess(
  convertirBooleano,
  z.boolean({ message: 'El valor debe ser true o false' }).optional(),
)

const pageSchema = z.coerce
  .number({ message: 'page debe ser un número entero' })
  .int('page debe ser un entero')
  .min(1, 'page debe ser mayor o igual a 1')
  .default(1)

const limitSchema = z.coerce
  .number({ message: 'limit debe ser un número entero' })
  .int('limit debe ser un entero')
  .min(1, 'limit debe ser mayor o igual a 1')
  .max(50, 'limit no puede superar 50')
  .default(20)

const paginacion = { page: pageSchema, limit: limitSchema }

export const idParamSchema = z
  .object({
    id: z.coerce
      .number({ message: 'El id debe ser numérico' })
      .int('El id debe ser un entero')
      .positive('El id debe ser mayor que 0'),
  })
  .strict()

export const listarUsuariosQuerySchema = z
  .object({
    q: z.string().trim().min(1, 'La búsqueda no puede estar vacía').max(100).optional(),
    rol: z.enum(ROLES, { message: 'El rol no es válido' }).optional(),
    premium: booleanoQuerySchema,
    ...paginacion,
  })
  .strict()

export const rolBodySchema = z
  .object({
    rol: z.enum(ROLES, { message: 'El rol no es válido' }),
  })
  .strict()

export const suscripcionBodySchema = z
  .object({
    planId: z.coerce
      .number({ message: 'planId debe ser numérico' })
      .int('planId debe ser un entero')
      .positive('planId debe ser mayor que 0'),
    fechaInicio: fechaCalendarioSchema.optional(),
    fechaFin: fechaCalendarioSchema.optional(),
  })
  .strict()
  .refine(
    (datos) =>
      !datos.fechaInicio || !datos.fechaFin || datos.fechaFin >= datos.fechaInicio,
    {
      message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
      path: ['fechaFin'],
    },
  )

export const crearCodigosBodySchema = z
  .object({
    planId: z.coerce
      .number({ message: 'planId debe ser numérico' })
      .int('planId debe ser un entero')
      .positive('planId debe ser mayor que 0'),
    cantidad: z.coerce
      .number({ message: 'cantidad debe ser numérica' })
      .int('cantidad debe ser un entero')
      .min(1, 'cantidad debe ser mayor o igual a 1')
      .max(100, 'cantidad no puede superar 100'),
    fechaVencimiento: fechaHoraSchema,
  })
  .strict()

export const listarCodigosQuerySchema = z
  .object({
    usado: booleanoQuerySchema,
    planId: z.coerce
      .number({ message: 'planId debe ser numérico' })
      .int('planId debe ser un entero')
      .positive('planId debe ser mayor que 0')
      .optional(),
    ...paginacion,
  })
  .strict()

export const listarAuditoriaQuerySchema = z
  .object({
    accion: z.string().trim().min(1, 'La acción no puede estar vacía').max(80).optional(),
    adminId: z.coerce
      .number({ message: 'adminId debe ser numérico' })
      .int('adminId debe ser un entero')
      .positive('adminId debe ser mayor que 0')
      .optional(),
    ...paginacion,
  })
  .strict()
