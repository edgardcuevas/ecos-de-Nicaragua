# AGENTS.md — Ecos de Nicaragua

## Estado actual
- El repo solo contiene `ROADMAP.md`. **No hay código, `package.json`, lockfile ni scripts** todavía; no inventes comandos de build/test/lint.
- El roadmap, los docs y el contenido del producto están en **español**; mantén ese idioma en la documentación y en todo texto visible al usuario.
- La estructura `client/` + `server/` es parte de la tarea `t02`, aún no creada.

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
