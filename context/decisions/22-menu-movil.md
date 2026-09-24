# 22 — Menú ⋮ en móvil, "Cerrar" como X, racha a todo el ancho y animación del Select

> Unidad `feat/menu-movil` (tanda del 2026-09-23, W6). Cubre D096–D100.

## D096 — Menú ⋮ en la cabecera de la pantalla principal en móvil

Pedido del dueño: en móvil, en lugar de `UserSummary` con los tres botones al lado
(🏅 Logros, 🏆 Ranking, 📍 Elegir países), un icono de menú vertical que al pulsarlo
muestre esas tres opciones con su texto y su icono.

- **Corte: `sm` (640 px).** Es el breakpoint en el que `UserSummary` ya cambia de
  forma (avatar, nombre largo, etiqueta de cuenta), así que no se inventa uno nuevo.
  Medido: a 360 px, `UserSummary` pasa de 165 px (con los tres iconos) a 269 px (con
  el ⋮); con el menú mide 230 px a 320 px, 300 px a 390 px y 340 px a 430 px. A 640 px, con los tres iconos,
  le quedan 422 px: sobra sitio.
- **Componente:** `configuration/ConfigurationMenu.tsx`, sobre el `Dropdown` de HeroUI
  v3 (patrón de menú WAI-ARIA de React Aria: flechas, Escape, inicial, cierre al pulsar
  fuera). El ⋮ es `IconButton` con `MoreVert` de iconoir, hijo directo de `Dropdown`
  (así lo documenta HeroUI; `Dropdown.Trigger` sería un botón dentro de otro).
- **Se pintan las dos formas y CSS oculta una** (`sm:hidden` / `hidden sm:flex`), igual
  que el selector de juego (D066): `display: none` saca la oculta del orden de
  tabulación y del árbol de accesibilidad, y decidirlo en JS con `matchMedia`
  desajustaría la hidratación.
- Opciones de 44 px de alto (`min-h-11`, objetivo táctil del kit), emoji en una caja de
  ancho fijo para que los textos queden alineados. El popover de HeroUI viene limitado
  a `48svw` (≈150 px a 320 px): se quita el tope y se le da `min-w-56`.
- **Foco al cerrar un modal abierto desde el menú:** vuelve al ⋮ sin código propio
  (el menú devuelve el foco a su botón al cerrarse y el modal lo toma como origen).
  Comprobado con teclado (Enter / flechas / Enter / Escape) y con puntero (clic en la
  opción y clic en la X, y confirmando en "Elegir países").
- Nombre accesible del ⋮ provisional: "Más opciones" (`CONTENT_CHECKLIST.md` #33).

Alternativa descartada: un `Popover` propio con tres `Button`. Habría que rehacer el
patrón de menú (roving focus, Escape, cierre) que HeroUI ya trae resuelto.

## D097 — "Cerrar" de las cabeceras de modal: X en móvil, texto en escritorio

`ui/ModalCloseButton.tsx`, usado por `LeaderboardModal`, `AchievementsModal`,
`ReleaseNotesModal`, `ConfigurationModal` y `CountryPickerModal`. Por debajo de `sm` es
un botón de solo icono (`Xmark`, 44 × 44 px) con `aria-label="Cerrar"`; desde `sm`, el
botón de texto de siempre (`variant="text" color="danger"`). Mismo patrón de "dos
botones y CSS oculta uno" que D096. "Saltar tutorial", "Cerrar sesión" y el "Cancelar"
del pie del selector de países no cambian.

## D098 — Los contadores sobreviven dentro del menú

- Logros sin ver: número en su opción **y** sobre el ⋮ (mismo badge que tenía el 🏅).
  El dato va también en los nombres accesibles: "Más opciones, 2 logros sin ver" y
  "Logros, 2 sin ver" (texto `sr-only` dentro del `Label`), así que no es un estado
  solo de color y forma.
- Países elegidos a mano: número en su opción, con "Elegir países, 3 elegidos" como
  nombre. No se repite sobre el ⋮ para no sumar dos cifras en el mismo badge.
- En la carga inicial (D042) no se pinta ningún contador, como en escritorio.
- El badge (`COUNT_BADGE_CLASS`) se exporta de `ConfigurationMenu` y lo usan también
  los iconos de escritorio: el `text-[0.6rem]` heredado no se duplica.

## D099 — Animación de apertura y cierre del `ui/Select` (y del menú ⋮)

Pedido del dueño: "no hay animaciones en el select del modo de juego".

- **Diagnóstico:** nada la anulaba. HeroUI v3 anima `select__popover` con
  `tw-animate-css` mientras React Aria pone `data-entering` / `data-exiting`, y en el
  navegador corre (`enter 0.15s` y `exit 0.1s`, vistas con `getAnimations()`). No hay
  regla en `global.css` ni `MotionConfig` que la pise; el bloque de
  `prefers-reduced-motion` solo actúa si el sistema lo pide. Lo que pasa es que es
  mínima: 150 ms de entrada, 100 ms de salida, escala al 95 % y 4 px de desplazamiento.
  En un móvil se lee como "sin transición".
  - Ojo al medir aquí: con el panel del navegador integrado oculto,
    `document.visibilityState` es `hidden` y las animaciones se quedan en
    `currentTime 0`. Se midió con el panel visible y clics reales.
- **Cambio:** `ui/popover-motion.ts` (`POPOVER_MOTION_CLASS`) alarga y amplía la de
  HeroUI: 200 ms de entrada (`ease-out`, escala al 90 %, 8 px desde el disparador) y
  150 ms de salida (`ease-in`, escala al 90 %, 8 px hacia el disparador). Son variantes
  `data-[entering=true]:` / `data-[exiting=true]:` de Tailwind: van en la capa
  `utilities` y ganan a la capa `components` de HeroUI sin `!important`. Se aplica en
  el wrapper `ui/Select` (lo ganan todos los selects: juego en móvil, estilo de avatar)
  y en el popover del menú ⋮.
- **Movimiento reducido:** el bloque de `global.css` está fuera de capa y deja la
  duración en 0,01 ms; comprobado simulando la regla (la animación pasa a `1e-05s`).

## D100 — La racha a todo el ancho de la tarjeta (sustituye al `max-w-sm`)

El dueño había elegido en `fix/responsive-racha` limitar el panel entero a `max-w-sm`
porque las celdas del calendario (1/7 del ancho, cuadradas) crecían a ~90 px y el panel
no cabía en móvil horizontal. Ahora pide que la racha ocupe todo el ancho en escritorio.

- El panel ocupa todo el ancho; **el tope pasa al calendario**: `max-w-sm` por debajo de
  `sm` (lo de antes en móvil vertical) y `max-w-xs` desde `sm`.
- Desde `sm`, fila: racha actual y mejor racha repartidas a la izquierda
  (`justify-evenly`), calendario a la derecha. Por debajo, columna como antes.
- Medidas: 1280 × 900 → panel de 894 × 247 px, calendario de 320 px. 740 × 360 → panel
  de 247 px de alto (antes ~329 px); último continente y "Comenzar práctica" alcanzables
  con scroll de la tarjeta. 320 × 568 → panel de 282 × 271 px, sin scroll horizontal.

Alternativa: calendario centrado bajo la racha con columnas de ancho máximo. Deja el
panel más alto en móvil horizontal, que es justo el caso que motivó el tope.
