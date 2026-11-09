# Roadmap Runner — "Huir de las Ceguas"

Minijuego tipo endless runner integrado al frontend React de Ecos de Nicaragua.
Fuera del MVP del backend; no modifica módulos existentes.

## 1. Objetivo

Crear un minijuego endless runner donde:

- El jugador controla a "El Borracho".
- Debe escapar de las Ceguas.
- Obstáculos aparecen continuamente.
- Hay puntaje (distancia + monedas).
- Hay pantalla de Game Over.
- Integrado a React, desacoplado del resto de la app.

## 2. Tecnología elegida: Canvas 2D nativo (HTML5)

**Justificación:**

- Sin dependencias nuevas (no Phaser, no librerías de juegos).
- Bundle pequeño; no infla el cliente.
- Control total del game loop con `requestAnimationFrame`.
- Integración limpia con React: un `<canvas>` + un hook.
- Phaser es potente pero pesado (~1 MB), su ciclo de vida choca con React (StrictMode, desmontaje) y es excesivo para un runner 2D simple.

**No se usa Phaser ni ninguna librería externa.** Solo `CanvasRenderingContext2D` + `requestAnimationFrame`.

## 3. Arquitectura (desacoplada)

```
client/src/
└── runner/
    ├── RunnerGame.jsx          # Componente React (monta canvas, UI, estado)
    ├── useRunner.js            # Hook que instancia y controla el engine
    ├── engine/
    │   ├── Game.js            # Orquestador: loop, estado, score, vidas
    │   ├── Player.js          # El Borracho: física, salto, animación
    │   ├── Enemy.js           # Cegua: spawn, movimiento, animación
    │   ├── Obstacle.js        # Obstáculos de suelo/pared
    │   ├── Background.js      # Parallax de fondo
    │   ├── Collision.js       # AABB / hitboxes
    │   └── Input.js           # Teclado + touch
    ├── assets/                # Sprites (WebP/PNG), audio (mp3)
    └── styles/runner.css
```

**Principios:**

- El engine es JS puro (sin React). React solo renderiza el `<canvas>` y la UI (score, vidas, Game Over).
- Comunicación engine ↔ React vía callbacks (`onScore`, `onGameOver`, `onLivesChange`).
- El engine no importa nada de React ni del resto de la app.
- Premium se consulta una sola vez al montar el componente (vía `GET /api/premium/mi-suscripcion`), pasándose al engine como config.

## 4. Sistema de vidas (sugerencia integrada)

- **Usuario gratis:** máximo **5 vidas**. Al perder la 5ª, Game Over.
- **Usuario premium:** **vidas ilimitadas** (respawn con 1.5s de invulnerabilidad tras cada golpe; sin Game Over por vidas).
- El estado premium se obtiene del backend (`accesoPremium` de `/api/premium/mi-suscripcion` o `/api/auth/me`).
- La UI muestra vidas restantes (corazones) solo para usuarios gratis.

## 5. Módulos paralelizables

| Módulo | Nombre | Depende de | Archivos |
|---|---|---|---|
| R00 | Scaffold y game loop | — | `runner/`, `Game.js`, `RunnerGame.jsx`, `useRunner.js` |
| R01 | Jugador (El Borracho) | R00 | `Player.js`, sprites |
| R02 | Enemigos (Ceguas) | R00 | `Enemy.js`, sprites |
| R03 | Obstáculos | R00 | `Obstacle.js` |
| R04 | Fondo parallax | R00 | `Background.js` |
| R05 | Colisiones | R01, R02, R03 | `Collision.js` |
| R06 | Input (teclado/touch) | R00 | `Input.js` |
| R07 | Sistema de vidas + premium | R00, R01 | integrado en `Game.js` |
| R08 | UI React (score, vidas, Game Over, start) | R00 | `RunnerGame.jsx` |
| R09 | Assets (sprites, audio) | — | `assets/` |
| R10 | Integración a la app (ruta + navegación) | R00, R08 | `App.jsx`, `Layout.jsx` |
| R11 | Progreso por usuario, niveles y ranking | R00, R07, R08, M06, M07 | `server/`, `runner/` |

R01–R04 y R09 son paralelizables. R05 depende de R01–R03. R07 depende de R01. R08 depende de R00. R11 depende de que existan autenticación y premium funcionales (M06 y M07).

## 6. Estructura de carpetas

```
client/src/runner/
├── RunnerGame.jsx
├── useRunner.js
├── engine/
│   ├── Game.js
│   ├── Player.js
│   ├── Enemy.js
│   ├── Obstacle.js
│   ├── Background.js
│   ├── Collision.js
│   └── Input.js
├── assets/
│   ├── borracho-run.png
│   ├── borracho-jump.png
│   ├── cegua-1.png
│   ├── cegua-2.png
│   ├── obstacle-1.png
│   ├── bg-far.png
│   ├── bg-mid.png
│   └── sfx-jump.mp3
└── styles/
    └── runner.css
```

Ruta React: `/juego` (o `/runner`), registrada en `App.jsx` con `<Route path="/juego" element={<RunnerGame />} />`. Acceso desde el menú o desde la ficha de La Cegua.

## 7. Assets necesarios

- Sprites de El Borracho: correr (4 frames), saltar (2 frames), golpeado (1 frame).
- Sprites de Cegua: 2 variantes, 4 frames de animación.
- Obstáculos: 3 variantes (barril, piedra, rama).
- Fondos parallax: 3 capas (cielo, montañas, suelo).
- Audio: salto, golpe, game over, música de fondo (opcional).
- Iconos de vidas (corazón lleno/vacío).

Assets en WebP/PNG optimizados, < 200 KB totales.

## 8. Definition of Done

- [x] El juego corre a 60 FPS en Canvas 2D.
- [x] El Borracho salta, corre y se anima.
- [x] Las Ceguas aparecen continuamente y se mueven hacia el jugador.
- [x] Los obstáculos aparecen y colisionan.
- [x] El puntaje aumenta con la distancia y se muestra en pantalla.
- [x] Usuario gratis: máximo 5 vidas; al perder la 5ª → Game Over.
- [x] Usuario premium: vidas ilimitadas; respawn con invulnerabilidad tras golpe.
- [x] Pantalla de Game Over con puntaje final y botón "Reintentar".
- [x] Controles: teclado (Espacio/↑) y touch (tap).
- [x] Integrado en React sin modificar módulos existentes (solo añadir ruta y enlace).
- [x] Desmontaje limpio (cancelAnimationFrame, removeEventListener).
- [x] Sin fugas de memoria ni listeners huérfanos.
- [x] Funciona en móvil y escritorio.

## 9. Complejidad estimada

| Módulo | Complejidad | Tiempo estimado |
|---|---|---|
| R00 Scaffold + loop | Baja | 0.5 día |
| R01 Jugador | Media | 1 día |
| R02 Enemigos | Media | 1 día |
| R03 Obstáculos | Baja | 0.5 día |
| R04 Fondo parallax | Baja | 0.5 día |
| R05 Colisiones | Media | 0.5 día |
| R06 Input | Baja | 0.5 día |
| R07 Vidas + premium | Media | 1 día |
| R08 UI React | Media | 1 día |
| R09 Assets | Media | 1–2 días |
| R10 Integración | Baja | 0.5 día |

**Total estimado: 7–9 días** (1 desarrollador frontend).

## 10. Integración con el backend

- Al montar `RunnerGame.jsx`, consultar `GET /api/auth/me` (la sesión ya resuelve `accesoPremium`).
- Pasar `premium: boolean` al engine como config.
- El engine ajusta el sistema de vidas según `premium`.
- R00–R10 no requieren cambios en el backend.
- R11 sí agrega API y tablas propias para guardar el progreso por usuario; se detalla en la sección 12.

## 11. Restricciones

- No modificar módulos existentes de la app (solo añadir la carpeta `runner/`, la ruta y un enlace en el menú).
- No instalar dependencias nuevas.
- El juego debe ser completamente desmontable (sin side effects globales).
- Respetar la identidad visual de Ecos de Nicaragua (colores, tipografía).

## 12. Progreso por usuario y niveles (R11)

Extensión posterior al runner base. Permite que cada cuenta tenga su propio progreso y
que la campaña avance por noches. El invitado solo juega la noche 1 y guarda su récord
en el navegador; para desbloquear el resto necesita cuenta.

### 12.1 Campaña de 5 noches

| Nivel | Nombre | Duración | Dificultad |
|---|---|---|---|
| 1 | La primera noche | 100 s | actual |
| 2 | El camino al río | 110 s | rampa y obstáculos algo mayores |
| 3 | La quebrada | 120 s | lianas antes y más Ceguas |
| 4 | El monte | 135 s | rampa alta |
| 5 | El amanecer | 150 s | máxima dificultad |

Reglas:

- Ganar la noche N desbloquea la N+1. Perder no desbloquea.
- El servidor valida que el nivel esté desbloqueado; el cliente no puede saltarse candados.
- Premium conserva su ventaja de 7 vidas frente a 5, pero no desbloquea niveles.
- El ranking se separa en gratis y premium por nivel.

### 12.2 Tablas nuevas

Migración `005_runner_progreso.sql`:

- `runner_perfiles`: `usuario_id` (PK/FK), `nivel_max_desbloqueado`, `actualizado_en`.
- `runner_records`: `usuario_id` + `nivel` (PK), `mejor_puntaje`, `mejor_distancia`, `victorias`, `partidas`, `actualizado_en`.
- `runner_partidas`: historial de cada partida con nivel, puntaje, distancia, duración, vidas restantes y victoria.

Todas las tablas usan `ON DELETE CASCADE` hacia `usuarios`.

### 12.3 Endpoints

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/runner/estado` | Opcional | Niveles con candado, récord y victorias |
| POST | `/api/runner/partidas` | Sí + CSRF | Guardar resultado y actualizar progreso |
| GET | `/api/runner/partidas` | Sí | Historial paginado propio |
| GET | `/api/runner/ranking` | Público | Top por nivel, separado gratis/premium |

El `usuario_id` sale siempre de la sesión, nunca del cuerpo de la petición.

### 12.4 Validación del servidor

- `nivel` entre 1 y 5 y desbloqueado para el usuario.
- Derrota: `vidasRestantes = 0` y `puntaje = distancia`.
- Victoria: `vidasRestantes >= 1` y `puntaje = distancia + bonoAmanecer + vidasRestantes * bonoVida`.
- `distancia` dentro del máximo teórico del nivel, con margen.
- `duracionSegundos` dentro de la duración del nivel (+2 s de margen).
- Esquemas Zod estrictos, consultas parametrizadas y rate limit en el POST.

El puntaje nace en el cliente; el servidor solo comprueba coherencia. No es anti-cheat real.

### 12.5 Tareas

- [x] R11-01 Documentar contratos, tablas y propiedad del módulo.
- [x] R11-02 Migración `005_runner_progreso.sql`.
- [x] R11-03 Configuración de las 5 noches en el servidor.
- [x] R11-04 Servicio, controlador, esquema y rutas de `/api/runner`.
- [x] R11-05 Refactor del motor para recibir la configuración de cada nivel.
- [x] R11-06 Selector de niveles, guardado y ranking en React.
- [x] R11-07 Pruebas unitarias, de integración y de contrato.
- [x] R11-08 Actualizar `docs/esquema-bd.md`, `docs/handoff.md` y checklist final.

### 12.6 Definition of Done de R11

- [x] El progreso persiste tras recargar y cerrar sesión.
- [x] Dos cuentas distintas tienen récords y desbloqueos independientes.
- [x] Un invitado juega la noche 1 sin crear filas en la base.
- [x] Ganar desbloquea la siguiente noche; perder no.
- [x] El ranking muestra solo nombre de usuario, puntaje y victorias, separado por plan.
- [x] El servidor rechaza niveles bloqueados y resultados incoherentes.
- [x] `npm test` y `npm run build` pasan (ver nota de entorno en `docs/handoff.md`).
