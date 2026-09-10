# Typography — World Flags

## Familia

- **Plus Jakarta Sans** (Google Fonts) para todo. Pesos cargados: **500, 600, 700, 800**.
  - `--font-sans` en `heroui-theme.css` y `theme.css`.
  - Carga hoy: `<link rel="stylesheet" href="fonts.googleapis.com/css2?...&display=swap">`
    en `Layout.astro` (render-blocking, con `preconnect`). Autohospedar con
    `@fontsource-variable/plus-jakarta-sans` mejoraría LCP — ver `CONTENT_CHECKLIST.md`.
- `font-black` (900) se usa en varios sitios pero **el peso 900 no se carga** y
  `font-synthesis: none` → renderiza igual que `font-extrabold`. Al tocar un archivo,
  cambiar `font-black` → `font-extrabold` o añadir `900` al import.

## Escala

No hay una escala tokenizada formal. Los headings usan `clamp()` en `global.css`:

| Nivel | Tamaño |
|---|---|
| h1 | `clamp(1.5rem, 4vw, 2rem)` |
| h2 | `clamp(1.2rem, 3vw, 1.5rem)` |
| h3 | `clamp(1.05rem, 2.5vw, 1.2rem)` |
| body | 14px (system-font base del reset) / `text-sm`–`text-base` en componentes |

El resto de la app usa tamaños **arbitrarios** de Tailwind heredados de antes de
HeroUI: `text-[0.68rem]`, `text-[0.72rem]`, `text-[0.82rem]`, `text-[0.9rem]`,
`text-[1.4rem]`, `text-[1.45rem]`, `text-[clamp(...)]`, etc.

## Reglas

- **No agregues más tamaños arbitrarios.** Cuando toques un componente, migra sus
  `text-[Xrem]` a la escala de Tailwind (`text-xs`/`sm`/`base`/`lg`/`xl`/`2xl`).
- Un tamaño nuevo intencional = decisión → fila en `DECISIONS_INDEX.md`.
- Consolidar la escala tipográfica en tokens es una tarea pendiente (ver
  `CURRENT_PHASE.md` › pendientes generales).
