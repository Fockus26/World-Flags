# 31 — Anillo sin transición de color, pulsado en HeroUI y skip link en un landmark

> Unidad `fix/foco-transicion-y-pulsado` (tanda del 2026-09-24, W7). Cubre D129–D131.
> Pendientes P3, P4 y P6 de `context/plans/pendientes.md`. Sigue a
> `23-foco-y-toque.md` (D101–D104).

## D129 — `transition-colors` ya no anima `outline-color`

- **Problema.** La utilidad `transition-colors` de Tailwind 4.3 anima `color,
  background-color, border-color, outline-color, text-decoration-color, fill,
  stroke` y los tres `--tw-gradient-*`. El color del contorno por defecto es
  `currentColor`: al enfocar con el teclado, el anillo (`focus-visible:outline-*`
  o `has-focus-visible:outline-*`) aparecía del color del texto y viraba a su
  color en 150–180 ms.
- **Arreglo global en `global.css`**, no en los 10 componentes que la usan
  (`ConnectivitySnackbar`, `AchievementToasts`, `AccountTab`, `AuthSection`,
  `CountryPickerModal`, `GameTypeToggle`, `RegionOption`, `UserSummary`, `Timer`,
  `ui/OptionTile`; W6 y W8 tocan algunos en esta tanda): una regla
  `.transition-colors` en `@layer utilities` que solo redefine
  `transition-property` con la misma lista menos `outline-color`. Curva y duración
  siguen saliendo de la utilidad original y de `duration-*`/`ease-*`.
- **Por qué no `@utility transition-colors`:** probado. Tailwind no sustituye la
  utilidad propia; funde las dos en una sola regla y la `transition-property`
  original queda detrás y gana. La regla en `@layer utilities` sale al final de
  la capa (comprobado en el CSS compilado: la generada en la posición ~427 k, la
  nuestra en ~446 k) y con la misma especificidad gana por orden.
- **Medido (navegador):** los 13 elementos `.transition-colors` de la pantalla
  de configuración tienen `transition-property` sin `outline-color`; cambiar su
  `outline-color` no crea ninguna transición (control: con la lista original sí
  crea una de `outline-color`). Al tabular a la opción de `GameTypeToggle`, el
  anillo sale ya en `--focus` sin animación y la duración sigue en 150 ms.
- **Fuera de alcance, a propósito:** `Avatar` usa
  `transition-[outline-color,transform,translate]`: ahí el contorno existe siempre
  (`outline-3`) y animar su color es el efecto de hover buscado. Los primitivos de
  HeroUI pintan su anillo con `box-shadow` (`focus-ring` = `ring-2 ring-focus`),
  no con `outline`, y sus `transition`/`transition-all` van en indicadores no
  enfocables: nada que tocar. Nadie en `src/` usa `transition` a secas ni
  `transition-all` sobre un elemento con anillo de `outline`.

## D130 — Pulsado de `Tabs`, `Select` y `Accordion` con el aspecto de su hover

- Su hover viene del CSS de HeroUI dentro de `@media (hover: hover)`; la variante
  `hover` redefinida (D103) no llega ahí, así que al tocar en el móvil no se veía
  nada.
- **Qué se añade (en `@layer components`, detrás del CSS de HeroUI):**
  - `.tabs__tab[data-pressed="true"]` (sin elegir ni deshabilitada): `opacity: .7`,
    como su hover.
  - `.select__trigger[data-pressed="true"]`: `--field-hover` y
    `--field-border-hover`, como su hover (y `--select-trigger-bg-hover` en la
    variante `secondary`, que hoy no se usa).
  - `.accordion__trigger[data-pressed="true"]` (cerrado): la misma mezcla del 3 %
    de su hover (y `--default` en la variante `surface`, que hoy no se usa).
- **`[data-pressed]` y no `:active`:** lo pone React Aria mientras dura la
  pulsación (dedo, ratón o Intro/Espacio) y lo quita al soltar o al cancelar: no
  hay hover pegado. No depende de que el navegador aplique `:active` (iOS Safari
  no siempre lo hace). Las mismas exclusiones que su hover (pestaña elegida,
  acordeón abierto, deshabilitado).
- **La variante `hover` de `src/` también casa con `[data-pressed="true"]`.** El
  acordeón de Novedades no usa el hover de HeroUI sino `hover:bg-surface-hover`
  (utilidad, gana a `components`). Con la regla de arriba sola, al tocar se veía
  el 3 % de HeroUI y no su hover real. Se suma `&[data-pressed="true"]` a
  `@custom-variant hover` (D103): cualquier `hover:` puesto sobre un primitivo de
  React Aria se ve al tocar aunque `:active` no llegue. En elementos que no son de
  React Aria el atributo no existe y no cambia nada; en los que sí, coincide con
  `:active` en el tiempo.
- **Medido (emulación `mobile`, `matchMedia('(hover: hover)')` = `false`,
  `pointerdown` táctil y `pointercancel`):**

  | Elemento | Reposo | Pulsado | Tras soltar |
  |---|---|---|---|
  | Pestaña "Juego" (sin elegir) | opacidad 1 | **0,7** | 1 |
  | Disparador del `Select` "Qué practicar" | `--field` | **`--field-hover`** + borde `--field-border-hover` | `--field` |
  | Versión de Novedades (cerrada y abierta) | transparente | **`surface-hover`** (`#262238` en oscuro) | transparente |

- La pulsación táctil de las pestañas no las elige hasta soltar (React Aria), así
  que el estado pulsado sí llega a verse.

## D131 — Skip link dentro de `<nav aria-label="Accesos directos">`

- axe (`region`, moderado) marcaba el enlace "Saltar al contenido principal" por
  estar fuera de todo landmark. Reproducido en la pantalla de configuración (con
  el recorrido del tutorial abierto no salía porque el resto queda `inert`).
- **`nav` con nombre, no `header`:** un `header` suelto en el `body` sería el
  `banner` de la página y solo contendría este enlace; engañaría al que navega por
  landmarks. `nav` es lo que es: un bloque de enlaces de navegación interna.
- Sigue siendo el primer hijo del `body` y el primer elemento enfocable: medido,
  el primer Tab tras cargar cae en él, y al enfocarlo se ve igual que antes
  (`fixed`, arriba a la izquierda, anillo `primary-hover`).
- El `aria-label` es copy nuevo: provisional (`CONTENT_CHECKLIST.md` #42).
- **Alternativa descartada:** meter el enlace dentro de `<main>`. Obligaría a
  moverlo al árbol de React (`FlagGame.tsx`, que no es de esta unidad) y quedaría
  dentro del mismo destino al que salta.
