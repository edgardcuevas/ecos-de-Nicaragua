// engine/Mundo.js
// El pueblo: casas, iglesia, cementerio, árboles. Colisiones, puertas y fondo estático.
import { MUNDO } from '../config.js'
import * as S from './Sprites.js'

export const IGLESIA = { x: 272, y: 22, w: 96, h: 62, iglesia: true }

const T = ['#5a2d2d', '#4a3a2a', '#3a2d4a', '#2d4a3f']
const CASAS = [
  [40, 40, 56, 34], [130, 34, 48, 32], [440, 38, 52, 34], [540, 52, 54, 32],
  [50, 214, 50, 34], [150, 224, 46, 32], [470, 222, 54, 34], [560, 214, 50, 34],
  [60, 300, 56, 36], [170, 310, 50, 32], [420, 304, 56, 34], [520, 296, 52, 36],
].map(([x, y, w, h], i) => ({ x, y, w, h, tejado: T[i % 4] }))

const ARBOLES = [
  [20, 120], [100, 130], [200, 120], [430, 120], [520, 130], [610, 120], [20, 200],
  [610, 190], [250, 270], [400, 264], [30, 270], [600, 270], [300, 350], [350, 356], [260, 350],
].map(([x, y]) => ({ x, y }))

const TUMBAS = [[236, 112], [252, 118], [268, 112], [372, 112], [388, 118], [404, 112]].map(([x, y]) => ({ x, y }))
const POZO = { x: 320, y: 190 }
const CAMINO_Y = [178, 196]
const CAMINO_X = [310, 330]

export class Mundo {
  constructor() {
    this.casas = CASAS
    this.iglesia = IGLESIA
    this.arboles = ARBOLES
    this.tumbas = TUMBAS
    this.pozo = POZO
    this.rects = [...CASAS, IGLESIA, ...TUMBAS.map((t) => ({ x: t.x - 3, y: t.y - 4, w: 6, h: 4 }))]
    this.circulos = [...ARBOLES.map((a) => ({ x: a.x, y: a.y - 2, r: 3 })), { x: POZO.x, y: POZO.y - 3, r: 7 }]
    this.puertas = [...CASAS, IGLESIA].map((c) => ({ x: c.x + c.w / 2, y: c.y + c.h + 4 }))
    this.luces = [...CASAS, IGLESIA].flatMap((c) =>
      c.iglesia
        ? [{ x: c.x + 18, y: c.y + c.h + 4, r: 34 }, { x: c.x + c.w - 18, y: c.y + c.h + 4, r: 34 }]
        : [{ x: c.x + 9, y: c.y + c.h + 4, r: 24 }, { x: c.x + c.w - 9, y: c.y + c.h + 4, r: 24 }],
    )
    this.dibujables = [
      ...CASAS.map((c) => ({ y: c.y + c.h, dibujar: (ctx, t) => S.casa(ctx, c, t) })),
      { y: IGLESIA.y + IGLESIA.h, dibujar: (ctx, t) => S.iglesia(ctx, IGLESIA, t) },
      ...ARBOLES.map((a) => ({ y: a.y, dibujar: (ctx) => S.arbol(ctx, a) })),
      ...TUMBAS.map((a) => ({ y: a.y, dibujar: (ctx) => S.tumba(ctx, a) })),
      { y: POZO.y, dibujar: (ctx) => S.pozo(ctx, POZO) },
    ]
    this.fondo = null
  }

  choca(x, y, r) {
    if (x < r || y < r || x > MUNDO.w - r || y > MUNDO.h - r) return true
    for (const q of this.rects) {
      const cx = Math.max(q.x, Math.min(x, q.x + q.w))
      const cy = Math.max(q.y, Math.min(y, q.y + q.h))
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true
    }
    for (const c of this.circulos) {
      if ((x - c.x) ** 2 + (y - c.y) ** 2 < (c.r + r) ** 2) return true
    }
    return false
  }

  /** Mueve una entidad deslizando por las paredes. Devuelve si avanzó algo. */
  mover(e, dx, dy) {
    let movio = false
    if (dx && !this.choca(e.x + dx, e.y, e.r)) {
      e.x += dx
      movio = true
    }
    if (dy && !this.choca(e.x, e.y + dy, e.r)) {
      e.y += dy
      movio = true
    }
    return movio
  }

  puertaCercana(x, y) {
    let mejor = this.puertas[0]
    let md = Infinity
    for (const p of this.puertas) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2
      if (d < md) {
        md = d
        mejor = p
      }
    }
    return mejor
  }

  puertaAlAzar() {
    return this.puertas[Math.floor(Math.random() * this.puertas.length)]
  }

  /** Punto cualquiera sobre los caminos del pueblo. */
  puntoDeCamino() {
    for (let i = 0; i < 12; i++) {
      const horizontal = Math.random() < 0.6
      const x = horizontal ? 20 + Math.random() * 600 : CAMINO_X[0] + Math.random() * 20
      const y = horizontal ? CAMINO_Y[0] + 2 + Math.random() * 14 : 92 + Math.random() * 280
      if (!this.choca(x, y, 4)) return { x, y }
    }
    return { x: 300, y: 186 }
  }

  construirFondo() {
    const c = document.createElement('canvas')
    c.width = MUNDO.w
    c.height = MUNDO.h
    const g = c.getContext('2d')
    g.fillStyle = '#17251f'
    g.fillRect(0, 0, MUNDO.w, MUNDO.h)
    let s = 7
    const rnd = () => {
      s = (s * 16807) % 2147483647
      return s / 2147483647
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = rnd() < 0.5 ? '#1d2e26' : '#122019'
      g.fillRect(Math.floor(rnd() * MUNDO.w), Math.floor(rnd() * MUNDO.h), 2, 1)
    }
    g.fillStyle = '#3a3226'
    g.fillRect(0, CAMINO_Y[0], MUNDO.w, CAMINO_Y[1] - CAMINO_Y[0])
    g.fillRect(CAMINO_X[0], 84, CAMINO_X[1] - CAMINO_X[0], MUNDO.h - 84)
    for (const p of this.puertas) {
      if (p.y < CAMINO_Y[0]) g.fillRect(p.x - 3, p.y - 4, 6, CAMINO_Y[0] - p.y + 4)
      else if (p.y > CAMINO_Y[1]) g.fillRect(p.x - 3, CAMINO_Y[1], 6, p.y - CAMINO_Y[1])
    }
    g.fillStyle = '#4a4030'
    g.beginPath()
    g.arc(POZO.x, POZO.y, 22, 0, Math.PI * 2)
    g.fill()
    for (let i = 0; i < 500; i++) {
      const x = Math.floor(rnd() * MUNDO.w)
      const y = Math.floor(rnd() * MUNDO.h)
      const d = g.getImageData(x, y, 1, 1).data
      if (d[0] > 50) {
        g.fillStyle = rnd() < 0.5 ? '#2e271d' : '#463c2c'
        g.fillRect(x, y, 2, 1)
      }
    }
    this.fondo = c
    return c
  }
}
