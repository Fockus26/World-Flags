# Ranking con la regla nueva — castigo, ranking limpio, top 20, avatares

> Unidad `feat/ranking-nueva-regla` (2.0.0). Del dueño: el castigo nuevo
> (**+10 s por fallo, +20 s por saltar**), que el ranking arranque vacío
> *"sin segunda temporada ni nada por el estilo"*, el top 20, los avatares
> (migración autorizada) y el skeleton. El resto de decisiones son del
> agente, justificadas aquí.

---

## D075 — Castigo del competitivo: +10 s por fallo, +20 s por saltar

`RUSH_WRONG_PENALTY_MS = 10_000` y `RUSH_SKIP_PENALTY_MS = 20_000` salen de
`Session.tsx` a `types/country.ts`, junto a las claves que dependen de ellas
(D076): quien cambie la regla las ve juntas. Aplica a Banderas y Capitales, los
dos juegos que usan `Session`.

**Países no cambia.** Su rush (`CountriesRush`) no tiene castigo: se completa o
se rinde (D033). No se inventa uno; su ranking y sus tiempos no se tocan.

**Se dice al jugador.** Al fallar o saltar en competitivo, el aviso de fallo
lleva una línea "+10 s al cronómetro" / "+20 s al cronómetro" (dentro del
aviso, para que se anuncie con él; `AnswerForm.penaltyLabel`). El cronómetro
está congelado durante la transición (900 ms), así que el salto del número
solo se ve al avanzar: sin la línea, el castigo pasaba desapercibido. La ayuda
de "Modo de juego" (`GameTab`) y el paso "Modo de juego" de la partida guiada
dicen la regla, con el texto generado desde las constantes
(`utils/rush-penalty.ts`). Copy provisional (`CONTENT_CHECKLIST.md` #26).

**Logros.** Ninguno depende del castigo salvo `vuelta_rapida` (mundo en menos
de 15 min, umbral ya marcado "a confirmar"): con la regla nueva cuesta más.
No se toca el umbral; ver D076 para cómo se lee.

## D076 — Ranking limpio: la versión de la regla va en la clave

El dueño quiere que el ranking de Banderas y Capitales empiece vacío, sin que
nadie vea "temporadas". Tres trampas, cerradas así:

**1. Clientes viejos en caché del SW.** Siguen subiendo su mejor tiempo en cada
carga (`pushedWorldBestRef` se reinicia). Por eso los scopes cambian:
`LEADERBOARD_SCOPES` pasa a `flags:world@2` y `capitals:world@2`
(`countries:world` se queda). Los clientes viejos escriben en `world` y
`capitals:world`, que ya nadie lee. El nombre del scope no se ve en ningún sitio.

**2. El mejor tiempo guardado del propio usuario.** Si el cliente nuevo leyera
`regionBestTimes.world`, subiría al ranking nuevo tiempos de la regla vieja, y
el merge por el menor (`mergeRegionBestTimes`) lo resucitaría desde la nube,
otro dispositivo, la base o un invitado. La marca de versión va **en la clave**:
el mejor tiempo del mundo con la regla 2 se guarda en `regionBestTimes["world@2"]`
(`WORLD_BEST_TIME_KEYS`: Banderas y Capitales → `world@2`, Países → `world`).

Descartado: un campo de versión aparte (`bestTimesRule: 2`) que la migración
mirara para borrar `world`. Un cliente viejo lo rompe de dos maneras, las dos
reales:

- En Países y Capitales, `migrateGameProgress` reconstruye el sub-objeto con
  solo las claves que conoce: el campo desaparece en su siguiente subida, y el
  cliente nuevo tiraría la marca buena que ya tenía.
- En Banderas iría en otra columna, que el cliente viejo no manda; pero sí
  manda `region_best_times` con `world = min(su marca vieja, la de la nube)`.
  La columna seguiría diciendo "regla 2" con un tiempo de la regla 1 dentro.

Con la clave, un cliente viejo no puede mezclar reglas: solo escribe en `world`,
y `world@2` lo conserva tal cual al normalizar (`?? {}` deja pasar claves) y al
fusionar (parte de `{ ...remote }` y compara clave a clave). La fusión nueva es
la misma función: clave a clave, así que nada pasa de `world` a `world@2`. No
hace falta migración ni columna nueva, y la idempotencia no cambia. Todo está
cubierto en `tests/unit/rush-rule.test.ts`, incluida una copia literal del
merge de la 1.2.0 para simular el dispositivo sin actualizar.

**3. Alcance.** Solo se invalida lo que alimenta el ranking: el mundo de
Banderas y Capitales. Los mejores tiempos por continente se conservan (siguen
en su clave y se mezclan reglas: ahí no hay ranking). Alternativa: invalidarlos
también, con claves `europe@2`…; costaría más claves y el jugador perdería
marcas que no compiten con nadie.

El `world` viejo **no se borra** de los datos: el cliente nuevo simplemente no
lo lee (ni lo muestra, ni lo sube). Borrarlo no serviría (un cliente viejo lo
repondría con el merge por el menor) y provocaría subidas de ida y vuelta.
Solo lo leen los logros de "completa el rush de Todo el mundo" y
`vuelta_rapida` (`getAnyRuleWorldBestTime`): se ganaron con la regla de
entonces y son retroactivos (D070).

**Filas viejas del ranking.** No se borran desde el cliente. El SQL de limpieza
(`supabase/leaderboard-limpieza-regla-2.sql`, local) borra los scopes `world` y
`capitals:world`; se corre **después** de desplegar, y se puede repetir.

**Versión: MAJOR (2.0.0).** D060 pone "un reinicio del ranking" como ejemplo
literal de MAJOR, y además el mejor tiempo de "Todo el mundo" guardado deja de
contar.

## D077 — Top 20 con skeleton de filas

`TOP_COUNT` 5 → 20; la fila propia sigue debajo de un separador si estás fuera
(ahora es una lista con `start` = tu puesto). El modal se ensancha a
`min(30rem, 92vw)` para el avatar; con 20 filas hace scroll dentro del propio
diálogo (`ui/Modal`, 90dvh). La cabecera y el selector se quedan arriba, en el
flujo: fijarlos (`sticky`) exigía casar el relleno del diálogo de HeroUI con
valores sueltos.

"Cargando…" pasa a 5 filas skeleton con la forma de las reales (puesto,
avatar redondo, nombre, tiempo), hechas con `ui/Skeleton` y texto de referencia
invisible: mismo alto por fila, así que al llegar los datos no se mueve nada de
lo que ya estaba (cuántas filas llegarán no se sabe; cinco es el alto del
ranking de antes). La lista va con `aria-busy` mientras carga y un
`LoadingAnnouncer` fuera de ella dice "Cargando el ranking…" / "Ranking
cargado." solo si el skeleton llegó a verse (umbral de 300 ms, D042).

Tu fila ya no se distingue solo por el color: lleva "(tú)" (copy provisional,
`CONTENT_CHECKLIST.md` #27).

## D078 — Avatares en el ranking

Columnas nuevas `avatar_style text` y `avatar_seed text`, **nullable**, en
`leaderboard_entries` (aplicadas en producción el 2026-09-23 23:09 UTC vía MCP,
autorizado por el dueño; SQL en `supabase/leaderboard-avatares.sql`). Las
políticas RLS de insert/update propias no filtran columnas y los grants de tabla
cubren las nuevas (comprobado). `fetchLeaderboard` las pide, `upsertLeaderboardEntry`
las manda; un cliente viejo no las manda y el upsert de PostgREST solo actualiza
las columnas enviadas, así que no las borra.

Una fila sin avatar (vieja, o con un estilo que este cliente no conoce) pinta la
inicial del nombre, como `UserSummary`. El avatar con respaldo sale de
`UserSummary` a `configuration/UserAvatar.tsx` (misma apariencia: la caja y la
tipografía de la inicial las pone quien lo usa). Avatares de 32 px,
`loading="lazy"`, decorativos (`alt=""`: el nombre va al lado). Sin conexión,
la caché HTTP o la inicial (D052).

## D079 — Un cambio de perfil actualiza las filas del ranking

Antes la fila solo se reescribía al batir la marca. Ahora `GameEffects`, una vez
por carga y con cada cambio de nombre o avatar, llama a `syncLeaderboardProfile`:
lee las filas del usuario y, si alguna difiere, actualiza `display_name`,
`avatar_style` y `avatar_seed` de todas (sin tocar `best_time_ms`). Una vez por
carga para que también se pongan al día las filas subidas sin avatar, y un
cambio hecho sin red en una sesión anterior. Mejor esfuerzo: si falla, se
reintenta tras la siguiente sincronización buena, como la marca (D050).
