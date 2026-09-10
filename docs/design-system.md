# Design system

> Resumen técnico. Para el detalle vivo (paleta con hex, decisiones, inventario)
> ver `context/COLORS.md`, `context/DESIGN_TOKENS.md`, `context/DECISIONS_INDEX.md`.

## Librería de componentes

**HeroUI v3** (`@heroui/react` + `@heroui/styles`) sobre **Tailwind CSS v4**
(CSS-first: `@import "tailwindcss"` + `@import "@heroui/styles"` en `global.css`,
sin `tailwind.config.js`).

Los primitivos propios de `src/components/ui/` son **wrappers sobre HeroUI que
conservan su API previa a la migración** (props `color`/`variant`/`disabled`/
`onClick`…). No rompas ese contrato: los ~17 consumidores dependen de él.

## Tokens de color — dos sistemas puenteados

1. `src/styles/variables.css` — paleta propia `--app-color-*` (claro en `:root`,
   oscuro en `[data-theme="dark"]` + `@media prefers-color-scheme`).
2. `src/styles/theme.css` — `@theme inline` que expone lo anterior como utilidades
   Tailwind (`--color-primary` → `bg-primary`, etc.) **y reemplaza la escala de
   radios** por una más generosa.
3. `src/styles/heroui-theme.css` — reescribe los tokens **base** de HeroUI
   (`--accent`, `--surface`, `--overlay`, `--field-*`, `--radius`, `--font-sans`…)
   con la paleta de marca. HeroUI deriva solo `-hover`/`-soft`/`-foreground`.

`[data-theme]` en `<html>` (lo pone `ThemeEffects`) controla ambos a la vez.

**Cuidado:** hubo colisiones de namespace (Tailwind `overlay` apuntaba al scrim
oscuro viejo → modales oscuros en modo claro; `--field-background` = blanco → campos
invisibles). Resueltas en `heroui-theme.css` / `theme.css`. **Lee
`context/decisions/02-tokens-y-tema.md` antes de tocar esos archivos.**

## Reglas

- Nunca hardcodear hex/px de color, espaciado, radio o sombra. Usar `var(--color-*)`,
  `bg-*`, `rounded-*`, tokens de HeroUI.
- Tamaños de fuente: hay muchos `text-[Xrem]` arbitrarios heredados. No sumes más;
  migra a la escala de Tailwind cuando toques el archivo (ver `context/TYPOGRAPHY.md`).
- Dark mode: mismo set de variables redefinidas bajo `[data-theme="dark"]`.

## Animaciones

- **framer-motion NO ejecuta en este stack.** `src/styles/animations.ts` es legado
  mayormente inerte. Ver `context/decisions/03-animaciones.md`.
- Animaciones nuevas: `tw-animate-css` (`animate-in fade-in-0 slide-in-from-* duration-200`,
  viene con `@heroui/styles`) o transiciones CSS.
- Los propios componentes de HeroUI traen sus micro-interacciones (tabs, backdrop,
  checkbox) vía CSS/React Aria.
- `prefers-reduced-motion`: bloque en `global.css` + `<MotionConfig reducedMotion="user">` en `Providers`.
