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
const PESOS_BASE = { enemigo: 0.35, obstaculo: 0.4, liana: 0.25 }
const ESPERA_INICIAL = 1.4

function elegir(pesos) {
  let total = 0
  for (const k in pesos) total += pesos[k]
  let r = Math.random() * total
  for (const [k, v] of Object.entries(pesos)) {
    r -= v
    if (v > 0 && r <= 0) return k
  }
  return 'obstaculo'
}

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
   *   crear: (tipo: 'enemigo'|'obstaculo'|'liana') => {x:number, speedFactor?:number},
   *   pesos?: Record<string, number>, bloqueado?: boolean,
   * }} ctx
   * @returns la entidad creada, o null si todavía no toca.
   */
  update(dt, { speed, playerX, peligros, crear, pesos = PESOS_BASE, bloqueado = false }) {
    this.timer -= dt
    if (this.timer > 0 || bloqueado) return null

    const tipo = elegir(pesos)
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
