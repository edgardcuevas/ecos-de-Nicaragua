# ROADMAP — Ecos de Nicaragua (MVP)

Plataforma web interactiva de leyendas nicaragüenses. Eslogan: «Las leyendas cobran vida».
Este roadmap está organizado por **fases y dependencias**, no por fechas.

---

## Cómo usar este roadmap (para agentes)

1. Trabaja **una tarea a la vez**, en el orden de su fase. Una tarea por rama.
2. Antes de empezar una fase, revisa su línea **Depende de**. Si no se cumple, no la empieces.
3. Las tareas marcadas `[opcional]` no son parte del MVP. No las hagas salvo que se pida.
4. Si algo no está definido aquí, **no lo inventes**: anótalo en «Decisiones abiertas» y pregunta.
5. Al terminar una tarea, marca su casilla y verifica el **Terminado cuando** de su fase.
6. Cualquier función nueva se compara contra el alcance del MVP (`docs/`) antes de entrar.

Tamaños: `S` pequeña, `M` mediana, `L` grande.

---

## Stack

- **Frontend:** React (HTML, CSS, JavaScript).
- **Backend:** Node.js con Express, API REST en JSON.
- **Base de datos:** MySQL.
- **Mapa:** SVG propio de Nicaragua (17 unidades: 15 departamentos y 2 regiones autónomas).
- **Despliegue:** VPS Ubuntu con Nginx, PM2 y HTTPS.
- **Archivos multimedia:** almacenamiento estático o de objetos; la base de datos guarda solo la ruta, no el archivo.

## Reglas que no se negocian

- **Permisos en el servidor.** Todo acceso a contenido premium o de administración se comprueba en el backend. Ocultar un botón en React no cuenta.
- **Sesiones, no JWT.** Cookies `HttpOnly`, `Secure` y `SameSite`, con protección CSRF y expiración. Nunca guardar credenciales de sesión en `localStorage`.
- **Contraseñas** con Argon2id (o bcrypt). Nunca en texto plano ni con SHA directo.
- **Acceso premium por estado real:** el backend consulta la suscripción y sus fechas, no solo el nombre del plan.
- **Sin contenido cultural inventado.** Cada vínculo leyenda–lugar lleva fuente y nivel de verificación (`verificado`, `testimonio oral`, `pendiente`, `sin verificar`). No se asigna una leyenda a un lugar sin respaldo.
- **Datos mínimos de usuario:** correo, nombre de usuario, contraseña (hash), rol, estado de suscripción y fecha de registro. Nada más.
- **Secretos fuera del repositorio.** Solo `.env.example`, sin valores reales.
- **Consultas parametrizadas** y validación de entradas en todos los formularios y rutas.
- **Textos, imágenes y audios propios o con licencia anotada.** No copiar versiones publicadas completas.

## Reparto gratis y premium (MVP)

| Función | Gratis | Premium |
|---|---|---|
| Biblioteca | Las 6 leyendas, 1 ilustración cada una | Contenido completo y versiones ampliadas |
| Trivias | 2 de 5 preguntas por leyenda | Las 5 preguntas |
| Ubica la leyenda | Completo | Completo |
| Mapa | Básico | Información ampliada |
| Audios | — | Narraciones |
| Material educativo | — | Disponible |

El premium se activa **a mano o con código**. No hay pasarela de pago en el MVP.

## Fuera del MVP

Pasarela de pago, suscripciones automáticas, app móvil, panel institucional para colegios, mapa de los 153 municipios, aula virtual, panel completo para editar contenido.

---

## Fase 0 — Arranque

**Objetivo:** dejar decidido el alcance y tener el proyecto listo para construir.
**Depende de:** nada.

- [x] `t01` (S) Definir el alcance del MVP y guardar el documento en `docs/`. → [`docs/alcance-mvp.md`](docs/alcance-mvp.md)
- [x] `t02` (S) Crear la estructura del repo: `client/` (React), `server/` (Node.js), README, `.env.example`. → [`README.md`](README.md)
- [x] `t03` (M) Wireframes de 5 pantallas: inicio, biblioteca, ficha de leyenda, mapa y trivia. Primero versión celular. → [`docs/wireframes.md`](docs/wireframes.md)
- [ ] `t04` (M) Esquema de MySQL con diagrama. Partir del borrador del MVP, recortado: sin `municipios`, `materiales_educativos` ni respuestas por usuario. Incluir `fuentes` y nivel de verificación. → borrador: [`docs/esquema-bd.md`](docs/esquema-bd.md)

**Terminado cuando:** el repo tiene estructura y README, el esquema está revisado por el autor y los wireframes existen.

---

## Fase 1 — Contenido e identidad

**Objetivo:** reunir y escribir el contenido cultural y definir la imagen del proyecto.
**Depende de:** Fase 0 (`t01`). Corre **en paralelo** con las fases 2, 3 y 4.
**Nota:** esta fase es investigación y producción, no código. No la rellenes con texto inventado.

- [ ] `t07` (M) Identidad visual: paleta, tipografías y guía de estilo de una página, a partir del logo.
- [ ] `t05` (L) Investigar las 6 leyendas (La Mocuana, El Cadejo, La Carretanagua, La Cegua, La Llorona, El Padre sin Cabeza). Mínimo 2 fuentes cada una, versiones y lugares, con nivel de verificación.
- [ ] `t11` (S) Definir cómo citar fuentes y versiones; anotar la licencia de cada imagen y audio.
- [ ] `t06` (L) Redactar las 6 fichas de leyenda: resumen, historia, origen, versiones, región y referencias.
- [ ] `t50` (M) Fichas básicas de los 17 departamentos y regiones, con fuente.
- [ ] `t08` (L) Una ilustración principal por leyenda, con estilo coherente, en WebP liviano.
- [ ] `t10` (M) 30 preguntas de trivia: 5 por leyenda, 4 opciones, 1 correcta y explicación.
- [ ] `t09` (S) 2 guiones de narración de 2 a 3 minutos.
- [ ] `t25` (M) Grabar y editar las 2 narraciones (MP3 comprimido).

**Terminado cuando:** las 6 fichas, las 17 fichas de departamentos, las 6 ilustraciones, las 30 preguntas y las 2 narraciones existen, cada dato con su fuente.

---

## Fase 2 — Backend

**Objetivo:** base de datos y API que sirvan el contenido.
**Depende de:** Fase 0 (`t02`, `t04`).

- [ ] `t12` (M) Crear la base de datos con migraciones y un script de carga (seed) del contenido disponible. → código listo: [`server/db`](server/db), pendiente ejecutar contra MySQL
- [ ] `t13` (M) API de leyendas: listar, detalle y filtrar por región y categoría.
- [ ] `t14` (M) API de regiones para el mapa, con leyendas asociadas, fuente y nivel de verificación.
- [ ] `t17` (S) Servir imágenes y audios con caché y rutas por leyenda.
- [ ] `t15` (M) API de trivias: entregar preguntas, validar respuestas y calcular puntaje.

**Terminado cuando:** las rutas responden con datos reales de la base y tienen pruebas básicas.

---

## Fase 3 — Frontend

**Objetivo:** interfaz en React para explorar, escuchar y jugar.
**Depende de:** Fase 0 (`t03`), Fase 1 (`t07`) y la API correspondiente de la Fase 2.
**En paralelo con:** Fase 4.

- [ ] `t18` (M) Proyecto React: rutas, layout y estilos base con la identidad visual.
- [ ] `t19` (M) Inicio y biblioteca con búsqueda y filtro por región.
- [ ] `t20` (M) Ficha de leyenda: ilustración, historia, versiones, fuentes y aviso de procedencia no verificada.
- [ ] `t21` (M) Reproductor de audio con controles claros.
- [ ] `t22` (L) Mapa interactivo en SVG con las 17 unidades, táctil y con ratón, y una lista de texto como alternativa.
- [ ] `t23` (M) Trivias: pregunta por pregunta, explicación y puntaje final.
- [ ] `t40` (M) Juego «Ubica la leyenda»: arrastrar cada leyenda a su lugar documentado, con validación y puntaje.

**Terminado cuando:** todas las pantallas funcionan en celular y computadora, sin enlaces rotos.

---

## Fase 4 — Usuarios y premium

**Objetivo:** cuentas, roles y acceso premium listo para vender sin pasarela de pago.
**Depende de:** Fase 2 (`t12`). Corre en paralelo con la Fase 3.

- [ ] `t16` (L) Usuarios: registro, login y logout con sesiones, roles `gratis`, `premium` y `admin`.
- [ ] `t34` (M) Planes y suscripciones en la base de datos, con fecha de inicio, fin y estado.
- [ ] `t26` (S) Definir el reparto gratis/premium (ver tabla arriba).
- [ ] `t35` (M) Control de acceso premium en el servidor para leyendas, audios y preguntas.
- [ ] `t24` (M) Pantallas de registro, login y planes, con bloqueo visual del contenido premium.
- [ ] `t39` (S) «Mi cuenta»: plan actual, vencimiento y cerrar sesión.
- [ ] `t46` (S) Política de privacidad y aviso de uso de datos.
- [ ] `t37` (M) Recuperar contraseña por correo con token temporal de un solo uso.
- [ ] `t27` (S) Confirmar cómo se activa el premium en el MVP: manual o con código.
- [ ] `t38` (M) Panel mínimo de administración: buscar usuarios, cambiar roles, activar o quitar premium y fijar vencimiento.
- [ ] `t45` (M) Códigos de activación únicos, de un solo uso, con hash y vencimiento.
- [ ] `t36` (M) `[opcional]` Progreso del usuario: puntajes, leyendas vistas y favoritas.

**Terminado cuando:** un usuario gratis no puede ver contenido premium ni cambiando la URL, un administrador puede activar el premium y los permisos se actualizan al instante.

---

## Fase 5 — Pruebas y lanzamiento

**Objetivo:** publicar una versión segura que puedan usar personas ajenas al desarrollador.
**Depende de:** fases 2, 3 y 4 con sus funciones completas. Desde aquí no entra nada nuevo.

- [ ] `t28` (M) Pruebas funcionales en Android, iPhone y computadora.
- [ ] `t32` (M) Revisión de seguridad: validación, consultas parametrizadas, CORS, límite de peticiones, secretos fuera del repo y pruebas de autorización.
- [ ] `t31` (M) Publicar en servidor con dominio, HTTPS, copia diaria de MySQL fuera del servidor y una prueba de restauración.
- [ ] `t29` (M) Probar con 5 a 10 personas reales, empezando por docentes y mayores de edad. Con menores, pedir antes autorización.
- [ ] `t30` (M) Corregir lo que bloquea el uso; el resto va a la lista posterior al MVP.
- [ ] `t33` (S) Lanzar el MVP y preparar una demo corta para Nicaragua Emprende.

**Terminado cuando:** el MVP está publicado con HTTPS, hay respaldos con restauración probada, no hay errores críticos conocidos y alguien ajeno al autor lo usó.

---

## Fase 6 — Extras `[opcional]`

**Objetivo:** ampliar el producto después de cumplir el MVP.
**Depende de:** fases 0 a 4. No cuenta en el MVP.

- [ ] `t41` (M) Juego «¿Qué leyenda soy?»: pistas una por una; menos pistas, más puntos.
- [ ] `t42` (S) Escribir 3 a 5 pistas por leyenda.
- [ ] `t43` (M) Diseñar un personaje nicaragüense original y las Ceguas para el runner. No copiar personajes ni juegos existentes.
- [ ] `t44` (L) Juego runner «huir de las Ceguas» con Canvas o Phaser.
- [ ] `t49` (M) Fichas para docentes: objetivo, actividad y evaluación, sin aula virtual.
- [ ] Las 4 narraciones restantes y efectos sonoros.

---

## Decisiones abiertas (no decidir sin el autor)

- ¿El contenido se carga con scripts versionados en el repo o con un panel de edición?
- ¿Qué servidor VPS se usa y cuánta RAM tiene? (Node, MySQL y Nginx juntos pueden quedar justos con 1 GB.)
- ¿Qué servicio de correo se usa para recuperar contraseñas?
- ¿Cuál es el dominio definitivo?
- ¿Qué identidad visual: misterio, folclore tradicional o una mezcla?
- ¿Precio, duración y tipo de suscripción premium (mensual, anual)?
