# Ecos de Nicaragua

Plataforma web interactiva de leyendas nicaragüenses. Eslogan: «Las leyendas cobran vida».

El proyecto está en construcción. El alcance y el orden de trabajo se definen en [`ROADMAP.md`](ROADMAP.md); el alcance cerrado del MVP está en [`docs/alcance-mvp.md`](docs/alcance-mvp.md).

## Stack

- **Cliente:** React + Vite.
- **Servidor:** Node.js + Express (API REST JSON).
- **Base de datos:** MySQL.
- **Mapa:** SVG propio de Nicaragua (15 departamentos y 2 regiones autónomas).

## Estructura

```
client/   Aplicación React (Vite)
server/   API Express
docs/     Documentación del proyecto
```

## Requisitos

- Node.js 20 o superior.
- MySQL 8 o superior (para las fases de base de datos).

## Puesta en marcha

```bash
# Terminal 1: API
cd server
npm install
npm run dev

# Terminal 2: cliente
cd client
npm install
npm run dev
```

- Cliente: http://localhost:5173
- API: http://localhost:3000 (`GET /api/health`)
- Vite redirige `/api` al servidor en desarrollo.

Copia `.env.example` a `.env` en la raíz y completa los valores locales. El archivo `.env` no se versiona.

## Estado

Fase 0 del roadmap en curso. Todavía no hay base de datos ni rutas de contenido.
