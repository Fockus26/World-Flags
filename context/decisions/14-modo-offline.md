# 14 — Modo offline: sin pérdidas al volver, subidas agrupadas, UI honesta

> Unidad `feat/modo-offline`. Depende de PR #8 (`feat/skeleton-carga`, estado
> `local`) y de PR #9 (`fix/sync-fallida-sin-subida`, D044–D046), ya en `main`.
> Hallazgos de partida: `context/CURRENT_PHASE.md` › "Hallazgos
> pre-existentes" 1 (la fila entera en cada cambio) y 2 (`pickMoreRecentReview`
> sin usar).

## El problema

Las acciones del juego ya escribían en `localStorage` aunque hubiera cuenta,
así que lo jugado sin conexión no se perdía en el disco: **se perdía en el
merge**. `mergeLearningData` daba la razón a la nube en `countryHistory`,
`regionGameScores`, el perfil y la última configuración, y la próxima
sincronización (al recargar, o al volver la red) borraba lo practicado sin red.
D046 lo evitaba solo para lo revisado *después* del primer intento de la carga
actual: una sesión offline antes de recargar seguía perdiéndose, y
`regionGameScores`/perfil/configuración cedían siempre.

Además:

- `GameEffects` hacía `void pushLearningData(...)` cada 800 ms tras un cambio:
  sin red, una promesa rechazada sin manejar y el cambio perdido en silencio
  (hasta el siguiente cambio). Sin reintento ni cola.
- Cada subida era un **upsert a ciegas de la fila entera**: con dos
  dispositivos abiertos, el último en subir pisaba lo del otro.
- ~60 upserts por sesión de Europa (~2–3 MB en datos móviles; hallazgo 1).
- `sw.js` respondía a un GET cross-origin fallido (Supabase, dicebear) con la
  página offline: HTML con 200. La app no podía saber que estaba sin conexión.
- `signOut()` de supabase-js 2.112 borra la sesión local aunque no haya red;
  `GameEffects` limpia entonces `localStorage` (D009): cerrar sesión sin red
  borraba lo jugado sin subir, sin avisar.

## D048 — `countryHistory`: gana la revisión más reciente de cada país

`mergeCountryHistory` aplica `pickMoreRecentReview` país por país, en los dos
juegos (Banderas en el primer nivel y `countriesGame`, D028/D029). Cada
revisión SRS trae su `lastReviewedAt`, así que es un registro "gana el último"
con marca de tiempo propia: idempotente, sin duplicar nada y sin depender de
qué lado llegue antes. Empate → lo remoto. Países de un solo lado se conservan,
incluidos los códigos fuera del catálogo (D040).

- **Sustituye a D046** (`applyReviewsSince` se elimina): lo que hacía queda
  incluido, sin la ventana de `since`.
- **Cambia el login de invitado** (D046 lo había dejado fuera a propósito):
  si un invitado revisó un país después que la cuenta, su revisión gana. Es la
  misma regla que ya tenían con los invitados el candado diario, las mejores
  marcas, los logros, las estadísticas y el historial. El caso habitual es la
  misma persona que practica y luego crea o abre su cuenta. Alternativa (en
  dos líneas): aplicar D048 solo cuando hay base de sincronización (D049), y
  dejar que la cuenta gane en el login de invitado.

## D049 — Base de sincronización: qué cambió este dispositivo

El perfil, la última configuración y las tres últimas notas de cada continente
(`regionGameScores`, por juego) **no tienen marca de tiempo**: mirando solo los
dos valores no se sabe cuál es más nuevo. La referencia es la **base de
sincronización**: lo último que este dispositivo sabe que está en la nube para
esa cuenta (`getSyncBase`/`saveSyncBase`, clave propia en `localStorage`, con
el `userId`; nunca se sube).

`mergeLearningData(remote, local, base)` → `pickUnversioned` por campo:

| Caso | Gana |
|---|---|
| Sin base (login de invitado, primer login en el dispositivo) | lo remoto (D020, sin cambios) |
| `local` igual a la base (este dispositivo no lo tocó) | lo remoto — trae los cambios de otro dispositivo |
| `local` distinto de la base (cambio de aquí aún no subido) | lo local |

- **La base es la cola persistida.** "Cambios pendientes" = datos locales
  distintos de la base. Los dos viven en `localStorage`, así que sobreviven a
  recargar o cerrar la app sin red; al volver se fusionan y suben. No hace
  falta un log de operaciones aparte.
- Se guarda **siempre junto a los datos**, en la misma tarea (hidratación y
  cada sincronización buena): tienen que ser una pareja coherente. Si no se
  puede escribir (cuota), se borra la vieja: sin base, la fusión cae a "gana lo
  remoto", que no inventa cambios; una base vieja haría pasar lo que trajo la
  nube por cambios locales. Por eso ahora `GameEffects` sí persiste los datos
  hidratados de la cuenta (antes no lo hacía, pero las acciones del juego ya los
  escribían; el logout los sigue borrando, D009).
- **Cuenta que nunca pudo sincronizar aquí** (primer login con la red caída):
  al primer fallo, lo local de ese momento se guarda como base provisional. Lo
  que se juegue desde entonces es de la cuenta y gana al recuperarse, también
  en perfil, configuración y notas; lo que traía el invitado sigue cediendo.
- Idempotente con la misma base: `merge(merge(r, l, b), l, b)` =
  `merge(r, l, b)`. Contadores de `stats`, igual que siempre: `max` con el
  derivado del historial fusionado, nunca suma (D020). Un merge de tres vías
  con suma (`r + l − b`) sería exacto con dos dispositivos, pero rompe la
  idempotencia en cuanto un reintento repite la fusión con la misma base.
- **Límite conocido:** si los dos dispositivos cambian **el mismo** campo sin
  marca de tiempo (las notas del mismo continente, el nombre, la
  configuración), gana el que sincroniza. En la prueba con dos dispositivos pasó
  con la configuración: A, sin red, completó Norteamérica y la app la
  deseleccionó sola; B había pasado a competitivo; ganó la de A.
- **Alternativas descartadas:** marcas de tiempo por campo (necesitan una
  columna nueva en Supabase → migración manual que bloquea el despliegue, y un
  cliente viejo las ignoraría); log de operaciones reaplicado sobre la nube
  (preciso, pero cada acción del juego tendría que emitir operaciones y la nube
  tendría que recordar cuáles aplicó para no duplicarlas).
- **Límite conocido (varias pestañas):** cada pestaña usa su base en memoria
  en sus sincronizaciones, pero `localStorage` es compartido; una recarga
  puede emparejar datos de una pestaña con la base de otra. Ya antes varias
  pestañas se pisaban `localStorage`.

## D050 — Estado de red: `navigator.onLine` más el resultado real

- `NetworkEffects` sigue `navigator.onLine` y sus eventos. `offline` se cree al
  momento. `online` no se cree a ciegas (miente con wifi sin salida a
  internet o con portal cautivo): con cuenta pide una sincronización y su
  resultado decide; sin cuenta se acepta.
- `cloud-storage.ts` clasifica cada fallo en `CloudRequestError` con `kind`:
  `network` (sin respuesta: `status` 0 de postgrest, tope de 10 s, o
  `navigator.onLine` falso) o `server` (500, permisos, esquema). Sin red no se
  registra error en consola: es un estado esperado que la UI comunica.
- `syncLearningData` **falla al instante** si `navigator.onLine` es falso
  (cuando dice "sin red", acierta). Si no, el GET esperaría a los reintentos de
  postgrest (1 + 2 + 4 s): abrir la app sin conexión dejaba ~7 s de skeleton.
- Slice efímero `sync` (`connectivity`, `hasPendingChanges`, `hasServerError`,
  `lastSyncedAt`, `syncRequestId`) + `useSyncStatus()` para la UI.
- **Ranking:** una marca batida sin conexión ya no se pierde para el ranking.
  `upsertLeaderboardEntry` devuelve si subió; si no, se reintenta tras la
  siguiente sincronización buena (`lastSyncedAt`), y no se intenta sin red.
- **`sw.js`:** los GET de otros orígenes (Supabase, dicebear, Google Fonts) ya
  no pasan por el service worker: nunca se cacheaban, y la página offline como
  respuesta tapaba el fallo de red. Un recurso propio sin caché y sin red
  (una bandera nunca vista) falla con `Response.error()` en vez de recibir el
  HTML de la app. `CACHE_NAME` sigue en `v4`: los assets cacheados siguen
  valiendo; el cambio de bytes de `sw.js` basta para que el navegador instale
  el nuevo y ofrezca "Actualizar". Hasta entonces, el SW viejo sigue
  devolviendo HTML: `toCloudRequestError` lo desempata con `navigator.onLine`.

## D051 — Cada subida es una sincronización, agrupada

- **Nada de upsert a ciegas.** Cada subida es `syncLearningData` (antes
  `syncOnLogin`): leer la fila → `mergeLearningData(remote, local, base)` →
  subir solo si aporta algo. Con dos dispositivos abiertos, lo del otro se
  incorpora en vez de pisarse (y aparece en pantalla). Lo cambiado mientras la
  subida está en vuelo se fusiona encima con la misma regla (base = lo que se
  mandó), sin perder nada.
- **Agrupadas:** tras un cambio se espera a que el usuario pare 5 s
  (`SYNC_IDLE_MS`), con un tope de 60 s desde el primer cambio sin subir
  (`SYNC_MAX_WAIT_MS`). Se adelantan al ocultar la app (`visibilitychange`,
  `pagehide`), al volver la red y al cerrar sesión. Esperar no arriesga nada:
  lo pendiente ya está en `localStorage` + base (D049).
- **Reintentos** tras un fallo: 5/15/30/60 s (como D044) y con `online`;
  mientras tanto los cambios nuevos no disparan peticiones.
- **Hallazgo 1, sí abordado:** en la prueba, 11 calificaciones y el final de
  una práctica de Centroamérica → 2 sincronizaciones (2 GET + 2 POST) en vez
  de 12 upserts. Una práctica de Europa (~60 calificaciones en 3–4 min) queda
  en unas 5 (una por minuto + la final): ~5 × (GET + POST) de ~50 KB ≈ 0,5 MB
  frente a ~3 MB, y 12 veces menos escrituras. Cada subida sigue llevando la
  fila entera.
- **Descartado por ahora:** `update` parcial de columnas. Una calificación
  cambia `country_history`, que es el grueso de la fila, así que ahorraría poco
  y exigiría diffs por columna. Siguiente paso posible: subida condicional
  (`update … where updated_at = <el último conocido>`), que se ahorra el GET
  cuando nadie más escribió.

## D052 — UI: qué se ve sin conexión y qué no funciona

`ConnectivitySnackbar`, primero en el contenedor de `SystemSnackbars`:

| Estado | Aviso |
|---|---|
| Sin conexión, con cuenta | 📡 "Sin conexión" — el progreso se guarda en este dispositivo y se sube al volver. "Entendido" lo oculta hasta el siguiente corte |
| Sin conexión, invitado | 📡 "Sin conexión" — se puede seguir practicando; ranking e inicio de sesión vuelven con la conexión |
| Hay red, la sync falla (con cuenta) | ⚠️ "No se pudo sincronizar" — se guarda aquí, se reintenta. No se dice "sin conexión": sería mentira |
| Vuelta | ✅ "Progreso sincronizado" (con cuenta: solo tras una sincronización buena) o "Conexión recuperada" (invitado). Se va sola a los 5 s, con botón de cerrar |

- Un corte de menos de 2 s no avisa (ni se anuncia la vuelta). El estado nunca
  va solo por color: emoji + título + texto. Vive en la región
  `role="status"`/`aria-live="polite"` de `SystemSnackbars`.
- **Qué no funciona sin conexión, y cómo se degrada:**
  - **Ranking público:** no se pide; el modal lo dice y se carga solo al volver
    la red. Si el navegador dice "en línea" pero el GET falla sin respuesta,
    mismo mensaje.
  - **Login / crear cuenta / Google:** nota "Sin conexión: … necesitas
    internet", botones deshabilitados (`aria-describedby` a la nota). Si aun
    así falla por red, "Failed to fetch" pasa a un mensaje en español.
  - **Avatares de dicebear:** uno ya visto sale de la caché HTTP del navegador
    (dicebear sirve `max-age` de ~1 año). Si no está: la inicial del nombre en
    la cabecera y el número de opción en el selector (se puede elegir igual; el
    selector lo avisa). Al volver la red se reintentan solos.
  - **Sincronización entre dispositivos y ranking:** esperan a la red (D050,
    D051).
- **Pregunta abierta para el dueño — banderas nunca vistas:** el SW solo tiene
  las banderas que ya aparecieron alguna vez. Sin red, practicar un continente
  nunca visto enseña la imagen rota (el `alt`, "Bandera que debes
  identificar"). Opciones: (a) precargar las 197 (~3,1 MB, una vez, en segundo
  plano y no con "ahorro de datos"); (b) aviso en la tarjeta + saltar; (c)
  dejarlo así. No se tocó en esta unidad.
- Copy provisional → `context/CONTENT_CHECKLIST.md`.

## D053 — Cerrar sesión con progreso sin subir

Cerrar sesión borra los datos de la cuenta de este dispositivo (D009), y
supabase-js lo permite sin red. `AuthSection`:

- Sin nada pendiente: cierra como siempre.
- Pendiente y con red: "Guardando…" — pide sincronizar ya y cierra sola en
  cuanto no queda nada pendiente (en la prueba, ~1 s).
- Pendiente y sin red, error de servidor, o más de 12 s guardando: aviso
  (`role="alert"`) de que se perderá, con "Cancelar" y "Cerrar sesión
  igualmente".
- El botón de cerrar sesión no se desmonta ni se deshabilita durante los
  avisos: el foco de teclado se queda en él (`aria-describedby` al aviso).
- **Límite conocido:** un cierre de sesión involuntario (refresh token
  revocado) sigue borrando lo no subido. Sin red, supabase-js conserva la
  sesión ante un refresco fallido, así que no pasa por estar offline.

## Verificación

- `bunx astro check` 0 errores · `bunx biome check ./src` limpio ·
  `bun run build` verde.
- **`bun run test`** (nuevo, también en CI): 24 aserciones sobre la capa pura
  (`tests/unit/sync-merge.test.ts`) — D048, D049, offline en un dispositivo,
  dos dispositivos, login de invitado, idempotencia (y 10 recargas sin inflar
  contadores ni notas), D017, D021, D040, base por cuenta y logout. Con el merge
  anterior fallan 10.
- **En navegador** (embebido): el build de producción servido por un servidor
  desechable y un mock local de Supabase (scratchpad de la sesión, fuera del
  repo) al que se le corta la "red" (respuestas sin CORS = fallo de red real
  para el cliente) o se le hace devolver 500. Sesión de prueba inyectada.
  - Practicar sin red → 0 subidas, todo pendiente → recargar con la nube caída
    → modo `local` con lo jugado y el aviso → B sube cambios distintos → volver
    la red → 1 GET + 1 POST; la fila tiene lo de los dos (revisiones por país
    la más reciente, Asia de B, Norteamérica de A, 3 sesiones sin duplicar,
    contadores 3/6/3, logros de ambos incluido un id desconocido).
  - Recarga con red después: 1 GET, 0 POST, fila idéntica.
  - Agrupado, cierre de sesión (los tres caminos, foco conservado), ranking y
    login sin red, `navigator.onLine` falso sin peticiones, aviso de error del
    servidor, respaldo del avatar.
  - axe-core 4.10: sin violaciones nuevas en claro y oscuro (oscuro emulando
    `prefers-color-scheme`) con los avisos, el aviso de cierre de sesión y el de
    vuelta; 320 px sin scroll horizontal.
- **No verificado en navegador:** el navegador embebido no registró ningún
  service worker en esta sesión ("unknown error when fetching the script", en
  cualquier origen), así que la página servida por el SW sin red no se pudo
  ver. El `sw.js` real se comprobó en un arnés aislado (`self`/`caches`/`fetch`
  simulados): cross-origin no interceptado, recurso sin caché y sin red →
  `Response.error()`, navegación sin red → caché, recurso propio cacheado.
  El de `main` falla en la primera.
