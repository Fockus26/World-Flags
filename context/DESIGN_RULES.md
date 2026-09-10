# Design Rules — World Flags

> Reglas no negociables. Romper una es una **decisión nueva** que pasa por el dueño
> y queda en `decisions/`, no una excepción silenciosa en un componente.

## Accesibilidad — WCAG 2.1 AA

- Texto normal ≥ **4.5:1** contra su fondo real; texto grande (≥24px o ≥19px bold) ≥ **3:1**.
- Bordes de inputs, iconos informativos y anillos de foco ≥ **3:1**.
- **Ningún estado solo por color.** Correcto/incorrecto, seleccionado, activo:
  color **+** icono/texto/forma. (Ej.: los 4 botones de calificación llevan
  etiqueta *y* número; la alerta de respuesta lleva icono *y* texto.)
- Foco visible siempre. En este proyecto: **el foco de teclado replica el aspecto
  del hover** (ver `Button.tsx` `HOVER_LIKE_FOCUS`, `RegionOption`/`OptionTile` con
  `has-focus-visible:`). Mantén ese patrón.
- Sin scroll horizontal a **320px**. Al 400% de zoom, una columna.
- `prefers-reduced-motion` respetado (bloque en `global.css` + `<MotionConfig reducedMotion="user">` en `Providers.tsx`).
- Todo control con nombre accesible. Iconos-solo → `aria-label` de la **acción**.
- Verificación axe-core: inyectar `axe-core` 4.10 desde cdnjs y correr sobre cada
  pantalla/estado, claro **y** oscuro. Estado al cierre de la migración: 0 violaciones.

Casos que fallan siempre, revísalos explícito: el morado `primary` como **texto**
sobre fondo claro (≈3.97:1, falla); chips/badges de estado; placeholders;
texto deshabilitado; el color de score de `RegionOption` usado como texto.

## Breakpoints (Tailwind v4 por defecto + custom `min-[…]`)

| Nombre | Ancho |
|---|---|
| base | 0 (mobile-first) |
| sm | 640px |
| md | 768px (el que más rompe) |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

El código usa además breakpoints arbitrarios `min-[30rem]`, `min-[43rem]`,
`min-[44rem]` en las pantallas de sesión. No inventes más; reutiliza esos.

**Anchos de verificación QA:** 320 · 360 · 390 · 430 · 768 · 1024 · 1280 · 1440 · 1920 · 2560 · 3840.

## Tokens

- **Cero valores mágicos de color / espaciado / radio / sombra.** Ver `COLORS.md`,
  `DESIGN_TOKENS.md`. Convive un sistema propio (`--app-color-*` → `@theme inline`
  → `--color-*`) con los tokens de HeroUI (`--accent`, `--surface`, `--overlay`,
  `--field-*`, …). El puente vive en `src/styles/heroui-theme.css`. Ver
  `decisions/02-tokens-y-tema.md` — **entiéndelo antes de tocar `theme.css` o
  `heroui-theme.css`**, hay colisiones de namespace resueltas ahí.
- Excepción viva: tamaños de fuente arbitrarios heredados. No sumes más.

## Componentes

- Revisa `COMPONENTS_INVENTORY.md` antes de crear uno nuevo.
- Los wrappers de `src/components/ui/` envuelven HeroUI y **conservan su API previa
  a la migración** (props `color`/`variant`/`disabled`/`onClick`…), para que los
  ~17 consumidores no cambien. Respeta ese contrato: si necesitas algo nuevo,
  amplía la API, no rompas la existente.
- Widgets compuestos → patrón WAI-ARIA APG. HeroUI/React-Aria ya lo trae; úsalo.

## Código

- **bun** como gestor y runner. Nunca npm/yarn/pnpm.
- **Context7** antes de usar cualquier API de librería.
- TypeScript estricto, cero `any`. `bunx astro check` limpio antes de cerrar.
- Persistencia solo por `learning-storage.ts`. Redux solo por los hooks de `src/hooks/`.
- **Nadie levanta `bun run dev`.** Lo levanta el dueño; los agentes piden y esperan.
- `framer-motion` no se usa para nada nuevo (no ejecuta aquí). Animaciones nuevas:
  `tw-animate-css` (`animate-in …`) o CSS. Ver `decisions/03-animaciones.md`.

## Contenido

- Ningún agente inventa copy final, `alt` real, dominio, ni datos. Placeholder
  marcado + fila en `CONTENT_CHECKLIST.md`.
- Cero lorem ipsum. Placeholder realista en español, con la longitud del texto final.

## Git

- Nada se commitea sin aprobación explícita del dueño.
- Contra `main`: merge `--no-ff`, **sin push**.
- Nada destructivo.

## Reglas específicas de este proyecto

- **El SW cachea agresivo**: al verificar en dev hay que desregistrarlo + limpiar
  `caches` y recargar tras cada cambio (ver `CLAUDE.md`).
- **Modales HeroUI**: el diálogo lleva `![max-height:90dvh] [overflow-y:auto]` porque
  HeroUI lo recorta sin barra y su `--visual-viewport-height` no es fiable aquí.
- **`Button` es `fullWidth` por defecto** (salvo `isIconOnly` o `fullWidth={false}`
  explícito en cabeceras de modal). Las filas de botones reparten el ancho.
