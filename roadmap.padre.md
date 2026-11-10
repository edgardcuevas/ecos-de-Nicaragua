# Roadmap — El Padre sin Cabeza

Minijuego de acción cenital integrado al frontend React de Ecos de Nicaragua.
Este documento define el módulo **M12 — Progreso de El Padre sin Cabeza** y su
contrato de backend. El contrato vinculante se trasladará también a
`roadmap.backend.md` antes de implementar, según la regla de fuente de verdad del
proyecto.

## 1. Estado

- Creado: 2026-11-09.
- Estado: **implementado; falta la prueba manual en navegador (M12-13)**.
- Juego base existente en `client/src/padre/` (sin niveles, modos ni backend).
- Backend del runner (M11) ya implementado; este módulo es independiente.
- Roadmap creado antes de empezar la implementación.
- M12 asignado al **desarrollador C**.
- Los archivos compartidos los aplicó el **desarrollador A** (migración 006, router y CSRF).

## 2. Objetivo

Convertir el juego actual en una experiencia con:

1. **Campaña de 5 niveles** con dificultad creciente.
2. **Progreso por usuario** en el servidor: desbloqueos, récords e historial.
3. **Modo infinito por rondas**, separado de la campaña.
4. **El Rosario del Padre**, ítem que recupera vidas.
5. **Ranking** por modo y nivel, separado en gratis y premium.
6. Validación de resultados en el servidor y aislamiento total entre usuarios.

## 3. Alcance y reglas de producto

### Incluido

- Campaña de 5 niveles.
- Modo infinito por rondas.
- Ítem Rosario.
- Guardado de partidas, récords y desbloqueos por usuario.
- Historial propio paginado.
- Ranking público separado por plan.
- Invitado: solo nivel 1 de la campaña, con récord local.
- Modo infinito y niveles 2–5: requieren cuenta.
- Premium: 7 vidas base en lugar de 5; no desbloquea niveles.

### Fuera de alcance

- Pasarela de pago.
- Monedas, tienda, logros o inventario permanente.
- Multijugador.
- Anti-cheat real. El servidor valida coherencia, igual que M11.
- Cambios al módulo del runner (M11).
- Nuevos assets de imagen o audio; los sprites y sonidos siguen siendo procedurales.

## 4. Decisiones cerradas

- El ítem es **El Rosario del Padre**. Recupera 1 vida y puede superar el máximo base.
- El invitado solo juega el **nivel 1** de la campaña. El modo infinito está bloqueado.
- El ranking se muestra en la UI en una tabla simple.
- La partida se guarda al terminar: victoria o derrota. **Detener no guarda**.
- El modo infinito solo termina al quedarse sin vidas; no tiene victoria.
- El puntaje nace en el cliente, pero el servidor lo valida con cotas calculadas
  a partir de las estadísticas. No es anti-cheat real.
- El servidor es la fuente de verdad de la configuración; el cliente mantiene un
  fallback local solo para práctica sin conexión.

## 5. Campaña

### 5.1 Niveles

| Nivel | Nombre | Duración | Aldeanos | Máx. enemigos | Spawn | Enemigos desde | Rosarios |
|---|---|---|---|---|---|---|---|
| 1 | El atrio de León Viejo | 90 s | 8 | 1 → 4 | 7.5 → 4.5 s | perro 10, monaguillo 30, beata 55, valiente 75 | 2 |
| 2 | Las calles de León | 105 s | 9 | 1 → 5 | 6.8 → 4.0 s | perro 8, monaguillo 25, beata 45, valiente 65 | 2 |
| 3 | El cementerio | 120 s | 10 | 1 → 6 | 6.0 → 3.5 s | perro 6, monaguillo 20, beata 35, valiente 55 | 2 |
| 4 | La ribera del Xolotlán | 135 s | 11 | 1 → 7 | 5.2 → 3.0 s | perro 5, monaguillo 15, beata 25, valiente 45 | 1 |
| 5 | La última campana | 150 s | 12 | 1 → 8 | 4.4 → 2.5 s | perro 4, monaguillo 12, beata 15, valiente 30 | 1 |

La columna **Máx. enemigos** representa la rampa `inicial → máximo`; el máximo se
alcanza con el paso del tiempo, no desde el primer segundo.

### 5.2 Parámetros por nivel

| Nivel | Velocidad enemigos | Rampa máx. enemigos | Bonus amanecer | Bonus por vida | Rosario: máx. / cada |
|---|---|---|---|---|---|
| 1 | 0.9x | 1 + 1 cada 20 s, tope 4 | 200 | 25 | 2 / 45 s |
| 2 | 1.0x | 1 + 1 cada 18 s, tope 5 | 250 | 25 | 2 / 50 s |
| 3 | 1.1x | 1 + 1 cada 16 s, tope 6 | 300 | 30 | 2 / 55 s |
| 4 | 1.2x | 1 + 1 cada 14 s, tope 7 | 350 | 30 | 1 / 65 s |
| 5 | 1.3x | 1 + 1 cada 12 s, tope 8 | 400 | 35 | 1 / 75 s |

Parámetros globales heredados del juego actual:

- Aldeano: 10 puntos base, combo máximo 5, ventana de combo 2.5 s.
- Perro: 1 HP, 25 puntos.
- Monaguillo: 1 HP, 30 puntos.
- Beata: 1 HP, 40 puntos.
- Cura valiente: 3 HP, 100 puntos.
- Velocidad de aldeanos y comportamiento de miedo: sin cambios.
- Jugador: velocidad, alcance, enfriamiento e invulnerabilidad actuales.

### 5.3 Reglas de campaña

- Nivel 1 siempre desbloqueado.
- Ganar el nivel N desbloquea el N+1.
- Perder no desbloquea.
- El invitado solo ve y juega el nivel 1.
- El nivel 1 de invitado guarda su récord en `localStorage`.
- Los niveles 2–5 exigen sesión.
- Al ganar, se suma `bonos.amanecer + vidasRestantes * bonos.vida`.
- Al perder, no hay bonus de amanecer.
- La victoria exige al menos 1 vida restante.
- La derrota exige 0 vidas restantes.

## 6. Modo infinito por rondas

### 6.1 Reglas

- Cada ronda dura **30 s**.
- Entre rondas hay **4 s de descanso**.
- La ronda 1 empieza con la dificultad del nivel 1.
- Al terminar una ronda se limpian enemigos y proyectiles y se muestra un aviso.
- El jugador puede moverse durante el descanso, pero no recibe daño.
- La partida termina al quedarse sin vidas.
- No hay victoria.
- Solo se guarda al morir.
- El récord se ordena por **rondas superadas** y luego por puntaje.
- Cada ronda superada suma **150 puntos**.
- El Rosario puede aparecer cada 3 rondas superadas, al empezar la ronda siguiente, con un máximo de 10 por partida. Mientras está activo, el HUD muestra el rumbo y la distancia.
- El invitado no puede jugar este modo.

### 6.2 Escalado por ronda

Para la ronda `r` (empezando en 1):

```text
aldeanos       = min(16, 8 + floor((r - 1) / 3))
maxEnemigos    = min(12, 4 + floor((r - 1) / 2))
esperaSpawn    = max(2.2, 7.5 - (r - 1) * 0.25)
velocidad      = 1 + min(0.4, (r - 1) * 0.02)
perro.desde    = max(2, 8 - (r - 1) * 0.5)
monaguillo.desde = max(4, 14 - (r - 1) * 0.8)
beata.desde    = max(6, 20 - (r - 1))
valiente.desde = max(8, 26 - (r - 1) * 1.2)
```

La función `configuracionRonda(ronda)` debe existir tanto en
`server/src/config/padre.js` como en `client/src/padre/config.js` y devolver los
mismos valores. El servidor usa esta función para validar los topes; el cliente
la usa para jugar.

### 6.3 Límites del servidor

- Duración máxima aceptada: **3600 s**.
- Rondas máximas aceptadas: **120**.
- `rondas <= floor(duracionSegundos / 30) + 1`.
- `duracionSegundos >= rondas * 30` cuando `rondas > 0`.
- `objetosUsados <= min(10, floor(rondas / 3) + 1)`.
- `vidasRestantes = 0` al guardar una partida infinita terminada.

## 7. El Rosario del Padre

### 7.1 Comportamiento

- Nombre visible: **El Rosario del Padre**.
- Recupera **1 vida**.
- Puede superar el máximo base: 5 + rosarios usados, o 7 + rosarios usados en premium.
- Solo hay un rosario activo a la vez.
- Desaparece a los **20 s** si no se recoge. Durante el juego el HUD muestra una brújula con el rumbo y la distancia al rosario mientras esté activo.
- Aparece cerca del atrio de la iglesia, el cementerio o las puertas del pueblo.
- Tiene luz propia en la oscuridad.
- Al recogerlo suena una campanilla suave y se muestra un aviso.
- El HUD muestra cuántos rosarios se han usado.

### 7.2 Aparición

- Campaña: según `nivel.objetos.max` y `nivel.objetos.cada`.
- Infinito: cada 3 rondas superadas, al empezar la ronda siguiente, máximo 10 por partida.
- No se genera si ya hay un rosario activo.
- No se genera dentro de un obstáculo.
- Se prefiere un punto accesible del mapa.

### 7.3 Validación

- `vidasRestantes <= vidasMaximas(premium) + objetosUsados`.
- `objetosUsados <=` el máximo del nivel o del modo.
- `objetosUsados` también está limitado por el tiempo jugado.
- El servidor no acepta vidas extra sin rosarios que las justifiquen.

## 8. Puntaje

### 8.1 Puntos base

```text
base = aldeanos * 10
     + perro * 25
     + monaguillo * 30
     + beata * 40
     + valiente * 100
```

`salvados` no otorga puntos; se guarda como estadística.

### 8.2 Puntaje del cliente

- Cada baja multiplica su valor base por el combo actual (1 a 5).
- El cliente acumula `puntosCombate`.
- En campaña, al ganar suma `bonos.amanecer + vidasRestantes * bonos.vida`.
- En infinito, cada ronda superada suma `150`.
- El total mostrado en el HUD es `puntaje`.
- `resultado()` devuelve `puntaje` y las estadísticas.

### 8.3 Cotas del servidor

```text
bonos = campana y victoria:
          nivel.bonos.amanecer + vidasRestantes * nivel.bonos.vida
        campana y derrota:
          0
        infinita:
          150 * rondas

minimo = base + bonos
maximo = base * comboMax + bonos
```

El servidor rechaza `puntaje < minimo` o `puntaje > maximo`.

Esta validación no reconstruye la secuencia exacta de combos; solo comprueba que
el resultado sea posible con las estadísticas declaradas. Es coherencia, no
anti-cheat real, igual que en M11.

## 9. Arquitectura

### 9.1 Cliente

```text
client/src/padre/
├── PadreGame.jsx              # Selector de modo/nivel, HUD, resultados y ranking
├── usePadre.js                # Estado, configuración, guardado y récords
├── config.js                  # Fallback local y helpers de configuración
├── engine/
│   ├── Game.js                # Motor: campaña, rondas, ítems y estadísticas
│   ├── Mundo.js               # Mapa y puntos de aparición
│   ├── Sprites.js             # Rosario y arte procedural
│   ├── Sound.js               # Campanilla del rosario
│   └── Input.js               # Sin cambios
├── styles/
│   └── padre.css              # Tarjetas, ranking, HUD y avisos
└── components/ (nuevo, si hace falta)
    └── RankingPadre.jsx       # Tabla de ranking
```

### 9.2 Servidor

```text
server/src/
├── config/padre.js            # Fuente de verdad de niveles, infinito y validación
├── schemas/padre.schema.js    # Zod estricto
├── services/padre.service.js  # Estado, guardado, historial y ranking
├── controllers/padre.controller.js
└── routes/padre.routes.js

server/db/migrations/
└── 006_padre_progreso.sql
```

### 9.3 Propiedad de archivos

**Desarrollador C:**

- `server/src/config/padre.js`
- `server/src/schemas/padre.schema.js`
- `server/src/services/padre.service.js`
- `server/src/controllers/padre.controller.js`
- `server/src/routes/padre.routes.js`
- `server/tests/unit/padre-validation.test.js`
- `server/tests/integration/padre.test.js`
- `server/tests/api/padre.contract.test.js`
- `client/src/padre/**`
- `roadmap.padre.md`

**Desarrollador A (compartidos):**

- `server/db/migrations/006_padre_progreso.sql`
- `server/src/routes/index.js` (montar `/padre`)
- `server/src/middleware/csrf.js` (añadir `/api/padre/partidas`)
- `AGENTS.md` (tabla de módulos y permisos)
- `docs/esquema-bd.md`
- `docs/handoff.md`

C entrega el código y las instrucciones exactas; A aplica los cambios compartidos.

## 10. Backend M12

### 10.1 Migración 006

```sql
CREATE TABLE IF NOT EXISTS padre_perfiles (
  usuario_id BIGINT UNSIGNED NOT NULL,
  nivel_max_desbloqueado TINYINT UNSIGNED NOT NULL DEFAULT 1,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id),
  CONSTRAINT chk_padre_perfiles_nivel CHECK (nivel_max_desbloqueado BETWEEN 1 AND 5),
  CONSTRAINT fk_padre_perfiles_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS padre_records (
  usuario_id BIGINT UNSIGNED NOT NULL,
  modo ENUM('campana', 'infinita') NOT NULL,
  nivel TINYINT UNSIGNED NOT NULL DEFAULT 0,
  mejor_puntaje INT UNSIGNED NOT NULL DEFAULT 0,
  mejor_rondas INT UNSIGNED NOT NULL DEFAULT 0,
  victorias INT UNSIGNED NOT NULL DEFAULT 0,
  partidas INT UNSIGNED NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, modo, nivel),
  KEY idx_padre_records_ranking (modo, nivel, mejor_puntaje DESC, mejor_rondas DESC),
  KEY idx_padre_records_infinito (modo, nivel, mejor_rondas DESC, mejor_puntaje DESC),
  CONSTRAINT chk_padre_records_modo CHECK (
    (modo = 'campana' AND nivel BETWEEN 1 AND 5)
    OR (modo = 'infinita' AND nivel = 0)
  ),
  CONSTRAINT fk_padre_records_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS padre_partidas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  modo ENUM('campana', 'infinita') NOT NULL,
  nivel TINYINT UNSIGNED NOT NULL DEFAULT 0,
  puntaje INT UNSIGNED NOT NULL,
  rondas INT UNSIGNED NOT NULL DEFAULT 0,
  duracion_segundos SMALLINT UNSIGNED NOT NULL,
  vidas_restantes TINYINT UNSIGNED NOT NULL,
  objetos_usados TINYINT UNSIGNED NOT NULL DEFAULT 0,
  aldeanos INT UNSIGNED NOT NULL DEFAULT 0,
  perro INT UNSIGNED NOT NULL DEFAULT 0,
  monaguillo INT UNSIGNED NOT NULL DEFAULT 0,
  beata INT UNSIGNED NOT NULL DEFAULT 0,
  valiente INT UNSIGNED NOT NULL DEFAULT 0,
  salvados INT UNSIGNED NOT NULL DEFAULT 0,
  victoria BOOLEAN NOT NULL DEFAULT FALSE,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_padre_partidas_usuario (usuario_id, creada_en),
  KEY idx_padre_partidas_ranking (modo, nivel, puntaje DESC),
  CONSTRAINT chk_padre_partidas_modo CHECK (
    (modo = 'campana' AND nivel BETWEEN 1 AND 5)
    OR (modo = 'infinita' AND nivel = 0)
  ),
  CONSTRAINT fk_padre_partidas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Notas:

- `nivel = 0` identifica la fila del modo infinito.
- `rondas` solo tiene sentido en infinito.
- `mejor_rondas` solo tiene sentido en infinito.
- Todas las tablas se consultan siempre por `usuario_id`.
- La migración se aplica una sola vez; no se edita después.

### 10.2 Configuración

`server/src/config/padre.js` exporta:

- `VIDAS = { gratis: 5, premium: 7 }`
- `vidasMaximas(premium)`
- `NIVELES` con los 5 niveles completos.
- `TOTAL_NIVELES`
- `INFINITO` con las reglas de rondas.
- `OBJETOS` con el Rosario.
- `configuracionNivel(id)`
- `configuracionRonda(ronda)`
- `topeEnemigos(config, segundos)`
- `puntajeBase(estadisticas)`
- `puntajeMinimo(...)`
- `puntajeMaximo(...)`

El cliente recibe la configuración por `GET /api/padre/estado`. El fallback de
`client/src/padre/config.js` debe mantener los mismos valores y las mismas
funciones puras.

### 10.3 Endpoints

| Método | Ruta | Auth | CSRF | Función |
|---|---|---|---|---|
| GET | `/api/padre/estado` | Opcional | No | Configuración, niveles, candados, récords e infinito |
| POST | `/api/padre/partidas` | Sí | Sí | Validar, guardar y desbloquear |
| GET | `/api/padre/partidas` | Sí | No | Historial propio paginado |
| GET | `/api/padre/ranking` | No | No | Top por modo/nivel, separado gratis/premium |

### 10.4 Respuesta de estado

`GET /api/padre/estado` para invitado:

```json
{
  "data": {
    "autenticado": false,
    "nivelMaxDesbloqueado": 1,
    "totalNiveles": 5,
    "infinito": {
      "desbloqueado": false,
      "requiereCuenta": true,
      "rondaSegundos": 30,
      "descansoSegundos": 4,
      "maxRondas": 120,
      "maxDuracionSegundos": 3600,
      "mejorPuntaje": 0,
      "mejorRondas": 0,
      "partidas": 0
    },
    "niveles": [
      {
        "id": 1,
        "nombre": "El atrio de León Viejo",
        "descripcion": "Sobrevive hasta que cante el gallo.",
        "duracionSegundos": 90,
        "aldeanos": 8,
        "maxEnemigos": { "inicial": 1, "maximo": 4, "cadaSegundos": 20 },
        "esperaSpawn": { "inicial": 7.5, "min": 4.5, "porSegundo": 0.03 },
        "velocidadEnemigos": 0.9,
        "enemigos": {
          "perro": {
            "nombre": "Perro",
            "desde": 10,
            "peso": 0.4,
            "hp": 1,
            "r": 4,
            "vel": 80,
            "puntos": 25,
            "aviso": "Un perro: su ladrido alerta al pueblo"
          }
        },
        "bonos": { "amanecer": 200, "vida": 25 },
        "objetos": { "max": 2, "cada": 45, "tipo": "rosario" },
        "desbloqueado": true,
        "mejorPuntaje": 0,
        "victorias": 0,
        "partidas": 0
      }
    ],
    "objetos": {
      "rosario": {
        "id": "rosario",
        "nombre": "El Rosario del Padre",
        "descripcion": "Un rosario de cuentas gastadas que devuelve al Padre una vida.",
        "vida": 1,
        "duracion": 20
      }
    }
  }
}
```

El ejemplo abrevia `niveles[]`; la respuesta real incluye los 5. Para invitado,
los niveles 2–5 llegan con `desbloqueado: false` y `infinito.desbloqueado: false`.
Para usuario autenticado, `infinito.desbloqueado` es `true` y los niveles traen
sus récords reales.

### 10.5 Guardar partida

`POST /api/padre/partidas` — Auth y CSRF obligatorios.

Request de campaña:

```json
{
  "modo": "campana",
  "nivel": 1,
  "puntaje": 1450,
  "duracionSegundos": 90,
  "rondas": 0,
  "vidasRestantes": 3,
  "objetosUsados": 1,
  "estadisticas": {
    "aldeanos": 42,
    "perro": 3,
    "monaguillo": 2,
    "beata": 1,
    "valiente": 0,
    "salvados": 5
  },
  "victoria": true
}
```

Request de infinito:

```json
{
  "modo": "infinita",
  "puntaje": 3200,
  "duracionSegundos": 128,
  "rondas": 3,
  "vidasRestantes": 0,
  "objetosUsados": 1,
  "estadisticas": {
    "aldeanos": 61,
    "perro": 5,
    "monaguillo": 4,
    "beata": 2,
    "valiente": 1,
    "salvados": 8
  },
  "victoria": false
}
```

Response `201`:

```json
{
  "data": {
    "partida": {
      "id": 21,
      "modo": "campana",
      "nivel": 1,
      "puntaje": 1450,
      "rondas": 0,
      "duracionSegundos": 90,
      "vidasRestantes": 3,
      "objetosUsados": 1,
      "victoria": true,
      "creadaEn": "2026-11-09T12:00:00.000Z"
    },
    "record": {
      "modo": "campana",
      "nivel": 1,
      "mejorPuntaje": 1450,
      "mejorRondas": 0,
      "victorias": 1,
      "partidas": 1
    },
    "nuevoRecord": true,
    "nivelDesbloqueado": 2,
    "nivelMaxDesbloqueado": 2
  }
}
```

Reglas:

- `nivelDesbloqueado` es `null` si no se desbloqueó nada.
- En infinito, `nivelDesbloqueado` siempre es `null`.
- `nuevoRecord` en campaña: `puntaje > mejorPuntaje`.
- `nuevoRecord` en infinito: más rondas, o mismas rondas con más puntaje.
- El servidor ignora cualquier `usuarioId` enviado por el cliente; el esquema
  estricto lo rechaza.

### 10.6 Historial

`GET /api/padre/partidas` — Auth obligatoria.

Query:

- `modo` opcional: `campana` o `infinita`.
- `nivel` opcional: 1–5; solo aplica a campaña.
- `limit`: 1–50, por defecto 20.
- `offset`: >= 0, por defecto 0.

Response:

```json
{
  "data": [
    {
      "id": 21,
      "modo": "campana",
      "nivel": 1,
      "puntaje": 1450,
      "rondas": 0,
      "duracionSegundos": 90,
      "vidasRestantes": 3,
      "objetosUsados": 1,
      "victoria": true,
      "creadaEn": "2026-11-09T12:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "limit": 20, "offset": 0 }
}
```

Solo devuelve las partidas del usuario autenticado.

### 10.7 Ranking

`GET /api/padre/ranking` — Público.

Query:

- `modo`: obligatorio, `campana` o `infinita`.
- `nivel`: obligatorio en campaña (1–5); prohibido en infinito.
- `limit`: 1–50, por defecto 10.

Response de campaña:

```json
{
  "data": {
    "modo": "campana",
    "nivel": 1,
    "gratis": [
      { "posicion": 1, "nombreUsuario": "ana", "puntaje": 5000, "rondas": 0, "victorias": 3 }
    ],
    "premium": [
      { "posicion": 1, "nombreUsuario": "carlos", "puntaje": 6200, "rondas": 0, "victorias": 5 }
    ]
  }
}
```

Response de infinito:

```json
{
  "data": {
    "modo": "infinita",
    "nivel": 0,
    "gratis": [
      { "posicion": 1, "nombreUsuario": "ana", "puntaje": 3200, "rondas": 7, "victorias": 0 }
    ],
    "premium": []
  }
}
```

Reglas:

- Campaña: orden por `mejorPuntaje DESC`, luego `actualizadoEn ASC`.
- Infinito: orden por `mejorRondas DESC`, luego `mejorPuntaje DESC`, luego
  `actualizadoEn ASC`.
- El plan se determina por suscripción vigente, no por `usuarios.rol`.
- Nunca devuelve correo, ID de usuario ni fecha de suscripción.

### 10.8 Validación del servidor

#### Esquema del body

- `modo`: `campana` o `infinita`.
- `nivel`: obligatorio en campaña (1–5); prohibido en infinito.
- `puntaje`: entero >= 0 y <= 1 000 000.
- `duracionSegundos`: entero 1–3600.
- `rondas`: entero 0–120; obligatorio en infinito, 0 en campaña.
- `vidasRestantes`: entero 0–20.
- `objetosUsados`: entero 0–20.
- `estadisticas`: objeto estricto con enteros no negativos:
  `aldeanos`, `perro`, `monaguillo`, `beata`, `valiente`, `salvados`.
- `victoria`: booleano.
- Sin campos desconocidos.

#### Campaña

- El nivel existe y está desbloqueado para el usuario.
- `duracionSegundos <= nivel.duracion + 2`.
- Si `victoria`:
  - `duracionSegundos >= nivel.duracion - 1`.
  - `vidasRestantes >= 1`.
- Si no hay victoria:
  - `vidasRestantes === 0`.
  - `duracionSegundos <= nivel.duracion + 2`.
- `vidasRestantes <= vidasMaximas(premium) + objetosUsados`.
- `objetosUsados <= nivel.objetos.max`.
- `objetosUsados <= ceil(duracionSegundos / nivel.objetos.cada) + 1`.
- `aldeanos + salvados <= nivel.aldeanos * (1 + ceil(duracionSegundos / 3))`.
- `perro + monaguillo + beata + valiente <= ceil(duracionSegundos / (nivel.esperaSpawn.min * 0.9)) + 1`.
- `puntaje` dentro de las cotas de la sección 8.3.

#### Infinito

- `victoria === false`.
- `duracionSegundos <= 3600`.
- `rondas <= 120`.
- `rondas <= floor(duracionSegundos / 30) + 1`.
- `duracionSegundos >= rondas * 30` cuando `rondas > 0`.
- `vidasRestantes === 0`.
- `vidasRestantes <= vidasMaximas(premium) + objetosUsados`.
- `objetosUsados <= min(10, floor(rondas / 3) + 1)`.
- `aldeanos + salvados <= configuracionRonda(rondas).aldeanos * (1 + ceil(duracionSegundos / 3))`.
- `perro + monaguillo + beata + valiente <= ceil(duracionSegundos / (2.2 * 0.9)) + 1`.
- `puntaje` dentro de las cotas de la sección 8.3.

#### Errores

- `SESION_REQUERIDA` (401).
- `NIVEL_NO_ENCONTRADO` (404).
- `NIVEL_BLOQUEADO` (403).
- `PARTIDA_INVALIDA` (400).
- `VALIDACION` (400).
- `DEMASIADAS_PETICIONES` (429).

### 10.9 Seguridad

- `usuario_id` sale siempre de `req.usuario.id`.
- Consultas parametrizadas en todas las rutas.
- Zod estricto en body y query.
- Rate limit específico en `POST /api/padre/partidas` (60 por 15 minutos).
- La ruta se añade a `RUTAS_PROTEGIDAS` de `csrf.js` para que sin sesión
  responda 401 y no 403.
- El ranking no expone datos privados.
- El historial solo devuelve filas del usuario autenticado.

## 11. Cliente

### 11.1 `config.js`

- Mantener `VISTA`, `MUNDO` y `JUGADOR`.
- Añadir `VIDAS`, `NIVELES`, `INFINITO`, `OBJETOS`.
- Añadir `configuracionNivel(id)`, `configuracionRonda(ronda)`,
  `topeEnemigos(config, segundos)`, `vidasMaximas(premium)`.
- Los valores deben coincidir con `server/src/config/padre.js`.
- El fallback sirve para práctica sin conexión; el servidor es la fuente de verdad.

### 11.2 `engine/Game.js`

- Aceptar `reglas`, `modo` y `nivel` al iniciar.
- Sustituir las constantes fijas `NOCHE`, `ALDEANOS`, `ENEMIGOS`,
  `maxEnemigos` y `esperaSpawn` por la configuración recibida.
- Añadir:
  - `puntosCombate` separado del puntaje total.
  - Contadores de estadísticas por tipo de enemigo.
  - `objetosUsados`.
  - Lista de rosarios, aparición, recogida y desaparición.
  - Rondas, descanso y `configuracionRonda` en modo infinito.
  - Callbacks `onObjetos` y `onRonda`.
  - `resultado()` con `modo`, `nivel`, `rondas`, `objetosUsados` y estadísticas.
- Mantener el comportamiento actual de movimiento, tajo, combos, aldeanos,
  enemigos, proyectiles, oscuridad y amanecer.
- El límite de vidas con ítems es `vidasMaximas + objetosUsados`.
- Al cambiar premium en mitad de la partida, ajustar las vidas sin borrar las
  vidas extra ganadas con rosarios.

### 11.3 `usePadre.js`

- Consultar `GET /api/padre/estado` al montar y cuando cambie la sesión.
- Exponer `estado`, `cargandoEstado`, `errorEstado`, `modo`, `nivel`,
  `records`, `guardado` y `resultado`.
- `start(modo, nivel)` usa la configuración del servidor.
- Al terminar:
  - Actualizar récord local si es invitado.
  - Si hay sesión, enviar `POST /api/padre/partidas`.
  - Actualizar récords, desbloqueos e infinito con la respuesta.
  - Mostrar `guardando`, `guardado`, `invitado` o `error`.
- Si la API falla, permitir jugar en modo práctica y avisar que no se guardará.
- Para invitado, usar claves locales por modo/nivel:
  - `ecos.padre.record.campana.1`
  - Migrar el antiguo `ecos.padre.record` al nivel 1 si existe.

### 11.4 `PadreGame.jsx`

- Mantener el selector de juegos y la pantalla completa.
- Añadir un selector antes del canvas:
  - Tarjetas de los 5 niveles con nombre, duración, dificultad, récord,
    victorias y candado.
  - Tarjeta de modo infinito con mejor ronda, mejor puntaje y candado para
    invitados.
- El botón de iniciar usa el modo/nivel seleccionado.
- HUD:
  - Campaña: `Nivel N · Nombre`.
  - Infinito: `Ronda N`.
  - Puntaje, récord, vidas y rosarios usados.
- Pantalla final:
  - Campaña victoria: “Canta el gallo”, puntaje, estadísticas, “Nuevo récord”,
    “Siguiente nivel” si se desbloqueó.
  - Campaña derrota: “El pueblo te detuvo”, reintentar.
  - Infinito: “La noche no termina”, rondas alcanzadas, mejor ronda, reintentar.
  - Invitado: aviso “Inicia sesión para guardar tu progreso” con enlace a
    `/ingresar`.
  - Estado del guardado.
- Ranking:
  - Componente `RankingPadre.jsx`.
  - Pestañas Campaña / Infinito.
  - Selector de nivel en campaña.
  - Tablas separadas gratis y premium.
  - Carga bajo demanda; si falla, muestra un aviso y no bloquea el juego.
- Mantener controles táctiles, pausa, sonido, pantalla completa y `AvisoGirar`.

### 11.5 Estilos

- Tarjetas de nivel responsive.
- Candados y estados “requiere cuenta”.
- Banner de ronda y descanso.
- Contador de rosarios.
- Tabla de ranking compacta.
- Estados de guardado.
- Ajustes para pantalla completa y móvil horizontal.

## 12. Pruebas

### 12.1 Unitarias

- `NIVELES` tiene 5 ids únicos y dificultad creciente.
- `configuracionRonda` escala correctamente y respeta topes.
- `puntajeBase`, `puntajeMinimo` y `puntajeMaximo`.
- Esquemas Zod aceptan cuerpos válidos y rechazan:
  - Campos desconocidos.
  - `usuarioId`.
  - Modo/nivel incoherentes.
  - Rangos fuera de límite.
- `validarPartida` acepta campaña e infinito coherentes.
- Rechaza vidas extra sin rosarios, ítems de más, duración excesiva, puntaje
  fuera de cotas y estadísticas imposibles.

### 12.2 Integración

- `GET /api/padre/estado` para invitado: solo nivel 1 e infinito bloqueado.
- Usuario nuevo: nivel 1, sin récords.
- Ganar nivel 1 desbloquea nivel 2.
- Perder no desbloquea.
- El récord solo sube y las partidas se acumulan.
- El servidor rechaza niveles bloqueados.
- El servidor rechaza resultados incoherentes.
- Dos cuentas tienen progreso, historial y desbloqueos independientes.
- Historial paginado y filtrado por modo/nivel.
- El plan decide el máximo de vidas aceptado.
- El Rosario justifica vidas extra; sin rosarios se rechaza.
- Modo infinito guarda rondas y ordena el récord por rondas.
- Ranking separa gratis/premium y no expone correos.
- Sin sesión, `POST /api/padre/partidas` responde 401.
- Sin CSRF, responde 403.

### 12.3 Contrato

- Forma de `estado`, `partida`, `record` e historial.
- Campos obligatorios y tipos.
- Ranking con `posicion`, `nombreUsuario`, `puntaje`, `rondas`, `victorias`.
- Ausencia de `correo`, `usuarioId`, `usuario_id`, `password` y
  `fechaSuscripcion`.
- Códigos de error esperados.

### 12.4 Frontend

- `cd client && npm run build`.
- Prueba manual en escritorio y móvil:
  - Invitado: nivel 1 jugable, infinito bloqueado, récord local.
  - Login: niveles, guardado, desbloqueo y ranking.
  - Dos cuentas: progreso distinto.
  - Pantalla completa y controles táctiles.
  - Rosario: aparición, recogida, vida extra y HUD.

## 13. Documentación

- `roadmap.padre.md` (este documento).
- `roadmap.backend.md`: añadir M12 con contrato vinculante.
- `AGENTS.md`: añadir M12 y permisos de `client/src/padre/**`.
- `docs/esquema-bd.md`: tablas, diagrama y nota de aislamiento.
- `docs/handoff.md`: estado, comandos, pruebas y próximos pasos.
- `README.md`: mencionar el juego y la ruta `/padre-sin-cabeza` si hace falta.

## 14. Tareas

- [x] **M12-01** Documentar contrato, tablas, propiedad y reglas de invitado.
- [x] **M12-02** Crear migración `006_padre_progreso.sql` (A la aplica).
- [x] **M12-03** Crear `server/src/config/padre.js` con niveles, infinito, ítem y validadores puros.
- [x] **M12-04** Crear esquemas Zod, servicio, controlador y rutas de `/api/padre`.
- [x] **M12-05** Montar el router y añadir la ruta a CSRF (A).
- [x] **M12-06** Refactorizar `client/src/padre/config.js` y el motor para campaña por niveles.
- [x] **M12-07** Implementar el Rosario, su aparición, recogida, HUD y sonido.
- [x] **M12-08** Implementar estado, guardado, récords, candados y modo invitado en React.
- [x] **M12-09** Implementar el modo infinito por rondas y su récord.
- [x] **M12-10** Implementar el ranking en la UI.
- [x] **M12-11** Pruebas unitarias, de integración y de contrato.
- [x] **M12-12** Actualizar documentación y ejecutar `npm run build` y pruebas.
- [ ] **M12-13** Prueba manual en navegador con dos cuentas y un invitado.

## 15. Definition of Done

- El invitado solo juega el nivel 1; el modo infinito y los niveles 2–5 están
  bloqueados y muestran el aviso de inicio de sesión.
- Un usuario autenticado tiene desbloqueos, récords e historial propios.
- Dos usuarios no comparten ningún dato de progreso.
- Ganar desbloquea el siguiente nivel; perder no.
- El servidor rechaza niveles bloqueados, resultados incoherentes, vidas extra
  sin rosarios y partidas con duración o estadísticas imposibles.
- El modo infinito funciona por rondas, escala la dificultad y guarda el récord
  por rondas.
- El Rosario recupera vidas, se cuenta en el HUD y se valida en el servidor.
- El ranking separa gratis/premium y no expone correos ni IDs.
- `npm run build` pasa.
- Las pruebas nuevas pasan.
- No se editaron migraciones anteriores.
- La documentación quedó actualizada.

## 16. Orden de implementación

1. Contrato y documentación M12.
2. Configuración del servidor y migración 006.
3. Backend: esquemas, servicio, controlador, rutas y pruebas.
4. Motor del cliente: campaña, dificultad, estadísticas y Rosario.
5. UI: selector, HUD, guardado, candados y pantalla final.
6. Modo infinito.
7. Ranking.
8. Documentación final, build y prueba manual.

## 17. Riesgos y notas

- **No es anti-cheat real:** el puntaje se valida por cotas, no por simulación.
- **Configuración duplicada:** servidor y cliente comparten valores; el servidor
  es la fuente de verdad. Cualquier cambio de balance se hace primero en
  `server/src/config/padre.js` y se refleja en el fallback del cliente.
- **Migración compartida:** C no aplica la migración; la aplica A. La migración
  006 ya está aplicada en desarrollo y en la base de test.
- **Rutas compartidas:** `routes/index.js` y `csrf.js` los toca A; ya están montados.
- **Prueba manual:** el handoff indica que la suite completa puede fallar por
  assets ausentes; usar pruebas parciales y documentar el entorno. Las pruebas
  de M12 (40) y `npm run build` pasan.
- **M11 ya está conectado al cliente:** el runner consume su backend de niveles.
  M12 sigue el mismo patrón y no modifica el módulo del runner.
- **Contenido cultural:** el Rosario y la campana son elementos documentados de
  la leyenda. No se añaden afirmaciones culturales nuevas; el ítem es una
  mecánica de juego.
- **Balance:** los valores de la tabla son una primera propuesta. Se ajustan en
  `server/src/config/padre.js` después de la prueba manual.

## 18. Anexo: handoff exacto a A

### Migración

Aplicar `server/db/migrations/006_padre_progreso.sql` en desarrollo y en
`ecos_nicaragua_test`. No editar migraciones anteriores.

### Router

En `server/src/routes/index.js`:

```js
import padreRoutes from './padre.routes.js'

router.use('/padre', padreRoutes)
```

### CSRF

En `server/src/middleware/csrf.js`, añadir a `RUTAS_PROTEGIDAS`:

```js
'/api/padre/partidas',
```

### AGENTS.md

Añadir M12 a la tabla de módulos:

| Módulo | Nombre | Desarrollador | Depende de |
|---|---|---|---|
| M12 | Progreso de El Padre sin Cabeza | C | M00, M06, M07, M11 (patrón) |

Y añadir `client/src/padre/**`, `server/src/config/padre.js`,
`server/src/routes/padre.routes.js`, controlador, servicio, esquema y pruebas a
los archivos permitidos de C.

### Docs

Actualizar `docs/esquema-bd.md` y `docs/handoff.md` después de aplicar la
migración y cerrar las pruebas.

## 19. Anexo: comandos útiles

```bash
# Migrar y sembrar
cd server
npm run db:migrate
npm run db:seed

# Pruebas
npm run test:unit
npm run test:integration

# Cliente
cd client
npm run build
npm run dev
```

Desbloqueo manual para pruebas de niveles:

```sql
UPDATE padre_perfiles
SET nivel_max_desbloqueado = 5
WHERE usuario_id = ?;
```
