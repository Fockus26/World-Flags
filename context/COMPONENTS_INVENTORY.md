# Components Inventory — World Flags

> Revisa esto antes de crear un componente. Los de `src/components/ui/` son
> **wrappers sobre HeroUI v3 que conservan la API previa a la migración** — no
> rompas ese contrato, amplíalo.

## UI reutilizable (`src/components/ui/`)

| Componente | Envuelve | API que expone (contrato) | Notas |
|---|---|---|---|
| `Button` | HeroUI `Button` | `color` (primary/secondary/danger/warning/success/neutral) · `variant` (contained/outline/text/soft) · `disabled` · `onClick` · `pressed` · `fullWidth` · `isIconOnly` | Pinta las custom props `--button-*` de HeroUI con tokens de marca. **`fullWidth` por defecto** salvo icon-only. `soft` hover ahonda tinte (no salta a color pleno). Foco = aspecto hover |
| `IconButton` | `Button isIconOnly` | `Button` + `aria-label` obligatorio | |
| `Modal` | HeroUI `ModalBackdrop/Container/Dialog` | `isOpen` · `onClose` · `role` · `ariaLabel(ledby/describedby)` · `size` | `onClose` con Escape y clic-fuera. Diálogo `![max-height:90dvh] [overflow-y:auto]` (HeroUI recorta sin barra). `animateHeight` está deprecado (no-op) |
| `Input` | HeroUI `Input` / `TextField`+`Label` | API nativa de `<input>` (incl. `onChange` con evento) · `label?` | Con `label` → `TextField`+`Label`; sin label → `Input` pelado |
| `Select` | HeroUI `Select`+`ListBox` | `options[{value,label}]` · `value` · `onChange(value)` · `label?` · `aria-label?` | Reemplazó al combobox `aria-activedescendant` casero |
| `Tooltip` | **propio** (portal a `<body>`, `position:fixed`) | `label` · `children` · `side` | NO usa el Tooltip de HeroUI (envolvía botones → nested-interactive; y lo recortaba el overflow del modal). Muestra en hover del ratón y focus del hijo |
| `FeedbackMessage` | HeroUI `Alert` | `variant` (success/danger) · `size` · `role` · `autoDismissMs?` · `onDismiss?` | Se le fuerza fondo `*-soft` + borde del color + `items-center` (el Alert de HeroUI por defecto es una tarjeta sutil sin color de fondo). Entra con `animate-in` |
| `OptionTile` | radio nativo + label | `name` · `value` · `checked` · `onChange` | Segmentado de selección única (modo/orden/dificultad/tema). Estilado con tokens HeroUI. Accesible sin ser HeroUI |
| `GradeButtons` | `Button` `variant="soft"` ×4 | `onGrade(grade)` | Otra vez/Difícil/Bien/Fácil, atajos 1–4, feedback de selección |
| `Fieldset` | `<fieldset>`/`<legend>` | `legend` · `hideLegend?` | Sin equivalente en HeroUI; se conserva por semántica |

`GradeButtons` y `Fieldset` no son HeroUI a propósito.

## Componentes de juego (una pantalla, no reutilizables entre pantallas)

Ver `SECTION_INVENTORY.md`. Resumen de dónde vive qué:

- `components/game/FlagGame.tsx` — router de vistas por estado de Redux
- `components/game/configuration/` — pantalla de config: `Configuration`, `RegionSelector`,
  `RegionOption`, `UserSummary`, `ThemeSwitcher`, `CountryPickerModal`, `LeaderboardModal`,
  `AchievementsModal`, y `configurationModal/` (`ConfigurationModal` con HeroUI `Tabs`,
  `AccountTab`, `GameTab`, `AuthSection`, `Avatar`, `EmailConfirmationPending`)
- `components/game/AchievementToasts.tsx` — snackbars de logro apiladas abajo a
  la derecha, montadas una sola vez en `FlagGame` (fuera del router de vistas,
  así se ven en cualquier pantalla)
- `components/game/session/` — sesión: `Session` (rush), `DailyPractice`, `AnswerForm`,
  `FlagDisplay`, `Header` (cronómetro), `Timer`, `ConfirmationModal`
- `components/game/Results.tsx` — resultados (práctica vs. competitivo por `result.mode`)
- `components/app/` — `Providers`, `AuthEffects`, `GameEffects`, `ThemeEffects`,
  `AchievementsEffects` (sella los logros recién cumplidos; ver `decisions/05-logros.md`)

## Estilos globales (`src/styles/`)

`global.css` (entrypoint Tailwind + `@import "@heroui/styles"` + reset), `variables.css`
(`--app-color-*`), `theme.css` (`@theme inline` → `--color-*` + radios), `heroui-theme.css`
(puente a los tokens de HeroUI), `animations.ts` (legado framer, inerte).
