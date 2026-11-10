// padre/config.js
// Respaldo local de la configuración de "El Padre sin Cabeza". El servidor es la
// fuente de verdad y la envía por GET /api/padre/estado; estos valores permiten
// jugar en modo práctica si la API no responde. Deben coincidir con
// server/src/config/padre.js.

export const VISTA = { w: 320, h: 192 } // resolución lógica (se escala con píxeles nítidos)
export const MUNDO = { w: 640, h: 384 }

export const VIDAS = { gratis: 5, premium: 7 }
export const vidasMaximas = (premium) => (premium ? VIDAS.premium : VIDAS.gratis)

export const JUGADOR = { vel: 72, r: 4, alcance: 22, enfriamiento: 0.42, invulnerable: 1.4 }

export const ALDEANOS = {
  miedo: 58,
  puntos: 10,
  comboMax: 5,
  comboVentana: 2.5,
  // Tiempo mínimo antes de que un aldeano asesinado o salvado sea reemplazado.
  reaparicionMin: 3,
}

const BASE_ENEMIGOS = {
  perro: {
    nombre: 'Perro',
    hp: 1,
    r: 4,
    vel: 80,
    puntos: 25,
    aviso: 'Un perro: su ladrido alerta al pueblo',
  },
  monaguillo: {
    nombre: 'Monaguillo',
    hp: 1,
    r: 4,
    vel: 42,
    puntos: 30,
    aviso: 'El monaguillo toca la campana: te frena',
  },
  beata: {
    nombre: 'Beata',
    hp: 1,
    r: 4,
    vel: 34,
    puntos: 40,
    aviso: 'La beata lanza agua bendita: esquívala',
  },
  valiente: {
    nombre: 'Cura valiente',
    hp: 3,
    r: 6,
    vel: 50,
    puntos: 100,
    aviso: 'El cura valiente: aguanta 3 tajos',
  },
}

const APARICION = {
  1: {
    perro: { desde: 10, peso: 0.4 },
    monaguillo: { desde: 30, peso: 0.25 },
    beata: { desde: 55, peso: 0.2 },
    valiente: { desde: 75, peso: 0.15 },
  },
  2: {
    perro: { desde: 8, peso: 0.4 },
    monaguillo: { desde: 25, peso: 0.25 },
    beata: { desde: 45, peso: 0.2 },
    valiente: { desde: 65, peso: 0.15 },
  },
  3: {
    perro: { desde: 6, peso: 0.4 },
    monaguillo: { desde: 20, peso: 0.25 },
    beata: { desde: 35, peso: 0.2 },
    valiente: { desde: 55, peso: 0.15 },
  },
  4: {
    perro: { desde: 5, peso: 0.4 },
    monaguillo: { desde: 15, peso: 0.25 },
    beata: { desde: 25, peso: 0.2 },
    valiente: { desde: 45, peso: 0.15 },
  },
  5: {
    perro: { desde: 4, peso: 0.4 },
    monaguillo: { desde: 12, peso: 0.25 },
    beata: { desde: 15, peso: 0.2 },
    valiente: { desde: 30, peso: 0.15 },
  },
}

function construirEnemigos(id) {
  const salida = {}
  for (const [tipo, base] of Object.entries(BASE_ENEMIGOS)) {
    salida[tipo] = { ...base, ...APARICION[id][tipo] }
  }
  return salida
}

export const NIVELES = [
  {
    id: 1,
    nombre: 'El atrio de León Viejo',
    descripcion: 'La primera noche. El Padre despierta entre las ruinas y el pueblo apenas comienza a temerle.',
    duracion: 90,
    aldeanos: 8,
    maxEnemigos: { inicial: 1, maximo: 4, cada: 20 },
    esperaSpawn: { inicial: 7.5, min: 4.5, porSegundo: 0.03 },
    velocidadEnemigos: 0.9,
    bonos: { amanecer: 200, vida: 25 },
    objetos: { max: 2, cada: 45 },
  },
  {
    id: 2,
    nombre: 'Las calles de León',
    descripcion: 'La ciudad ya conoce tu paso. Las campanas suenan antes y los perros salen en manada.',
    duracion: 105,
    aldeanos: 9,
    maxEnemigos: { inicial: 1, maximo: 5, cada: 18 },
    esperaSpawn: { inicial: 6.8, min: 4, porSegundo: 0.03 },
    velocidadEnemigos: 1,
    bonos: { amanecer: 250, vida: 25 },
    objetos: { max: 2, cada: 50 },
  },
  {
    id: 3,
    nombre: 'El cementerio',
    descripcion: 'Entre las tumbas, el rosario brilla. Los valientes llegan con agua bendita y antorchas.',
    duracion: 120,
    aldeanos: 10,
    maxEnemigos: { inicial: 1, maximo: 6, cada: 16 },
    esperaSpawn: { inicial: 6, min: 3.5, porSegundo: 0.03 },
    velocidadEnemigos: 1.1,
    bonos: { amanecer: 300, vida: 30 },
    objetos: { max: 2, cada: 55 },
  },
  {
    id: 4,
    nombre: 'La ribera del Xolotlán',
    descripcion: 'El viento del lago trae plegarias. La noche se alarga y el pueblo entero te busca.',
    duracion: 135,
    aldeanos: 11,
    maxEnemigos: { inicial: 1, maximo: 7, cada: 14 },
    esperaSpawn: { inicial: 5.2, min: 3, porSegundo: 0.03 },
    velocidadEnemigos: 1.2,
    bonos: { amanecer: 350, vida: 30 },
    objetos: { max: 1, cada: 65 },
  },
  {
    id: 5,
    nombre: 'La última campana',
    descripcion: 'Suena la campana mayor. Si resistes hasta el alba, el Padre descansará una noche más.',
    duracion: 150,
    aldeanos: 12,
    maxEnemigos: { inicial: 1, maximo: 8, cada: 12 },
    esperaSpawn: { inicial: 4.4, min: 2.5, porSegundo: 0.03 },
    velocidadEnemigos: 1.3,
    bonos: { amanecer: 400, vida: 35 },
    objetos: { max: 1, cada: 75 },
  },
].map((nivel) => ({ ...nivel, enemigos: construirEnemigos(nivel.id) }))

export const TOTAL_NIVELES = NIVELES.length

export const INFINITO = {
  rondaSegundos: 30,
  descansoSegundos: 4,
  maxRondas: 120,
  maxDuracionSegundos: 3600,
  bonoRonda: 150,
  objetosCadaRondas: 3,
  maxObjetos: 10,
  aldeanosBase: 8,
  aldeanosMax: 16,
  enemigosBase: 4,
  enemigosMax: 12,
  spawnInicial: 7.5,
  spawnMin: 2.2,
  spawnPaso: 0.25,
  velocidadMax: 1.4,
  velocidadPaso: 0.02,
}

export const OBJETOS = {
  rosario: {
    id: 'rosario',
    nombre: 'El Rosario del Padre',
    descripcion: 'Un rosario de cuentas gastadas. Al recogerlo, el Padre recupera una vida.',
    vida: 1,
    duracion: 20,
    maxActivos: 1,
  },
}

export const PUNTOS = {
  aldeano: ALDEANOS.puntos,
  perro: BASE_ENEMIGOS.perro.puntos,
  monaguillo: BASE_ENEMIGOS.monaguillo.puntos,
  beata: BASE_ENEMIGOS.beata.puntos,
  valiente: BASE_ENEMIGOS.valiente.puntos,
}

export function configuracionNivel(id) {
  return NIVELES.find((nivel) => nivel.id === Number(id)) ?? null
}

export function configuracionRonda(ronda) {
  const r = Math.max(1, Math.floor(Number(ronda) || 1))
  const aldeanos = Math.min(INFINITO.aldeanosMax, INFINITO.aldeanosBase + Math.floor((r - 1) / 3))
  const tope = Math.min(INFINITO.enemigosMax, INFINITO.enemigosBase + Math.floor((r - 1) / 2))
  const espera = Math.max(INFINITO.spawnMin, INFINITO.spawnInicial - (r - 1) * INFINITO.spawnPaso)
  const velocidad = 1 + Math.min(INFINITO.velocidadMax - 1, (r - 1) * INFINITO.velocidadPaso)

  const desde = {
    perro: Math.max(2, 8 - (r - 1) * 0.5),
    monaguillo: Math.max(4, 14 - (r - 1) * 0.8),
    beata: Math.max(6, 20 - (r - 1)),
    valiente: Math.max(8, 26 - (r - 1) * 1.2),
  }

  const enemigos = {}
  for (const [tipo, base] of Object.entries(BASE_ENEMIGOS)) {
    enemigos[tipo] = { ...base, desde: desde[tipo], peso: APARICION[1][tipo].peso }
  }

  return {
    id: 0,
    ronda: r,
    nombre: `Ronda ${r}`,
    descripcion: 'La noche no termina: sobrevive ronda tras ronda.',
    duracion: INFINITO.rondaSegundos,
    aldeanos,
    maxEnemigos: { inicial: tope, maximo: tope, cada: 0 },
    esperaSpawn: { inicial: espera, min: espera, porSegundo: 0 },
    velocidadEnemigos: velocidad,
    bonos: { amanecer: 0, vida: 0 },
    objetos: { max: INFINITO.maxObjetos, cada: 0, porRondas: INFINITO.objetosCadaRondas },
    enemigos,
  }
}

export function topeEnemigos(config, segundos) {
  const tope = config?.maxEnemigos
  if (!tope?.cada) return tope?.maximo ?? 1
  return Math.min(tope.maximo, tope.inicial + Math.floor(segundos / tope.cada))
}

export function esperaSpawn(config, segundos) {
  const espera = config?.esperaSpawn
  if (!espera) return 4
  return Math.max(espera.min, espera.inicial - segundos * espera.porSegundo)
}
