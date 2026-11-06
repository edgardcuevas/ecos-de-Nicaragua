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

## Estado

Fase 0 en progreso: entorno de desarrollo con workspaces, scripts raíz, middlewares base, routers vacíos (501) y health con comprobación de base. Migraciones y seed básicos operativos.
