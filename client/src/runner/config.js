// runner/config.js
// Balance del juego en un solo lugar. Ajusta estos números sin tocar el motor.

// Vidas máximas por plan. El premium NO es ilimitado: solo tiene más margen de error.
export const VIDAS = { gratis: 5, premium: 7 }

export const vidasMaximas = (premium) => (premium ? VIDAS.premium : VIDAS.gratis)
