# Handoff — Ecos de Nicaragua

Actualizado: 2026-11-08. Rama central: `main`. Último commit: `22fb909` (sin push). Cambios de M08 y M11 sin commitear.

## Resumen

MVP de una plataforma web de leyendas nicaragüenses. **Fase 0 completa** y base de datos operativa. **M06 (auth), M07 (premium), M08 (administración) y M11 (progreso del runner) implementados** con 191 pruebas. M09/M10 pendientes. **Fase 1 (contenido) no iniciada.**

## Hecho y verificado

| Tarea | Entregable | Estado |
|---|---|---|
| `t01` | [`docs/alcance-mvp.md`](alcance-mvp.md) | Completa |
| `t02` | `client/`, `server/`, `README.md`, `.env.example`, `.gitignore` | Completa |
| `t03` | [`docs/wireframes.md`](wireframes.md) | Completa |
| `t04` | [`docs/esquema-bd.md`](esquema-bd.md) + `server/db/migrations/001_esquema-inicial.sql` | Completa y aplicada |
| `t12` | `server/scripts/migrate.js`, `server/scripts/seed.js`, `server/db/seed/regiones.json` | Completa y ejecutada |
| `M06` | Sesiones, CSRF, registro/login/logout/refresh/recuperación con Argon2id | Completa y probada |
| `M07` | Planes, suscripciones por fechas, canje de códigos y middleware premium | Completa y probada |
| `M08` | API de administración, auditoría y 9 pruebas de integración | Completa y probada |
| `M11` | Progreso del runner: 5 noches, récords, historial y ranking gratis/premium | Completa y probada |

Comprobaciones reales:

- `client`: `npm run build` termina bien (React 19.3.1, Vite 8.3.6).
- `server`: `GET /api/health` responde `{"status":"ok"}` (Express 5.3.0).
- MySQL 9.7: migraciones 001–005 aplicadas; 20 tablas de aplicación + `schema_migrations` (incluye `runner_perfiles`, `runner_records`, `runner_partidas`).
- `npm run db:migrate` es idempotente; la migración 005 se aplicó a las bases de desarrollo y de test.
- Suite completa: **191 pruebas, 0 fallos** (auth, premium, admin, contenido, trivia, media, runner, seed y seguridad).
- **No se ha probado la interfaz en navegador**, solo el build. No hay linter.

## Cómo ejecutar

```bash
# API (http://localhost:3000)
cd server
npm install
npm run dev

# Cliente (http://localhost:5173, proxy /api -> 3000)
cd client
npm install
npm run dev
```

```bash
cd server
npm run db:migrate
npm run db:seed
npm run db:setup   # ambas en orden
```

## Entorno local de esta máquina

- MySQL **9.7**, servicio `MySQL97`, puerto **3307** (no 3306).
- Cliente oficial: `C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe`.
- Base `ecos_nicaragua`, usuario `ecos`. Credenciales en `.env` de la raíz (ignorado por git). **No imprimir ni commitear secretos.**
- No hay Docker instalado.
- El autor pidió **MySQL puro, no XAMPP**; no usar el cliente de XAMPP aunque exista.
- `.env` carga desde la raíz mediante `server/src/config.js`; los valores con `#` deben ir entre comillas.

## Estructura y puntos de entrada

```
client/src/main.jsx / App.jsx   UI React
client/src/runner/              minijuego, campaña y ranking
client/vite.config.js           proxy /api -> localhost:3000
server/src/index.js             arranque HTTP
server/src/app.js               Express, sesión, CSRF y montaje de /api
server/src/routes/              routers por módulo (incluye runner.routes.js)
server/src/config/runner.js     fuente de verdad de las 5 noches
server/src/config.js            carga .env y configuración de MySQL
server/db/migrations/           migraciones SQL (001–005)
server/db/seed/                 datos de seed
server/scripts/                 runner de migraciones y seed
docs/                           alcance, wireframes, esquema y handoff
```

## Progreso del runner (M11)

- `GET /api/runner/estado` — niveles, candados, récords y victorias; funciona para invitado.
- `POST /api/runner/partidas` — exige sesión y CSRF; valida coherencia y desbloquea la noche siguiente al ganar.
- `GET /api/runner/partidas` — historial paginado del usuario autenticado.
- `GET /api/runner/ranking` — top por noche, separado en gratis y premium.
- El invitado juega solo la noche 1 y guarda el récord en `localStorage` (`ecos.runner.record.invitado`).
- El `usuario_id` sale siempre de `req.usuario.id`; nunca del cuerpo.
- Detalle completo en [`roadmap.runner.md`](../roadmap.runner.md) sección 12 y `roadmap.backend.md` M11.

## Reglas que no se pueden romper

- Autorización **en el servidor**; ocultar UI no protege.
- Sesiones con cookies `HttpOnly`, `Secure`, `SameSite` + CSRF; **nunca JWT** ni credenciales en `localStorage`.
- Contraseñas con Argon2id (o bcrypt).
- Premium validado por `suscripciones` y fechas reales, no por el nombre del rol.
- Consultas parametrizadas y validación de entrada.
- Secretos solo en `.env`; el repo guarda `.env.example`.
- **Contenido cultural sin inventar.** Cada vínculo leyenda–lugar requiere fuente y nivel de verificación.
- No copiar versiones publicadas completas; registrar licencia de cada imagen/audio.

## Bloqueos y decisiones abiertas

- `t08` (ilustraciones) y `t25` (narraciones) requieren producción humana; no generarlas ni inventarlas.
- `t05`/`t06`/`t50` requieren investigación con fuentes reales; el autor debe validar el contenido.
- `t11` (reglas de citación y licencias) **no está hecho**; se intentó y se canceló.
- «Material educativo» figura como premium, pero las fichas docentes (`t49`) están en Fase 6 `[opcional]`. Confirmar alcance.
- Activación premium manual vs. código (`t27`) sigue sin decidir.
- **Assets de imagen ausentes en esta máquina:** `npm test` falla en `test:db:setup` porque el seed referencia `img/...` en la raíz y esos archivos no existen. La base de test ya estaba sembrada, así que la suite completa se corrió con el comando directo de `node --test` y pasó (191/191). Cuando existan los assets, `npm test` debe volver a funcionar sin cambios.
- `main` no tiene upstream configurado; confirmar antes de pushear.

## Próximos pasos sugeridos

1. **B debe cerrar M02/M03** (leyendas, categorías, regiones) para desbloquear M09.
2. **M09 — Seguridad** (A): validación, SQL, rate limit, CORS, headers, cookies, logs.
3. **M10 — Pruebas** (C): cerrar suite completa y contratos.
4. **D (seguimiento):** añadir rutas admin a `RUTAS_PROTEGIDAS` en `csrf.js`.
5. **Runner (C):** probar en navegador el flujo completo con dos cuentas y un invitado; ajustar balance si hace falta.

## Git

- Rama central `main`; todo el trabajo va ahí.
- Commits: `2c719ef` (t01), `d3c3095` (t02), `8c85a63` (t03), `e35e5b8` (t04), `4f16e6f` (t12), `3066e80` (verificación), `20402e8` (M00/M01), `70104e8` (M04/M05 esqueleto), `25515df`/`53a6053`/`22fb909` (M06/M07). M08 y M11 sin commitear.
- No se ha pusheado nada.

## Gotchas

- `FLUSH PRIVILEGES` emite un warning de deprecación en MySQL 9.x; es inofensivo.
- El DDL se verificó en MySQL 9.7; `VALUES()` en el seed funciona, aunque está deprecado.
- Si se usa un usuario limitado a la base, `CREATE DATABASE` requiere permiso global: crear la base antes.
- No editar una migración ya aplicada; añadir una nueva en `server/db/migrations/`.
- El runner valida el puntaje en el servidor, pero el puntaje nace en el cliente: no es anti-cheat real.
- El ranking separa por suscripción vigente (`fecha_inicio <= CURDATE() <= fecha_fin`), no por `usuarios.rol`.
