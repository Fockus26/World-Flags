# 16 — Modo de juego "Capitales"

> Tercer tipo de juego: se muestra un país y se escribe su capital. Plan
> completo (local): `context/plans/modo-capitales.md`, aprobado por el dueño el
> 2026-09-22, que decidió entregarlo en dos PR. Este archivo crece con cada
> uno: el primero (`refactor/progreso-por-juego`) solo trae D061; las demás
> decisiones del modo (D062-D070) llegan con `feat/modo-capitales`.

## D061 — Un registro de juegos en vez de ramas por juego

### El problema

Hasta ahora había dos juegos y el código los distinguía con ramas sueltas:
`toGameView`/`fromGameView` copiaban `countriesGame` a mano, `normalize` y
`merge` nombraban `countriesGame` en su sitio, `hasLearningProgress` sumaba
los dos a mano, los logros tenían dos funciones gemelas de conteo por
continente, `GameEffects` tenía dos efectos de ranking casi iguales, y
`Configuration`, `Results` y `LeaderboardModal` elegían texto o scope con
ternarios `gameType === "countries" ? … : …`. Con un tercer juego, cada una es
un sitio donde olvidarse de él, y varios olvidos fallan en silencio. El más
grave: si `hasLearningProgress` no contara el juego nuevo, una cuenta que solo
jugó ese juego pasaría por "sin progreso" y **el invitado que entra en ella la
pisaría entera** (D056).

### La decisión

**El almacenamiento no cambia** (D028): Banderas sigue en el primer nivel de
`UserLearningData` y cada juego posterior en su sub-objeto, con su columna en
Supabase. **El código deja de saberlo por partes**:

- `learning-storage.ts` tiene el registro, `SUB_GAME_KEYS` (juego → clave de
  su sub-objeto; su tipo, `SubGameKey`, sale solo de las claves de
  `UserLearningData` que son `GameProgress`), y `getGameProgress` /
  `setGameProgress` (este, privado). `toGameView`/`fromGameView` se apoyan en
  ellos (misma semántica, incluido el segundo guardado de D029);
  `normalizeLearningData` y `mergeLearningData` construyen los sub-objetos
  recorriendo `SUB_GAME_TYPES`, en el orden de `GAME_TYPES`, en la misma
  posición de siempre; `hasLearningProgress` recorre `GAME_TYPES`. Banderas se
  fusiona ahora con la misma `mergeGameProgress` que los demás (antes esa
  lógica estaba duplicada en línea).
- `cloud-storage.ts` tiene `SUB_GAME_COLUMNS` (juego → columna) para el mapeo
  de la fila y el `upsert`. El `select` sigue siendo texto literal
  (supabase-js deduce de él el tipo de la fila) y **no compila** si le falta
  la columna de algún juego del registro. Olvidarla no fallaría en ningún
  test: la nube devolvería el juego siempre vacío.
- Lo visible por juego sale de mapas `Record<GameType, …>` en
  `types/country.ts` (`GAME_TYPE_TITLES`, `GAME_TYPE_NOUNS`,
  `LEADERBOARD_SCOPES`) y en `LeaderboardModal` (descripciones). El scope de
  Banderas sigue siendo `"world"` a secas: cambiarlo reiniciaría su ranking.
- Logros: `countLearnedInRegions(data, gameType, regions)` sustituye a las dos
  gemelas. `GameEffects`: un solo efecto de ranking que recorre los juegos,
  con la última marca subida de cada uno.
- Añadir un juego es añadir su clave al registro y su columna al mapa de
  columnas (y al `select`, que lo exige). `Record` hace que TypeScript no deje
  olvidar ninguno de los mapas.

Quedan, a propósito, comparaciones con un juego concreto donde el significado
es de ese juego: los filtros de logros por juego (D036), el enrutado de
`FlagGame` y la tarjeta de `DailyPractice` (se generalizan en el PR de
Capitales), y `migrateConfiguration` (`?? "flags"`, D030).

### Alternativas descartadas

- **Migrar todo a una columna `games jsonb`** (`{ flags, countries, … }`):
  migración de filas en producción, y un cliente viejo con el SW en caché
  seguiría escribiendo `country_history`/`countries_game` (mismo motivo que
  D021 y D028).
- **Una columna genérica para el tercer juego y los siguientes**: se ahorraría
  la migración de los futuros, pero añade una tercera forma de guardar y
  obliga a conservar juegos desconocidos al fusionar. El beneficio es
  especulativo; una columna por juego es explícita y ya está probada.

### Verificación

- Equivalencia con la versión anterior (script temporal en el scratchpad, no
  committeado): 3.000 conjuntos de datos aleatorios, incluidos códigos fuera
  del catálogo, filas viejas con `{}` o sin sub-objeto, sin fechas y con ids
  de logro desconocidos. `normalize`, `merge` (y `merge` repetido), `planSync`,
  `hasLearningProgress`, `toGameView` y `fromGameView`, y lo que cada uno deja
  escrito en `localStorage`, comparados con `JSON.stringify` (así también el
  orden de las claves): 33.000 comparaciones, 0 diferencias.
- `bun run test`: 60 (los 55 de antes sin tocarlos + 5 del registro: cada
  juego se lee de su sitio, ida y vuelta por su vista, escribir en un juego no
  toca los demás, mismo orden de claves en `normalize` y `merge`, y D056 con
  progreso en un solo juego). Con `hasLearningProgress` roto a propósito para
  que ignore los sub-objetos, falla el último.
- El guardián del `select`: quitando `countries_game` del texto,
  `bunx astro check` da error.
- `bunx astro check` 0 errores, `bunx biome check ./src` limpio,
  `bun run build` verde. Sin cambio visible: sin versión ni changelog (D060).

## D062 — Un juego que este cliente no conoce, y los clientes viejos

Con Capitales, `lastConfiguration.gameType` puede valer `"capitals"`, y por la
nube eso llega también a clientes que no lo conocen.

### Desde esta versión

`migrateConfiguration` **conserva** un `gameType` desconocido (pisarlo al
normalizar lo subiría a la nube y le cambiaría el juego al dispositivo que lo
eligió) y se **resuelve al leerlo** con `resolveGameType` (`types/country.ts`)
en el único sitio que lee el juego de la configuración, `Configuration.tsx`;
todo lo demás (partida, práctica diaria, ranking) recibe el juego ya resuelto.
Un juego desconocido cae en el de usuario nuevo (Países, D030). Es el patrón
de D040 con los códigos de país: se conserva al guardar, se filtra al leer.
`SessionRecord.gameType` puede traer también un juego desconocido: los logros
lo comparan (`=== "flags"`, D036), nunca lo usan para indexar.

### Los clientes de hoy (sin esta guarda)

Una pestaña o PWA abierta desde antes de desplegar Capitales, con
`gameType: "capitals"` recibido por la nube: el selector sin opción marcada,
el título de Banderas, y `toGameView(…, "capitals")` cae en la rama de Países
de la versión anterior. Su "Práctica diaria" enseñaría banderas y calificaría
el SRS de **Países**. No pierde datos, pero los falsea. Solo pasa con dos
dispositivos y uno sin actualizar; al recargar con red se carga la versión
nueva y se arregla. **Mitigación (Fase 7, aprobada por el dueño):** cambiar
los bytes de `public/sw.js` sin subir `CACHE_NAME`, para que esas pestañas
vean "Actualizar" (D047/D050) sin volver a descargar las 197 banderas (D054).

### Supabase

Columna nueva `capitals_game jsonb not null default '{}'::jsonb`
(`supabase/capitals-game.sql`, local). **Hay que correrla antes de desplegar**:
si el `select` pide una columna que no existe, falla con error de servidor y
toda cuenta autenticada se queda en `local` con "No se pudo sincronizar"
(D044/D050). Los clientes viejos no la piden y, al subir, enumeran sus
columnas: no la pisan (D028). El ranking usa `capitals:world` en
`leaderboard_entries`, sin migración.

### Verificación

`bun run test`: 65. Los datos compartidos de todos los escenarios existentes
(offline, dos dispositivos, invitado, idempotencia, diez recargas) llevan
ahora progreso de Capitales; nuevos: fila vieja sin la columna, posición de la
clave, fusión sin mezclar juegos, juego desconocido conservado y resuelto. El
de D056 con progreso en un solo juego ya recorre los tres. En el build, el
`select` y el mapa de columnas llevan `capitals_game`.
