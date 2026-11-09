// runner/config.js
// Constantes del cliente. La configuración de cada noche llega del servidor
// por GET /api/runner/estado; aquí solo quedan las vidas y la fórmula de
// velocidad que comparten todos los niveles.

// Vidas máximas por plan. El premium NO es ilimitado: solo tiene más margen de error.
// Debe coincidir con server/src/config/runner.js.
export const VIDAS = { gratis: 5, premium: 7 }

export const vidasMaximas = (premium) => (premium ? VIDAS.premium : VIDAS.gratis)

// Aceleración progresiva: la velocidad sube con el tiempo de partida (sin contar
// pausas) hasta el tope definido por la noche.
export const factorVelocidad = (segundos, rampa) =>
  Math.min(rampa.max, 1 + segundos * rampa.porSegundo)
