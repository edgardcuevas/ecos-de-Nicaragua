// engine/Spawner.js
// Generador único de peligros (obstáculos y Ceguas) con separación garantizada.
//
// Antes cada tipo tenía su propio temporizador, y las Ceguas además avanzan a una
// velocidad distinta, así que podían llegar casi juntas al jugador. Aquí todo pasa
// por una sola cola y se garantiza que dos peligros consecutivos lleguen al jugador
// con al menos SEPARACION_MIN segundos de diferencia.
//
// Un salto dura ~0.69 s (el aire es independiente de la escala). Con 1.15 s entre
// llegadas, el jugador aterriza y le quedan ~0.45 s para reaccionar al siguiente.

export const SEPARACION_MIN = 1.15 // s entre llegadas consecutivas al jugador
const ESPERA_MIN = 1.3 // s entre apariciones (el mínimo real lo impone la separación)
const ESPERA_MAX = 2.5
const PROB_ENEMIGO = 0.4
const ESPERA_INICIAL = 1.4

export class Spawner {
  constructor() {
    this.timer = ESPERA_INICIAL
  }

  reset() {
    this.timer = ESPERA_INICIAL
  }

  /**
   * @param {number} dt
   * @param {{
   *   speed: number,
   *   playerX: number,
   *   peligros: Array<{x:number, speedFactor?:number}>,
   *   crear: (tipo: 'enemigo'|'obstaculo') => {x:number, speedFactor?:number},
   * }} ctx
   * @returns la entidad creada, o null si todavía no toca.
   */
  update(dt, { speed, playerX, peligros, crear }) {
    this.timer -= dt
    if (this.timer > 0) return null

    const tipo = Math.random() < PROB_ENEMIGO ? 'enemigo' : 'obstaculo'
    const nuevo = crear(tipo)
    this.separar(nuevo, speed, playerX, peligros)
    this.timer = ESPERA_MIN + Math.random() * (ESPERA_MAX - ESPERA_MIN)
    return nuevo
  }

  /**
   * Si el peligro nuevo llegaría demasiado cerca (en tiempo) de alguno existente,
   * se aparta más a la derecha. Sigue fuera de pantalla, así que no se nota.
   */
  separar(nuevo, speed, playerX, peligros) {
    let ultimaLlegada = -Infinity
    for (const p of peligros) {
      if (p.x <= playerX) continue // ya pasó al jugador
      const llegada = (p.x - playerX) / (speed * (p.speedFactor ?? 1))
      if (llegada > ultimaLlegada) ultimaLlegada = llegada
    }
    if (ultimaLlegada === -Infinity) return

    const vel = speed * (nuevo.speedFactor ?? 1)
    const llegadaNueva = (nuevo.x - playerX) / vel
    const minima = ultimaLlegada + SEPARACION_MIN
    if (llegadaNueva < minima) nuevo.x = playerX + vel * minima
  }
}
