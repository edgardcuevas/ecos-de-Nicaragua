// padre/config.js
// Todo lo ajustable del juego está aquí. Los enemigos son datos: para adaptarlos al
// texto exacto de la leyenda basta con cambiar nombre, avisos, tiempos o añadir uno.

export const VISTA = { w: 320, h: 192 } // resolución lógica (se escala con píxeles nítidos)
export const MUNDO = { w: 640, h: 384 }

export const VIDAS = { gratis: 5, premium: 7 }
export const vidasMaximas = (premium) => (premium ? VIDAS.premium : VIDAS.gratis)

export const NOCHE = { segundos: 120, bonoAmanecer: 300, bonoVida: 40 }

export const JUGADOR = { vel: 72, r: 4, alcance: 22, enfriamiento: 0.42, invulnerable: 1.4 }

export const ALDEANOS = { cantidad: 9, miedo: 58, puntos: 10, comboMax: 5, comboVentana: 2.5 }

// desde = segundo en que puede empezar a aparecer; peso = probabilidad relativa.
export const ENEMIGOS = {
  perro: {
    nombre: 'Perro',
    desde: 6, peso: 0.4, hp: 1, r: 4, vel: 80, puntos: 25,
    aviso: 'Un perro: su ladrido alerta al pueblo',
  },
  monaguillo: {
    nombre: 'Monaguillo',
    desde: 22, peso: 0.25, hp: 1, r: 4, vel: 42, puntos: 30,
    aviso: 'El monaguillo toca la campana: te frena',
  },
  beata: {
    nombre: 'Beata',
    desde: 42, peso: 0.2, hp: 1, r: 4, vel: 34, puntos: 40,
    aviso: 'La beata lanza agua bendita: esquívala',
  },
  valiente: {
    nombre: 'Cura valiente',
    desde: 70, peso: 0.15, hp: 3, r: 6, vel: 50, puntos: 100,
    aviso: 'El cura valiente: aguanta 3 tajos',
  },
}

export const maxEnemigos = (t) => Math.min(6, 1 + Math.floor(t / 18))
export const esperaSpawn = (t) => Math.max(3.2, 7 - t * 0.03)
