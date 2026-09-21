# 08 — Puntuación de la tarjeta "Todo el mundo"

> Fix acotado, rama `fix/puntuacion-todo-el-mundo`. Verificado con
> `bunx astro check` / `bunx biome check ./src` / `bun run build` y con
> aserciones puras sobre `calculateWorldAverage` (script temporal, no
> committeado — ver el detalle en D039). No hay entorno de tests unitarios en
> el repo (solo Playwright `e2e/`); no se añadió infraestructura nueva para
> esto.

## Síntoma y causa

En modo práctica, cada tarjeta de continente muestra su nota (`X/10`) pero
"Todo el mundo" no mostraba nada: `RegionSelector.tsx` le pasaba `score={null}`
a mano. La causa de fondo es que no existe (ni existió nunca) una nota de
mundo persistida: `useGame.ts` recorre `result.regionBreakdown` y llama a
`registerRegionGame` una vez **por continente**, así que una sesión de mundo
reparte sus notas entre los 8 continentes tocados, nunca en una clave `world`.
`RegionGameScores` está tipado sobre `Region` (sin `"world"`); solo
`RegionBestTimes` usa `PracticeRegion` (con `"world"`), y eso es precedente
de otra cosa — el mejor tiempo del rush de mundo sí es un dato propio de esa
sesión, no derivado.

## D039 — Nota derivada, no persistida

Se calcula la nota de mundo a partir de las notas de continente que ya
existen: media de las 8 (`calculateRegionAverage` por continente) **ponderada
por el número de países de cada continente** (`REGION_COUNTRY_COUNTS` de
`region-stats.ts`), no una media simple — así un continente de 33 países pesa
más que uno de 3. Nueva función pura `calculateWorldAverage` en
`learning-storage.ts`, junto a `calculateRegionAverage`.

Alternativa descartada: **persistir una nota de mundo real**, ampliando
`RegionGameScores` a `PracticeRegion` y guardando una entrada `world` cuando
la sesión cubra el mundo entero (`useGame.ts` tendría que además llamar a
`registerRegionGame("world", …)`). Se descartó porque:

- No aporta nada que la derivada no dé ya — la nota de mundo siempre puede
  reconstruirse a partir de los continentes, así que guardar el dato dos veces
  es una fuente de desincronización, no una ventaja.
- **Rompe un invariante ya verificado (D019/D017):** `perfectSessions` cuenta
  cuántos `10` hay en todo `regionGameScores` (`learning-storage.ts` ~L179,
  `achievements.ts` ~L379: la evidencia de una sesión sin fallos ES un 10 ahí
  guardado). Una entrada `world` sumaría un segundo `10` por cada sesión de
  mundo perfecta — inflando el contador para partidas en curso Y para la
  siembra retroactiva de `seedStats` sobre datos ya guardados, con riesgo de
  desbloquear de más el logro que cuenta sesiones impecables. Habría que
  excluir `world` explícitamente en `seedStats`, en el conteo de
  `perfectSessions` y comprobar `mergeLearningData` — tres sitios más para
  mantener sincronizados, por un dato que ya se puede derivar sin tocar
  persistencia.
- Requeriría cambiar el tipo compartido `RegionGameScores` (usado en
  `UserLearningData` y en `GameProgress`, es decir en los dos juegos por
  D029) y una regla de exclusión nueva, todo para un dato redundante.

La vía derivada no toca persistencia, funciona retroactivamente con el
progreso que cualquier usuario ya tiene guardado (no hace falta que vuelva a
jugar nada) y no necesita migración de Supabase.

## Nota solo con cobertura completa

`calculateWorldAverage` devuelve `null` — la tarjeta no muestra nota — hasta
que el usuario tiene nota en **los 8 continentes**. Se descartó mostrar una
media parcial (solo de los continentes ya practicados): al lado de las
tarjetas de continente, que siempre reflejan el 100% de su propio alcance, una
nota de mundo basada en 2 de 8 continentes sería engañosa sin decir "parcial"
en algún lado — y no hay sitio en la tarjeta para esa aclaración sin invadir
el patrón visual ya cerrado (D013/D038). Cuando falta cobertura, la tarjeta se
comporta igual que hoy: sin nota, como un continente nunca practicado.

## Copy del tooltip

El tooltip de nota de cada continente dice "Promedio de tus últimas 3
partidas" (cierto: `MAX_REGION_GAMES = 3`). Para "Todo el mundo" ese texto ya
no es exacto — no hay partidas de mundo detrás, hay continentes. Se añadió
`scoreTooltipLabel` opcional a `RegionOption` (por defecto el texto de
siempre) y la tarjeta de mundo pasa **"Media de tus continentes, ponderada por
número de países"**. Es microcopy funcional del mismo tipo que el tooltip
existente (no contenido final marcado como pendiente en
`CONTENT_CHECKLIST.md`): describe el mecanismo, no un dato inventado.
