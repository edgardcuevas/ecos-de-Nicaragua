// engine/Collision.js
// Detección de colisiones AABB entre el jugador y las entidades del juego.

/** @returns {boolean} true si dos cajas {x, y, w, h} se solapan. */
export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** Colisión entre el jugador y una entidad con getBounds(). */
export function colisionaJugador(jugador, entidad) {
  return aabb(jugador.getBounds(), entidad.getBounds())
}
