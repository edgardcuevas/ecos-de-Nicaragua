// Configuración de la campaña del runner. Es la fuente de verdad para el
// servidor y para el cliente, que la recibe por GET /api/runner/estado.
//
// Los valores de vidas y velocidad deben coincidir con el motor de
// client/src/runner. Si se cambia el balance, se cambia aquí y se refleja en
// el contrato de la API.

export const VIDAS = { gratis: 5, premium: 7 }

export const vidasMaximas = (premium) => (premium ? VIDAS.premium : VIDAS.gratis)

export const NIVELES = [
  {
    id: 1,
    nombre: 'La primera noche',
    descripcion: 'El Borracho corre entre las sombras. Sobrevive hasta que cante el gallo.',
    duracion: 100,
    cierre: 5,
    lianasDesde: 12,
    rampa: { porSegundo: 0.006, max: 1.7 },
    bonos: { amanecer: 200, vida: 25 },
    pesos: { enemigo: 0.35, obstaculo: 0.4, liana: 0.25 },
  },
  {
    id: 2,
    nombre: 'El camino al río',
    descripcion: 'La Cegua conoce el sendero. La noche se alarga y los peligros llegan antes.',
    duracion: 110,
    cierre: 5,
    lianasDesde: 10,
    rampa: { porSegundo: 0.007, max: 1.8 },
    bonos: { amanecer: 250, vida: 25 },
    pesos: { enemigo: 0.4, obstaculo: 0.35, liana: 0.25 },
  },
  {
    id: 3,
    nombre: 'La quebrada',
    descripcion: 'Entre lianas y piedras, el camino se estrecha. Agacharse ya no es opcional.',
    duracion: 120,
    cierre: 5,
    lianasDesde: 8,
    rampa: { porSegundo: 0.008, max: 1.9 },
    bonos: { amanecer: 300, vida: 30 },
    pesos: { enemigo: 0.45, obstaculo: 0.3, liana: 0.25 },
  },
  {
    id: 4,
    nombre: 'El monte',
    descripcion: 'El monte cierra el paso. Las Ceguas ya no vienen solas.',
    duracion: 135,
    cierre: 5,
    lianasDesde: 6,
    rampa: { porSegundo: 0.009, max: 2.0 },
    bonos: { amanecer: 350, vida: 30 },
    pesos: { enemigo: 0.5, obstaculo: 0.25, liana: 0.25 },
  },
  {
    id: 5,
    nombre: 'El amanecer',
    descripcion: 'La última noche. Si resistes, el gallo canta y la Cegua se esfuma.',
    duracion: 150,
    cierre: 5,
    lianasDesde: 5,
    rampa: { porSegundo: 0.01, max: 2.1 },
    bonos: { amanecer: 400, vida: 35 },
    pesos: { enemigo: 0.55, obstaculo: 0.2, liana: 0.25 },
  },
]

export const TOTAL_NIVELES = NIVELES.length

export function obtenerNivel(id) {
  return NIVELES.find((nivel) => nivel.id === Number(id)) || null
}

export function esNivelValido(id) {
  return Number.isInteger(Number(id)) && Number(id) >= 1 && Number(id) <= TOTAL_NIVELES
}

// Distancia máxima teórica: velocidad base 230 px/s por la escala máxima del
// jugador (1.2) por el tope de rampa, dividida entre 10 px/m. Se deja un 10 %
// de margen para los cuadros finales.
export function distanciaMaxima(nivel) {
  return Math.ceil(((230 * 1.2 * nivel.rampa.max * nivel.duracion) / 10) * 1.1)
}

export function puntajeMaximo(nivel, premium = false) {
  return (
    distanciaMaxima(nivel) +
    nivel.bonos.amanecer +
    vidasMaximas(premium) * nivel.bonos.vida
  )
}

export function puntajeEsperado(nivel, { distancia, vidasRestantes, victoria }) {
  if (!victoria) return distancia
  return distancia + nivel.bonos.amanecer + vidasRestantes * nivel.bonos.vida
}
