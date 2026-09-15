# 07 — Modo de juego "Países"

> Rama experimental `feat/modo-paises`. Cubre D028–D038 (ver
> `context/plans/modo-paises.md` para el plan completo con las 7 fases).
> Este archivo se completa fase a fase; los IDs se reservan todos desde el
> principio, pero el detalle de cada uno se llena cuando se implementa esa
> parte (D031–D035, D037, D038 llegan en las Fases 3–6).

## Por qué

`PROJECT_CONTEXT.md` dice que aprender las banderas es más fácil si primero se
sabe qué países hay en cada continente. Hasta ahora solo existía el juego de
banderas. Este modo reutiliza casi todo el flujo existente (alcance,
práctica/competitivo, práctica diaria, SRS, logros, ranking) y solo cambia la
tarjeta: un tablero de países en vez de una bandera.

## D028 — Un solo `UserLearningData`, progreso de Países en un sub-objeto

Se añadió `countriesGame: GameProgress` (`src/types/progress.ts`), con
`GameProgress = { countryHistory, regionGameScores, regionBestTimes,
lastPracticeByCountry }`. Los campos de primer nivel de `UserLearningData`
**siguen siendo los de Banderas** — no se renombraron.

Alternativa descartada: renombrar los campos de primer nivel a algo neutro
(`flagsGame`/`countriesGame` simétricos) y migrar. Se descartó porque una
migración de columnas de Supabase en filas ya en producción es más riesgosa
que añadir una columna nueva, y porque un cliente viejo con el service worker
cacheado (ver `CLAUDE.md`) seguiría escribiendo en los nombres viejos — igual
que ya se decidió para los ids de logro en D021.

Lo compartido entre juegos no se duplicó: `profile`, `lastConfiguration`,
`achievements`, `stats`, `sessionHistory` siguen siendo los mismos objetos
para los dos juegos. En Supabase: una columna nueva, `countries_game jsonb not
null default '{}'::jsonb` (`supabase/countries-game.sql`). Mismo riesgo de
despliegue que `achievements.sql` (D acción manual en `CURRENT_PHASE.md`): si
el cliente pide la columna antes de que exista, `fetchRemoteLearningData`
falla y el usuario autenticado cae al fallback de `localStorage`.

**Un cliente viejo (SW cacheado) que no conoce `countriesGame` es seguro**:
`pushLearningData` hace un `upsert` enumerando columnas explícitas — un
cliente que no manda `countries_game` en el objeto simplemente no la incluye
en el `upsert`, así que Postgres conserva el valor que ya tenía la fila. No
hay forma de que un cliente viejo borre el progreso de Países de otro
dispositivo.

## D029 — "Vista" de juego en vez de reescribir `learning-storage.ts`

Ninguna de las funciones puras existentes (`saveReviewResult`,
`registerRegionGame`, `registerRegionBestTime`, `registerCountryPracticed`,
`getUnpracticedCodesToday`, `hasPracticedCountryToday`, `getDueCountries`,
`countLearnedCountries`…) sabe que existe un segundo juego: todas siguen
leyendo/escribiendo los campos de primer nivel, exactamente igual que antes.

En su lugar, `toGameView(data, gameType)` proyecta el progreso del juego
pedido sobre esos campos de primer nivel (para "flags" es la identidad; para
"countries" copia `countriesGame.*` encima), y `fromGameView(original, view,
gameType)` hace la inversa: restaura los campos de Banderas desde `original` y
mueve lo que cambió de vuelta a `countriesGame`, conservando de `view` todo lo
compartido que la función pura haya tocado (stats, sessionHistory,
achievements, lastConfiguration, profile).

Patrón de uso en `useGame.ts`:

```ts
const current = getCurrentLearningData();
const view = algunaFuncionPura(toGameView(current, gameType), ...);
const updatedData = fromGameView(current, view, gameType);
dispatch(setLearningData(updatedData));
```

**Ajuste sobre el diseño inicial del plan:** las funciones puras de
`learning-storage.ts` persisten por su cuenta (`saveLearningData(updatedData)`
dentro de cada una). Si `fromGameView` no volviera a persistir, lo que
quedaría escrito en `localStorage` tras una acción sobre Países sería la
VISTA a medio corregir (de primer nivel con el progreso de Países, y
`countriesGame` todavía desactualizado) — una recarga justo después de esa
acción y antes del siguiente cambio perdería la actualización. Por eso
`fromGameView` vuelve a llamar a `saveLearningData` con el objeto ya corregido
cuando `gameType !== "flags"` (para "flags" no hace falta: la función pura ya
persistió la forma correcta, al ser la identidad). Verificado con un
script de aserciones puras (ver Fase 1 en `context/plans/modo-paises.md`).

Alternativa descartada: pasar `gameType` como parámetro a cada función pura
de `learning-storage.ts` y que decida internamente dónde leer/escribir. Se
descartó porque multiplicaría por dos la superficie de cada función (rama
`if (gameType === "countries")` repetida en más de diez sitios) para un caso
que la proyección resuelve una sola vez.

## D030 — Orden y valor por defecto

En la UI (Fase 2), Países aparece **primero**: `GAME_TYPES = ["countries",
"flags"]`. Un usuario nuevo (sin `lastConfiguration` nunca guardada) arranca
en Países: `DEFAULT_GAME_TYPE = "countries"`.

Una configuración guardada **antes** de que existiera el modo Países no trae
`gameType`: `migrateConfiguration` la migra a `"flags"`, no al default de
usuario nuevo — quien ya jugaba Banderas no debe verse cambiado de juego de
golpe en su próxima visita. `updateLastConfiguration` (que arma la config
completa cuando no hay ninguna previa) sí usa `DEFAULT_GAME_TYPE`, porque ese
caso — literalmente no hay config guardada — es el de un usuario nuevo.

## D036 — Logros

Los logros existentes en `src/utils/achievements.ts` siguen siendo de
Banderas (leen `data.countryHistory`/`data.regionBestTimes` de primer nivel,
que es Banderas — no se tocaron). De los que recorren `sessionHistory`
filtrando `mode === "competitive"`, dos necesitaban filtro adicional porque
ahora el rush también puede ser de Países: `rush_impecable` y `sin_frenos`
ahora exigen además `(session.gameType ?? "flags") === "flags"`.
`a_contrarreloj` no se tocó: lee `regionBestTimes` de primer nivel, que sigue
siendo exclusivamente de Banderas.

`SessionRecord` ganó `gameType?: GameType`, **opcional** y no
`AchievementId`-como-estrecho: un registro sin este campo (guardado antes de
esta versión) se trata como `"flags"` en todo el código que lo lee — nunca se
debe desestructurar `session.gameType` sin el `?? "flags"`. Mismo espíritu
que D021 (ids de logro como `string`, no como el tipo estrecho): un dato que
puede faltar en registros viejos no se puede tratar como si siempre estuviera.

Los 4 logros nuevos de Países llegan en la Fase 7 (ver plan).
