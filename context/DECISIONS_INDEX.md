# Decisions Index — World Flags

> Buscador. El detalle vive en `decisions/`. No dupliques el detalle aquí.
> IDs secuenciales, nunca se reutilizan; obsoletas se marcan, no se borran.

| ID | Categoría | Resumen | Archivo | Estado |
|---|---|---|---|---|
| D001 | HeroUI | Migrar toda la UI a **HeroUI v3** (`@heroui/react` 3.2.x) sobre Tailwind v4, con wrappers que conservan la API previa | `decisions/01-heroui-migracion.md` | Implementado |
| D002 | HeroUI | Wrappers de `ui/` mantienen `color`/`variant`/`disabled`/`onClick`… — los ~17 consumidores no cambian | `decisions/01-heroui-migracion.md` | Implementado |
| D003 | Tokens | Puente de tema: `--app-color-*` → `@theme inline` → `--color-*`, y `heroui-theme.css` reescribe los tokens base de HeroUI con la marca | `decisions/02-tokens-y-tema.md` | Implementado |
| D004 | Tokens | `--color-overlay` apunta a `--overlay` de HeroUI (superficie opaca), no al scrim oscuro viejo — colisión de namespace que pintaba los modales oscuros en modo claro | `decisions/02-tokens-y-tema.md` | Implementado |
| D005 | Tokens | `--field-background` = gris suave (no blanco) para separar inputs/selects del blanco de tarjetas/modales | `decisions/02-tokens-y-tema.md` | Implementado |
| D006 | Animación | **framer-motion no ejecuta en este stack** (entrada, `AnimatePresence` y `layout`). Vistas → `initial={false}` / condicionales; animaciones nuevas → `tw-animate-css` | `decisions/03-animaciones.md` | Implementado |
| D007 | Animación | `<MotionConfig reducedMotion="user">` en `Providers` para respetar reduced-motion del SO en lo que quede de framer | `decisions/03-animaciones.md` | Implementado |
| D008 | Persistencia | Columnas `last_practice_by_country` / `region_best_times` en `user_learning_data` + merge en `syncOnLogin` (fecha más reciente por país, menor ms por región) | `decisions/04-persistencia.md` | Implementado |
| D009 | Persistencia | El invitado ya no se limpia en cada carga: `GameEffects` solo limpia en transición `authenticated → guest` real; si no, hidrata de `localStorage`. Fallback a `localStorage` si Auth no resuelve en 2.5s | `decisions/04-persistencia.md` | Implementado |
| D010 | Componentes | `Button` es `fullWidth` por defecto (salvo `isIconOnly`/`fullWidth={false}`); las filas de botones reparten el ancho | `decisions/01-heroui-migracion.md` | Implementado |
| D011 | Componentes | `Tooltip` propio (portal a `<body>`, `position:fixed`) en vez del de HeroUI — evita nested-interactive y el recorte por overflow del modal | `decisions/01-heroui-migracion.md` | Implementado |
| D012 | Componentes | `Modal`: `![max-height:90dvh] [overflow-y:auto]` en el diálogo (HeroUI recorta sin barra; su `--visual-viewport-height` no es fiable aquí) | `decisions/01-heroui-migracion.md` | Implementado |
| D013 | Diseño | Selección de continente en `RegionOption` usa el color por puntuación (borde + anillo + casilla), nunca el morado; el texto va en color fijo AA | `decisions/02-tokens-y-tema.md` | Implementado |
| D014 | Build | `astro.config` `optimizeDeps.include` para `@heroui/react` + `react-aria-components` + `framer-motion`, y React Compiler solo sobre `src/` — sin esto Vite reoptimiza a mitad de carga (504) y la isla no hidrata | `decisions/01-heroui-migracion.md` | Implementado |
| D015 | QA | Se añadió `@playwright/test` + `e2e/game-flows.spec.ts` (14 flujos). Necesita alineación de selectores con la UI migrada | `PHASE_LOG/heroui-migracion.md` | Parcial |
