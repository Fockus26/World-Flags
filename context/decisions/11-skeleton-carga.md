# 11 — Skeleton de carga en la pantalla de inicio

> Unidad `feat/skeleton-carga`. Hasta ahora la pantalla de inicio pintaba
> `DEFAULT_DATA` (0 %, "Explorador", "Todo el mundo" marcado, modo competitivo)
> hasta que llegaban los datos del usuario, y entonces todo saltaba. Ya existía
> `state.game.hydrationStatus`, pero ningún componente lo usaba para pintar.

## D042 — Carga inicial con skeleton: cuándo, dónde y cómo

### Cuándo se muestra

- **Solo en la carga inicial.** `gameSlice` gana `hasHydratedOnce` (pegajoso):
  pasa a `true` la primera vez que llegan datos a la pantalla y ya no vuelve.
  La UI lo lee con `useHydration()` (`src/hooks/useHydration.ts`) →
  `isInitialLoad`. Un login posterior, o la sincronización que llega después
  del fallback, **reemplazan los datos en el sitio** sin volver al skeleton:
  contenido → skeleton → contenido es peor que un reemplazo directo.
- **La red de seguridad de 2,5 s ya no deja el skeleton colgado.** Si Supabase
  Auth no resuelve (red caída), `GameEffects` hidrata desde `localStorage` y
  ahora marca `hydrationStatus = "local"` (nuevo valor). Todos los consumidores
  previos comparan contra `"ready"`, así que `local` se comporta exactamente
  como antes se comportaba `idle` en ese camino: sin push a Supabase, sin
  evaluación de logros ni snackbar de recordatorio. Lo único que cambia es que
  cuenta como "ya hay datos en pantalla".
- **Invitado (hidratación síncrona) — umbral de 300 ms, no exclusión.** No se
  puede saber que es invitado hasta que Supabase Auth resuelve, así que todos
  arrancan en el layout de carga (que además es lo que Astro prerenderiza: la
  primera pintura, antes de que cargue el JS, ya es el skeleton y no los datos
  por defecto). Pero cada skeleton entra con un fundido que **espera
  `SKELETON_DELAY_MS` (300 ms)** desde que se monta (`animate-in fade-in
  fill-mode-backwards` + `animation-delay` inline): si los datos llegan antes,
  se desmonta sin haberse visto. Un parpadeo gris de 10 ms es peor que un hueco
  vacío de 10 ms. El mismo umbral decide si `LoadingAnnouncer` anuncia algo.
  - 300 ms: por debajo de lo que se percibe como espera, y por encima de lo
    que tarda Supabase en leer la sesión de `localStorage`.
  - Con movimiento reducido el bloque de `global.css` deja el fundido en
    0,01 ms pero respeta la espera: mismo umbral, sin animación.

### Dónde

Mismo árbol y misma caja que el contenido real, con los huecos de datos
cambiados por skeleton (nada de un "ConfigurationSkeleton" aparte que haya que
mantener sincronizado a mano). La medida de cada skeleton sale de **texto de
referencia invisible** dentro de él (patrón D038): los props traen los valores
por defecto (`"Explorador"`, `"0% · 0/197"`, el título, `"Práctica diaria (0)"`)
y se usan solo para dar ancho y alto de línea exactos, sin inventar medidas.

| Pieza | En carga |
|---|---|
| `UserSummary` | Avatar, nombre, cuenta, barra y contador en skeleton; badge de racha como disco skeleton |
| Iconos 🏅 🏆 📍 | Visibles (no dependen del progreso); sus contadores esperan a los datos (son `absolute`, no mueven nada) |
| `GameTypeToggle` | Sin píldora ni opción marcada (el valor aún es el por defecto; si no, "aparecería" en Países y se deslizaría a Banderas) |
| `<h1>` | Skeleton del ancho del título |
| `RegionOption` | Nombre y nº de países reales; skeleton en la nota y en la línea "hoy"; ninguna tarjeta marcada |
| "Práctica diaria" | Hueco reservado: skeleton con el `Button` real invisible dentro (mide lo mismo en cada breakpoint) |

**Layout reservado (decisión con contrapartida).** El modo y la existencia de
países pendientes también llegan tarde y cambian el alto de la tarjeta. En
carga se reserva el layout de quien **practica a diario**: modo práctica (línea
"Practicado hoy" en cada tarjeta) + botón "Práctica diaria". Es quien vuelve
cada día (el objetivo del producto) y quien más espera a la sincronización.

- Usuario en práctica con pendientes: **0 px de salto** (medido: 19/19
  rectángulos idénticos a 1280×800 y 18/18 a 360×640).
- Usuario competitivo o sin pendientes: la tarjeta se acorta **una vez** al
  llegar los datos (medido a 1280×800: 725,7 → 622,8 px; como está centrada, su
  borde superior baja ~51 px). En móvil, donde la tarjeta suele llenar la
  pantalla y hace scroll, el cambio queda abajo, fuera de la vista.
- Alternativa descartada por ahora: layout de carga = datos por defecto
  (competitivo, sin botón). Invierte quién ve el salto — lo verían los que
  practican a diario, cada día. Se cambia en dos líneas si el dueño lo prefiere
  (`showPracticedLine` en `RegionSelector` y el hueco en `Configuration`).

**Avatar de dicebear.** CDN externo: aunque los datos estén, la imagen tarda (o
no llega sin red). `AvatarImage` (en `UserSummary`) muestra el skeleton hasta
`onLoad` y lo quita (no lo deja debajo: los avatares tienen fondo transparente
y se vería el brillo a través); con `onError` queda un disco quieto
(`animated={false}`). `key={avatarUrl}` hace que un avatar nuevo vuelva a
empezar en "cargando". La caja ya tenía tamaño fijo: no había salto de layout,
solo aparición brusca.

### Cómo (accesibilidad)

- La sección entera va `inert` + `aria-busy` mientras `isInitialLoad`: nada
  enfocable ni clicable, y fuera del árbol de accesibilidad (medido con axe:
  0 de 231 nodos visibles para lector de pantalla). Así ni los skeletons ni los
  valores por defecto se anuncian como contenido, y no se puede empezar una
  partida o elegir continentes sobre `DEFAULT_DATA` (la sincronización lo
  pisaría). `UserSummary` además se marca `inert` a sí mismo en carga.
- `ui/Skeleton` siempre `aria-hidden`; el texto de referencia va `invisible`.
- `ui/LoadingAnnouncer`: región `role="status"` visualmente oculta, **fuera**
  de la zona `inert`, que anuncia "cargando" solo si el skeleton llegó a verse
  y "listo" solo si antes anunció "cargando". Copy provisional
  (`CONTENT_CHECKLIST.md` #16).
- El brillo de HeroUI vive en `::after`, que el `*` del bloque de movimiento
  reducido de `global.css` no alcanza: `motion-reduce:after:animate-none` en el
  wrapper. WCAG 2.2.2 exime las animaciones de precarga cuando no se puede
  interactuar, que es el caso (`inert`).

### Límite conocido

Si la sincronización de una cuenta **se cuelga** (la red no responde ni falla,
p. ej. un portal cautivo), el skeleton dura lo que tarde el navegador en
abandonar el `fetch`: `syncOnLogin` no tiene timeout. Con la red caída de
verdad el `fetch` falla al instante y se cae a `localStorage`. Poner un timeout
a la sincronización toca la lógica de sync (qué pasa con lo que el usuario
juegue mientras tanto), así que queda fuera de esta unidad.

> **Resuelto en D045** (`12-sync-fallida.md`): `syncOnLogin` se rinde a los
> 10 s y la sync fallida pasa a `local` (que también marca `hasHydratedOnce`),
> así que el skeleton de una cuenta dura como mucho ~10 s.

### Verificación

`bunx astro check` 0 errores · `bunx biome check ./src` limpio · `bun run build`
verde. Máquina de estados comprobada contra el reducer real (6 secuencias:
invitado, autenticado, Auth colgado, fallback → sync, login tras invitado, sync
que falla). En navegador (dev server autorizado por el dueño), con un mock
local de Supabase con retardo configurable: autenticado con red lenta (4–6 s),
Auth colgado (refresh de token sin respuesta), sync que falla rápido e
invitado; geometría carga ↔ cargado, 320 px sin scroll horizontal, axe-core
4.10 en carga y cargado, claro y oscuro.

## D043 — `--surface-tertiary` puenteado al borde de tarjeta

El `Skeleton` de HeroUI pinta con `--surface-tertiary` (al 70 %, brillo al
100 %), que el repo no puenteaba: quedaba el gris neutro de HeroUI, fuera de la
paleta lavanda. En `heroui-theme.css`: `--surface-tertiary:
var(--app-color-surface-border)` — **no es un color nuevo**, es el tono de los
bordes de tarjeta (`#e2dff1` claro / `#34304a` oscuro), y al ir por `var()`
vira solo con el tema. Aparte del Skeleton, ese token solo lo usan las
variantes "tertiary" de `Card`/`Surface` de HeroUI, que la app no usa.
Contraste del bloque contra la tarjeta ≈1,2:1 (del orden de otros skeletons
habituales): es decorativo, el estado de carga lo comunican `aria-busy` y el
anuncio.
