# Design Tokens — World Flags

> Valores reutilizables que no son color ni tipografía. Fuente real: `src/styles/*.css`.

## Espaciado

No hay tokens de espaciado propios: se usa la **escala de Tailwind** (`gap-2`,
`p-4`, `mt-3`, …), unidad base 0.25rem (4px). Hay `p-[0.85rem]`, `gap-[0.45rem]`,
etc. arbitrarios heredados en las pantallas de sesión — no sumar más.

## Radios

`theme.css` **reemplaza la escala de radios de Tailwind** por una más generosa
("HeroUI-ish") + HeroUI deriva su `--radius`:

| Token | Valor | Notas |
|---|---|---|
| `--radius` (HeroUI, `heroui-theme.css`) | `0.75rem` | base de HeroUI (botones, campos) |
| `--radius-sm` (Tailwind, `theme.css`) | `0.625rem` | |
| `--radius-md` | `1rem` | |
| `--radius-lg` | `1.375rem` | tarjetas de pantalla |
| `--radius-xl` | `1.75rem` | |
| `--radius-2xl` | `2rem` | tarjetas grandes en `min-[44rem]` |
| `--field-radius` (HeroUI) | `calc(var(--radius) * 0.85)` | inputs/selects |

Clases: `rounded-sm/md/lg/xl/2xl` ya heredan estos valores. Modales HeroUI usan
`min(32px, var(--radius-3xl))` internamente.

## Sombras

- `shadow-xl` de Tailwind en las tarjetas de pantalla (`Configuration`, `Session`,
  `DailyPractice`, `Results`).
- `--overlay-shadow` de HeroUI en modales/tooltips.
- Anillos de 2 px: `ring-2` del color de la nota en `RegionOption` (antes `shadow-[0_0_0_2px_...]`; D157).
- Elevación al pasar (D157): `shadow-md` en la tarjeta de continente, `shadow-sm` en las opciones del selector de juego y en `OptionTile`. `ring-*` y `shadow-*` se suman en un solo `box-shadow`.

## Movimiento

- `--default-transition-duration` (HeroUI): `0.15s`.
- Transiciones CSS propias: `duration-150` / `duration-180` / `duration-200` según componente.
- `tw-animate-css` (viene con `@heroui/styles`): `animate-in fade-in-0 slide-in-from-*
  duration-200` para entradas de vista y paneles de tabs.
- "Pop" al elegir (D158): `animate-in zoom-in-95` con `motion-safe:`, solo desde el
  `onChange` del usuario (nunca al montar ni al restaurar lo guardado).
- Skeleton (`ui/Skeleton.tsx`, D042): brillo de HeroUI (`skeleton 2s linear
  infinite` en `::after`) + entrada `animate-in fade-in duration-200` que espera
  `SKELETON_DELAY_MS` (300 ms) para que una carga rápida no parpadee. Con
  movimiento reducido: sin brillo, misma espera, fundido de 0,01 ms.
- `src/styles/animations.ts` (`motionVariants`, `motionTransition`) — **legado de
  framer-motion, mayormente inerte**. No lo uses para nada nuevo. Ver
  `decisions/03-animaciones.md`.
- `prefers-reduced-motion`: bloque global en `global.css` + `<MotionConfig reducedMotion="user">`.

## z-index

Sin escala tokenizada. Valores en uso: skip-link `z-1000`, modales HeroUI `z-50`,
tooltip propio (`Tooltip.tsx`, portal a `<body>`) `z-[200]`, listbox del Select `z-20`.

## Iconos

`iconoir-react` (import por nombre). Emojis funcionales para 🏆 (ranking) y 📍 (picker de países).
