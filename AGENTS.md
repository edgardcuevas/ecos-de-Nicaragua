# AGENTS.md — Ecos de Nicaragua

## Estado actual
- Fase 0 completada: `client/` (React 19 + Vite 8), `server/` (Express 5) y base MySQL con esquema y seed aplicados. Aún no hay rutas de contenido ni tests.
- Handoff detallado para retomar: [`docs/handoff.md`](docs/handoff.md).
- El roadmap, los docs y el contenido del producto están en **español**; mantén ese idioma en la documentación y en todo texto visible al usuario.

## Comandos
- Cliente: `cd client && npm install && npm run dev` → http://localhost:5173. Build: `npm run build`.
- Servidor: `cd server && npm install && npm run dev` → http://localhost:3000 (`node --watch`).
- Vite redirige `/api` a `http://localhost:3000`; no hace falta CORS en desarrollo.
- `.env` va en la raíz (copia `.env.example`); el servidor carga `../../.env` explícitamente. Entrecomilla valores con `#` (dotenv los corta como comentario).
- Base de datos (MySQL 8+): `cd server && npm run db:migrate`, luego `npm run db:seed`. `db:migrate` es idempotente; `db:seed` solo carga las 17 regiones por ahora.
- No hay tests ni linter configurados todavía. Si se agregan, documenta aquí el comando exacto.

## Fuente de verdad: `ROADMAP.md`
- Trabaja **una tarea a la vez**, en el orden de su fase, y revisa su línea **Depende de** antes de empezar.
- No hagas tareas marcadas `[opcional]` salvo que se pidan explícitamente.
- Si algo no está definido, **no lo inventes**: anótalo en «Decisiones abiertas» y pregunta al autor.
- Al terminar una tarea, marca su casilla `- [ ]` y verifica el **Terminado cuando** de la fase.
- No implementes lo que está «Fuera del MVP»: pasarela de pago, app móvil, aula virtual, panel institucional, mapa de los 153 municipios.

## Stack (según el roadmap)
- Frontend: React. Backend: Node.js + Express, API REST JSON. BD: MySQL.
- Mapa: SVG propio con 17 unidades (15 departamentos + 2 regiones autónomas), no un mapa externo.
- Despliegue: VPS Ubuntu con Nginx, PM2 y HTTPS.
- Multimedia en almacenamiento estático/objetos; la BD guarda **solo la ruta**, no el archivo.

## Reglas que no se negocian
- **Autorización en el servidor**: ocultar un botón en React no protege nada.
- **Sesiones con cookies** `HttpOnly`, `Secure`, `SameSite` + CSRF y expiración. Nunca JWT ni credenciales en `localStorage`.
- **Contraseñas** con Argon2id (o bcrypt), nunca texto plano ni SHA directo.
- **Premium real**: el backend consulta suscripción y fechas en la BD, no el nombre del plan. En el MVP se activa a mano o con código; no hay pasarela de pago.
- **Consultas parametrizadas** y validación de entrada en todas las rutas y formularios.
- **Secretos fuera del repo**: solo `.env.example`, sin valores reales.
- **Datos mínimos de usuario**: correo, nombre de usuario, hash de contraseña, rol, estado de suscripción y fecha de registro. Nada más.
- **Contenido cultural con fuente**: cada vínculo leyenda–lugar requiere fuente y nivel (`verificado`, `testimonio oral`, `pendiente`, `sin verificar`). No asignes leyendas a lugares sin respaldo.
- **No copiar** versiones publicadas completas; textos, imágenes y audios propios o con licencia anotada. Ilustraciones principales en WebP liviano.

## Git
- La rama central es **`main`**. Todo el trabajo va ahí; no crear ramas por tarea.
- `main` no tiene upstream configurado (existe `origin/main`). Confirma con el autor antes de pushear.
