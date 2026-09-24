# 23 — Contorno de foco del color del elemento y hover al tocar en móvil

> Unidad `style/foco-y-toque` (tanda del 2026-09-23, W7). Cubre D101–D104.
> D105 queda reservado y sin usar.

Pedidos del dueño:

1. "Al hacer focus con el tab del keyboard sale un outline de color morado; me
   gustaría que ese color de outline sea según el color del elemento."
2. "En mobile que al pulsar el elemento se muestre el estilo del hover."

## D101 — `Button`: el anillo de foco toma el tono `-hover` de su color

- HeroUI pinta el anillo con `ring-focus` = `var(--focus)` (compilado `@theme
  inline`, así que la utilidad lee `--focus` directamente) y `--focus` vale
  `var(--accent)` en `:root`. `ui/Button.tsx` fija ahora `--focus` en el `style`
  del propio botón (junto a `--button-bg-*`): basta, porque la variable se resuelve
  en el elemento.
- **Tono: `var(--color-<color>-hover)`, no el base.** Medido contra lo que rodea al
  anillo: por dentro la banda de separación de HeroUI (`ring-offset-background` =
  `--background`), por fuera la superficie (tarjeta o modal). En claro el base de
  `success` y `warning` no llega al 3:1 de un anillo; el `-hover` sí. En oscuro los
  `-hover` son más claros que el base y dan más contraste. Un solo tono por color
  para las 4 variantes (`contained`/`soft`/`outline`/`text`) y coherente con la
  regla "el foco replica el hover".
- `success` usa el token `--color-success-hover`, no la mezcla con negro que usa su
  fondo `hover` en `brand`.
- El skip link de `Layout.astro` (relleno `primary`) pasa de `outline-primary-border`
  (≈2:1 en oscuro, fallaba) a `outline-primary-hover`.

Contraste medido (navegador, estilo computado del anillo) — mínimo entre la banda
interior (`--background`) y la superficie exterior:

| Color | Claro: base | Claro: `-hover` (usado) | Oscuro: `-hover` (usado) |
|---|---|---|---|
| primary | 4,15 | **5,39** | **7,99** |
| secondary | 3,86 | **5,07** | **10,27** |
| danger | 3,64 | **4,95** | **8,61** |
| warning | 2,77 ✗ | **3,88** | **10,10** |
| success | 2,68 ✗ | **3,88** | **10,77** |
| neutral | 6,55 | **9,39** | **12,56** |

## D102 — Resto de elementos: el color que ya tienen

Cada elemento propio (no HeroUI) usa el color con el que ya se pinta, en su tono
`-hover` cuando es un color de marca:

| Elemento | Color del anillo | Claro | Oscuro |
|---|---|---|---|
| `RegionOption` (tarjeta de continente) | color de su nota mezclado hacia `--foreground` (`--app-score-ring`, misma fórmula que `readableFg`) | ≥4,22 (10 notas) | ≥6,5 |
| `RegionOption` sin nota | `neutral-hover` mezclado igual | 12,9 | 14,5 |
| Enlaces "Todos/Ninguno" del selector de países | `secondary-hover` | 5,0 | 9,22 |
| Casilla de país del selector | `secondary-hover` (su color al marcarla) | 5,0 | 9,22 |
| Badge de racha (`UserSummary`) | `primary-hover` | 6,04 | 8,64 |
| `UserSummary`, avatares del perfil, pestañas del login, "?" del modo, X de avisos, título del tutorial, "Gestionar sesión", desplegable de continente del selector | `surface-soft` (el color del texto) | 16,86 | 14,96 |
| `OptionTile`, `GameTypeToggle` y primitivos HeroUI (pestañas, `Select`, `Switch`, campos, acordeón) | `--focus` = accent, sin cambios: su color **es** el morado de acento | 4,66 (4,01 sobre `--default`) | 5,5–6,6 |

- **Neutros → `surface-soft`**, no el morado ni el gris `text-placeholder`: es el
  color del texto, el que ya usaban `UserSummary` y el hover de los avatares.
  El avatar enfocado pasa de morado (igual que el seleccionado, que es
  `outline-primary`) a `surface-soft` + el mismo levantamiento del hover: foco y
  selección ya no se confunden.
- **Controles que no marcaban nada con el teclado** (el `button { outline: none }`
  global los dejaba sin indicador): casillas y desplegables de continente del
  `CountryPickerModal`, "Gestionar sesión →" (`AccountTab`) y la X de
  `AchievementToasts`. Se les pone el anillo del color que les toca. Era un fallo
  de WCAG 2.4.7 del mismo tema que esta unidad.

## D103 — `hover:` también al pulsar, con una sola variante en `global.css`

```css
@custom-variant hover {
	@media (hover: hover) { &:hover { @slot; } }
	&:active { @slot; }
}
```

- Tailwind v4 envuelve `hover:` en `@media (hover: hover)` (Context7, guía de
  actualización), por eso al tocar no se veía nada. Redefinir la variante arregla
  todos los `hover:` y `group-hover:` de `src/` a la vez, en vez de sembrar `active:`.
- **Sin hover pegado:** el `:hover` sigue solo para ratón; en táctil solo aplica
  `:active`, que dura lo que el dedo. Quitar la media query (`@custom-variant hover
  (&:hover)`, lo que propone la guía) sí dejaría el hover pegado tras tocar.
- **Orden:** la variante redefinida conserva su sitio (antes que `focus-visible` y
  `active`), comprobado en el CSS compilado: los `active:` propios siguen ganando
  (p. ej. `RegionOption` `active:translate-y-0 active:scale-[0.98]` al pulsar).
- **HeroUI no se toca:** su CSS trae `:hover`/`[data-hovered]` dentro de su propia
  `@media (hover: hover)` y `:active`/`[data-pressed]` → `--button-bg-pressed`. Los
  botones ya mostraban el estado pulsado al tocar (medido: `data-pressed="true"` y
  fondo = `--button-bg-hover` en `contained`/`outline`/`text`; en `soft` un tinte
  algo más hondo, como ya estaba decidido en `02-tokens-y-tema.md`).
- Se quitan los `active:` duplicados que alguien había sembrado a mano
  (`UserSummary`, `AuthSection`, `AccountTab`, `Avatar`, `RegionOption`,
  `FlagDisplay`): ahora los cubre `hover:`.
- iOS Safari solo aplica `:active` si hay un `touchstart` escuchando; React ya
  registra sus eventos táctiles en la raíz. No verificado en un iPhone real.

## D104 — Qué quedó cubierto al tocar (emulación `mobile`, 375 px)

Comprobado con reglas `:active` que casan con el elemento fuera de
`@media (hover: hover)` (`matchMedia('(hover: hover)')` = `false`) y, para HeroUI,
disparando `pointerdown` táctil y leyendo el fondo computado:

| Elemento | Al tocar |
|---|---|
| Tarjetas de continente (`RegionOption`) | fondo de la nota, anillo de 2 px, levantamiento (y el `active:` propio de escala) |
| `OptionTile` (modo, orden, dificultad, temporizador, tema) | `--default-hover` |
| `UserSummary` y su barra (`group-hover`) | `surface-hover` / `surface` |
| Badge de racha | escala 110 % |
| Avatares del perfil | levantamiento + anillo `surface-soft` |
| "Gestionar sesión", pestañas del login, X de avisos | texto `surface-soft` |
| Enlaces del selector de países | `secondary-hover` |
| Iconos de la cabecera, botones de modales, "Comenzar", "Abandonar", resultados | estado pulsado de HeroUI (ya existía) |
| Selector de juego (`GameTypeToggle`) | no tiene hover propio: nada que replicar |
| Tablero de Países | sus casillas no son interactivas: nada que replicar |
