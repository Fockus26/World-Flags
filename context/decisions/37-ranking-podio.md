# Decisiones — Ranking: podio, hover por fila y columna del puesto

> Estilo, rama `style/ranking-podio` (pendiente P21, tanda 2026-09-26). Todo en
> `LeaderboardModal.tsx`, más los tokens de medalla (`variables.css`, `theme.css`).
> Hover solo visual decidido por el dueño (brief de la tanda).

| ID | Decisión | Razón | Estado |
|---|---|---|---|
| D147 | Tokens `--app-color-medal-{gold,silver,bronze}` y su `-soft` en claro y oscuro, expuestos como `--color-medal-*` (`bg-medal-gold-soft`, `text-medal-gold`, `ring-medal-gold`…). Claro: oro `#835600`/`#fcefc7`, plata `#545d6e`/`#e9edf3`, bronce `#8f481e`/`#f9e4d6`. Oscuro: oro `#f2c94c`/`#3a3015`, plata `#c5ccd8`/`#2c2f3d`, bronce `#eba273`/`#3e2619`. Contraste medido en el navegador (tono de medalla como texto): claro 5,56 / 5,64 / 5,49:1 sobre su `-soft` y 4,89 / 4,96 / 4,81:1 con el hover encima; oscuro 8,20 / 8,22 / 6,65:1 (7,06 / 7,09 / 5,77:1 con hover). Contra el fondo del modal y contra `primary-soft` (tu fila), ≥5,4:1 en claro y ≥6,6:1 en oscuro. El texto normal sobre los `-soft` da ≥11:1 | `COLORS.md` no tenía oro/plata/bronce y `warning` (#d97a13, "Difícil") no da 4,5:1 como texto en claro. Con los tonos a ≥4,5:1 incluso con hover, un mismo token sirve de texto, icono y borde sin casos especiales | Implementado (`style/ranking-podio`) |
| D148 | Podio: la fila de otra persona en 1.º/2.º/3.º lleva el `-soft` de su medalla y el número (`#1`) en el tono de la medalla; el avatar lleva una medalla de `iconoir-react` (`Medal`) en la esquina, sobre un círculo `bg-overlay` con borde del color del puesto, `aria-hidden`. Tu fila en el podio conserva `bg-primary-soft` y suma un borde interior de 2 px (`ring-inset`) del color del puesto, más el número y la medalla. El texto de tu fila pasa de `text-primary` a `text-primary-hover` | Nunca solo por color: el puesto sigue siendo texto real ("#1") y la lista es un `<ol>`; la medalla es decoración. La medalla va sobre el avatar y no en la columna del puesto para no quitarle ancho al nombre a 320 px. `primary` sobre `primary-soft` daba 3,97:1 en claro (el "(tú)" y el nombre); `primary-hover` da 5,15:1 (6,54:1 en oscuro). Alternativa: medalla sustituyendo al "#" dentro de la columna (más limpia, pero +1,25 em en todas las filas) | Implementado (`style/ranking-podio`) |
| D149 | Hover por fila, solo visual: la fila sigue siendo un `<li>` no enfocable, sin tooltip, `cursor` normal. Fila normal: `hover:bg-surface-hover`. Filas con tinte (podio, tu fila): el tinte se ahonda con `color-mix(in oklab, <tinte>, var(--color-surface-soft) 6%)`. `transition-colors duration-150`. La variante `hover:` es la de D103: ratón, o mientras dura el toque (`:active`), sin hover pegado. Movimiento reducido: lo acorta el bloque global | Decidido por el dueño: sin nada nuevo que mostrar, hacerla enfocable añadiría 20 paradas de tabulador sin contenido. Mezclar con el color del texto sirve en los dos temas (oscurece en claro, aclara en oscuro), como el hover de los botones `soft`. Sin el "sube 1 px" opcional de P21: queda para P19 | Implementado (`style/ranking-podio`) |
| D150 | Columna del puesto con ancho en `ch` según el puesto más alto que se ve ("#" + dígitos: `rankColumnWidth`), el mismo en todas las filas y en tu fila bajo el separador; el skeleton usa el de un top lleno ("#20") para que el avatar no se mueva al llegar los datos. Entre el puesto y el avatar siempre `gap-3` (antes `gap-2.5`); bajo `sm`, el resto de la fila a `gap-2` y `px-2`. Modal a `w-[min(34rem,92vw)] max-w-none` | Con `w-7` fijo, "#100" se salía hacia el avatar. El `max-w-none` hacía falta: `modal__dialog--md` de HeroUI limita a 28 rem, así que el `30rem` de antes nunca se aplicaba (medido: 448 px). 34 rem, el mismo valor que ya usa `CountryPickerModal`; a 320 px manda el 92vw y no hay scroll horizontal. Alternativa: `size="lg"` del `Modal` (32 rem, token de HeroUI) | Implementado (`style/ranking-podio`) |

## Demo

`leaderboard-demo.ts` (solo dev, D117) suma dos opciones: `podio` (tu fila en el
puesto 2) y `lejos` (tu fila en el puesto 123; sin número, 150 personas). El número
de personas acepta hasta 200. Sin opciones nuevas, la demo sale igual que antes.

## Lo que esto no cubre

- A 320 px, con tu puesto de tres cifras bajo el separador, al nombre de tu fila le
  quedan ~19 px (se trunca casi entero): puesto, avatar, "(tú)" y el tiempo no se
  pueden quitar. Si molesta, la salida es pasar el tiempo bajo el nombre en pantallas
  estrechas (otra unidad).
- `CountryPickerModal` tiene el mismo tope de 28 rem sin `max-w-none`: su `34rem`
  tampoco se aplica. Visto aquí, no se toca.
