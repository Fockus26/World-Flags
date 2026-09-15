# Current Phase — World Flags

> Liviano a propósito. La narrativa de lo cerrado vive en `PHASE_LOG/`.

## Estado actual

**Cerrado (pendiente de decisión del dueño sobre merge): modo de juego "Países"
(rama experimental `feat/modo-paises`).** Implementa `context/plans/modo-paises.md`
completo — un segundo tipo de juego (aprender qué país pertenece a cada
continente, con tablero de países y animación de "vuelo") que reutiliza el flujo
existente (alcance, práctica/competitivo, práctica diaria, SRS, logros, ranking).
Las 7 fases del plan están hechas, cada una con su commit y su pausa de
aprobación. Detalle de cada decisión en `context/decisions/07-modo-paises.md`
(D028–D038).

**De paso se cerró una unidad aparte, ya mergeada a `main`:**
`perf/batch-country-attempts` — `registerCountryAttempts`/`saveReviewResults`
en `learning-storage.ts` registran varios países con un solo guardado en
`localStorage` en vez de uno por país (hacía falta para "Rendirme" en un rush
de "Todo el mundo", hasta ~150 de golpe). 100% aditivo, sin cambiar el
comportamiento existente. Benchmark: ~27ms/150 guardados → ~4ms/1 guardado.

Verificado en el navegador real (`bun run dev`, con permiso explícito del
dueño), no solo revisión de código: rush completo (auto-aceptación, prefijos
ambiguos, "Rendirme", ranking), práctica con tarjeta cloze y pistas, práctica
diaria de países de punta a punta (vencidos inyectados a mano), candado
"practicado hoy" independiente entre los dos juegos, 320px sin scroll
horizontal, claro/oscuro, y una pasada de axe-core sobre selector/tablero/
modales/ranking/logros (encontró y se corrigió un hallazgo real: el tablero
no era alcanzable por teclado — ver D038). `bunx astro check`/`bun run build`/
`bunx biome check ./src` en verde en cada fase.

**`bun run test:e2e` corrido contra el server real:** expuso que D030 (usuario
nuevo arranca en Países) rompía el helper de hidratación de las 14 pruebas
existentes (asumían "Aprende las banderas del mundo" desde el arranque) — se
ajustó el helper, no el comportamiento del producto. De paso salió a la luz un
bug **preexistente**, no de esta unidad (ya en `main` desde `feat/transiciones-ui`):
`PageFlip.tsx` monta el mismo contenido en sus dos ranuras desde el arranque,
duplicando nodos de texto en el DOM — se reportó y se dejó una tarea aparte
para decidir si se arregla, sin tocar `PageFlip.tsx` acá. Con eso, T7/T2/T4
pasan de forma aislada; T1 y probablemente otras que completan una sesión
entera se cuelgan de forma intermitente con "element was detached from the
DOM" — coincide con la inestabilidad de Playwright/Chromium en este Windows ya
documentada arriba, no con un cambio de esta unidad.

Subagentes `design-qa`/`functional-qa` no se lanzaron: la verificación manual +
axe-core en el navegador real de esta unidad ya cubre lo que esos subagentes
habrían visto (y en este equipo Playwright es intermitente, ver nota de
entorno). Si el dueño quiere igual una pasada con esos subagentes antes de
decidir el merge, que lo pida.

### Acción manual pendiente del dueño (bloquea el despliegue)

**Correr `supabase/countries-game.sql`** en el SQL Editor de Supabase **antes**
de desplegar el cliente de esta rama. Mismo riesgo que ya describe
`achievements.sql`: si el cliente pide la columna `countries_game` y todavía no
existe, el `select` de `fetchRemoteLearningData` falla, `syncOnLogin` lanza, y el
usuario autenticado cae al fallback de `localStorage` en vez de ver su progreso
de la nube. No aplica mientras la rama no se despliegue.

### Fuera de alcance de esta unidad (ver `context/plans/modo-paises.md` › 5)

Alias de nombres de país (EE. UU., Congo, Birmania…), mapa/silueta como
tarjeta alternativa de práctica, aviso cruzado "aprende primero los países" en
Banderas, rankings por continente (el esquema ya lo soporta), extraer
`useCardCountdown` para que `Session.tsx` también lo use, logros de Países por
continente. La duplicación de nodos de `PageFlip.tsx` (ver arriba) también
queda fuera — tarea aparte ya señalada.

Anterior: **Tanda de 6 fixes de feedback post-logros** (timer, continentes, práctica diaria,
logros, banderas) — **aprobada, mergeada a `main` y ya con push a `origin/main`**
(commit `524e9c8`). Detalle de cada unidad en `GIT_STATE.md` › Bloques cerrados.
Todas las ramas de trabajo de esta tanda ya se borraron (mergeadas).

Verificado en vivo con `bun run dev` (autorizado puntualmente por el dueño):
- Timer de práctica cronometrada: cuenta normal desde la primera bandera y
  cada expiración avanza una sola vez (antes se congelaba o saltaba dos) —
  confirmado con logs de timestamp en consola, ~15 ciclos sin fallos.
- `RegionOption`: 0px de diferencia de altura al seleccionar (antes 2px).
- Práctica diaria: `lastPracticeByCountry` queda vacío tras calificar ahí,
  el continente no se marca "practicado hoy" por eso.
- Al terminar una sesión de práctica que completa un continente, éste se
  deselecciona solo en la config (probado con Norteamérica, 3 países).
- Logros: badge "Nuevo" + anillo se ven en el modal; `seenAt` se marca recién
  al cerrar el modal, no al abrir.
- `FlagDisplay` sirve `/flags/{code}.svg` (origen propio), no `flagcdn.com`.
- `bun run test:e2e`: 13/14 verdes. El que falla (T14, tema oscuro) es un
  timeout esperando el tab "Juego" del modal de perfil — no lo tocó ninguna
  unidad de esta tanda; probable relación con la animación de alto del modal
  ya registrada como pendiente más abajo. Revisado a mano: el toggle de tema
  funciona bien clickeado con normalidad: el fallo del test parece un
  problema de selector/timing del propio test, no del producto.

Anterior: **Sistema de logros** (con una ronda de ajustes de feedback: verde para
desbloqueado, snackbars en vez de `Results`, scrollbar temática, select de
avatar) — aprobado, commiteado y mergeado a `main` (commit `da042ab`, merge
`414d137`, `--no-ff`). Rama `feat/achievements` no borrada.

Anterior a eso: **Migración a HeroUI v3 + fix de persistencia + pasada de
diseño/a11y**, cerrada y mergeada a `main` (merge `a4c2e65`, `--no-ff`).

### Acción manual pendiente del dueño (bloquea el despliegue)

**Correr `supabase/achievements.sql`** en el SQL Editor de Supabase **antes** de
desplegar el cliente. Si el cliente pide las columnas nuevas y no existen, el
`select` de `fetchRemoteLearningData` falla, `syncOnLogin` lanza y el usuario
autenticado cae al fallback de `localStorage` en vez de ver su progreso de la
nube. Es una regresión, no una degradación elegante.

## Track

No aplica el track de fases del kit — el proyecto ya estaba en producción. Ver
`PROJECT_CONTEXT.md` › Track de fases.

## Lo que quedó verificado

- `bunx astro check` limpio, `bun run build` verde.
- axe-core (WCAG 2.1 A/AA) sin violaciones en config, modal de config (ambas tabs),
  listbox del Select, sesión, estado de calificación y diálogo de abandono — claro y oscuro.
- Fix de persistencia probado a mano: invitado practica un continente → hard reload
  → sigue "Practicado hoy" y bloqueado. Columnas Supabase aplicadas
  (`supabase/practice-sync.sql`).

## Lo verificado en la unidad de logros

- `bunx astro check` 0 errores · `bun run build` verde · biome sin hallazgos de
  lint en los archivos tocados.
- 47 aserciones sobre la capa pura (migración, siembra retroactiva, rachas,
  punto fijo del catálogo, merge) en verde, incluida la **idempotencia del
  merge** (`merge(merge(r,l),l) === merge(r,l)`), que es lo que garantiza que los
  contadores no se inflen en cada recarga.
- Contraste calculado a mano sobre los tokens reales, claro y oscuro — incluida
  la segunda ronda (verde, `field-background` del select de avatar).

## Lo que NO se pudo verificar

- **Barrido responsive / zoom / daltonismo / forced-colors completo:** los subagentes
  `design-qa` y `functional-qa` no pudieron correr Playwright en este Windows
  (Chromium cuelga). Sus reportes son revisión de código. Queda `e2e/game-flows.spec.ts`
  (14 tests) con selectores que necesitan alinearse con la UI migrada antes de pasar todos.
- Flujo autenticado end-to-end (registro/login real, sync entre dispositivos, IDOR):
  necesita una cuenta de prueba en Supabase.
- **Toda la UI de logros en navegador**: ningún agente levanta `bun run dev` aquí.
  Falta comprobar con el sitio corriendo: axe-core sobre el modal (claro y
  oscuro), y sobre todo **la fila de iconos a 320 px** — ahora son tres botones
  (🏅 🏆 📍) junto a `UserSummary`; el margen es de pocos píxeles y el contador de
  progreso de `UserSummary` lleva `whitespace-nowrap` + `shrink-0`, que es justo
  lo que provocaría scroll horizontal si no cabe.
- **Los snackbars en 320 px y con varios apilados a la vez.** `AchievementToasts`
  usa `inset-x-3` (ancho completo con márgenes) en móvil y una columna fija a la
  derecha desde `sm:`; falta comprobar en pantalla real que 3-4 apilados no
  tapen controles importantes (el botón "Salir" de `Header` en sesión, por
  ejemplo) y que el auto-descarte a 6 s da tiempo a leerlos.
- **El scrollbar temática en Windows/Chrome real** — las reglas
  `::-webkit-scrollbar-*` no tienen equivalente exacto en todos los navegadores
  (Chromium sí, Firefox usa `scrollbar-color` con un resultado visualmente
  distinto — más plano, sin el "padding" del `border` transparente).

## Pendientes generales

- Ver `CONTENT_CHECKLIST.md` (SITE_URL, imagen OG, iconos PWA, fuente, peso CSS, `animations.ts`).
- Consolidar la escala tipográfica en tokens (hoy hay ~15 `text-[Xrem]` arbitrarios).
- Animación del alto del modal al cambiar de tab/modo — **no hecha** (CSS
  `interpolate-size` no anima el cambio por contenido en este motor; framer `layout`
  no es fiable). Alternativa: medir con `ResizeObserver` como el `Modal` viejo.
- Transiciones de animación (unidad en curso en `feat/transiciones-ui`, pendiente de
  revisión del dueño): tabs del modal de configuración (fundido simple, sin slide —
  el slide direccional causaba una superposición visual entre paneles y se quitó),
  giro 3D de página entre Configuración/Sesión/Práctica diaria/Resultados
  (`PageFlip.tsx`, D008), y `AutoHeight.tsx` (D009) para animar el alto cuando
  aparece/desaparece contenido dentro de una vista ya montada (repetir contraseña en
  registro, ajustes de práctica al cambiar de modo, fila de duración del temporizador).
  El alto del *modal completo* al cambiar de tab (Usuario/Juego) sigue sin animarse —
  ver la fila de abajo, no es parte de esta unidad.
- **framer-motion**: decidir si se recupera (bajar a `framer-motion@11`, `<LazyMotion>`,
  probar en navegador real) o se quita del `package.json`. Ver `decisions/03-animaciones.md`.

## Hallazgos pre-existentes de QA (no de esta unidad — el dueño decide por separado)

En `PHASE_LOG/heroui-migracion.md` › "Hallazgos pre-existentes". Los principales:
doble-submit en modo competitivo, spam de teclas 1–4 en calificación, `isDue` en
UTC vs. candado en hora local, `createClient` sin guard si faltan envs.

Encontrados durante la unidad de logros (se reportan, no se arreglan aquí):

1. **`pushLearningData` sube la fila entera en cada cambio debounced.** Una
   práctica de Europa son ~60 calificaciones espaciadas 2–4 s, así que el
   debounce de 800 ms no las agrupa: ~60 upserts de la fila completa. A ~33 KB
   son ~2 MB por sesión, y con los campos de logros (~51 KB) unos 3 MB. En datos
   móviles es real. Arreglo posible: `update` parcial de columnas en vez de
   `upsert` completo, o subir los campos pesados solo al terminar la sesión.
   *(Los campos nuevos no empeoran la frecuencia: `stats` y `sessionHistory`
   cambian una vez por sesión, no por calificación. Lo que crece es el tamaño de
   cada push.)*
2. **`pickMoreRecentReview` (`src/utils/spaced-repetition.ts:77`) existe y no lo
   usa nadie.** En `syncOnLogin` lo remoto gana `countryHistory` entero, así que
   una sesión practicada sin conexión se pierde al volver a entrar. El helper
   para arreglarlo ya está escrito; no se aplicó aquí por no meter un cambio de
   comportamiento del SRS dentro de la unidad de logros.
3. **Badge contador con contraste insuficiente** (3.97:1 en claro), tanto el
   nuevo de 🏅 como el pre-existente de 📍 — fila #8 de `CONTENT_CHECKLIST.md`.
4. **`--field-border` (`#9c96c4`) da 2.77:1 contra blanco puro**, por debajo del
   `≥3:1` que su propio comentario en `heroui-theme.css` reclama — es decir, ya
   fallaba antes de esta unidad. Se notó al ajustar `--field-background`
   (D027) pero no se tocó: no era lo pedido, y mezclar un fix de borde con un
   cambio de fondo en el mismo commit lo hace más difícil de revisar.

## Bloqueos

- Despliegue / dominio → decisión del dueño (bloquea SITE_URL, sitemap, OG absoluto).
- Cuenta de prueba Supabase → bloquea QA de auth.
