import { z } from 'zod'

const correoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'El correo es demasiado corto')
  .max(254, 'El correo es demasiado largo')
  .refine((valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor), {
    message: 'Debe ser un correo válido',
  })

const nombreUsuarioSchema = z
  .string()
  .trim()
  .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
  .max(50, 'El nombre de usuario no puede superar 50 caracteres')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Solo se permiten letras, números, punto, guion y guion bajo')

const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .max(128, 'La contraseña no puede superar 128 caracteres')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra')
  .regex(/[0-9]/, 'La contraseña debe incluir al menos un número')

export const registroSchema = z
  .object({
    correo: correoSchema,
    nombreUsuario: nombreUsuarioSchema,
    password: passwordSchema,
  })
  .strict()

export const loginSchema = z
  .object({
    correoOUsuario: z
      .string()
      .trim()
      .min(1, 'Indica tu correo o nombre de usuario')
      .max(254, 'El identificador es demasiado largo'),
    password: z.string().min(1, 'La contraseña es obligatoria').max(128),
  })
  .strict()

export const recuperarSchema = z
  .object({
    correo: correoSchema,
  })
  .strict()

export const restablecerSchema = z
  .object({
    token: z.string().min(1, 'El token es obligatorio').max(200),
    password: passwordSchema,
  })
  .strict()
