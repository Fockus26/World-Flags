# 12 — Sincronización fallida: sin subida, con reintentos y con tope

> Fix, rama `fix/sync-fallida-sin-subida`. Hallazgo reportado en PR #8
> (`feat/skeleton-carga`) y reproducido allí con un mock de Supabase que
> devolvía 500 en el GET: justo después llegaba un POST a
> `/rest/v1/user_learning_data`. Alcance y regla de SRS elegidos por el dueño
> entre tres opciones cada uno (2026-09-21).

## El problema

`GameEffects` hidrata una cuenta con `syncOnLogin` (GET de la fila → merge →
push si hace falta). Si eso lanzaba (red caída, 500, JWT roto…), el `catch`
cargaba `getLearningData()` (`localStorage`), fijaba `hydratedUserRef` y
marcaba `hydrationStatus = "ready"`. `ready` habilita el push debounced
(800 ms), que hace **upsert de la fila entera**. Lo que había en
`localStorage` pasaba a ser la cuenta:

- **Copia vieja** si se jugó en otro dispositivo: se perdía todo lo de allí,
  logros incluidos. En la nube, un logro se "des-desbloqueaba" (rompe D017).
- **Copia vacía** tras un logout, que ejecuta `clearLearningData()`. Si se
  volvía a entrar con mala red, se subía `DEFAULT_DATA` (o lo que hubiera
  jugado el invitado entre medias) y **se borraba la cuenta**.
- **Ranking:** con `ready`, `upsertLeaderboardEntry` sustituía la marca
  pública por el mejor tiempo local, aunque fuera peor.

Además, `syncOnLogin` no tenía tope: con una red que se cuelga sin fallar
(portal cautivo, túnel), la hidratación se quedaba en `loading` hasta que el
navegador abandonaba el `fetch` (minutos).

## D044 — Una sincronización fallida deja la app en `local`, nunca en `ready`

- El `catch` marca `hydrationStatus = "local"`: se juega sobre `localStorage`,
  pero push, ranking, logros y recordatorio siguen bloqueados (todos comparan
  contra `"ready"`). `hydratedUserRef` **no** se fija: la cuenta sigue sin
  hidratar.
- `local` es el mismo valor, con el mismo significado, que introduce PR #8
  para el fallback de 2,5 s de Supabase Auth (datos de `localStorage` sin
  contrastar con la nube, push bloqueado). Si ese PR entra antes, el
  conflicto en `gameSlice.ts` es solo el comentario del tipo.
- **Reintentos:** a los 5 s, 15 s, 30 s y después cada 60 s mientras siga
  fallando. Además, uno inmediato con el evento `online` y con cualquier
  evento de Supabase Auth (el efecto se re-ejecuta porque `user` cambia de
  identidad, p. ej. al refrescar el token). No hay tope de intentos: cada uno
  es un GET pequeño, y rendirse dejaría la sesión entera sin guardar.
- **Reintento ≠ primer intento** (`failedSyncRef`, que sobrevive a las
  re-ejecuciones del efecto): no vuelve a `loading` ni reemplaza los datos con
  los que ya se está jugando. Se limpia al tener éxito o al pasar a invitado.
- **Al recuperarse**, el resultado reemplaza los datos en el sitio (el
  progreso de la nube "aparece"). Lo jugado mientras la sincronización estaba
  en vuelo ya está en `localStorage` pero no en el resultado; si lo local
  cambió durante el vuelo, se vuelve a pasar por `mergeLearningData` en vez
  de reemplazar sin más. Luego se aplica D046. Con `ready`, el push normal
  sube el resultado final.
- La limpieza del efecto (logout, otro usuario) **aborta** la sincronización
  en vuelo (`AbortController`): antes solo ignoraba la respuesta, y la
  petición seguía y podía subir datos.

**Visible:** mientras dura `local` no salen snackbars de logro ni el del
recordatorio diario. Los logros ganados en ese rato se sellan **en silencio**
al recuperarse, porque es la primera evaluación tras hidratar (D026). No hay
aviso de "sin conexión": sería copy nuevo y queda como posible siguiente
unidad.

Alternativas que el dueño descartó: **mínimo** (`local` + tope, sin
reintentos: la sesión entera sin guardar, y más revisiones que se pierden al
fusionar) y **solo bloquear el push** (sin tope ni reintentos).

## D045 — `syncOnLogin` se rinde a los 10 s

- `SYNC_TIMEOUT_MS = 10_000` en `cloud-storage.ts`. El GET normal tarda menos
  de un segundo. 10 s cubren una red lenta y los reintentos propios de
  postgrest-js 2.112 ante un error de red (GET: 3 reintentos a 1 s, 2 s y
  4 s; un 500 no se reintenta).
- Un `AbortController` interno se aborta por tope o por la señal del llamante
  (limpieza del efecto). El GET y el push llevan `.abortSignal()`.
- **`Promise.race` además del abort:** `fetchWithAuth` de supabase-js espera
  al token de sesión *antes* del `fetch`, y esa espera no la corta ninguna
  señal. Sin la carrera, un cuelgue ahí (el lock de Auth) dejaría la promesa
  pendiente para siempre. Con ella se rechaza a tiempo, y cuando ese `fetch`
  por fin salga lo hará ya abortado, así que no llega a enviarse.
- Un tope que salta con el push de `syncOnLogin` ya en vuelo puede dejar
  subido el merge (o no). Da igual: ese merge nunca pierde datos de la nube.
- `fetchRemoteLearningData`/`pushLearningData` no registran error cuando la
  petición se abortó a propósito (evita ruido al cancelar). El tope sí se
  registra, en el `console.error` de `GameEffects`.

## D046 — Al recuperarse, las revisiones del rato `local` ganan por país

`mergeLearningData` da la razón a la nube en `countryHistory` (D020). Sin más,
las revisiones SRS hechas en `local` se perderían al recuperarse la
sincronización. Hoy a quien usa un solo dispositivo eso no le pasa: el push
"accidental" subía su copia, que coincidía con la nube.

- `applyReviewsSince(base, local, since)` (`learning-storage.ts`, pura): cada
  entrada de `local` con `lastReviewedAt >= since` pisa a la de `base`, país
  por país y en los dos juegos (Banderas y `countriesGame`). Usa
  `pickMoreRecentReview`, así que si la nube tiene una revisión aún más
  reciente de ese país (otro dispositivo, con la nube funcionando), gana esa.
  Devuelve `base` tal cual si no cambia nada.
- `since` = inicio del **primer** intento de sincronizar de esa cuenta: todo
  lo revisado desde entonces lo hizo ella. Los datos de partida (invitado, o
  la copia vieja de este dispositivo) son de antes y no ganan nada.
- **D020 queda intacto:** el login de invitado sigue igual (gana lo remoto).
  Esto solo aplica al volver de un fallo, o a lo jugado durante el vuelo.
- **Límite conocido:** `regionGameScores`, el perfil y la última
  configuración de ese rato siguen cediendo ante la nube. No tienen marca de
  tiempo, así que no se sabe qué parte es de ese rato. Lo que
  `mergeLearningData` ya sabía unir (marcas, candado diario, logros,
  estadísticas, historial) sobrevive como siempre.
- **Límite conocido:** un logout mientras se está en `local` borra
  `localStorage` (D009) con lo jugado sin subir. Antes esos datos se subían
  pisando la nube.

Alternativa descartada por ahora: fusionar siempre `countryHistory` por la
revisión más reciente dentro de `mergeLearningData`. También cambiaría el
login de invitado, es decir, re-litigaría D020. Si se quiere, en un PR aparte.

## Verificación

`bunx astro check`, `bunx biome check ./src` y `bun run build` (con variables
de Supabase de relleno: el `.env` es local). `GameEffects` real montado con
React 19 + Redux sobre happy-dom (script temporal en el scratchpad de la
sesión, no committeado), con el `fetch` de Supabase simulado y `localStorage`
vacío como tras un logout:

| Escenario | Qué se comprueba |
|---|---|
| GET 500 → `online` → GET 200 | `local`, 0 escrituras a `user_learning_data` y al ranking; jugar en `local` no sube nada; al volver la red, `ready` inmediato con la revisión de la nube (`fr`) **y** la del rato local (`de`), logro y perfil de la nube; el push final lleva las dos |
| GET colgado → reintento a los 5 s | el GET se aborta a los ~10 s, `local`, 0 escrituras; el reintento recupera igual que arriba |
| Token de sesión colgado | `local` a los 10 s por la carrera; ninguna petición sale después |
| GET 200 directo | `ready` con los datos de la nube, como antes |

No verificado en navegador: el dev server lo levanta el dueño, y el
comportamiento es de red/estado sin cambio de UI.
