# Wireframes del MVP (móvil primero)

Baja fidelidad. No definen identidad visual ni contenido: solo estructura, jerarquía y estados. Ancho de referencia: 360 px.

Convenciones: `[ ]` botón, `( )` opción, `▢` imagen, `🔒` contenido premium, `←` volver.

## 1. Inicio

```
┌──────────────────────────┐
│ Ecos de Nicaragua     ☰  │
├──────────────────────────┤
│                          │
│      ▢ portada/logo      │
│                          │
│   Las leyendas cobran    │
│   vida.                  │
│                          │
│  [ Explorar leyendas ]   │
│                          │
│  [ Mapa ]   [ Trivias ]  │
│                          │
│  [ Ubica la leyenda ]    │
│                          │
│        Mi cuenta         │
└──────────────────────────┘
```

- El menú `☰` lleva a cuenta, planes y política de privacidad.
- Si hay sesión premium, «Mi cuenta» muestra el plan; si no, «Ingresar».

## 2. Biblioteca

```
┌──────────────────────────┐
│ ←  Biblioteca            │
├──────────────────────────┤
│ [ Buscar leyenda...    ] │
│ (Todas) (Caribe) (Pacífico) ... │
├──────────────────────────┤
│ ┌────────┐  ┌────────┐   │
│ │  ▢     │  │  ▢  🔒│   │
│ │ Título │  │ Título │   │
│ │ Región │  │ Región │   │
│ └────────┘  └────────┘   │
│ ┌────────┐  ┌────────┐   │
│ │  ▢     │  │  ▢     │   │
│ └────────┘  └────────┘   │
└──────────────────────────┘
```

- Filtro por región en chips desplazables; búsqueda por título.
- Las 6 leyendas se listan siempre; el candado indica contenido ampliado premium.
- Estado vacío: «No encontramos leyendas con ese filtro» + botón para limpiar.

## 3. Ficha de leyenda

```
┌──────────────────────────┐
│ ←  La Mocuana            │
├──────────────────────────┤
│ ▢ ilustración principal  │
│                          │
│ Región · Categoría       │
│ Resumen breve            │
│                          │
│ [ Escuchar narración 🔒] │
│                          │
│ Historia                 │
│ Texto...                 │
│                          │
│ Versiones                │
│ - Versión A (fuente)     │
│ - Versión B (fuente)     │
│                          │
│ Fuentes y procedencia    │
│ [verificado] Fuente 1    │
│ [testimonio oral] F. 2   │
│                          │
│ [ Jugar trivia ]         │
│ [ Ubicar en el mapa ]    │
└──────────────────────────┘
```

- El nivel de verificación se muestra junto a cada vínculo leyenda–lugar, no oculto.
- Si el contenido es premium y no hay acceso: se muestra el inicio del texto y un bloqueo con CTA de planes; nunca se envía el texto completo al cliente.
- Aviso visible cuando la procedencia es `pendiente` o `sin verificar`.

## 4. Mapa

```
┌──────────────────────────┐
│ ←  Mapa de Nicaragua     │
├──────────────────────────┤
│                          │
│      ▢ SVG 17 unidades   │
│      (táctil y ratón)    │
│                          │
├──────────────────────────┤
│ Departamento seleccionado│
│ Leyendas asociadas:      │
│ - Título    [verificado] │
│ - Título    [pendiente]  │
│                          │
│ [ Ver como lista ]       │
└──────────────────────────┘
```

- Panel inferior (bottom sheet) con las leyendas de la unidad tocada.
- «Ver como lista» es la alternativa textual accesible del mapa.
- Unidades sin leyendas documentadas muestran «Sin leyendas documentadas», sin inventar vínculos.

## 5. Trivia

```
┌──────────────────────────┐
│ ←  Trivia · La Mocuana   │
├──────────────────────────┤
│ Pregunta 2 de 5          │
│ ██████░░░░               │
│                          │
│ ¿Pregunta?               │
│                          │
│ ( ) Opción A             │
│ ( ) Opción B             │
│ ( ) Opción C             │
│ ( ) Opción D             │
│                          │
│ [ Responder ]            │
└──────────────────────────┘
```

Después de responder:

```
│ ✔/✘ Respuesta correcta   │
│ Explicación breve        │
│ [ Siguiente ]            │
```

Final:

```
│ Puntaje: 4 de 5          │
│ [ Repetir ] [ Biblioteca ]│
```

- En cuenta gratis: 2 de 5 preguntas y CTA premium para el resto; el backend no envía las preguntas bloqueadas.
- La explicación aparece solo después de responder.

## Reglas transversales

- Objetivos táctiles de al menos 44 px; nada depende solo de `hover`.
- Cada pantalla define estados: cargando, error, vacío y sin sesión.
- El contenido premium se muestra bloqueado con CTA, nunca como enlace roto.
- Las fuentes y su nivel de verificación son visibles en ficha y mapa.
- No se usa contenido cultural de relleno en los wireframes.
