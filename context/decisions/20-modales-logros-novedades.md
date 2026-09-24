# 20 — Modal de logros en rejilla y Novedades en acordeón

> Unidad `feat/modales-logros-novedades` (tanda del 2026-09-23, W3). Cubre D085–D086.
> D087–D089 quedan reservados y sin usar.

## D085 — Logros: modal ancho y varias tarjetas por fila

Pedido del dueño: "el modal de logros más amplio, que en lugar de una tarjeta por
categoría puedan haber más".

- **Ancho:** `w-[min(58rem,94vw)]`, el mismo que la partida guiada (`Tutorial.tsx`).
  No es un valor nuevo: ya existe en el código para un modal de contenido ancho.
  **Hace falta `max-w-none`:** `ui/Modal` usa `size="md"` y HeroUI aplica
  `.modal__dialog--md` = `max-w-md` (28rem), que gana a cualquier `w-*`; medido en el
  navegador, sin él el diálogo se quedaba en ~448 px aunque pidiera 58rem. La partida
  guiada (`Tutorial.tsx`) sufre el mismo tope hoy (fuera de esta unidad).
- **Rejilla en el propio `ul`** de cada categoría: 1 columna de base (320 px),
  2 desde `min-[30rem]` y 3 desde `min-[44rem]`. Son breakpoints que ya usa la app
  (`DESIGN_RULES.md`: no se inventan más). Se miden contra el viewport, no contra el
  modal, pero con el modal al 94 % del ancho las columnas nunca bajan de ~200 px.
- **Tarjeta vertical** (`AchievementCard`, antes `AchievementRow`): emoji + nombre +
  insignia "Nuevo" arriba, descripción, barra de progreso y el estado con icono
  empujado abajo (`mt-auto`). Cada `li` es `h-full` + columna flex: las tarjetas de
  una fila miden lo mismo (el grid las estira) y los estados quedan alineados.
- **Se conserva todo lo de antes:** estado nunca solo por color (candado/check +
  texto "Bloqueado — x/y" / "Desbloqueado el…"), anillo + insignia de texto "Nuevo",
  scroll a la primera nueva (`rowNodesRef` + `scrollIntoView`, `auto` con
  `prefers-reduced-motion`), semántica `ul`/`li`. El botón "Cerrar" de la cabecera
  no se toca (lo cambia la ola 2, `feat/menu-movil`).

Alternativa descartada: rejilla por `auto-fill, minmax(…)`. Da columnas según el
ancho real del modal, pero exige un ancho mínimo en `rem` que sería un valor nuevo
sin token; con los breakpoints existentes el resultado es equivalente.

## D086 — Novedades: acordeón de HeroUI con una versión abierta a la vez

Pedido del dueño: "mostrar las anteriores versiones colapsadas y que solo se pueda
abrir una versión a la vez".

- `Accordion` de HeroUI v3 (sobre `DisclosureGroup` de React Aria), no uno casero:
  teclado (Tab entre disparadores, Enter/Espacio), `aria-expanded`, `aria-controls`
  y el `aria-labelledby` del panel vienen dados.
- **Expansión única:** `allowsMultipleExpanded` se deja en su valor por defecto
  (`false`). Pulsar la abierta la cierra (comportamiento de React Aria), así que
  puede quedar todo cerrado; se acepta porque lo pidió así el prompt de la unidad.
- **La versión que corre abierta por defecto:** `defaultExpandedKeys={[APP_VERSION]}`,
  con `id={entry.version}` en cada elemento. `tests/unit/changelog.test.ts` ya exige
  que la primera entrada sea `APP_VERSION`. El modal se desmonta al cerrarse, así que
  cada apertura (también desde "Ver novedades" del aviso, D058) vuelve a empezar con
  la actual abierta.
- **Encabezados:** h2 del modal → `Accordion.Heading level={3}` por versión (el
  disparador va dentro del h3) → h4 por sección, igual que antes. El `id`
  `release-notes-<versión>` pasa al disparador, que es lo que nombra al panel.
- **Fecha** en el disparador, con `formatReleaseDate` en UTC (sin cambios).
- **Animación:** la de HeroUI, una transición CSS de `height`/`opacity` sobre
  `--disclosure-panel-height` (sin framer, compatible con D006) con
  `motion-reduce:transition-none`. El texto del cuerpo usa los tokens de siempre
  (`text-surface-soft`, `text-text-placeholder`), no el `text-muted` de HeroUI.
- **Foco = hover** (`DESIGN_RULES.md`): el disparador lleva `bg-surface-hover` en
  hover y en `data-focus-visible`, además del anillo `status-focused` de HeroUI.

Alternativa: controlar `expandedKeys` para impedir que quede todo cerrado. Se
descartó por añadir estado sin que el dueño lo pidiera.
