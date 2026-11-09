// runner/config.js
// Balance del juego en un solo lugar. Ajusta estos números sin tocar el motor.

// Vidas máximas por plan. El premium NO es ilimitado: solo tiene más margen de error.
export const VIDAS = { gratis: 5, premium: 7 }

export const vidasMaximas = (premium) => (premium ? VIDAS.premium : VIDAS.gratis)

// Aceleración progresiva: la velocidad sube con el tiempo de partida (sin contar pausas)
// hasta un tope. Con estos valores: +0.6 %/s, tope x1.7 (se alcanza a ~2 min).
export const RAMPA = { porSegundo: 0.006, max: 1.7 }

export const factorVelocidad = (segundos) => Math.min(RAMPA.max, 1 + segundos * RAMPA.porSegundo)

// Una partida es una noche: sobrevive hasta que cante el gallo y ganas.
// `cierre`: en los últimos segundos ya no salen peligros nuevos, para que el final sea limpio.
// `lianasDesde`: las lianas (hay que agacharse) aparecen después, cuando ya dominas el salto.
export const NOCHE = { segundos: 100, cierre: 5, bonoAmanecer: 200, bonoVida: 25, lianasDesde: 12 }
