# Current Phase — World Flags

> Liviano a propósito. La narrativa de lo cerrado vive en `PHASE_LOG/`.

## Estado actual

**Migración a HeroUI v3 + fix de persistencia + pasada de diseño/a11y** — **cerrada
y mergeada a `main`** (merge `a4c2e65`, `--no-ff`).

`main` está **14 commits por delante de `origin/main` sin push** — el dueño decide
cuándo se sube.

Sin unidad de trabajo en curso. **Rama base de la próxima unidad: `main`** (ver `GIT_STATE.md`).

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

## Lo que NO se pudo verificar

- **Barrido responsive / zoom / daltonismo / forced-colors completo:** los subagentes
  `design-qa` y `functional-qa` no pudieron correr Playwright en este Windows
  (Chromium cuelga). Sus reportes son revisión de código. Queda `e2e/game-flows.spec.ts`
  (14 tests) con selectores que necesitan alinearse con la UI migrada antes de pasar todos.
- Flujo autenticado end-to-end (registro/login real, sync entre dispositivos, IDOR):
  necesita una cuenta de prueba en Supabase.

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

## Bloqueos

- Despliegue / dominio → decisión del dueño (bloquea SITE_URL, sitemap, OG absoluto).
- Cuenta de prueba Supabase → bloquea QA de auth.
