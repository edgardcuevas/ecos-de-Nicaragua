# Ecos de Nicaragua

Plataforma web interactiva de leyendas nicaragüenses. Eslogan: «Las leyendas cobran vida».

El proyecto está en construcción. El alcance y el orden de trabajo se definen en [`ROADMAP.md`](ROADMAP.md); el alcance cerrado del MVP está en [`docs/alcance-mvp.md`](docs/alcance-mvp.md). El desglose técnico para el backend está en [`roadmap.backend.md`](roadmap.backend.md).

## Stack

- **Cliente:** React + Vite.
- **Servidor:** Node.js + Express (API REST JSON).
- **Base de datos:** MySQL 8+.
- **Mapa:** SVG propio de Nicaragua (15 departamentos y 2 regiones autónomas).

## Estructura

```
ecos-nicaragua/
├─ package.json          # workspaces y scripts raíz
├─ .env                  # generado por setup, ignorado por git
├─ client/               # Aplicación React (Vite)
└─ server/               # API Express
```

## Requisitos

- Node.js 20.19 o superior (recomendado 22 LTS).
- npm 10 o superior.
- MySQL 8.0 o superior iniciado.
- Git 2.30 o superior.

## Puesta en marcha

```bash
git clone <repo>
cd ecos-nicaragua
npm install
npm run setup
npm run dev
```

- Cliente: http://localhost:5173
- API: http://localhost:3000 (`GET /api/health`)

`npm run setup` crea `.env` (si no existe), genera secretos, crea la base de datos, aplica migraciones, carga el seed e importa multimedia. Se puede ejecutar varias veces sin duplicar datos.

## Comandos útiles

```bash
npm run dev:api          # solo API
npm run dev:client       # solo cliente
npm run db:migrate       # aplica migraciones
npm run db:seed          # carga datos iniciales
npm run db:seed:validate # valida el seed
npm run reset-db         # recrea la base (solo desarrollo)
npm run media:import     # importa y optimiza multimedia
npm run test             # pruebas del servidor
```

## Base de datos

- `db:migrate` es idempotente: registra cada archivo en `schema_migrations` y crea la base si no existe.
- `db:seed` hace upsert por claves naturales; se puede repetir.
- El contenido cultural se carga por seed; no se edita desde la API.

## Actualizar contenido cultural

El contenido se carga por seed desde `server/db/seed/`. Para modificar leyendas, fuentes, regiones o trivia:

1. Editar los JSON correspondientes (`regiones.json`, `categorias.json`, `fuentes.json`, `leyendas.json`, `planes.json`).
2. Ejecutar `npm run db:seed:validate` para validar.
3. Ejecutar `npm run db:seed` para aplicar los cambios (transaccional e idempotente).

El seed no modifica usuarios ni suscripciones.

## Variables de entorno

El archivo `.env` se genera en la raíz con `npm run setup`. Variables principales:

| Variable | Descripción | Por defecto |
|---|---|---|
| `NODE_ENV` | Entorno (`development`/`production`/`test`) | `development` |
| `PORT` | Puerto de la API | `3000` |
| `APP_URL` | URL pública del cliente (enlaces de recuperación) | `http://localhost:5173` |
| `CLIENT_ORIGIN` | Origen permitido para CORS | `http://localhost:5173` |
| `CORS_ENABLED` | Habilitar CORS con credenciales | `false` |
| `TRUST_PROXY` | Número de proxies de confianza (Nginx) | `0` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión MySQL | — |
| `SESSION_SECRET` | Secreto de sesión (obligatorio en producción) | generado |
| `SESSION_NAME` | Nombre de la cookie de sesión | `ecos.sid` |
| `SESSION_TTL_HORAS` | Duración de la sesión en horas | `8` |
| `COOKIE_SECURE` | Cookie `Secure` (forzado en producción) | `false` |
| `TOKEN_PEPPER` | Pepper para HMAC de tokens y códigos | generado |
| `RESET_TOKEN_MINUTOS` | Vencimiento del token de recuperación | `60` |
| `MEDIA_ROOT`, `MEDIA_URL` | Almacenamiento y URL de medios | `./storage/media`, `/media` |
| `MAIL_TRANSPORT` | `console`, `memory` o `smtp` | `console` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Correo SMTP | — |
| `LOG_LEVEL` | Nivel de log (pino) | `info` |
| `RATE_LIMIT_ENABLED` | Activar rate limiting | `true` |

Los valores con `#` deben ir entrecomillados en `.env` (dotenv los corta como comentario).

## Usuarios de prueba

El seed no crea usuarios. Para probar los tres roles:

```bash
# Administrador (crea o promueve)
npm run admin:create -- --correo admin@ejemplo.com --usuario admin --password ClaveSegura123

# Usuario gratis: registrarse vía POST /api/auth/registro
# Usuario premium: registrar y canjear un código, o activar desde admin
```

Para generar códigos de activación (como admin, vía API):

```bash
POST /api/admin/codigos
{ "planId": 1, "cantidad": 5, "fechaVencimiento": "2027-01-31T23:59:59.000Z" }
```

Los códigos se muestran una sola vez en la respuesta.

## Autenticación y CSRF (cliente)

La API usa sesiones con cookies (`HttpOnly`, `Secure` en producción, `SameSite=Lax`). El cliente debe:

1. Pedir el token CSRF al cargar:
   ```js
   const res = await fetch('/api/auth/csrf', { credentials: 'include' })
   const { data } = await res.json()
   const csrfToken = data.csrfToken
   ```

2. Enviar `credentials: 'include'` y `X-CSRF-Token` en cada mutación:
   ```js
   await fetch('/api/auth/login', {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
     body: JSON.stringify({ correoOUsuario, password }),
   })
   ```

3. Tras login/registro, usar el nuevo `csrfToken` devuelto en la respuesta.

Los métodos `GET` no exigen CSRF. Sin sesión, `POST /api/auth/logout`, `/api/auth/refresh`, `/api/premium/canjear` y `/api/runner/partidas` devuelven `401 SESION_REQUERIDA` (no `403 CSRF_INVALIDO`).

## Solución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| `ECONNREFUSED` | MySQL apagado o puerto incorrecto | Iniciar servicio o ajustar `DB_PORT` |
| `ER_ACCESS_DENIED_ERROR` | Usuario o contraseña incorrectos | Ejecutar `npm run setup` y corregir credenciales |
| `ER_DBACCESS_DENIED_ERROR` | Usuario sin permiso sobre la base | Conceder permisos o usar un usuario con `CREATE` |
| `EADDRINUSE` | Puerto 3000 ocupado | Cambiar `PORT` |
| `Cannot find module 'sharp'` | Dependencias incompletas | `npm install` en la raíz |
| `SESSION_SECRET` vacío | `.env` incompleto | `npm run setup` |
| Migración aplicada a medias | Error SQL | Corregir y crear migración nueva; no editar la anterior |

## Ejemplos de fetch

```js
// Listar leyendas (público)
const leyendas = await fetch('/api/leyendas?region=managua&premium=false', { credentials: 'include' })

// Suscripción actual
const sus = await fetch('/api/premium/mi-suscripcion', { credentials: 'include' })

// Canjear código (mutación: CSRF)
await fetch('/api/premium/canjear', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
  body: JSON.stringify({ codigo: 'ECOS-XXXX-XXXX-XXXX' }),
})
```

Los errores tienen forma `{ error: { codigo, mensaje, detalles } }` con códigos estables (`SESION_REQUERIDA`, `CSRF_INVALIDO`, `CODIGO_INVALIDO`, `PREMIUM_REQUERIDO`, `VALIDACION`, etc.).

## Estado

Backend MVP completado: entorno, seed, multimedia, health, autenticación con sesiones y CSRF, premium y canje de códigos, administración, seguridad, pruebas y progreso del runner. Migraciones 001–005 aplicadas. El frontend puede consumir la API en `http://localhost:3000` con el proxy de Vite.

> Nota: `npm test` ejecuta `test:db:setup`, que valida los assets del seed. Si faltan los archivos `img/...` referenciados por `server/db/seed/leyendas.json`, el setup se detiene; la suite puede correrse contra una base de test ya sembrada.
