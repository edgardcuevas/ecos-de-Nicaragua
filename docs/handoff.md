# Handoff — Ecos de Nicaragua

Actualizado: 2026-11-04. Rama central: `main`. Último commit: `3066e80`.

## Resumen

MVP de una plataforma web de leyendas nicaragüenses. **Fase 0 completa** y base de datos operativa. **Fase 1 (contenido) no iniciada.** No hay rutas de contenido, autenticación ni tests.

## Hecho y verificado

| Tarea | Entregable | Estado |
|---|---|---|
| `t01` | [`docs/alcance-mvp.md`](alcance-mvp.md) | Completa |
| `t02` | `client/`, `server/`, `README.md`, `.env.example`, `.gitignore` | Completa |
| `t03` | [`docs/wireframes.md`](wireframes.md) | Completa |
| `t04` | [`docs/esquema-bd.md`](esquema-bd.md) + `server/db/migrations/001_esquema-inicial.sql` | Completa y aplicada |
| `t12` | `server/scripts/migrate.js`, `server/scripts/seed.js`, `server/db/seed/regiones.json` | Completa y ejecutada |

Comprobaciones reales:

- `client`: `npm run build` termina bien (React 19.3.1, Vite 8.3.5).
- `server`: `GET /api/health` responde `{"status":"ok"}` (Express 5.3.0).
- MySQL 9.7: 16 tablas creadas, 17 regiones cargadas (15 departamentos + 2 regiones autónomas).
- `npm run db:migrate` es idempotente; `npm run db:seed` se puede repetir sin duplicar.
- **No se ha probado la interfaz en navegador**, solo el build. No hay tests ni linter.

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
client/vite.config.js           proxy /api -> localhost:3000
server/src/index.js             arranque HTTP
server/src/app.js               Express y rutas (solo /api/health)
server/src/config.js            carga .env y configuración de MySQL
server/db/migrations/           migraciones SQL
server/db/seed/                 datos de seed (solo regiones)
server/scripts/                 runner de migraciones y seed
docs/                           alcance, wireframes, esquema
```

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

- **`t07` (identidad visual) está bloqueada:** no hay logo en el repo y falta decidir misterio / folclore tradicional / mezcla.
- `t08` (ilustraciones) y `t25` (narraciones) requieren producción humana; no generarlas ni inventarlas.
- `t05`/`t06`/`t50` requieren investigación con fuentes reales; el autor debe validar el contenido.
- `t11` (reglas de citación y licencias) **no está hecho**; se intentó y se canceló.
- «Material educativo» figura como premium, pero las fichas docentes (`t49`) están en Fase 6 `[opcional]`. Confirmar alcance.
- Activación premium manual vs. código (`t27`) sigue sin decidir.
- `main` no tiene upstream configurado; confirmar antes de pushear.

## Próximos pasos sugeridos

1. **Fase 1:** resolver identidad/logo (`t07`) o empezar por `t11` (citar fuentes y licencias) y `t05` (investigar las 6 leyendas con mínimo 2 fuentes cada una).
2. **Fase 2:** `t13` API de leyendas. La base ya existe, pero **no hay leyendas ni fuentes cargadas**; hará falta contenido de Fase 1 o fixtures de prueba.
3. Configurar tests (Node test runner) y linter antes de crecer.

## Git

- Rama central `main`; todo el trabajo va ahí.
- Commits: `2c719ef` (t01), `d3c3095` (t02), `8c85a63` (t03), `e35e5b8` (t04), `4f16e6f` (t12), `3066e80` (verificación).
- No se ha pusheado nada.

## Gotchas

- `FLUSH PRIVILEGES` emite un warning de deprecación en MySQL 9.x; es inofensivo.
- El DDL se verificó en MySQL 9.7; `VALUES()` en el seed funciona, aunque está deprecado.
- Si se usa un usuario limitado a la base, `CREATE DATABASE` requiere permiso global: crear la base antes.
- No editar una migración ya aplicada; añadir una nueva en `server/db/migrations/`.
