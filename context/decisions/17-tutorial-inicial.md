# Tutorial de la primera vez — partida guiada

> Unidad `feat/tutorial-inicial` (1.2.0). Forma elegida por el dueño, literal:
> *"partida guiada, ese progreso no contaría, y en esas partidas debe señalarse
> los distintos modos de juego, dificultades, orden y temporizador"*.

---

## D071 — Partida guiada la primera vez, marca de "visto" por dispositivo

**Qué es.** Un recorrido de seis pasos en un diálogo modal: bienvenida (con la
promesa de que nada cuenta), los tres juegos, el modo de juego, los ajustes de
práctica (orden, dificultad, temporizador), la partida de ejemplo y el cierre.

**Cuándo aparece solo** (`utils/tutorial-gate.ts`, `shouldOfferTutorial`):

- `hydrationStatus === "ready"`, **nunca** `"local"`. En `local` los datos son la
  copia de `localStorage` sin contrastar con la nube (Auth que no resolvió en
  2,5 s, D042; o una sincronización fallida, D044): "parece no tener progreso"
  puede ser simplemente que su progreso no ha llegado todavía. Esperar es gratis;
  ofrecerle un tutorial a quien lleva meses jugando, no.
- `hasLearningProgress(data) === false` — la misma función que protege el
  progreso en `planSync` (D056): cubre los tres juegos, los logros y el historial
  de sesiones.
- Sin partida, práctica diaria ni resultados en pantalla.
- Una sola vez por carga (`tutorial.hasBeenOffered`): una re-hidratación
  posterior no lo vuelve a sacar, y cerrarlo no lo reabre.

**Dónde se guarda el "ya se ofreció".** En su propia clave de `localStorage`
(`world-flags-tutorial-seen`), siempre vía `learning-storage.ts`
(`getTutorialSeen`/`saveTutorialSeen`) — **por dispositivo**, como la versión
vista de "Novedades" (D058), y no dentro de `UserLearningData`.

El dilema es el de `DailyReminderPreference`, que sí vive en el blob. Se decidió
al revés por tres razones:

1. `UserLearningData` se sincroniza entera por cuenta: un campo nuevo ahí cuesta
   **una columna nueva en Supabase**, con su SQL corrido a mano antes de
   desplegar. Eso bloqueó los dos últimos despliegues (D055, D062); no vale la
   pena por un booleano de UI.
2. Quien más ve el tutorial es el **invitado**, que no tiene cuenta que
   sincronizar.
3. La puerta real no es la marca, es `hasLearningProgress`. En el segundo
   dispositivo de una cuenta que ya jugó, el tutorial no se ofrece aunque su
   marca no haya viajado.

**Invitado que luego crea cuenta:** la marca es del dispositivo, así que
sobrevive intacta al login — al contrario que si viviera en el blob, donde D056
puede descartar el progreso del invitado entero y con él la marca.

**Lo que queda descubierto, a propósito:** misma persona, cero progreso, otro
dispositivo → lo ve otra vez. Es inofensivo: todavía no ha jugado. Si algún día
molesta, el arreglo es mover la marca al blob con su columna.

**Reabrirlo.** Entrada "Cómo se juega" en el **pie de `ConfigurationModal`**,
junto a "Versión X · Novedades" — se reutiliza el sitio que abrió D059 en vez de
inventar un cuarto icono, porque la fila de 🏅 🏆 📍 a 320 px ya va justa. El pie
pasa a `flex-wrap`: con tres cosas en vez de dos, en pantallas estrechas los
botones bajan a su propia línea. Reabrirlo a mano **no** pasa por la puerta: se
ve siempre, con el progreso que sea.

**El modal de configuración no se cierra al abrir el recorrido**: se queda
abierto por debajo, como ya hace "Novedades". Así, al cerrar el tutorial, React
Aria devuelve el foco al botón que lo abrió (WCAG 2.4.3); cerrándolo antes, ese
botón ya no existiría y el foco caería en `<body>`.

**Estado en pantalla:** slice efímero `tutorial` (`isOpen`, `hasBeenOffered`),
como `achievementToasts`. Está en Redux y no en un estado local de `FlagGame`
porque quien lo reabre es el pie del modal de configuración, varios niveles por
debajo, y el recorrido tiene que montarse por encima de toda la app.

---

## D072 — La partida de ejemplo no pasa por `useGame`: `SessionRuntime` inyectado

**El problema.** Todo el flujo normal de partida persiste en cada paso:
`saveReviewResult`/`registerCountryAttempt` (historial SRS),
`registerCountryPracticed` (candado "practicado hoy"), `registerRegionGame`
(nota del continente), `registerRegionBestTime` (mejor marca y, en mundo, el
**ranking público** vía `upsertLeaderboardEntry`), `registerSessionOutcome` +
`createSessionRecord` (stats e historial), `touchActiveDay` (la racha) y la
evaluación de logros. Encima, `GameEffects` sube `learningData` a Supabase con
cada cambio. Casi todas esas funciones llaman a `saveLearningData` por dentro:
no basta con no despachar a Redux.

**Lo que NO se hizo:** un flag "si es el tutorial, no guardes" dentro de
`useGame`. Se olvidaría en el siguiente cambio y nada lo avisaría: el progreso
se movería en silencio.

**Lo que se hizo.** `components/game/session/session-runtime.ts` define
`SessionRuntime`: exactamente lo que una pantalla de sesión necesita del exterior
(`activeGame`, `learningData` de solo lectura, `exitGame`, `finishGame`,
`gradeCountryReview`). `CountriesPractice` lo recibe como **prop obligatoria**,
sin valor por defecto, y ya no llama a `useGame`.

- `FlagGame` inyecta el `useGame()` real, que cumple el contrato **tal cual, por
  estructura**, sin adaptador.
- El tutorial inyecta `useSandboxRuntime()`: estado en memoria
  (`utils/tutorial-sandbox.ts`, puro y sin React) que no tiene forma de escribir
  en ningún sitio. `finishGame` guarda el resultado para el paso de cierre;
  `gradeCountryReview` solo cuenta tarjetas.
- El sandbox juega sobre un `createDefaultLearningData()` propio, **nunca el del
  usuario**: la sesión no puede ni leer datos reales, y las tres tarjetas se
  comportan igual para todo el mundo (sin historial SRS previo que cambie cuántas
  veces se repite una tarjeta).
- `preparedCountries` se calcula **al empezar**, no por render: con
  `order: "random"` (que el recorrido deja elegir), `prepareCountries` baraja con
  `Math.random` y recalcularlo reordenaría las tarjetas a mitad de partida.

**Las aserciones** (`tests/unit/tutorial-sandbox.test.ts`), que son la parte que
impide que esto se rompa en silencio:

1. **Comportamiento:** se siembra progreso real con las funciones reales (que
   persisten), se juega la partida guiada entera sobre un `localStorage` que
   **cuenta escrituras**, y se comprueba que el contador no sube y que lo
   guardado queda byte a byte igual.
2. **Estructura:** ningún archivo del tutorial ni `CountriesPractice` importa
   nada capaz de escribir progreso (lista explícita: `useGame`,
   `setLearningData` y las funciones de `learning-storage` que guardan). Se miran
   los **imports**, no el cuerpo: es donde ESM obliga a declarar todo lo que
   entra, y así los comentarios que nombran `useGame` para explicar por qué NO
   está no dan falsos positivos. Es lo que atrapa la regresión del futuro.
3. `runtime` está declarada sin `?` y sin valor por defecto.

`Session.tsx` (Banderas/Capitales) y `CountriesRush.tsx` **siguen llamando a
`useGame`**: el tutorial no los monta, y meterlos en el contrato sin necesidad
habría tocado tres archivos más de una unidad que no los necesita. Si un paso
futuro del recorrido los usa, se extienden entonces.

**Lo único que el tutorial sí escribe** es su propia marca de "visto", al
cerrarse (D071). No toca `learningData`.

---

## D073 — Los ajustes se enseñan funcionando, no resaltando la UI real

El brief dejaba elegir entre abrir `ConfigurationModal` dentro del recorrido y
señalar sus controles, o explicarlos sin abrirlo. Se eligió una tercera:
**montarlos dentro del recorrido, reales y tocables**, sobre la configuración del
sandbox — lo que se elija es con lo que arranca la partida de ejemplo, y no toca
la configuración guardada del usuario.

**Por qué no resaltar la UI real.** Las vistas del juego viven dentro del giro 3D
de `PageFlip`, que deja montada la vista anterior en su ranura oculta y aplica
`rotateY`/`perspective` al contenedor. Un overlay que buscara por selector
encontraría dos nodos, y medir posiciones (`getBoundingClientRect` sobre un
elemento transformado en 3D) devuelve rectángulos proyectados. Es frágil de una
forma que no se nota hasta que se rompe. Enseñar los controles en su sitio,
funcionando, no necesita medir nada; el paso de cierre dice dónde viven.

**Qué se enseña:**

- **Modo de juego** (paso propio). El selector es una **vista previa**: no entra
  en la configuración del sandbox. La partida de ejemplo siempre es Práctica —
  tres tarjetas no enseñan una carrera contra el reloj — y el paso lo dice en vez
  de prometer otra cosa. El aviso del competitivo repite lo que ya dice `GameTab`:
  orden aleatorio y dificultad difícil, no ajustables. El tutorial **no puede
  prometer lo contrario**.
- **Orden, dificultad y temporizador** (paso propio). Sí entran en el sandbox.

`TutorialSettings` usa los mismos primitivos (`Fieldset`, `OptionTile`,
`AutoHeight`) y **las mismas constantes** que `GameTab` (`GAME_MODES`,
`GAME_MODE_LABELS`, `TIMER_DURATIONS`), no una copia de sus etiquetas: añadir un
modo o una duración allí aparece aquí solo. Los `name` de los radios sí son
propios (`tutorial-*`), para no agruparse con los del modal si coexisten en el
DOM (que es lo que pasa al reabrirlo desde el pie).

`ui/Modal` gana `isDismissable?: boolean` (por defecto `true`, los consumidores
existentes no cambian): el recorrido no se pierde con un clic fuera. **Escape
sigue cerrando** — `isKeyboardDismissDisabled` no se toca.

`CountriesPractice` gana `exitDescription?: string`. El aviso de abandonar de
siempre dice que "el progreso de esta partida se perderá", y en la partida
guiada eso sería mentira justo en lo único que el tutorial promete.

---

## D074 — Los tres países son Norteamérica completa, no una selección a dedo

El ejemplo se juega con **Canadá, Estados Unidos y México**: Norteamérica entera,
el continente más pequeño del catálogo (`data/countries.ts`).

No están elegidos uno a uno. Así la partida guiada es un **alcance real del
juego, terminado de verdad** —con su tablero, su etiqueta de continente y su
resultado— en vez de un recorte artificial de tres países sueltos que no se
parece a nada de lo que el usuario va a jugar después. De paso son de los más
reconocibles para el público en español, que es el mercado de la app.

El juego es **Países** porque es con el que arranca un usuario nuevo (D030), y el
modo es Práctica (D073). Un test comprueba que siguen siendo tres y que todos
están en el catálogo, por si el catálogo cambia.
