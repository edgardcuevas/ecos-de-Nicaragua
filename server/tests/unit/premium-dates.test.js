import test from 'node:test'
import assert from 'node:assert/strict'

import {
  diasHasta,
  hoyCalendario,
  serializarSuscripcion,
  sumarDias,
} from '../../src/services/suscripciones.service.js'

test('hoyCalendario devuelve AAAA-MM-DD', () => {
  assert.match(hoyCalendario(), /^\d{4}-\d{2}-\d{2}$/)
})

test('sumarDias suma días sobre fechas calendario', () => {
  assert.equal(sumarDias('2026-11-06', 0), '2026-11-06')
  assert.equal(sumarDias('2026-11-06', 1), '2026-11-07')
  assert.equal(sumarDias('2026-11-30', 1), '2026-12-01')
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01')
})

test('diasHasta calcula días restantes', () => {
  const hoy = hoyCalendario()
  assert.equal(diasHasta(hoy), 0)
  assert.equal(diasHasta(sumarDias(hoy, 5)), 5)
})

test('serializarSuscripcion normaliza fechas y plan', () => {
  const fila = {
    id: 7,
    fecha_inicio: '2026-11-06',
    fecha_fin: '2026-12-05',
    estado: 'activa',
    plan_id: 1,
    plan_nombre: 'Premium 30 días',
    duracion_dias: 30,
  }
  const resultado = serializarSuscripcion(fila)
  assert.equal(resultado.id, 7)
  assert.equal(resultado.fechaInicio, '2026-11-06')
  assert.equal(resultado.fechaFin, '2026-12-05')
  assert.equal(resultado.estado, 'activa')
  assert.equal(resultado.plan.nombre, 'Premium 30 días')
  assert.equal(resultado.plan.duracionDias, 30)
  assert.equal(resultado.diasRestantes, diasHasta('2026-12-05'))
})

test('serializarSuscripcion devuelve null sin fila', () => {
  assert.equal(serializarSuscripcion(null), null)
})
