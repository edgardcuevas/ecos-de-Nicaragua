# Auditoría de seguridad M09 — Ecos de Nicaragua

## npm audit --omit=dev

Se detectan 2 vulnerabilidades en `mysql2` (transitiva vía `express-mysql-session@3.0.3`, que fija `mysql2@3.10.2`):

1. **GHSA-3f6p-5ww8-9rcr** (high) — degradación del plugin de autenticación a `mysql_clear_password`.
2. **GHSA-rgwj-5xj2-c3m3** (moderate) — descompresión sin límite en el protocolo comprimido.

### Justificación

- La aplicación se conecta únicamente a una base MySQL propia con autenticación estándar (`mysql_native_password`/`caching_sha2_password`); el servidor nunca solicita `mysql_clear_password`, por lo que la ruta vulnerable no se ejerce.
- El protocolo comprimido de MySQL no está habilitado (`compress` no se configura en `dbConfig`), por lo que la descompresión vulnerable no se alcanza.
- Corregir con `npm audit fix --force` degradaría `express-mysql-session` a la 2.1.8, que depende de `mysql@2.x` y `express-session@1.17`, rompiendo la compatibilidad con el código actual. No existe una versión parcheada de `express-mysql-session` que use `mysql2 >= 3.23.1`.
- Mitigación adicional: el usuario MySQL de la aplicación tiene privilegios mínimos y la conexión se realiza por TCP local/en VPS con TLS cuando corresponda.

### Acción pendiente

Reevaluar cuando se publique una versión de `express-mysql-session` compatible con `mysql2 >= 3.23.1`, o migrar a un almacén de sesiones propio basado en el pool de `mysql2` existente.

## Otras verificaciones M09

- Todas las consultas SQL son parametrizadas (sin interpolación de entrada de usuario).
- CORS solo se habilita con origen exacto (`CLIENT_ORIGIN`) y credenciales.
- Rate limiting global activo; login, recuperación y canje tienen límites específicos.
- Helmet configurado sin CSP y con `crossOriginResourcePolicy: cross-origin` para medios.
- Logs redactan cookies, tokens y contraseñas.
- Errores 500 no revelan stack ni SQL.
- `.env`, `storage/` y `node_modules/` están en `.gitignore`.
