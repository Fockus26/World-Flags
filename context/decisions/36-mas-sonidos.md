# Decisiones — Más sonidos (P18)

> Unidad `feat/mas-sonidos`. Pedido del dueño (P18 de `pendientes.md`), solo los
> recomendados: `select`, `start`, `penalty`, `record`, y `skip` con nota propia. Sin
> sonidos de hover, sin interruptor nuevo, sin `finish`/`streak`/`grade`/`page`/cuenta
> atrás. Siguen valiendo D080–D082 (Web Audio sintetizado, refuerzo y nunca única
> señal, respeta "Sonidos", falla en silencio), D125 (audible en el móvil) y D072
> (`sound.ts` solo lee).

| ID | Decisión | Razón | Estado |
|---|---|---|---|
| D143 | `select`: un "tic" en seno de Mi6 (1318 Hz), 40 ms, pico 0,12, al elegir juego (`GameTypeToggle`, las dos formas), continente (`RegionOption`) y cualquier `OptionTile` (modo, orden, temporizador, dificultad, sonido, tema; también en la partida guiada). Por un hook, `useSelectSound`, que envuelve el `onChange` por dentro: ningún wrapper de `ui/` cambia su API. Suena **después** del cambio y solo si la opción cambia de verdad. Con flechas también suena; dos tics a menos de 50 ms se quedan en uno | Es el sonido que más se repite: el más corto y bajo de la tabla, un roce y no una nota. Tras el cambio, para que activar "Sonidos" se confirme con el tic y desactivarlo no suene. Con flechas cada pulsación es una elección distinta (igual que un clic); lo que molestaría es la tecla mantenida, y eso lo corta el limitador | En curso (`feat/mas-sonidos`) |
| D144 | `start`: Do5 que se desliza a Sol5 (220 ms) con su octava, al arrancar una partida (`startGame` con éxito: "Comenzar" y "Repetir") y la práctica diaria. `skip`: Re5 suelto (150 ms, triángulo, sin octava) al saltar o al agotarse el temporizador de práctica, en `Session` y `CountriesPractice`. Sustituye la línea de D083 que hacía sonar el salto como un fallo | `start` en `useGame` y no en cada botón: suena solo si la partida arranca de verdad (un alcance ya practicado hoy no suena). `skip` ni sube ni baja: saltar es "no lo sé"; queda entre el acierto y el fallo en altura y más suave que los dos. Se sigue viendo como fallo (aviso rojo), como pide D083 | En curso (`feat/mas-sonidos`) |
| D145 | `penalty`: golpe tipo bombo (triángulo de Mi4 a Mi2 en 150 ms, más su octava de `withBody`) en `applyPenalty` de `Session`, el mismo instante en que aparece el badge "+10 s"/"+20 s" (D132). Suena **junto** al fallo o al salto del competitivo, no en su lugar | Los dos dicen cosas distintas (fallaste / te costó tiempo). No se tapan: el golpe es percusivo y se va a los 0,15 s; con la segunda nota del fallo solo se solapa su cola más grave. La octava empieza en 659 Hz, así que se oye en un altavoz de móvil (D125) | En curso (`feat/mas-sonidos`) |
| D146 | `record`: fanfarria en Do mayor (Sol–Do–Mi–Sol en staccato y acorde final de 0,55 s), ~1 s, más del doble que el logro. Suena al terminar un rush que **mejora una marca que ya existía** (misma regla que la guarda: completo, plausible, alcance con continente, clave vigente). Espera a que termine lo que suena, como el logro. `finishGame` marca `isNewRecord` en el resultado y `Results` muestra "¡Nuevo récord!" | El primer rush completado crea la marca, no la bate. La señal visible es obligatoria (D082): la línea de texto es la mínima; la insignia animada con confeti es de W7 (P19) y puede reemplazarla. Copy provisional #47 | En curso (`feat/mas-sonidos`) |

## Por qué así

- **Castigo junto al fallo, no en su lugar.** La otra salida era que en competitivo el
  golpe sustituyera al fallo. Se descartó porque el fallo del competitivo sonaría
  distinto del de la práctica sin que se vea distinto, y porque el salto del
  competitivo tendría que elegir entre "no lo sé" y "castigo". Juntos, cada sonido dice
  lo suyo y están diseñados para no taparse (registro y duración distintos).
- **El tic también con flechas.** La alternativa era callarlo con teclado (detectar
  la tecla en el `keydown` del grupo). Se descartó: quien navega con teclado se
  quedaría sin el refuerzo que sí tiene quien usa el ratón, y lo que de verdad
  molesta (la tecla mantenida) ya lo corta el limitador de 50 ms.
- **Récord solo al batir.** La alternativa era sonar también en la primera marca de
  un alcance. Se descartó: "batir la mejor marca" pide una marca previa, y la primera
  vez de cada continente sonaría a récord sin serlo.
- **Selector del ranking.** `GameTypeToggle` también está en el ranking, así que allí
  cambiar de juego también hace tic. El selector de continente del ranking
  (`ui/Select`) no suena: es un filtro de consulta, no configuración de partida.

## Medido

Espía sobre `AudioContext.prototype.createOscillator` en el navegador (servidor de
desarrollo, invitado), contando las notas programadas por cada evento:

- Elegir juego, continente, modo, tema: un tic cada uno. Elegir la opción ya marcada:
  nada. Con "Sonidos" apagado: nada. Al activarlo: un tic. Flechas en un grupo: un tic
  por cambio.
- "Comenzar" y "Repetir práctica": `start` una vez.
- Fallo en competitivo: `incorrect` + `penalty`, los dos en el mismo instante, con el
  badge "+10 s". Saltar en competitivo: `skip` + `penalty` con "+20 s". Saltar en
  práctica: solo `skip`.
- Rush de Centroamérica que mejora la marca: `record` una vez, después del último
  acierto, con "¡Nuevo récord!" en pantalla. El rush que creó la marca no sonó.

Tests unitarios en `tests/unit/sound-table.test.ts` (duraciones relativas, `skip` de
una nota, programación sobre un `AudioContext` falso).
