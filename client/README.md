# Ecos de Nicaragua — cliente (React 19 + Vite)

```bash
npm install
npm run dev      # http://localhost:5173, proxy /api -> http://localhost:3000
npm run build
```

- La API debe estar en el puerto 3000 (o `VITE_API_TARGET=http://host:puerto npm run dev`).
- En producción sirve `dist/` desde el mismo origen que `/api` (la sesión usa cookie HttpOnly SameSite=Lax y CSRF).
- `public/img/portadas/*.webp`: portadas de respaldo (solo las gratuitas). Las ilustraciones premium llegan siempre por `/api/media`.
- `src/data/nic-map.json`: límites de las 17 unidades, derivados de geoBoundaries (CC BY 4.0; la atribución está en el pie).
- Páginas: inicio, leyendas, ficha, mapa, trivias, ubica la leyenda, planes, cuenta, ingresar/registro/recuperar/restablecer, administración.
