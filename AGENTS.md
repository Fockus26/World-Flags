## Claude assistant context for world-flags

Astro + React + TypeScript + Bun. Quiz de banderas con progreso tipo Anki.

### Antes de tocar código, lee según la tarea:
- Estilos/design system → docs/design-system.md
- Animaciones → docs/design-system.md#animations
- Estado global / progreso persistido → docs/state-management.md
- Agregar features de juego (regiones, orden, scoring) → docs/features.md

### Reglas rápidas (aplican siempre)
- No introduzcas librerías de animación nuevas ni CSS keyframes: todo motion vive en `src/styles/animations.ts`
- Estilos con CSS Modules + variables de `src/styles/variables.css`, nunca hardcodear colores/spacing
- Cualquier dato persistido va a través de `src/utils/learning-storage.ts` (localStorage), no acceso directo a `window.localStorage` desde componentes
- `bun` para todo (install/dev/build)