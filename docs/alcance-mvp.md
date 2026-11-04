# Alcance del MVP — Ecos de Nicaragua

Documento de referencia para decidir si una función entra al MVP. Se deriva de `ROADMAP.md`; si hay conflicto, manda el roadmap.

## Objetivo

Plataforma web interactiva de leyendas nicaragüenses («Las leyendas cobran vida») para explorar, escuchar y jugar con contenido cultural documentado.

## Funciones incluidas

- Biblioteca de las 6 leyendas: La Mocuana, El Cadejo, La Carretanagua, La Cegua, La Llorona y El Padre sin Cabeza.
- Ficha de leyenda con historia, versiones, fuentes y aviso de procedencia no verificada.
- Mapa SVG propio de Nicaragua con 17 unidades (15 departamentos y 2 regiones autónomas) y sus leyendas asociadas.
- Trivias de 5 preguntas por leyenda, con explicación y puntaje.
- Juego «Ubica la leyenda» (arrastrar cada leyenda a su lugar documentado).
- Reproductor de audio para las narraciones.
- Cuentas con roles `gratis`, `premium` y `admin`, sesiones y recuperación de contraseña.
- Activación premium sin pasarela de pago.
- Panel mínimo de administración de usuarios y premium.

## Reparto gratis / premium

| Función | Gratis | Premium |
|---|---|---|
| Biblioteca | Las 6 leyendas, 1 ilustración cada una | Contenido completo y versiones ampliadas |
| Trivias | 2 de 5 preguntas por leyenda | Las 5 preguntas |
| Ubica la leyenda | Completo | Completo |
| Mapa | Básico | Información ampliada |
| Audios | — | Narraciones |
| Material educativo | — | Disponible |

## Fuera del MVP

Pasarela de pago, suscripciones automáticas, app móvil, panel institucional para colegios, mapa de los 153 municipios, aula virtual y panel completo para editar contenido.

## Reglas no negociables

- **Permisos en el servidor.** Todo acceso premium o de administración se comprueba en el backend; ocultar un botón en React no cuenta.
- **Sesiones, no JWT.** Cookies `HttpOnly`, `Secure` y `SameSite`, con CSRF y expiración. Nada de credenciales en `localStorage`.
- **Contraseñas** con Argon2id (o bcrypt), nunca en texto plano ni con SHA directo.
- **Premium por estado real:** el backend consulta la suscripción y sus fechas, no solo el nombre del plan.
- **Contenido cultural con fuente.** Cada vínculo leyenda–lugar requiere fuente y nivel (`verificado`, `testimonio oral`, `pendiente`, `sin verificar`).
- **Datos mínimos de usuario:** correo, nombre de usuario, hash de contraseña, rol, estado de suscripción y fecha de registro.
- **Secretos fuera del repositorio:** solo `.env.example`, sin valores reales.
- **Consultas parametrizadas** y validación de entradas en todas las rutas y formularios.
- **Material propio o con licencia anotada.** No copiar versiones publicadas completas.

## Criterios de aceptación del MVP

- Existen las 6 fichas, las 17 fichas de departamentos, las 6 ilustraciones, las 30 preguntas y las 2 narraciones, cada dato con su fuente.
- Un usuario gratis no puede ver contenido premium ni cambiando la URL.
- Un administrador puede activar el premium y los permisos se actualizan al instante.
- Todas las pantallas funcionan en celular y computadora, sin enlaces rotos.
- Está publicado con HTTPS, con respaldos y una restauración probada, sin errores críticos conocidos y usado por alguien ajeno al autor.

## Pendiente de decisión

- ¿El contenido se carga con scripts versionados o con un panel de edición?
- ¿Qué VPS se usa y cuánta RAM tiene?
- ¿Qué servicio de correo se usa para recuperar contraseñas?
- ¿Cuál es el dominio definitivo?
- ¿Qué identidad visual se adopta?
- ¿Precio, duración y tipo de suscripción premium?
- ¿La activación premium del MVP es manual o con código (t27)?
- «Material educativo» figura como premium, pero las fichas para docentes (t49) están en la Fase 6 `[opcional]`. Confirmar si entra al MVP.
