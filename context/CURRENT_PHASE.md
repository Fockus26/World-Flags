# Current Phase — World Flags

> Liviano a propósito. La narrativa de lo cerrado vive en `PHASE_LOG/`.

## Estado actual

**Sistema de logros** — implementado en `feat/achievements`, con una ronda de
ajustes de feedback ya aplicada (verde para desbloqueado, snackbars en vez de
`Results`, scrollbar temática, select de avatar). **Esperando revisión del
dueño**. No commiteado todavía.

Anterior: **Migración a HeroUI v3 + fix de persistencia + pasada de diseño/a11y**,
cerrada y mergeada a `main` (merge `a4c2e65`, `--no-ff`).

`main` está **15 commits por delante de `origin/main` sin push** — el dueño decide
cuándo se sube.

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
