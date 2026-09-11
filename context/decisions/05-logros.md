# 05 — Sistema de logros

> Unidad `feat/achievements`. Cubre D016–D023.

## Por qué

`TODO.md` §2 tenía reservado el sistema de logros y no había nada de código. El
objetivo del proyecto es la **retención** (`PROJECT_CONTEXT.md`) y lo único que
reforzaba ese bucle era el ranking competitivo, que solo aplica a quien juega
rush de "Todo el mundo".

El problema no era de UI sino de datos: todo lo que ocurría dentro de una sesión
(aciertos, fallos, skips, tiempo, y sobre todo **qué días se practicó**) se
descartaba al terminar. Sin eso no hay logros de hábito.

---

## D016 — Motor híbrido: hechos imperativos, desbloqueo declarativo

La recolección de hechos (`stats`, `sessionHistory`) es **imperativa**, porque no
se puede derivar de nada. La **detección** de desbloqueo es **declarativa**: un
catálogo de predicados puros sobre `UserLearningData`
(`src/utils/achievements.ts`) que un único efecto
(`src/components/app/AchievementsEffects.tsx`) re-evalúa.

Alternativa descartada: emitir eventos desde `finishGame`, `gradeCountryReview`,
`attemptCountry`… Un desbloqueo puede venir de cualquiera de esas rutas (y de los
modos de juego de `TODO.md` §3, que aún no existen); con un solo observador no
hay forma de olvidarse de una.

Efecto secundario buscado: **los logros derivables son retroactivos**. Un usuario
con 120 países aprendidos los desbloquea en cuanto abre la app.

## D017 — Invariante: un logro nunca se des-desbloquea

`evaluate` es monótono y una entrada sellada no se reescribe. Sostiene dos cosas:

1. **Corrección.** `MAX_REGION_GAMES = 3`: `regionGameScores` solo guarda los tres
   últimos puntajes por continente, así que "sacaste un 10" es evidencia que
   **caduca a las tres partidas**. Sin sellado, el usuario perdería el logro por
   seguir practicando.
2. **Terminación.** El efecto escribe en `learningData`, que es lo que lo dispara.
   Corta con la regla **"sin delta, no se despacha"**: en la segunda pasada no hay
   ids nuevos y no se despacha nada.

Esa misma regla es lo que mantiene vivo el push a Supabase. El efecto de push de
`GameEffects.tsx` cancela y reprograma su timeout con cada cambio de
`learningData`; un despacho incondicional lo empujaría hacia adelante para
siempre y **no subiría nunca**. Ese, y no un push duplicado, era el fallo a
evitar.

Los logros meta ("desbloquea 10 logros") leen el propio conjunto de
desbloqueados, así que el punto fijo se resuelve **dentro** de
`getNewlyUnlocked` con un bucle acotado al tamaño del catálogo, y todo se sella
en un único `dispatch`.

## D018 — La racha se deriva de `activeDays`, no se guarda como contador

`stats.activeDays` es un array de fechas locales (`YYYY-MM-DD`);
`getCurrentStreak` y `getLongestStreak` son funciones puras.

Un contador `currentStreak` **no es fusionable**: un "3" en el móvil y un "3" en
el escritorio pueden ser los mismos tres días o seis distintos, y ni `max` ni la
suma serían correctos. Un conjunto de fechas se une exacto. Además, un
`currentStreak: 5` guardado miente si el último día activo fue hace cuatro días.

**El día activo se marca al calificar/responder** (dentro de `attemptCountry` y
`gradeCountryReview`), no al terminar la sesión: quien responde veinte banderas y
abandona practicó ese día igual, y así la racha funciona también en la práctica
diaria, que no pasa por `finishGame`.

## D019 — Siembra retroactiva que solo puede sub-contar

En la migración (`stats` ausente **o** `{}`, que es como llega el default
`'{}'::jsonb` de una columna nueva) se siembra:

- `activeDays` ← fechas de `lastPracticeByCountry` ∪ `review.lastReviewedAt`
  convertido con `getLocalDateString(new Date(iso))` — **nunca** `.slice(0,10)`,
  que metería el desfase UTC que ya arrastra `isDue`.
- `perfectSessions` ← número de dieces en `regionGameScores` (un 10 *es* la
  evidencia de una sesión sin fallos).

Ambas fuentes guardan **una sola fecha por país**, así que el conjunto sale ralo:
quien practicó sesenta días seguidos los mismos veinte países verá unos veinte
días sueltos. Son **falsos negativos, jamás falsos positivos** — una racha
histórica se subestima y "Un mes sin fallar" casi nunca se desbloqueará
retroactivamente. Por eso es seguro.

No sembrables (arrancan en 0): `totalSessions`, `totalAnswers`, `totalCorrect`,
`totalSkips`, `totalTimePlayedMs`.

## D020 — `mergeLearningData` sustituye a `mergePracticeState`

Antes se fusionaban dos campos sueltos y `syncOnLogin` los comparaba **uno a uno**
con `JSON.stringify` para decidir si re-subir. Añadir un campo obligaba a tocar
tres sitios, y **olvidar el tercero fallaba en silencio**: el merge se quedaba en
el dispositivo y se perdía en el siguiente.

Ahora se fusiona el objeto entero y se compara entero. El orden de claves de
`mergeLearningData` replica el de `normalizeLearningData` a propósito, para que
la comparación no dé siempre distinto.

| Campo | Regla |
|---|---|
| `profile`, `countryHistory`, `regionGameScores`, `lastConfiguration` | gana lo remoto (sin cambios) |
| `regionBestTimes` | menor tiempo |
| `lastPracticeByCountry` | fecha más reciente por país |
| `achievements` | unión por id; `unlockedAt` **el más antiguo**; `seenAt` gana el no-null |
| `stats.activeDays` | unión de conjuntos |
| `stats.*` contadores | `max(remoto, local, derivado del historial fusionado)` |
| `sessionHistory` | concat → dedup por id → orden desc → tope |

**Sumar contadores está prohibido.** `syncOnLogin` corre en cada hidratación
autenticada (o sea, en cada recarga) y `local` ya contiene lo que se subió la vez
anterior: sumar duplicaría sin techo. `max` es monótono e idempotente pero
sub-cuenta si dos dispositivos jugaron sin conexión a la vez; de ahí el tercer
candidato, derivado del historial ya fusionado, que recupera justo ese caso.
Hay prueba de idempotencia: `merge(merge(r,l),l) === merge(r,l)`.

`hasLearningProgress` también mira ahora logros e historial: si no, una cuenta
cuyo progreso fuera solo logros se consideraría vacía y `syncOnLogin` la pisaría.

## D021 — Ids de logro tipados como `string` en lo persistido

`achievements` es `Record<string, AchievementUnlock>`, no
`Record<AchievementId, …>`. El service worker cachea agresivo, así que un cliente
viejo puede leer una fila con logros de una versión más nueva; si el normalizador
filtrara por los ids conocidos, los **borraría** en el siguiente push — y con
merge por unión, borrar es irreversible. Se estrecha a `AchievementId` solo al
buscar en el catálogo.

## D022 — `SessionRecord` guarda la etiqueta del alcance, no el `PracticeScope`

Un scope custom con 60 códigos pesa ~620 B por registro frente a ~260 B con
`scopeLabel` + `scopeKey`, y no aporta nada que esos dos no cubran.

**Tope de 25 sesiones** (~6,5 KB). `pushLearningData` sube la fila entera en cada
cambio y la fila ya ronda los 33 KB. Los logros que miran sesiones concretas solo
necesitan las últimas; los agregados viven en `stats`. Regla de orden: **primero
acumular contadores, después truncar** (al revés, lo que se sale del tope no
llegaría a contarse).

## D023 — Abandonar la práctica diaria deja de ser lo mismo que completarla

`DailyPractice` tenía un único `onFinish` para el fin de cola **y** para el botón
de abandonar del `ConfirmationModal`. Enganchar ahí el registro habría contado
cada abandono como sesión completada e inflado los logros. Ahora son
`onComplete(summary)` y `onAbandon()`.

Criterio de acierto en práctica diaria: cuentan `good`/`easy`/`hard`, falla solo
`again` — coherente con `calculateNextReview`, que reinicia las repeticiones
únicamente en `again`.

---

## Copy

Nombres, descripciones y umbrales del catálogo son **provisionales**, pendientes
de aprobación del dueño. Fila #7 en `CONTENT_CHECKLIST.md`.
