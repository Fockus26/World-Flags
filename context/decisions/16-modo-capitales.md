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

## D063 — Las capitales: archivo aparte, con fuente y fecha

- **`src/data/capitals.ts`**, no un campo `capital` en `Country`. `Country` es
  el catálogo que comparten los tres juegos (y viaja en `activeGame.countries`);
  los alias y las notas son contenido solo de Capitales. Un futuro `aliases`
  de nombres de país (fuera de alcance en Países) iría en `Country`: así no se
  mezclan. Forma: `Record<código, Capital>`, con `Capital = { name,
  accepted?, note? }` (`types/country.ts`).
- **Cobertura por test, no por un `throw` al importar** como el de
  `countries.ts`: `tests/unit/capitals.test.ts` exige una entrada por país del
  catálogo y ni una más. Si faltara una en ejecución, `getCapital` devuelve
  `undefined` y la sesión trata el país como fuera de catálogo (D040), nunca
  una tarjeta sin respuesta.
- **Fuentes** (consultadas el 2026-09-22; el detalle, las consultas para
  reproducirlo y la tabla completa están en el anexo local
  `context/plans/modo-capitales-capitales.md`):
  - **Se muestra la forma de la UE**: *Libro de estilo interinstitucional*,
    Anexo A5, versión en español actualizada el 16-09-2026, elaborada «en
    consulta con la Real Academia Española» y el Ministerio de Exteriores
    español. Donde la UE no da capital (Kosovo, Israel, Palestina, Santa
    Sede), la de Wikidata.
  - **Qué ciudad y desde cuándo**: Wikidata, P36 con sus fechas y roles, y sus
    etiquetas y alias en español. En 176 de 197, UE y Wikidata escriben lo
    mismo letra por letra; el resto son grafías o casos de D064.
  - **Tercera referencia**: Wikipedia (en), «List of national capitals».
  - No se pudo usar la lista de la RAE (403 de Cloudflare, no se forzó) ni el
    World Factbook de la CIA (ya no existe).
- Hallazgos que no se habrían acertado de memoria: **Guinea Ecuatorial cambió
  de capital el 03-01-2026** (Malabo → Ciudad de la Paz, las tres fuentes);
  Burundi es Guitega desde 2019. Indonesia tiene designada Nusantara sin
  traslado oficial todavía: se revisa en cada PR que toque el archivo.

## D064 — Capitales múltiples, disputadas y cambios recientes (decisión del dueño)

Regla: vale toda ciudad que la UE (en su tabla o sus notas) o Wikidata (P36
vigente) llaman capital de cualquier tipo. No valen las antiguas, las
económicas ni las sedes que ninguna fuente llama capital; regla del dueño
para estas: "si el país tiene otra ciudad como capital, esas no valen".

| País | Se muestra | También vale | No vale |
|---|---|---|---|
| Bolivia | Sucre (constitucional) | La Paz (sede del Gobierno) | — |
| Sudáfrica | Pretoria (administrativa) | Ciudad del Cabo, Bloemfontein, Tshwane | — |
| Malasia | Kuala Lumpur | Putrajaya | — |
| Benín | Porto Novo | Cotonú | — |
| Sri Lanka | Sri Jayawardenapura Kotte | Colombo | — |
| Esuatini | Babane | Mbabane, Lobamba | — |
| Yemen | Saná | Adén | — |
| Países Bajos | Ámsterdam | — | La Haya |
| Chile | Santiago | Santiago de Chile | Valparaíso |
| Costa de Marfil | Yamusukro | — | Abiyán |
| Tanzania | Dodoma | — | Dar es-Salaam |
| Montenegro | Podgorica | — | Cetiña |
| Myanmar | Naipyidó | Naypyidaw, Nay Pyi Taw, Nepidó | Rangún |
| Burundi | Guitega | Gitega | Buyumbura |
| Guinea Ecuatorial | Ciudad de la Paz | — | Malabo (hasta enero de 2026) |
| Indonesia | Yakarta | Jakarta | Nusantara |
| Kazajistán | Astaná | — | Nur-Sultán |
| **Israel** | Jerusalén, con nota neutra | — | Tel Aviv |
| **Palestina** | **Jerusalén Este** | Ramala (sede administrativa), Jerusalén Oriental | — |

Israel y Palestina: decisión del dueño sobre las tres opciones que se le presentaron — Israel, Jerusalén; Palestina, **Jerusalén Este** (la UE
deja la casilla de Israel vacía a propósito y no lista Palestina; Wikidata da
Jerusalén para Israel, y Jerusalén Este de iure y Ramala de facto para
Palestina). Las notas que acompañan a cada caso al revelar son provisionales
(`CONTENT_CHECKLIST.md` #22). Grafías donde UE y Wikidata difieren (Camberra y
Canberra, Nueva Deli y Nueva Delhi, Hanoi y Hanói…): se muestra la de la UE,
valen las dos.

## D065 — Respuestas: alias por entrada; en difícil cuentan tildes y signos

- `isAcceptedAnswer(answer, accepted, difficulty)` en `normalize-answer.ts`,
  solo para Capitales. **`normalize` e `isCorrectAnswer` no cambian**: Banderas
  y Países comparan igual que antes (lo comprueba un test).
- **Regla del dueño:** en difícil (y por tanto en competitivo) los apóstrofos,
  guiones y espacios cuentan igual que las tildes: "Saint John's",
  "Port-au-Prince" y "Porto Novo" se escriben como son. En fácil se ignoran,
  junto con las tildes, los puntos y las comas ("saint johns", "washington
  dc"). En difícil, el apóstrofo tipográfico de la fuente (’) equivale al del
  teclado ('), y varios espacios seguidos cuentan como uno (confirmado por el
  dueño).
- **Alias explícitos por entrada, sin reglas genéricas** de artículo ni de
  "Ciudad de": "La Paz" es Bolivia y "Ciudad de la Paz" es Guinea Ecuatorial;
  una regla genérica los confundiría. Política A (del dueño): solo español,
  como los otros dos juegos — variantes documentadas por la UE o Wikidata,
  formas corta o larga ("Washington", "Habana") y topónimos locales que
  Wikidata registra como alias en español ("Phnom Penh", "Accra"). No valen
  apodos, abreviaturas ni nombres anteriores.
- Una variante que solo difiere en la tilde no se añade (la cubre "fácil"),
  salvo tres grafías documentadas como distintas: Hanói, Uagadugú, Taipei.
- Ignorar signos en el modo fácil de Banderas y Países sería cambiar juegos
  cerrados: fuera de alcance (la auditoría del catálogo vio que "Guinea
  Bisáu" falla).

### Verificación (D063-D065)

`tests/unit/capitals.test.ts`: cobertura 197/197, datos sin espacios
sobrantes ni alias repetidos, cada decisión de la tabla de D064, la regla de
signos en los dos modos y la guarda de Banderas/Países. `bun run test`: 80.
Con la regla rota a propósito (difícil ignorando guiones), falla el test de
signos.

## D066 — El selector con tres juegos: desplegable en móvil, pastillas a partir de 30rem

Elegido por el dueño sobre un canvas de Claude Design con las tres opciones
(icono encima del texto, solo iconos, desplegable), vistas a 320 px.

- **Por qué no caben tres pastillas a 320 px:** quedan ~271 px para el
  segmentado, unos 90 por opción, y "Capitales" con su icono ya los ocupa
  casi enteros. Con el espaciado de texto de WCAG 1.4.12 se sale.
- **Cómo:** por debajo de `min-[30rem]` se pinta el `Select` de HeroUI
  (`ui/Select`, con teclado y `role="listbox"` de React Aria); desde ahí, el
  segmentado de siempre con tres opciones. Se pintan los dos y CSS oculta el
  que no toca: `display: none` también lo saca del orden de tabulación y del
  árbol de accesibilidad, y en un sitio estático decidirlo en JS con
  `matchMedia` desajustaría la hidratación.
- **La píldora ya no está atada a dos opciones:** su ancho es
  `calc((100% - 0.5rem) / n)` (el hueco real entre los `p-1` del grupo) y se
  desplaza en múltiplos de su propio ancho. La fórmula anterior sumaba además
  `0.5rem`, así que en "Banderas" se salía 8 px a la derecha. Medido: 0 px de
  desfase en las tres opciones.
- **`ui/Select` gana una prop opcional `placeholder`** (cambio aditivo, el
  contrato de los wrappers se mantiene). Sin ella, durante la carga inicial
  —cuando todavía no hay juego elegido (D042)— el desplegable mostraba
  "Select an item", el texto por defecto de HeroUI, en inglés.
- **El título ya no se recorta:** "Aprende las capitales del mundo" se pasaba
  por 2 px del ancho disponible a 320 px y salía con "…". Se le quitó el
  `whitespace-nowrap`; los otros dos títulos siguen cabiendo en una línea.

### El contraste de la opción marcada (hallazgo reportado dos veces, resuelto)

El texto de la opción marcada nunca llegaba a tomar su color: dependía de
`has-checked:` (`:has(:checked)`) y **Chrome no recalcula ese estilo cuando es
React quien marca el radio al cargar la página** — medido en el navegador:
tras recargar sigue con el color normal al menos 4,5 s, hasta que algo fuerza
un recálculo (un clic, un cambio de tamaño). Por eso se veía el texto normal
sobre el morado: 3,62:1 en claro y 2,44:1 en oscuro, por debajo de AA.

Ahora el color sale del estado de React (`checked ? … : …`), sin depender de
`:has()`, y usa `--btn-contained-fg`, el token del texto de los botones
rellenos: **4,66:1 en claro y 6,64:1 en oscuro**.

**Visto de paso, no tocado:** `OptionTile` (tema, dificultad, modo) y
`RegionOption` (continentes) usan el mismo patrón `has-checked:` con radios
controlados por React, así que pueden tener el mismo problema al cargar. No
entra en esta unidad; queda reportado.

### Verificación (navegador real, con el servidor del dueño)

- 320 px: desplegable, pastillas ocultas, sin scroll horizontal, y lo mismo
  con el espaciado de texto de WCAG 1.4.12. 900 px: las tres pastillas, con la
  píldora exactamente sobre la marcada.
- axe-core 4.10.2 sin violaciones en claro y en oscuro, en la configuración y
  en el modal de ranking (que usa el mismo selector: desplegable a 320 px,
  pastillas a 900 px).
- Elegir un juego con el ratón cambia selector, título y progreso mostrado.
  El foco queda en el control y su anillo se ve.
- **No verificado:** la navegación con flechas dentro del grupo de radios. El
  panel del navegador no entrega esas teclas (un grupo de radios nativo de
  prueba, creado al margen de la app, se comporta igual), así que no se puede
  distinguir el componente del entorno. Tab y el clic sí funcionan.
- **Ojo con el método:** con el panel oculto o la ventana detrás, la página
  deja de repintarse y `getComputedStyle` devuelve valores congelados (hasta
  un `color: red` en línea deja de verse). Toda medición de estilos de aquí en
  adelante se hace con la página pintando, comprobándolo con una captura.

## D067 — La tarjeta de Capitales: solo el nombre del país

**Decisión del dueño (opción B de tres):** la tarjeta muestra solo el nombre
del país, grande, en el mismo hueco que ocupa la bandera en Banderas
(`session/capitals/CapitalCard.tsx`). Se descartaron el nombre con la bandera
(A) y la bandera al responder (C).

- La pregunta del input lleva el país ("¿Cuál es la capital de Perú?"): el
  lector de pantalla la oye entera al enfocar el input, sin depender de la
  tarjeta.
- Fondo `bg-surface-hover`, texto `text-surface-soft`, tamaños de la escala de
  Tailwind (`text-3xl` → `text-5xl`), sin valores arbitrarios nuevos. Los
  nombres largos parten en dos líneas (`text-balance`, `hyphens-auto` con
  `lang="es"`); "San Vicente y las Granadinas" cabe a 320 px sin scroll
  horizontal.
- Entrada con `tw-animate-css` (`fade-in` + `zoom-in-95`, 200 ms) y `key` por
  país para que se repita en cada tarjeta. Sin framer (D006); el
  `prefers-reduced-motion` global la deja en 0,01 ms.

## D068 — Una sola sesión para Banderas y Capitales

`FlagGame` manda Países a sus componentes (sin cambios) y **todo lo demás** a
`Session`. Lo que cambia por juego lo da una tarjeta de sesión
(`session/session-cards.tsx`, `SESSION_CARDS: Record<CardGameType, …>`): qué se
muestra, qué respuesta se enseña, cómo se comprueba, la pregunta y el
placeholder, y una nota opcional para el aviso.

- `Session` lee el juego de `activeGame.configuration.gameType`; sus cinco
  `"flags"` fijos (calificar, intento de rush y los dos `finishGame`) pasan a
  ser ese valor, y la cola de repaso lee el historial de ese juego
  (`toGameView`), no siempre el de Banderas.
- **Banderas compara con `isCorrectAnswer` tal cual**, no con el comparador de
  Capitales: acepta exactamente lo mismo que antes. Mismos textos, misma
  `FlagDisplay`.
- `AnswerForm` gana `answerNote?` (aditivo; Banderas no la pasa). Va **dentro**
  del aviso de acierto o fallo, no al lado, para que el lector de pantalla lo
  anuncie con él (`role="alert"` / `"status"`). En Capitales: "También vale
  La Paz." (las demás respuestas que valen, unidas con "o") y la nota de la
  capital.
- Al acertar con un alias el aviso enseña igualmente la capital principal
  ("Correcto: Sucre · También vale La Paz."): enseña la que se muestra en el
  resto del juego.
- El rush de Capitales es el camino competitivo de `Session` con otra tarjeta:
  cada país una vez, penalizaciones de 2 s y 5 s, tildes obligatorias,
  `completed: true` siempre (D069 lo completa con el ranking en la Fase 6).
- Arreglos de copy de paso (aprobados, pregunta 8 del plan): "Acertaste X de Y
  **banderas** a la primera" usa el sustantivo del juego (también salía en
  Países) y la ayuda de modo de juego dice "calificas cada **respuesta**" en vez
  de "cada bandera".
- El doble envío y la doble calificación que Capitales habría heredado se
  arreglaron antes, en su propio PR (`fix/sesion-calificacion-doble`, #14).

### Verificación (navegador real, servidor levantado por el agente con permiso del dueño)

- Práctica de Capitales: Argentina en minúsculas en difícil (vale: difícil
  distingue tildes y signos, no mayúsculas, igual que Banderas); Bolivia con
  "La Paz" (acierto, con alias y nota); Brasil con "Brasília" en difícil (fallo);
  Chile saltado (revela Santiago, alias y nota); "quíto" en fácil (acierto).
  Pulsar "1" dos veces califica una sola vez.
- El progreso cae en `capitalsGame.countryHistory`; el de Banderas no se toca.
  Las sesiones se guardan con `gameType: "capitals"`.
- Temporizador de práctica de 5 s: al agotarse revela la capital.
- Rush de 3 países: "Recorriste 3 capitales en 5.51" (con una penalización).
  Práctica de 1 país: "Acertaste 1 de 1 capitales a la primera".
- Banderas intacta: bandera, pregunta y placeholder de siempre, "Peru" sin
  tilde sigue fallando en difícil y la nota va a `countryHistory`.
- 320 px (en claro) con el nombre más largo y la nota más larga (Israel): sin
  scroll horizontal. axe-core 4.10.2 sin violaciones en claro y en oscuro.
- **No verificado:** Enter y las flechas (el panel no entrega esas teclas; las
  respuestas se enviaron con el formulario); lector de pantalla real.

## D069 — Rush, ranking y práctica diaria de Capitales

- **Rush = rush de Banderas** con la tarjeta de Capitales (D068): cada país una
  vez, penalización de 2 s por fallo y 5 s por saltar, tildes obligatorias,
  `completed: true` siempre. Los mejores tiempos van a
  `capitalsGame.regionBestTimes`.
- **Ranking:** scope **`capitals:world`** en `leaderboard_entries`, sin
  migración (`scope text`, PK `(user_id, scope)`). `GameEffects` sube la marca
  de "Todo el mundo" de cada juego desde un solo efecto que recorre
  `GAME_TYPES` (D061), con reintento por juego tras la siguiente
  sincronización buena (D050). `LeaderboardModal` ya tenía el selector de tres
  (D066) y la descripción "…practicando todas las capitales".
- **Práctica diaria:** Países sigue con su tablero; Banderas y Capitales usan
  la tarjeta de su juego (`SESSION_CARDS`). Capitales muestra además la
  pregunta ("¿Cuál es la capital de Israel?", `showQuestionInDaily`), porque el
  nombre del país solo no dice qué se pregunta. Al revelar: la capital, las
  otras respuestas que valen y la nota. Banderas no cambia.
- El candado de "practicado hoy" ya era por juego (`lastPracticeByCountry` de
  cada `GameProgress`); la práctica diaria sigue sin marcarlo.
- Los países cuya capital se llama como el país (Mónaco, Singapur, Kuwait…)
  son "gratis" en el rush: es el contenido, igual para todos; no se toca.

### Verificación (navegador real)

- Con 3 capitales vencidas inyectadas: "Práctica diaria (3)" solo en
  Capitales (Banderas y Países sin botón), la tarjeta con la pregunta, al
  revelar "Jerusalén" + nota y "Jerusalén Este" + "También vale Ramala o
  Jerusalén Oriental." + nota. "3" dos veces avanza una sola tarjeta. La
  sesión se guarda como `daily` / `capitals`; el progreso, en `capitalsGame`.
- Candado independiente: Sudamérica marca 7/12 hoy en Capitales, 3/12 en
  Banderas y nada en Países, cada uno con lo suyo.
- Modal de ranking en Capitales: descripción correcta, consulta sin error
  (vacío). axe-core sin violaciones en la práctica diaria y en el modal.
- **No verificado:** subir una marca al ranking (hace falta cuenta y la
  columna `capitals_game` en Supabase); el rush completo de "Todo el mundo".
- **Visto de paso, no tocado:** al revelar en la práctica diaria la respuesta
  aparece sin región viva, así que un lector de pantalla no la anuncia por sí
  solo. Ya pasaba en Banderas; queda reportado.
