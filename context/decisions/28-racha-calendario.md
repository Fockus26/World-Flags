# 28 — Racha: el calendario a todo el ancho, debajo de la racha

> Unidad `fix/racha-calendario-ancho` (tanda del 2026-09-24, W4, pendiente P2).
> Cubre D118–D119. **Sustituye a D100** (`decisions/22-menu-movil.md`).

## D118 — Una sola columna en todos los anchos (sustituye a D100)

Pedido del dueño: en escritorio el panel de la racha no se divide en columnas. Racha
actual y mejor racha arriba, en una fila, y **el calendario ocupa todo el ancho** de la
tarjeta debajo.

- `StreakPanel.tsx` pierde el `sm:flex-row` y el tope de ancho del calendario
  (`max-w-sm` en móvil, `max-w-xs` desde `sm`, los dos de D100). El panel es siempre
  una columna: fila de racha (actual a la izquierda, mejor a la derecha, como ya se
  veía en móvil) y calendario con `w-full`.
- La fila de arriba es la que ya había por debajo de `sm`; no se inventa otra forma
  para escritorio.

Alternativa descartada: conservar la fila de D100 solo a partir de `lg`. Es justo lo
que el dueño pidió quitar.

## D119 — El tope pasa al alto de la celda: `aspect-square` + `max-h-7`

Con el calendario a todo el ancho, cada columna es 1/7 del panel: una celda cuadrada
llegaría a ~120 px en escritorio (el problema que motivó el `max-w-sm` de
`fix/responsive-racha` y el tope de D100).

- Cada celda es `aspect-square w-full max-h-7` (`CELL_CLASS`): cuadrada mientras es
  pequeña y, cuando su alto llegaría a 28 px (token de espaciado `7`), deja de crecer
  hacia abajo y solo se ensancha. El panel no se alarga con el ancho y la rejilla
  ocupa todo el ancho sin hueco a los lados.
- **`w-full` es necesario.** Sin él, con el ancho automático del item de grid, el
  navegador traslada el `max-height` al ancho a través del `aspect-ratio` (medido: celdas
  de 28 × 28 px pegadas a la izquierda de columnas de 120 px).
- Medidas (invitado, septiembre de 2026: 4 filas de semanas):

  | Viewport | Panel | Celda | Con D100 |
  |---|---|---|---|
  | 1440 × 900 | 894 × 250 px | 120,6 × 28 px | 894 × 247 px (a 1280) |
  | 740 × 360 | 690 × 250 px | 91,5 × 28 px | 247 px de alto |
  | 320 × 568 | 282 × 250 px | 33,1 × 28 px | 282 × 271 px |

  A 740 × 360 "África" y "Comenzar práctica" se alcanzan con el scroll de la tarjeta
  (el botón acaba a 335 px con el contenedor terminando en 352 px). A 320 px no hay
  scroll horizontal (`scrollWidth` = 320, ningún elemento sobresale).
- Un mes de 6 filas (31 días que empiezan en sábado o domingo, a final de mes) suma dos
  filas de 28 + 4 px: ~314 px. Con D100 el mismo mes también crecía, con celdas de
  ~42 px desde `sm`.

Alternativa: celdas cuadradas de tamaño fijo y la rejilla centrada con hueco a los
lados. Mantiene los cuadrados, pero el calendario deja de ocupar todo el ancho, que es
lo que pidió el dueño.
