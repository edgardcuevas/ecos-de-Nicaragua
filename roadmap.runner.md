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

R01–R04 y R09 son paralelizables. R05 depende de R01–R03. R07 depende de R01. R08 depende de R00.

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

- Al montar `RunnerGame.jsx`, consultar `GET /api/premium/mi-suscripcion` (o `/api/auth/me`).
- Pasar `premium: boolean` al engine como config.
- El engine ajusta el sistema de vidas según `premium`.
- No se requieren cambios en el backend.

## 11. Restricciones

- No modificar módulos existentes de la app (solo añadir la carpeta `runner/`, la ruta y un enlace en el menú).
- No instalar dependencias nuevas.
- El juego debe ser completamente desmontable (sin side effects globales).
- Respetar la identidad visual de Ecos de Nicaragua (colores, tipografía).
