export class AppError extends Error {
  constructor(codigo, mensaje, status = 400, detalles = []) {
    super(mensaje)
    this.name = 'AppError'
    this.codigo = codigo
    this.status = status
    this.detalles = detalles
  }
}

export function httpError(status, codigo, mensaje, detalles = []) {
  return new AppError(codigo, mensaje, status, detalles)
}

export const Errores = {
  validacion: (detalles = [], mensaje = 'Datos de entrada invalidos') =>
    new AppError('VALIDACION', mensaje, 400, detalles),
  noEncontrado: (codigo = 'NO_ENCONTRADO', mensaje = 'Recurso no encontrado') =>
    new AppError(codigo, mensaje, 404, []),
  noAutorizado: (mensaje = 'Sesion requerida') =>
    new AppError('SESION_REQUERIDA', mensaje, 401, []),
  prohibido: (codigo = 'PROHIBIDO', mensaje = 'No tiene permiso para esta accion') =>
    new AppError(codigo, mensaje, 403, []),
  conflicto: (codigo = 'CONFLICTO', mensaje = 'Conflicto con el estado actual') =>
    new AppError(codigo, mensaje, 409, []),
  demasiadasPeticiones: (mensaje = 'Demasiadas peticiones') =>
    new AppError('LIMITE_PETICIONES', mensaje, 429, []),
  noImplementado: (mensaje = 'Funcionalidad no implementada') =>
    new AppError('NO_IMPLEMENTADO', mensaje, 501, []),
}
