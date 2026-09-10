# Page Inventory — World Flags

> El sitio tiene **una sola ruta**. Lo que parecen "páginas" son 4 vistas que
> alternan por estado de Redux dentro de esa ruta, sin cambiar la URL.

| Ruta | Archivo | Qué monta | Estado |
|---|---|---|---|
| `/` | `src/pages/index.astro` → `src/components/App.tsx` (`client:load`) | `Providers` (Redux + Effects) → `FlagGame` | Cerrada |

## Router de vistas — `components/game/FlagGame.tsx`

Elige qué renderizar según el estado del slice `game`:

| Condición | Vista | Archivo |
|---|---|---|
| `activeGame` presente | **Sesión** (práctica por continente o competitivo "rush") | `game/session/Session.tsx` |
| `dailyPracticeQueue` presente | **Práctica diaria** (revelar → calificar, estilo Anki) | `game/session/DailyPractice.tsx` |
| `lastResult` presente | **Resultados** | `game/Results.tsx` |
| (por defecto) | **Configuración** (pantalla de inicio) | `game/configuration/Configuration.tsx` |

Las transiciones entre vistas son condicionales de React + `animate-in` de
`tw-animate-css` (no framer). Ver `SECTION_INVENTORY.md` para el desglose de cada vista.

## Rutas futuras posibles (no implementadas)

Modos de juego nuevos (capitales, ubicar en mapa, "todos de un tirón") — el
`README.md` › Roadmap y `TODO.md` los listan. Seguirían el patrón
`components/game/<modo>/` reutilizando `components/ui/`.
