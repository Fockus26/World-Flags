# Script de implementación: modo de juego "Países" (rama experimental)

> Instrucciones para un agente (pensado para Sonnet con esfuerzo medio).
> Autor del plan: sesión de planificación del 2026-09-14. Rama: `feat/modo-paises`.
> **Léelo entero antes de tocar nada.** Si algo de aquí choca con `CLAUDE.md`, gana `CLAUDE.md`.

---

## 0. Qué es esto (en una frase)

Un segundo tipo de juego, **"Países"**, que va **antes** que "Banderas": aprender qué
países hay en cada continente. Usa el mismo flujo que ya existe (alcance por
continentes o países sueltos, práctica/competitivo, práctica diaria, SRS con
Otra vez/Difícil/Bien/Fácil, puntuación, logros, ranking). Lo único que cambia es
**la tarjeta**: en vez de una bandera, un **tablero** con un hueco por país.

### Vocabulario que usa este documento

| Término | Significado |
|---|---|
| `gameType` | `"countries"` (Países) o `"flags"` (Banderas). Nuevo campo de `GameConfiguration` |
| **Tablero** | Lista de países de un continente en orden alfabético (collator `es`), pintados como bloques en `flex-wrap`. El ancho de cada bloque es el de la palabra |
| **Hueco** | Bloque de un país aún no descubierto. Mismo ancho que el nombre, sin mostrar el texto |
| **Vuelo** | Animación: el texto escrito en el input sube hasta su hueco en el tablero |
| **Rush de países** | Competitivo: escribir todos los países del alcance, en cualquier orden, contra reloj |
| **Tarjeta cloze** | Práctica: el tablero del continente con todos los nombres visibles **menos uno** (el hueco resaltado). Hay que escribir el que falta |

---

## 1. Decisiones de diseño ya tomadas (no re-litigar; registrar como D028–D036)

Estas las propone el plan y el dueño las aprueba al revisar este documento. Si al
implementar alguna resulta imposible, **para y pregunta** (no improvises otra).

**D028 — Un solo `UserLearningData`, progreso de Países en un sub-objeto.**
Se añade `countriesGame: GameProgress`, con
`GameProgress = { countryHistory, regionGameScores, regionBestTimes, lastPracticeByCountry }`.
Los campos actuales de primer nivel **siguen siendo los de Banderas** (no se renombran:
renombrar rompería el sync con filas viejas y clientes con SW cacheado).
Lo compartido entre ambos juegos: `profile`, `lastConfiguration`, `achievements`,
`stats` (racha, días activos, tiempo total), `sessionHistory`.
En Supabase: **una sola columna nueva** `countries_game jsonb not null default '{}'`.

**D029 — "Vista" de juego en vez de reescribir `learning-storage.ts`.**
Todas las funciones puras actuales (`saveReviewResult`, `registerRegionGame`,
`registerRegionBestTime`, `registerCountryPracticed`, `getUnpracticedCodesToday`,
`hasPracticedCountryToday`, `getDueCountries`, `countLearnedCountries`…) leen
`data.countryHistory` etc. **No se tocan.** Se añaden dos helpers:

```ts
// Proyecta el progreso del juego pedido sobre los campos de primer nivel.
export function toGameView(data: UserLearningData, gameType: GameType): UserLearningData
// Devuelve `original` con el progreso de `view` escrito en el sitio correcto.
export function fromGameView(original: UserLearningData, view: UserLearningData, gameType: GameType): UserLearningData
```

Para `"flags"` ambas son identidad (`fromGameView` devuelve `view` tal cual).
Para `"countries"`, `toGameView` copia `data.countriesGame.*` a los campos de primer
nivel y `fromGameView` hace lo inverso **restaurando** los de Banderas desde `original`
y conservando de `view` todo lo compartido (stats, sessionHistory, achievements,
lastConfiguration, profile). Así cada acción de `useGame` queda:
`dispatch(setLearningData(fromGameView(cur, fn(toGameView(cur, gt)), gt)))`.

**D030 — Orden y valor por defecto.** En la UI, Países aparece **primero**.
Usuario nuevo → `gameType: "countries"`. Configuración guardada sin `gameType`
(usuarios existentes) → `"flags"` en `migrateConfiguration`, para no cambiarles el
juego de golpe.

**D031 — Rush de países: auto-aceptación mientras se escribe, sin botón Comprobar.**
En cada cambio del input se normaliza y se compara contra los países **no
descubiertos** del alcance. Coincidencia exacta → se acepta, se limpia el input y
sale el vuelo. No hay "fallo" (no se puede saber si alguien se equivocó o sigue
escribiendo), así que no hay penalización por error.
**Caso obligatorio — prefijos:** si el texto coincide con un país **y además es
prefijo** de otro país no descubierto, **no se acepta todavía**: se acepta al pulsar
Enter o tras 700 ms sin escribir. Colisiones reales en `countries.ts`:
`Guinea` ⊂ `Guinea-Bisáu`, `Guinea Ecuatorial` · `Sudán` ⊂ `Sudán del Sur` ·
`Níger` ⊂ `Nigeria` (sin separador — la regla es prefijo puro, no "prefijo + espacio").
Si el texto coincide con un país **ya descubierto** → mensaje breve "Ya lo tienes"
(texto, no solo color) y no se limpia.

**D032 — Rush de países: acentos opcionales.** Se compara siempre con
`difficulty: "easy"` (sin diacríticos), aunque en Banderas el competitivo fuerce
`"hard"`. Motivo: es una carrera de tecleo; exigir tildes castiga el teclado, no el
conocimiento. Es igual para todos, así que el ranking sigue siendo justo.
(La práctica de Países sí respeta la dificultad elegida.)

**D033 — Rush de países: se termina completando o rindiéndose.** Botón "Rendirme"
(con `ConfirmationModal`). Al rendirse se revelan los que faltaban (estilo `danger`
+ icono ✕ + texto "No encontrado" solo para lectores de pantalla), la sesión cuenta
en estadísticas, y **el mejor tiempo solo se registra si se completó al 100 %**.
Ranking en `leaderboard_entries` con scope `"countries:world"` (la PK
`(user_id, scope)` ya lo soporta, **sin migración**).

**D034 — Práctica de Países = tarjeta cloze sobre el tablero del continente.**
Cada tarjeta SRS es un país. Se muestra el tablero **de su continente** con todos los
nombres visibles excepto el suyo, que aparece como hueco resaltado (borde `primary`,
con el texto "N letras" accesible) y se desplaza a la vista. El usuario escribe y
pulsa Comprobar (mismo `AnswerForm`). Botón **"Pista"**: revela la siguiente letra
dentro del hueco (máx. `longitud − 1`). Tras comprobar: correcto → vuelo al hueco;
incorrecto o saltar → el hueco muestra el nombre en `danger`. Luego los botones
Otra vez/Difícil/Bien/Fácil de siempre. El feedback dice cuántas pistas se usaron
("Correcto con 2 pistas") para ayudar a calificar con honestidad. Las pistas **no**
cuentan como primer intento fallido para la puntuación, pero sí se guardan en el
resumen (ver Fase 5).
Alternativas descartadas (para el registro de la decisión):
- *Mostrar la palabra directamente y hacer copiarla:* no hay recuerdo activo, el SRS
  no mide nada.
- *Mapa / silueta del país:* lo mejor pedagógicamente, pero necesita un SVG de mapa
  mundial con licencia y geometría por país — fuera del alcance de una rama
  experimental. Queda como mejora futura (`CONTENT_CHECKLIST`).

**D035 — Práctica diaria por juego.** El botón "Práctica diaria (N)" cuenta los
vencidos del juego seleccionado. `dailyPracticeQueue` pasa de `string[] | null` a
`{ gameType: GameType; codes: string[] } | null`. En Países, "revelar" rellena el hueco
de la tarjeta cloze.

**D036 — Logros.** Los logros existentes **siguen siendo de Banderas**
(leen `data.countryHistory` de primer nivel, que es Banderas). Los que recorren
`sessionHistory` buscando `mode === "competitive"` deben filtrar además
`(session.gameType ?? "flags") === "flags"`. `SessionRecord` gana
`gameType?: GameType` (opcional: registros viejos = Banderas). La racha, días activos
y tiempo total sí suman ambos juegos. Se añaden 4 logros de Países (Fase 7).

**D037 — Animación de vuelo con Web Animations API (FLIP), no framer-motion.**
Ver `context/decisions/03-animaciones.md`: framer no corre en este stack.
Con `prefers-reduced-motion: reduce` no hay vuelo: el hueco se rellena con un
`animate-in fade-in-0` corto.

**D038 — Ancho del hueco sin valores mágicos.** El hueco renderiza **el nombre real**
dentro con `invisible` + `aria-hidden="true"` + `select-none`. El ancho es exactamente
el de la palabra y al descubrirlo no hay salto de layout. `visibility:hidden` no
aparece en Ctrl+F. (Hacer trampa con DevTools es posible igual que hoy: los nombres
van en el bundle.) Nada de `style={{ width: \`${n}ch\` }}`.

---

## 2. Reglas del proyecto que aplican aquí (resumen, no sustituye `CLAUDE.md`)

- **Bun** para todo. **No levantes `bun run dev`**: si necesitas el sitio, pídeselo al
  dueño y espera. Tras cada cambio en dev: desregistrar SW y borrar cachés (ver `CLAUDE.md`).
- Consulta **Context7** antes de usar APIs de HeroUI v3 (especialmente `Tabs`),
  React Aria o Supabase.
- **Cero valores mágicos** de color/espaciado/radio. Colores de `context/COLORS.md`.
  No añadas `text-[Xrem]` nuevos. Recuerda: `primary` y `success` **no** van como color
  de texto (fallan AA); texto con acento verde → `success-hover`.
- **Persistencia solo por `src/utils/learning-storage.ts`.** Redux solo vía hooks de
  `src/hooks/` y reducers en `store/slices/`.
- Wrappers de `src/components/ui/` **conservan su API**: solo cambios **aditivos y
  opcionales** (p. ej. un prop `label?` en `AnswerForm`).
- WCAG 2.1 AA, foco visible, ningún estado solo por color, sin scroll horizontal a 320 px.
- Copy nuevo = placeholder marcado + fila en `context/CONTENT_CHECKLIST.md`.
- Bug encontrado en código cerrado → se **reporta**, no se arregla aquí.
  Archivo que queda sin uso → se **señala**, no se borra.
- **Nada se commitea sin aprobación explícita del dueño.** Sin `reset --hard`, sin
  `push`, sin reescribir historia.
- Comentarios en español, con la densidad y el tono de los archivos que tocas
  (explican el *porqué*). Indentación con tabs (biome).

---

## 3. Arranque

1. Lee, en orden: `CLAUDE.md`, `context/PROJECT_CONTEXT.md`, `context/CURRENT_PHASE.md`,
   `context/DESIGN_RULES.md`, `context/GIT_STATE.md`, `context/DECISIONS_INDEX.md`,
   `context/decisions/03-animaciones.md`, `context/decisions/05-logros.md`, `context/COLORS.md`.
2. Lee enteros estos archivos antes de escribir código:
   `src/types/country.ts`, `src/types/progress.ts`, `src/hooks/useGame.ts`,
   `src/utils/learning-storage.ts`, `src/utils/cloud-storage.ts`,
   `src/store/slices/gameSlice.ts`, `src/components/game/FlagGame.tsx`,
   `src/components/game/session/Session.tsx`, `src/components/game/session/DailyPractice.tsx`,
   `src/components/game/session/AnswerForm.tsx`, `src/components/game/session/Header.tsx`,
   `src/components/game/session/ConfirmationModal.tsx`, `src/components/game/Results.tsx`,
   `src/components/game/configuration/Configuration.tsx`,
   `src/components/game/configuration/LeaderboardModal.tsx`,
   `src/components/app/GameEffects.tsx`, `src/utils/achievements.ts`,
   `src/utils/prepare-countries.ts`, `src/utils/practice-scope.ts`,
   `src/utils/normalize-answer.ts`, `src/hooks/usePracticeQueue.ts`.
3. Usa la skill **`git-flow`** para abrir la rama. Base = `main` (según `GIT_STATE.md`).
   Nombre: **`feat/modo-paises`**. Es **experimental**: al cerrar **no se mergea** a
   `main` salvo que el dueño lo pida expresamente.
4. Anota la rama en `context/GIT_STATE.md` › Ramas de trabajo ("experimental, sin merge
   previsto") y en `context/CURRENT_PHASE.md` › Estado actual.
5. Ejecuta `bunx astro check` y `bun run build` **antes de cambiar nada** y guarda el
   resultado: así sabes qué errores ya existían.

---

## 4. Fases

Cada fase termina con: `bunx astro check` limpio + `bun run build` verde +
`bunx biome check ./src` sin hallazgos nuevos en los archivos tocados + un **reporte
corto** al dueño (qué hiciste, qué no pudiste verificar) + **PAUSA** hasta que apruebe.
Tras la aprobación: commit en Conventional Commits en `feat/modo-paises`, con el
trailer de co-autoría que indique el sistema. Una fase = un commit.

---

### Fase 1 — Modelo de datos, migración y sync (sin UI)

**Objetivo:** que exista `gameType` y el progreso de Países, se guarde en local, se
sincronice con Supabase y se fusione, sin cambiar nada visible.

1. `src/types/country.ts`
   - `export const GAME_TYPES = ["countries", "flags"] as const;` (este orden = orden en UI)
   - `export type GameType = (typeof GAME_TYPES)[number];`
   - `export const DEFAULT_GAME_TYPE: GameType = "countries";`
   - `GAME_TYPE_LABELS: Record<GameType, string>` = `{ countries: "Países", flags: "Banderas" }`
   - `GameConfiguration` gana `gameType: GameType`.
   - `GameResultBase` gana `gameType: GameType`.
   - `CompetitiveGameResult` gana `completed: boolean` (en Banderas siempre `true`;
     actualiza el `finishGame` de `Session.tsx` para pasarlo).
2. `src/types/progress.ts`
   - `export interface GameProgress { countryHistory; regionGameScores; regionBestTimes; lastPracticeByCountry }`
     (reutiliza los tipos que ya existen).
   - `UserLearningData` gana `countriesGame: GameProgress`.
   - `SessionRecord` gana `gameType?: GameType` (con comentario: ausente = Banderas, D036).
3. `src/utils/learning-storage.ts`
   - `DEFAULT_GAME_PROGRESS` (todo vacío) y `countriesGame` en `DEFAULT_DATA`.
   - `normalizeLearningData`: normaliza `countriesGame` campo a campo
     (`migrateCountryHistory` para su `countryHistory`; `?? {}` para el resto; trata `{}`
     como vacío, igual que el comentario de `migrateStats`). **Coloca la clave
     `countriesGame` en el mismo sitio del objeto** que en `mergeLearningData` (lee el
     comentario sobre el orden de claves y `JSON.stringify`).
   - `migrateConfiguration`: `gameType: configuration.gameType ?? "flags"` (D030).
     Si no hay configuración previa, el valor lo pone quien crea la primera (usa
     `DEFAULT_GAME_TYPE` en `Configuration.tsx`).
   - `mergeLearningData`: extrae a funciones puras la fusión de `regionBestTimes`
     (menor) y `lastPracticeByCountry` (más reciente) que ya existe, y aplícalas también
     a `countriesGame`. `countriesGame.countryHistory` y `.regionGameScores`: gana lo
     remoto, igual que en Banderas. **Sin cambiar el resultado para los campos de
     Banderas.**
   - `hasLearningProgress`: que también cuente progreso en `countriesGame`.
   - `toGameView` / `fromGameView` (D029), con comentario explicando la idea.
   - `createSessionRecord` acepta y guarda `gameType`.
4. `src/utils/cloud-storage.ts`: añade `countries_game` al `select`, al mapeo de
   `fetchRemoteLearningData` (`data.countries_game ?? {}`) y al `upsert`.
5. `supabase/countries-game.sql` (nuevo), mismo estilo que `supabase/achievements.sql`:
   `alter table public.user_learning_data add column if not exists countries_game jsonb not null default '{}'::jsonb;`
   con comentario de cabecera. **No lo ejecutes tú.**
6. `src/hooks/useGame.ts`: todavía sin UI, pero deja lista la infraestructura:
   - Toda acción que hoy lee/escribe progreso por país (`startGame`, `finishGame`,
     `attemptCountry`, `gradeCountryReview`, `startDailyPractice`,
     `getRegionPracticeProgress`, `isCountryPracticedToday`, `restartGame`) recibe o
     deduce el `gameType` (de `activeGame.configuration`, de la cola diaria, o de
     `lastConfiguration`) y opera sobre `toGameView`/`fromGameView`.
   - `toSessionRecord` y `finishDailyPractice` guardan `gameType`.
   - `finishGame` en competitivo: `registerRegionBestTime` **solo si `result.completed`**.
   - `restartGame` pasa `gameType`.
   - Mantén el patrón `getCurrentLearningData()` y **un solo `dispatch`** por evento
     (lee el comentario de arriba del archivo).
7. `src/store/slices/gameSlice.ts`: `dailyPracticeQueue: { gameType: GameType; codes: string[] } | null`
   (D035). Ajusta `FlagGame.tsx` y `DailyPractice` para que compilen pasando
   `gameType="flags"` por ahora.
8. `src/utils/achievements.ts`: en los logros que filtran `sessionHistory` por
   `mode === "competitive"` añade `(session.gameType ?? "flags") === "flags"` (D036).
   Revisa `a_contrarreloj` (`Object.keys(data.regionBestTimes)`) — lee el top-level =
   Banderas, correcto, no tocar.
9. **Verificación pura** (sin navegador): crea un script temporal en el scratchpad
   (no en el repo) que ejecute con `bun` aserciones sobre:
   - `normalizeLearningData({})` produce `countriesGame` vacío válido.
   - Config vieja sin `gameType` → `"flags"`.
   - `fromGameView(d, toGameView(d, "countries"), "countries")` deep-equal a `d`.
   - Tras aplicar `saveReviewResult` en vista `countries`, `d.countryHistory`
     (Banderas) **no cambia** y `d.countriesGame.countryHistory` sí.
   - Idempotencia: `merge(merge(r, l), l)` deep-equal `merge(r, l)` con datos en
     `countriesGame` (misma garantía que D020).
   - `JSON.stringify(merge(r, r)) === JSON.stringify(r)` (orden de claves).
   Pega el resumen de resultados en el reporte.
10. Registra D028–D030, D036 en `context/decisions/07-modo-paises.md` (nuevo, formato
    de los otros archivos de `decisions/`) y en `DECISIONS_INDEX.md`.
11. En `CURRENT_PHASE.md` añade la acción manual bloqueante: **correr
    `supabase/countries-game.sql` antes de desplegar** (mismo riesgo que describe
    para `achievements.sql`: si falta la columna, el `select` falla y el usuario
    autenticado cae a `localStorage`).

**PAUSA.** Commit sugerido: `feat(modo-paises): añade gameType y progreso separado de países con sync`.

---

### Fase 2 — Selector de juego en Configuración

1. Consulta Context7 para `Tabs` de HeroUI v3 (`@heroui/react`). Si `Tabs` no encaja
   (p. ej. exige paneles), usa `ToggleButtonGroup` o el patrón que ya usa
   `GameTab.tsx` para el modo — lo que ya exista en el repo gana.
2. `Configuration.tsx`:
   - Selector "Países | Banderas" (Países primero) **encima del título**, controlado por
     `lastConfiguration.gameType ?? DEFAULT_GAME_TYPE`, que llama a
     `updateSettings({ gameType })` y limpia `blockedMessage`.
   - Título según juego: "Aprende los países del mundo" / "Aprende las banderas del
     mundo" (el primero es copy nuevo → `CONTENT_CHECKLIST`).
   - `RegionSelector` recibe `regionGameScores`/`regionBestTimes` de
     `toGameView(learningData, gameType)`; `getRegionPracticeProgress` e
     `isCountryPracticedToday` ya dependen del juego (Fase 1).
   - `UserSummary`: aprendidos y progreso del juego seleccionado.
   - "Práctica diaria (N)": vencidos del juego seleccionado.
   - `startGame` recibe `gameType`.
3. Con `gameType === "countries"` el botón "Comenzar práctica" todavía no lleva a
   nada nuevo: en `FlagGame.tsx` renderiza temporalmente un placeholder simple dentro
   de la misma tarjeta de sesión ("Modo Países — en construcción" + botón Salir) para
   no romper el flujo. Se reemplaza en la Fase 4.
4. a11y: el selector se opera con teclado (flechas si es tablist), foco visible, el
   seleccionado se indica con algo más que color (el patrón de HeroUI ya lo cubre —
   compruébalo).

**PAUSA.** Commit sugerido: `feat(modo-paises): agrega selector Países/Banderas en configuración`.

---

### Fase 3 — Tablero y animación de vuelo (componentes aislados)

Carpeta nueva: `src/components/game/session/countries/`.

1. **`src/utils/country-board.ts`** (puro, testeable):
   - `buildBoard(countries: Country[]): BoardGroup[]` con
     `BoardGroup = { region: Region; label: string; countries: Country[] }`.
     Agrupa por región en el orden de `REGION_ORDER` y ordena alfabéticamente con el
     collator `es` **siempre** (el orden alfabético/aleatorio de la config no afecta al
     tablero). Exporta desde `prepare-countries.ts` lo que necesites
     (`REGION_ORDER`, `sortAlphabetically`) en vez de duplicarlo.
   - `findMatch(input, unfound: Country[], found: Set<string>, difficulty)` →
     `{ kind: "none" } | { kind: "match"; code; ambiguousPrefix: boolean } | { kind: "alreadyFound"; code }`.
     Usa `isCorrectAnswer` / la normalización de `normalize-answer.ts` (exporta
     `normalize` si hace falta, sin cambiar su comportamiento).
     `ambiguousPrefix = unfound.some(c => c.code !== match.code && normalize(c.name).startsWith(normalizedInput))`.
   - Aserciones temporales en el scratchpad: Guinea / Guinea-Bisáu / Guinea Ecuatorial,
     Sudán / Sudán del Sur, Níger / Nigeria (con y sin tilde), "ya descubierto",
     espacios alrededor.
2. **`BoardSlot.tsx`** — `forwardRef`/`ref` al `<li>`. Estados:
   `hidden` (hueco), `revealed` (descubierto), `target` (hueco resaltado de la tarjeta
   cloze), `missed` (no encontrado / fallo), `context` (nombre visible atenuado en la
   tarjeta cloze). Props extra: `hintLetters?: number` (cuántas letras mostrar en
   `target`), `isFlying?: boolean` (texto invisible mientras vuela el clon).
   - Ancho = nombre real dentro con `invisible` (D038). En `target` con pistas, pinta
     las primeras letras visibles y el resto invisible (dos `<span>` contiguos: el
     ancho total no cambia).
   - Todo con tokens: hueco `bg-surface-hover` + `border-surface-border`; descubierto
     `bg-success-soft` + borde `success` + texto `text-surface-soft`; `target` borde
     `primary` + anillo; `missed` `bg-danger-soft` + borde `danger` + icono `Xmark` de
     `iconoir-react` (`aria-hidden`). Radios/espaciados de la escala existente
     (`rounded-md`, `px-2`, `py-1`…). Sin `text-[..rem]` nuevos.
   - `whitespace-nowrap` + `max-w-full`; si un nombre no cabe a 320 px, permite el
     salto dentro del bloque (`break-words`) antes que provocar scroll horizontal.
   - Accesible: texto oculto visualmente (`sr-only`) por estado — "Sin descubrir",
     "{nombre}", "Falta un país, {N} letras", "{nombre}, no encontrado".
3. **`CountryBoard.tsx`** — recibe `groups`, un `Record<code, SlotState>`, y registra
   refs en un `Map<string, HTMLLIElement>` que expone vía prop `slotRefs`.
   - Cada grupo: `<section aria-labelledby>` con `<h3>` "Europa · 12/45" y un `<ol>`
     `flex flex-wrap gap-…`. Si solo hay un grupo, el encabezado igual se muestra.
   - El contenedor del tablero es el que hace scroll (`min-h-0 flex-1 overflow-y-auto`),
     nunca la página.
4. **`useFlyToSlot.ts`** — hook de la animación (D037):
   - `fly({ text, fromEl, toCode, onLanded })`:
     1. `slot.scrollIntoView({ block: "nearest", behavior: "auto" })` (instantáneo,
        para medir posiciones finales estables).
     2. Mide `from = fromEl.getBoundingClientRect()` (input) y `to = slot.getBoundingClientRect()`.
     3. Crea un clon `position: fixed` en `document.body` con la tipografía del slot
        (reutiliza las mismas clases), colocado en `to`, con `pointer-events: none` y
        `aria-hidden`.
     4. `clone.animate([{ transform: translate(dx, dy) scale(sx) , opacity: .9 }, { transform: "none", opacity: 1 }], { duration: 450, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" })`
        donde `dx/dy` llevan el clon a la posición del input.
     5. `onfinish` → quita el clon y llama a `onLanded` (el slot pasa de `isFlying` a
        visible con un `animate-in zoom-in-95 duration-150`).
   - Soporta varios vuelos a la vez (un clon por llamada). Limpia clones en el
     unmount. Con `matchMedia("(prefers-reduced-motion: reduce)")` → sin clon,
     `onLanded` inmediato.
   - Duración/easing: si existe token de duración en `context/DESIGN_TOKENS.md`, úsalo;
     si no, constantes con nombre al principio del archivo y anótalo en la decisión D037.
5. Página de prueba: **no** crear rutas nuevas (la app es de una sola página). Verifica
   con typecheck + build; la verificación visual llega en la Fase 4.

**PAUSA.** Commit sugerido: `feat(modo-paises): agrega tablero de países y animación de vuelo`.

---

### Fase 4 — Rush de países (competitivo)

**`CountriesRush.tsx`** en `session/countries/`. En `FlagGame.tsx`, sustituye el
placeholder: si `activeGame.configuration.gameType === "countries"` y modo
competitivo → `<CountriesRush key={activeGame.id} />`. **No modifiques `Session.tsx`**
salvo lo mínimo de la Fase 1 (`gameType`, `completed`).

Estructura (misma tarjeta/clases de contenedor que `Session.tsx`):
```
<section> (tarjeta)
  <Header regionLabel currentIndex={found} totalCountries elapsedMs onExit />
  <CountryBoard …/>                     ← scroll interno
  <div role="status" aria-live="polite" class="sr-only">…</div>
  <form> input + fila [Rendirme]         ← fijo abajo, shrink-0
</section>
<ConfirmationModal …/> (salir)  ·  <ConfirmationModal …/> (rendirse)
```

Comportamiento:
1. Cronómetro: copia el patrón de `Session.tsx` (`startTimeRef`, `isClockPausedRef`,
   intervalo de 100 ms, pausa mientras un modal está abierto y se descuenta al
   cerrarlo). Sin penalizaciones.
2. Input: label visible "Escribe un país de {alcance}" (copy nuevo → checklist),
   `autoComplete="off"`, `spellCheck={false}`, `autoCapitalize="none"`,
   `enterKeyHint="done"`. El foco vuelve siempre al input (tras vuelo, tras cerrar modal).
3. `onChange` → `findMatch` con `difficulty: "easy"` (D032):
   - `match` sin `ambiguousPrefix` → aceptar.
   - `match` con `ambiguousPrefix` → programa aceptación a 700 ms (se cancela si el
     texto cambia); Enter acepta ya.
   - `alreadyFound` → texto breve "Ya tienes {nombre}" bajo el input (`FeedbackMessage`
     `size="sm"`), sin limpiar.
   - Enter con `none` → "No es un país de {alcance}" (solo texto informativo, sin penalizar).
4. Aceptar: guarda `text` actual, limpia input, marca `found` + `isFlying`, llama a
   `attemptCountry(code, true)` (marca día activo; ver `useGame`), anuncia en el live
   region "{nombre}. {found} de {total}." y lanza `fly`. Protege contra doble
   aceptación del mismo código (ref `Set`), lección de los hallazgos de doble-submit.
5. Completar (found === total): pausa reloj, espera a que aterrice el último vuelo (o
   300 ms con reduced motion), y `finishGame({ mode: "competitive", gameType: "countries", completed: true, correctAnswers: total, skippedAnswers: 0, … })`.
6. Rendirse (confirmado): pausa reloj, revela faltantes como `missed`, deshabilita el
   input, muestra botón "Ver resultados" que llama a `finishGame` con
   `completed: false`, `correctAnswers: found`, `skippedAnswers: total - found`.
   El foco va al botón "Ver resultados".
7. Salir (icono del Header): igual que hoy, `exitGame` sin registrar sesión.
8. `Results.tsx`: parametriza el copy por `result.gameType` ("banderas" ↔ "países").
   En rush de países no completado: no mostrar "mejor tiempo", mostrar "Encontraste X
   de Y". Cambios mínimos y aditivos.
9. `GameEffects.tsx`: además del ranking de Banderas (`"world"`), sube
   `countriesGame.regionBestTimes.world` con scope `"countries:world"` cuando mejore
   (mismo patrón exacto que ya existe).
10. `LeaderboardModal.tsx`: selector Países/Banderas (mismo componente que la Fase 2),
    por defecto el juego activo en la configuración; `fetchLeaderboard` con el scope
    correspondiente.

**Pide al dueño que levante `bun run dev`** y verifica (o, si no hay navegador fiable,
márcalo como no verificado):
- Europa completa: vuelos a slots fuera de vista (hace scroll), varios vuelos seguidos rápido.
- África: `Guinea` → espera; seguir a `Guinea Ecuatorial` funciona; `Níger` + 700 ms → acepta.
- "Todo el mundo": 196 slots, sin tirones al escribir.
- 320 px: sin scroll horizontal, teclado móvil no tapa el input (el tablero se encoge).
- Reduced motion (DevTools › Rendering) → sin vuelo.
- Tema claro y oscuro.
- Rendirse → faltantes en rojo con icono; resultados sin mejor tiempo.
- Ranking de Países aparece tras completar "Todo el mundo" autenticado (si hay cuenta).

**PAUSA.** Commit sugerido: `feat(modo-paises): agrega rush competitivo de países con ranking`.

---

### Fase 5 — Práctica de países (tarjeta cloze + SRS)

**`CountriesPractice.tsx`** en `session/countries/`. En `FlagGame.tsx`:
`gameType === "countries"` + práctica → `<CountriesPractice key={activeGame.id} />`.

1. Cola: `usePracticeQueue` tal cual, con `learningData` en **vista countries**
   (`toGameView`) para `countryHistory`, y `gradeCountryReview` (que ya opera en la
   vista del juego activo desde la Fase 1). Orden inicial = `prepareCountries`
   (respeta alfabético/aleatorio de la config).
2. Tarjeta: `buildBoard` con **todos los países del continente** de la tarjeta actual
   (no solo los del alcance), estado `context` para todos salvo el actual (`target`).
   Al cambiar de tarjeta, `scrollIntoView({ block: "center" })` sobre el `target`
   (con `behavior: "smooth"` salvo reduced motion).
3. Formulario: reutiliza `AnswerForm` añadiendo **props opcionales** `label?` y
   `placeholder?` (por defecto los textos actuales, así Banderas no cambia). Label:
   "¿Qué país falta en {continente}?".
4. Botón "Pista" (`Button` `variant="outline"` `color="neutral"`, `fullWidth={false}`)
   junto al tablero o sobre el formulario, visible solo con `answerStatus === "idle"`.
   Incrementa `hintLetters` del target hasta `nombre.length - 1`. `aria-label`
   "Pista: revelar una letra ({usadas}/{máx})". Anuncia la letra revelada por live region.
5. Comprobar: `isCorrectAnswer(answer, name, configuration.difficulty)`.
   - Correcto → vuelo desde el input al target, feedback "Correcto: {nombre}" (+ " con N
     pistas" si N > 0).
   - Incorrecto → target pasa a `missed` mostrando el nombre, feedback como hoy.
   - `recordFirstAttempt` y `regionBreakdown` igual que `Session.tsx` (cópialo, no lo
     importes desde el componente). Un acierto **con pistas** cuenta como acierto para
     la puntuación (D034).
6. Saltar → igual que Banderas: revelar 1500 ms y calificar "again" automáticamente.
7. Teclas 1–4 para calificar: copia el efecto de `Session.tsx`, y **evita el spam**
   (hallazgo pre-existente): ignora la tecla si ya se está procesando una calificación
   (ref booleana que se libera al cambiar `currentCode`).
8. Temporizador por tarjeta (`timerEnabled`): crea `useCardCountdown` en
   `src/hooks/` copiando la lógica del efecto de `Session.tsx` **con su comentario**
   (`timerCodeRef`, `effectiveTimeLeft`) — el bug de doble skip ya se arregló ahí una
   vez, no lo reintroduzcas. No refactorices `Session.tsx` para usarlo (fuera de
   alcance; anótalo como mejora en `CURRENT_PHASE.md`).
9. `finishGame({ mode: "practice", gameType: "countries", … })`. El deseleccionado de
   continentes practicados hoy ya funciona sobre la vista del juego (Fase 1) —
   compruébalo.

Verificación (con el dueño levantando dev): Oceanía en alfabético y aleatorio,
pistas hasta el máximo, acierto/fallo/saltar, 1–4 repetido rápido, timer 5 s,
candado "practicado hoy" de Países **independiente** del de Banderas (practicar
Oceanía en Países no bloquea Oceanía en Banderas), 320 px, claro/oscuro.

**PAUSA.** Commit sugerido: `feat(modo-paises): agrega práctica con tarjeta cloze, pistas y SRS`.

---

### Fase 6 — Práctica diaria de Países

1. `DailyPractice.tsx`: prop `gameType: GameType`. Para `"flags"` nada cambia. Para
   `"countries"`, en lugar de `FlagDisplay` pinta la tarjeta cloze de la Fase 5
   (extrae a `CountryClozeCard.tsx` lo que compartan práctica y diaria; props:
   `countryCode`, `isRevealed`, `hintLetters?`). "Revelar" pone el target en
   `revealed` con el nombre. Resto del flujo idéntico.
2. `usePracticeQueue` con `countryHistory` de la vista del juego de la cola.
3. `finishDailyPractice` guarda `gameType` en el registro.
4. Verificación: para tener países vencidos, pide al dueño que en DevTools edite a
   mano un `dueDate` a ayer dentro de `countriesGame.countryHistory` en `localStorage`
   (es depuración manual, no código) y recargue. Comprueba que el contador de
   "Práctica diaria (N)" cambia al alternar Países/Banderas y que la cola de Países
   muestra la tarjeta cloze.

**PAUSA.** Commit sugerido: `feat(modo-paises): agrega práctica diaria para países`.

---

### Fase 7 — Logros de Países (mínimo) y cierre

1. `src/utils/achievements.ts`: 4 logros nuevos, con el mismo formato del catálogo
   (id `string` estable, evaluación pura, retroactivos cuando se pueda):
   - `primer_tablero` — completar un rush de países (cualquier alcance):
     `sessionHistory` con `gameType === "countries"`, `mode === "competitive"`,
     `correctAnswers === totalCountries`.
   - `mapa_mental_europa` — aprender los países de Europa en Países
     (`countriesGame.countryHistory`, reutilizando `isCountryLearned`).
   - `mundo_de_memoria` — completar el rush de Países de "Todo el mundo"
     (`countriesGame.regionBestTimes.world !== undefined`).
   - `primero_los_paises` — tener un continente aprendido en Países **y** en Banderas.
   Títulos/descripciones = copy nuevo → `CONTENT_CHECKLIST`. Respeta D017 (nunca se
   des-desbloquea) y D026 (siembra silenciosa tras hidratar) — no toques ese motor.
2. Skill **`a11y`** sobre: selector de juego, tablero (rush y cloze), modales de
   rendirse, ranking con selector. Objetivo axe-core limpio en claro y oscuro +
   checklist manual (teclado completo sin ratón, lector de pantalla anuncia cada país
   encontrado, foco nunca se pierde tras un vuelo).
3. `bunx astro check`, `bun run build`, `bunx biome check ./src`.
4. `bun run test:e2e` (con el server que levante el dueño). Si aparecen fallos nuevos
   en los flujos de Banderas por el selector nuevo (p. ej. un test que asume la
   pantalla inicial de Banderas), **repórtalos**; ajusta el test solo si el cambio de
   comportamiento es intencional (D030: el usuario nuevo arranca en Países) y dilo
   explícitamente.
5. Subagentes `design-qa` y `functional-qa` sobre el flujo completo de Países. Si no
   pueden ejecutar Playwright, su reporte es revisión de código: márcalo como
   **no verificado en navegador**.
6. Documentación:
   - `context/decisions/07-modo-paises.md`: D028–D038 completas (contexto, decisión,
     alternativas, consecuencias).
   - `DECISIONS_INDEX.md`, `CURRENT_PHASE.md` (qué quedó verificado / qué no),
     `GIT_STATE.md`, `COMPONENTS_INVENTORY.md` (componentes nuevos),
     `CONTENT_CHECKLIST.md` (copy nuevo, mapa futuro, alias de nombres).
   - Nota en `docs/state-management.md` sobre `countriesGame` y la vista de juego.

**PAUSA FINAL.** Reporte al dueño con: lista de commits, qué se verificó en navegador
y qué no, acción manual de Supabase pendiente, y la pregunta explícita de si se
mergea o se queda como experimental. **No mergees ni hagas push por tu cuenta.**

---

## 5. Fuera de alcance (anotar en `CURRENT_PHASE.md`, no implementar)

- **Alias de nombres** ("EE. UU.", "Congo", "Birmania", "Holanda", "Chequia"…).
  Requiere `aliases?: string[]` en `Country` y decidir cuáles se aceptan — decisión de
  contenido del dueño.
- **Mapa / silueta** como tarjeta alternativa de práctica (D034).
- **Consejo "aprende primero los países"** en Banderas cuando el continente no está
  aprendido en Países.
- **Rankings por continente** (el esquema ya lo soporta con scope `"countries:europe"`).
- Extraer `useCardCountdown` y usarlo también en `Session.tsx`.
- Logros adicionales de Países por continente.

## 6. Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| Deploy sin correr `countries-game.sql` → usuarios autenticados caen a local | Acción manual bloqueante en `CURRENT_PHASE.md` (Fase 1) |
| SW cachea un bundle viejo que no conoce `countriesGame` y en el push lo borra | El cliente viejo hace `upsert` sin la columna → Postgres **conserva** el valor existente (no se envía la clave). Verifícalo leyendo `pushLearningData`: solo manda las columnas que enumera. Anótalo en D028 |
| Vuelo desincronizado si el tablero hace scroll suave mientras vuela | Scroll instantáneo antes de medir (Fase 3, paso 4.1) |
| Auto-aceptación cortando nombres compuestos | Regla de prefijo ambiguo + 700 ms / Enter (D031) |
| Tecleo lento con 196 slots | `findMatch` sobre un `Map` normalizado precalculado (`useMemo` no hace falta con React Compiler, pero sí precalcular fuera del render por tecla); slots sin estado propio |
| `JSON.stringify` distinto por orden de claves → push extra en cada login | Aserción específica en Fase 1, paso 9 |
