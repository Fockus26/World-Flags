# Decisiones — Persistencia

| ID | Decisión | Razón | Estado |
|---|---|---|---|
| D008 | Añadir columnas `last_practice_by_country jsonb` y `region_best_times jsonb` a `public.user_learning_data` (`supabase/practice-sync.sql`). `cloud-storage.ts` las lee y escribe; `syncOnLogin` hace **merge** de esos dos campos (por país se queda la fecha más reciente; por región el menor ms) en vez de "gana remoto" | Antes `fetchRemoteLearningData` devolvía `lastPracticeByCountry: {}` y `regionBestTimes: {}` hardcodeados ("no existen columnas todavía") y `pushLearningData` no los mandaba → en cada recarga de una cuenta autenticada, `syncOnLogin` retornaba `remote` con esos campos vacíos y **se perdía el candado diario y las mejores marcas** | Implementado |
| D009 | `GameEffects` rama `guest`: solo llama `clearLearningData()` en la transición **`authenticated → guest`** real (logout, detectada con un `useRef` del `status` previo); en una carga normal de invitado hidrata desde `getLearningData()` (localStorage). Además, si `status` sigue en `"loading"` tras 2.5s (Supabase Auth no resuelve), hidrata igual desde localStorage | La rama guest llamaba `clearLearningData()` en **cada** carga (la intención era limpiar el caché de una sesión autenticada previa), lo que borraba TODO el progreso del invitado — incluido `lastPracticeByCountry` — en cada recarga | Implementado |

## Reglas de persistencia que siguen vigentes (ver `docs/state-management.md`)

- Toda escritura/lectura de `localStorage` pasa por `src/utils/learning-storage.ts`.
- Las funciones `saveX()`/`registerX()` reciben el `UserLearningData` actual como
  parámetro y **nunca lo releen de `localStorage`** (en usuarios autenticados esa
  copia puede estar vieja respecto a lo hidratado de Supabase). `getLearningData()`
  solo se usa en arranque/hidratación.
- Nuevo campo persistido → (1) tipo en `types/progress.ts`, (2) default en
  `DEFAULT_DATA` + fallback en `getLearningData()`, (3) `saveX()` dedicada,
  (4) el hook despacha `setLearningData(updatedData)`. Si debe sincronizar con la
  nube: añadir columna en Supabase, mapearla en `cloud-storage.ts` fetch/push, y
  decidir si va en el merge de `syncOnLogin`.

## Hallazgo abierto relacionado

`isDue` (`utils/spaced-repetition.ts`) compara con fecha **UTC**
(`toISOString().slice(0,10)`) mientras el candado diario usa fecha **local**
(`getLocalDateString`). En zonas `America/*` cerca de medianoche UTC pueden
desincronizarse (un continente "practicado hoy" y a la vez ofrecido en "Práctica
diaria"). Documentado como intencional en `date.ts` pero es un borde a vigilar.
