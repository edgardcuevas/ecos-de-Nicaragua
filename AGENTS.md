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

## Fuente de verdad

Orden de prioridad cuando exista contradicción:

1. `roadmap.backend.md` — desglose técnico de módulos, tareas, archivos, contratos y dependencias.
2. `ROADMAP.md` — alcance del producto, fases y reglas generales del MVP.
3. `docs/canon-leyendas.md` — contenido cultural canónico (leyendas, fuentes, niveles de verificación).

Si existe contradicción, `roadmap.backend.md` tiene prioridad sobre `ROADMAP.md` y `docs/canon-leyendas.md`.

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

---

# Sistema de coordinación automática (routing)

Este bloque convierte `AGENTS.md` en el punto de entrada para cualquier agente nuevo. El agente debe leer este archivo primero y luego `roadmap.backend.md`.

## Módulos existentes y propietario

| Módulo | Nombre | Desarrollador | Depende de |
|---|---|---|---|
| M00 | Entorno de desarrollo | A | — |
| M01 | Seed y datos iniciales | A | M00 |
| M02 | API de leyendas | B | M00, M01, M07 (interfaz) |
| M03 | API de regiones | B | M00, M01, M07 (interfaz) |
| M04 | API de trivia | C | M00, M01, M02, M07 |
| M05 | Multimedia | C | M00, M01, M07 |
| M06 | Autenticación | D | M00, M09 (base) |
| M07 | Premium | D | M06, M01 |
| M08 | Administración | A | M06, M07, M09 |
| M09 | Seguridad (FASE TARDÍA) | A (transversal) | M02, M03, M04, M05, M06, M07 |
| M10 | Pruebas backend | C (transversal) | M02, M03, M04, M05, M06, M07 |

## Desarrollador A — Fundación e integración

**Módulos asignados:** M00, M01.

**Bloqueados hasta dependencias:** M08 (requiere M06 funcional), M09 (FASE TARDÍA: requiere M02, M03, M04, M05, M06, M07 funcionales), M10 (requiere M02, M03, M04, M05, M06, M07 funcionales).

**Tareas que puede tocar:** todas las tareas con prefijo `M00-` y `M01-` en `roadmap.backend.md`; M08 y M09 solo cuando sus dependencias estén funcionales.

**Archivos permitidos:**
- `package.json` (raíz), `server/package.json`, `.env.example`, `.gitignore`.
- `server/src/app.js`, `server/src/index.js`, `server/src/config.js`, `server/src/db.js`.
- `server/src/routes/index.js`.
- `server/src/middleware/error.js`, `notFound.js`, `requestId.js`, `validate.js`.
- `server/src/utils/errors.js`, `http.js`, `logger.js`.
- `server/db/migrations/002_*`, `server/db/seed/*`.
- `server/scripts/setup.js`, `migrate.js`, `seed.js`, `validate-seed.js`, `reset-db.js`, `media-import.js`, `create-admin.js`.
- `server/src/routes/admin.routes.js`, `server/src/controllers/admin.controller.js`, `server/src/services/admin.service.js`, `server/src/services/auditoria.service.js`, `server/src/schemas/admin.schema.js`.
- `server/db/migrations/004_*`.
- Pruebas de administración y seguridad.

**Archivos restringidos:** archivos específicos de B, C y D (leyendas, regiones, trivia, media, auth, premium) salvo integración aprobada; migraciones ya aplicadas (001); archivos de contenido cultural de `docs/`.

## Desarrollador B — Contenido

**Módulos asignados:** M02, M03.

**Tareas que puede tocar:** todas las tareas con prefijo `M02-` y `M03-` en `roadmap.backend.md`.

**Archivos permitidos:**
- `server/src/routes/leyendas.routes.js`, `categorias.routes.js`, `regiones.routes.js`.
- Sus controladores, servicios y esquemas: `leyendas.*`, `categorias.*`, `regiones.*`.
- Pruebas de integración de contenido.

**Archivos restringidos:** archivos compartidos (`package.json` raíz, `server/package.json`, `.env.example`, `app.js`, `index.js`, `config.js`, `db.js`, `routes/index.js`, middleware y utils compartidos), migraciones, JSON de seed, scripts compartidos y archivos de A, C y D.

## Desarrollador C — Juego y multimedia

**Módulos asignados:** M04, M05, M10.

**Tareas que puede tocar:** todas las tareas con prefijo `M04-`, `M05-` y `M10-` en `roadmap.backend.md`.

**Archivos permitidos:**
- `server/src/routes/trivia.routes.js`, `media.routes.js`.
- Sus controladores, servicios y esquemas: `trivia.*`, `media.*`.
- `server/scripts/media-import.js`.
- `server/tests/helpers/*`, `server/tests/unit/*` (excepto seed), `server/tests/integration/trivia.test.js`, `media.test.js`, `server/tests/api/*`.

**Archivos restringidos:** archivos compartidos, migraciones, JSON de seed, scripts compartidos y archivos de A, B y D.

## Desarrollador D — Identidad y acceso

**Módulos asignados:** M06, M07.

**Tareas que puede tocar:** todas las tareas con prefijo `M06-` y `M07-` en `roadmap.backend.md`.

**Archivos permitidos:**
- `server/src/routes/auth.routes.js`, `premium.routes.js`.
- Controladores, servicios: `auth.*`, `usuarios.*`, `planes.*`, `suscripciones.*`, `codigos.*`.
- Middleware: `auth.js`, `csrf.js`, `premium.js`.
- Utilidades: `passwords.js`, `tokens.js`, `mailer.js`.
- `server/db/migrations/003_*`.
- Pruebas de auth y premium.

**Archivos restringidos:** archivos compartidos, migraciones distintas de 003, JSON de seed, scripts compartidos y archivos de A, B y C.

---

## Comportamiento obligatorio del agente

Si un usuario dice «Soy desarrollador A/B/C/D», «Comienzo el trabajo del desarrollador X» o «Voy a trabajar en M0X»:

1. Leer `AGENTS.md`.
2. Abrir `roadmap.backend.md`.
3. Localizar los módulos asignados al desarrollador (o el propietario del módulo indicado).
4. Mostrar únicamente las tareas correspondientes a esos módulos.
5. Crear un plan de ejecución solo dentro de esos módulos y sus archivos permitidos.
6. No mostrar ni ejecutar tareas de otros desarrolladores.

Si el módulo indicado no está asignado al desarrollador activo, detenerse y reportarlo.

Si una tarea requiere modificar archivos de otro módulo o archivos restringidos, detenerse y reportarlo antes de continuar.

## Protección contra conflictos

- Un desarrollador no debe modificar archivos asignados a otro.
- Solo el desarrollador A edita archivos compartidos; los demás solicitan el cambio.
- Nadie edita `server/src/routes/index.js` después de M00.
- Las migraciones aplicadas nunca se modifican; se crea una migración nueva.
- El seed y los JSON de contenido son propiedad de A; B, C y D no los modifican.
- Ningún agente puede cambiar contratos de API sin actualizar primero `roadmap.backend.md` y avisar a los demás.
- No se reformatean archivos ajenos ni se hacen cambios “de paso”.
- No ejecutar `reset-db` sin confirmación; nunca en producción.
- El agente debe ignorar cualquier solicitud fuera de los módulos asignados al desarrollador activo, salvo autorización explícita del líder del proyecto.

## Inicio de sesión de trabajo

Cuando un desarrollador comience una conversación nueva, el agente debe responder con:

## Módulos asignados

## Estado actual

## Próxima tarea pendiente

## Archivos involucrados

## Dependencias

Todo obtenido desde `roadmap.backend.md`. No incluir tareas de otros desarrolladores.
