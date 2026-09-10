# Unidad — Migración HeroUI v3 + persistencia + diseño/a11y (cerrada)

Mergeada a `main` en `a4c2e65` (`--no-ff`). ~14 commits. No pusheada.

## Resumen

1. **Fix de persistencia** del candado "practicado hoy" y las mejores marcas de rush
   (se perdían al recargar): causa doble (invitado limpiaba localStorage en cada
   carga; cuentas nunca subían esos campos a Supabase). Ver `decisions/04-persistencia.md`.
2. **Migración de `src/components/ui/`** a HeroUI v3 (Button, IconButton, Modal, Input,
   Select, Tabs, Alert/FeedbackMessage, OptionTile). Wrappers con API estable.
   Ver `decisions/01-heroui-migracion.md`.
3. **Puente de tema** a los tokens de HeroUI (claro/oscuro). Ver `decisions/02-tokens-y-tema.md`.
4. **Pasada de diseño + a11y** (dos rondas de feedback del dueño): contraste de campos,
   botones de calificación y texto de `RegionOption`; modal que se pintaba oscuro en
   modo claro; botones full-width; tooltips en portal; modales scrolleables; "Limpiar
   todo" en el picker de países; foco = hover; `UserSummary` en forma de píldora;
   divisor "o"; alerta re-estilada.
5. **framer-motion → CSS**: no ejecuta en este stack; las vistas y los cambios de
   vista pasaron a condicionales + `tw-animate-css`. Ver `decisions/03-animaciones.md`.
6. Herramienta: `@playwright/test` + `e2e/game-flows.spec.ts` (14 flujos).

## Decisiones relevantes

D001–D014 (ver `DECISIONS_INDEX.md` y `decisions/01-04`).

## Verificado

- `bunx astro check` limpio · `bun run build` verde.
- axe-core 4.10 (WCAG 2.1 A/AA) sin violaciones en las pantallas y estados clave, claro y oscuro.
- Persistencia a mano: invitado practica continente → hard reload → sigue bloqueado y "Practicado hoy". Columnas Supabase aplicadas vía MCP.

## No verificado (entorno Windows: Playwright / preview embebido fallan)

- Barrido responsive 360→3840, zoom 400%, daltonismo, `forced-colors`.
- Flujo autenticado real (registro/login, sync entre dispositivos, IDOR) — falta cuenta de prueba Supabase.
- `e2e/game-flows.spec.ts`: T1 falla por selectores del harness (`getByText` sobre tiles), no por bug de la app. Los 13 restantes no llegaron a correr. Necesita alinear selectores.

## Hallazgos pre-existentes (revisión de código de los subagentes — NO de esta unidad)

El dueño decide si se abordan por separado:

| Sev | Hallazgo | Dónde |
|---|---|---|
| Medio | Modo competitivo, doble envío: `handleSubmit`/`handleSkip` mutan `startTimeRef` síncrono; un segundo disparo con `answerStatus` aún `"idle"` → doble penalización, o si era correcta salta una bandera → ensucia el mejor tiempo del ranking | `session/Session.tsx` |
| Medio | Spam de teclas 1–4 en Práctica salta el guard de `GradeButtons` (el listener llama `practiceQueue.grade` directo) → misma carta calificada 2× | `Session.tsx`, `DailyPractice.tsx`, `usePracticeQueue.ts` |
| Medio | `isDue` en UTC vs. candado en hora local (ver `decisions/04-persistencia.md`) | `utils/spaced-repetition.ts` vs `date.ts` |
| Bajo | "Repetir práctica" tras terminar siempre saca al inicio en silencio (todo quedó practicado hoy) | `hooks/useGame.ts` |
| Bajo | `dailyPracticeQueue = []` es truthy → pantalla en blanco si se dispara con 0 due | `FlagGame.tsx:21` |
| Bajo | `createClient(undefined, undefined)` lanza y rompe la isla si faltan envs | `lib/supabase.ts` |
| Bajo | Objetivos táctiles <44px (filas del picker, botón "Todos/Ninguno", badge de score) | `CountryPickerModal.tsx`, `RegionOption.tsx` |
| Bajo | Banderas/avatares desde CDN externo en una PWA (fallo offline en primer uso) | `FlagDisplay.tsx`, `utils/avatar.ts` |

## Pendientes que quedaron abiertos

Ver `CURRENT_PHASE.md` › Pendientes generales y `CONTENT_CHECKLIST.md`.
