# 07 — Modo de juego "Países"

> Rama experimental `feat/modo-paises`. Cubre D028–D038 (ver
> `context/plans/modo-paises.md` para el plan completo con las 7 fases, todas
> cerradas). Verificado en el navegador real (`bun run dev`, con permiso
> explícito del dueño) además de con `bunx astro check`/`bun run build`/
> `bunx biome check`/aserciones puras — ver el detalle de cada decisión.

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

Los 4 logros nuevos de Países (Fase 7): `mapa_mental_europa` (continentes,
sobre `countriesGame`), `primer_tablero` (completar cualquier rush de
países), `mundo_de_memoria` (completar el rush de "Todo el mundo" en
Países) y `primero_los_paises` (un continente aprendido en los dos juegos a
la vez — meta). Todos verificados con aserciones puras y, `primer_tablero` y
`mapa_mental_europa`, también viéndolos desbloquearse en vivo en el
navegador durante la Fase 7.

## D031 — Rush de países: auto-aceptación al escribir, con espera para prefijos ambiguos

`findMatch` (`src/utils/country-board.ts`) compara el texto normalizado
contra el alcance completo de la sesión en cada `onChange`. Si coincide
exactamente con un país no encontrado, se acepta al instante — sin botón
"Comprobar": es una carrera de tecleo, no una prueba de acierto/fallo, así
que no hay "penalización" que aplicar a medio escribir.

Si el texto coincide con un país **y además es prefijo** de otro país sin
descubrir, se espera 700 ms (o Enter, que acepta ya) antes de darlo por
bueno. Colisiones reales en `src/data/countries.ts`: `Guinea` ⊂
`Guinea-Bisáu`/`Guinea Ecuatorial`, `Sudán` ⊂ `Sudán del Sur`, `Níger` ⊂
`Nigeria` (sin espacio de por medio). **Hallazgo de la Fase 3:** la
ambigüedad Níger/Nigeria solo existe comparando sin tildes — con tildes
("hard") ya difieren en la segunda letra (í vs i). Tras D032 (revisada:
el rush compara con tildes), este caso concreto de Níger/Nigeria ya no se
da en la práctica — quedan Guinea y Sudán, que no dependen de acentos.

Verificado en el navegador (Fase 4): escribir "Guinea" lo acepta tras la
espera; completar hasta "Guinea Ecuatorial" lo acepta antes de que la
espera expire; un país ya encontrado muestra "Ya tienes {nombre}" sin
duplicar ni reiniciar el input.

## D032 — Rush de países: exige tildes, igual que el resto del competitivo

**Revisada tras feedback del dueño** (la Fase 4 la implementó al revés:
`findMatch` siempre con `difficulty: "easy"`, sin exigir tildes, razonando
que era "una carrera de tecleo, no una prueba de acento"). Decisión final:
el rush de Países exige tildes igual que el resto del modo competitivo
(que en Banderas ya fuerza `"hard"`) — `findMatch` se llama siempre con
`difficulty: "hard"` en `CountriesRush.tsx`, sin importar la dificultad
configurada (el competitivo no deja elegirla). Consistencia entre los dos
juegos: si Banderas exige tildes en competitivo, Países también. La
práctica de países sigue respetando la dificultad elegida (`isCorrectAnswer`
normal en `CountriesPractice`, sin tocar).

## D033 — Rush de países: completar o rendirse; el mejor tiempo solo cuenta al 100 %

`CompetitiveGameResult` ganó `completed: boolean` (Banderas siempre manda
`true`, no tiene botón "Rendirme"). Al rendirse (`CountriesRush.tsx`, con
`ConfirmationModal` reutilizado vía sus props opcionales de D034-adjacent):
se revelan los países que faltaban como `"missed"` (rojo + icono, D038), se
registra la sesión igual (cuenta para `stats`), y **`registerRegionBestTime`
solo se llama si `completed`** — un rush abandonado a medio camino no debe
mejorar ni crear una marca. `Results.tsx` muestra "Encontraste X de Y" en
vez de un tiempo cuando no se completó.

Ranking en `leaderboard_entries` con scope `"countries:world"` — la PK
`(user_id, scope)` ya lo soportaba sin migración. `LeaderboardModal` gana un
selector Países/Banderas (mismo `GameTypeToggle` que la Fase 2) que decide
el scope consultado.

**Hallazgo de rendimiento (Fase 4, resuelto en una rama aparte):** al
rendirse en un rush de "Todo el mundo" hay que registrar hasta ~150 países
no encontrados de golpe. Llamar a `attemptCountry` uno por uno habría
repetido el guardado completo en `localStorage` (`JSON.stringify` +
`setItem` de la fila entera) ~150 veces para un solo evento del usuario. Se
resolvió en `perf/batch-country-attempts` (mergeada a `main` antes de
continuar): `registerCountryAttempts`/`saveReviewResults` en
`learning-storage.ts` aplican el cálculo de varios países y persisten una
sola vez; `attemptCountries` (plural) en `useGame.ts` expone esto con
despacho único. Benchmark con un perfil realista (~33 KB, 150 países):
~27 ms/150 guardados antes → ~4 ms/1 guardado después.

## D034 — Práctica de países: tarjeta cloze con pistas letra a letra

Cada tarjeta SRS es un país. `CountryClozeCard.tsx` (compartido con la Fase
6) muestra el tablero **del continente entero** del país objetivo — no solo
el alcance de la sesión — con todos los nombres visibles salvo el objetivo,
que aparece resaltado (`target`). El formulario es el mismo `AnswerForm` de
Banderas, con props opcionales nuevas (`label`, `placeholder`,
`correctSuffix`, `inputRef`) que no cambian nada para `Session.tsx`.

Botón "Pista": revela una letra más del hueco hasta `longitud - 1`,
anunciado por una región `aria-live`. Un acierto con pistas **cuenta igual**
para la puntuación (D034 original) — las pistas ayudan a recordar, la
calificación honesta (Otra vez/Difícil/Bien/Fácil) sigue siendo decisión del
usuario, y el aviso de acierto dice cuántas se usaron.

**Ajuste sobre el plan:** `CountryClozeCard` recibe el `BoardSlotState`
completo del hueco (`target`/`revealed`/`missed`), no el `isRevealed:
boolean` que proponía el plan original — la práctica con SRS necesita
distinguir un fallo (rojo, con el nombre) de un hueco sin más; la práctica
diaria (D035) nunca falla, así que simplemente nunca le pasa `"missed"`.

Guard contra tecleo repetido 1-4 (ref que se libera al cambiar de tarjeta):
`Session.tsx` tiene este hallazgo reportado sin arreglar (hallazgo
pre-existente de la unidad de logros); acá se previene desde el principio
en vez de heredar el bug.

Alternativas descartadas (del plan original): mostrar la palabra
directamente y hacer copiarla (sin recuerdo activo, el SRS no mide nada); un
mapa/silueta del país (mejor pedagógicamente, pero necesita un SVG con
licencia y geometría por país — fuera de alcance de una rama experimental,
fila en `CONTENT_CHECKLIST.md`).

## D035 — Práctica diaria por juego

`dailyPracticeQueue` pasa de `string[] | null` a `{ gameType, codes } |
null` (`gameSlice.ts`). El botón "Práctica diaria (N)" cuenta los vencidos
del juego seleccionado (`toGameView` sobre `getDueCountries`), y
`finishDailyPractice` guarda `gameType` en el `SessionRecord` leyendo el de
la cola en curso — no el de la configuración actual, que pudo cambiar
mientras la cola seguía abierta.

Para Países, `DailyPractice.tsx` reemplaza `FlagDisplay` por
`CountryClozeCard` (D034) en estado `"target"`/`"revealed"`; el nombre
revelado ya se ve en el tablero, así que no se repite como texto aparte.
Resto del flujo (revelar con Espacio/tocar, calificar con 1-4 o los
botones) idéntico a Banderas.

Verificado de punta a punta en el navegador (Fase 6): países vencidos
inyectados a mano en `localStorage`, la cola mostró la tarjeta cloze
correcta para cada uno, reveló y calificó bien, y cerró la sesión.

## D037 — Animación de "vuelo" con Web Animations API

`useFlyToSlot.ts` anima el texto aceptado desde el input hasta su hueco con
la técnica FLIP (el clon se posiciona ya en el destino y se anima un
`transform` que lo trae desde el origen a `none`) — no framer-motion, que no
ejecuta en este stack (D006). Duración 450 ms, `cubic-bezier(0.2, 0.8, 0.2,
1)`: constantes con nombre en el archivo, no hay token de
`DESIGN_TOKENS.md` para una animación JS de esta duración (los que existen
son transiciones CSS de 150-200 ms).

Con `prefers-reduced-motion: reduce` no hay clon: `onLanded` se llama de
inmediato y el hueco pasa a su estado final sin animación. Antes de medir
posiciones, `scrollIntoView({ block: "nearest", behavior: "auto" })`
instantáneo — si el tablero se desplazara con animación mientras se toman
las medidas, el clon aterrizaría en el sitio equivocado.

## D038 — Ancho del hueco sin valores mágicos, accesible por teclado

`BoardSlot.tsx` renderiza el nombre real dentro con `invisible` (D038
original) cuando no debe mostrarse — nunca un `width` fijo — así el ancho es
siempre el de la palabra y no hay salto de layout al descubrirlo. Estados
(`hidden`/`revealed`/`target`/`missed`/`context`) siempre con color **más**
forma/icono/texto para lectores de pantalla, nunca solo color (`missed`
lleva el icono `Xmark` además del rojo).

**Hallazgo de accesibilidad (Fase 5-6, verificado y corregido con
axe-core en el navegador):** `CountryBoard.tsx` tiene su propio scroll
(`overflow-y-auto`, puede ser más alto que lo visible en continentes
grandes o "Todo el mundo") pero no era alcanzable por teclado —
`scrollable-region-focusable`, violación **seria** de axe-core. Se
corrigió con un `<section tabIndex={0} aria-label="...">` (no un `<div
role="group">`: biome pedía un elemento semántico, y `role="group"` es
para controles de formulario, no para una sección de contenido). Quedó un
`biome-ignore` documentado para `noNoninteractiveTabindex`: es el patrón
recomendado por WAI-ARIA para una región con scroll propio, y la regla
genérica de biome no distingue este caso legítimo. Confirmado en el
navegador: la violación desaparece tras el fix, y no aparecen violaciones
nuevas en ninguna de las pantallas de Países (selector, tablero de rush,
tarjeta cloze, modal de "Rendirme", ranking, modal de logros) en claro ni
en oscuro.
