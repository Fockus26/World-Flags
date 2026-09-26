# Castigo del competitivo animado junto al cronómetro

> Unidad `feat/castigo-animado` (P10 de `plans/pendientes.md`). Del dueño: que el
> "+10 s al cronómetro" salga del aviso de fallo y aparezca un "+10" / "+20" al
> lado del cronómetro con una animación de suma, con CSS (no framer, D006),
> respetando `prefers-reduced-motion` y anunciado en `aria-live`. El resto,
> decisiones del agente justificadas aquí.

---

## D132 — "+10 s" junto al cronómetro; el cronómetro salta en el mismo instante

Sustituye la parte de D075 que decía el castigo dentro del aviso de fallo
(`AnswerForm.penaltyLabel`, que desaparece). La regla (+10 s fallo, +20 s
salto, constantes en `types/country.ts`) no cambia.

- **Dónde.** `Header` envuelve el cronómetro del rush en un `relative` y pinta a
  su izquierda (`absolute right-full`) un `PenaltyBadge` por castigo:
  `formatPenalty` ("+10 s"), `text-danger-hover` (el tono de texto de danger que
  pasa AA en claro y oscuro, `COLORS.md`), `font-extrabold tabular-nums`. Queda
  en el hueco entre el contador y el cronómetro, fuera del flujo: no empuja nada
  ni cambia el alto de la cabecera.
- **Texto.** "+10 s" y no "+10" a secas: el cronómetro también lleva la "s" por
  debajo del minuto, y sin unidad se podía leer como diez puntos o diez
  tarjetas. Alternativa: "+10", tal cual lo escribió el dueño.
- **Animación** (`tw-animate-css`): el badge entra subiendo
  (`fade-in-0 slide-in-from-bottom-3`, 200 ms), se queda y sale hacia arriba
  desvaneciéndose (`fade-out-0 slide-out-to-top-3 fill-mode-forwards`, 300 ms).
  El cronómetro "salta": su `span` lleva `key` = id del último castigo y
  `zoom-in-125` (de 125 % a 100 % en 300 ms), así que cada castigo lo remonta y
  rearranca la animación.
- **El número salta junto al "+10 s", no 900 ms después.** El intervalo del
  cronómetro está congelado durante la pausa entre tarjetas (`pauseThenAdvance`),
  así que antes el castigo solo se veía al avanzar. `applyPenalty` en `Session`
  resta el castigo al `startTimeRef` **y** hace `setElapsedMs` al momento. El
  tiempo final es el mismo: la pausa se sigue descontando al reanudar.
- **Reloj monótono (de P15).** Todo el reloj de `Session` (inicio, cronómetro,
  castigos, pausa entre tarjetas y la del modal de abandonar) mide con
  `performance.now()` en vez de `Date.now()`: si la hora del sistema cambia a
  mitad del rush (ajuste manual, sincronización NTP), el tiempo ya no salta ni
  sale negativo. Solo se usan diferencias, así que el tiempo final es el mismo.
  `finishedAt` sigue siendo `new Date()` (es una fecha, no una duración).
- **Tutorial.** La partida guiada monta el mismo `Session`, pero siempre en
  práctica (`TUTORIAL_CONFIGURATION.mode = "practice"`; elegir "Competitivo" en
  el paso de modo solo explica qué implica): allí no hay cronómetro ni castigo,
  así que el "+10 s" no aparece. Verificado en el navegador. Si algún día la
  partida guiada se juega en competitivo, lo hereda sin código aparte.

## D133 — Vida del badge por temporizador y uno por evento

- `Session` guarda una lista `penalties: { id, penaltyMs }[]` con `id`
  creciente (ref). Cada badge se pinta con `key={id}`: dos castigos seguidos no
  se pisan, cada uno arranca su propia animación y el anterior termina su
  salida mientras entra el nuevo (el hueco mínimo entre dos es la pausa de
  900 ms del rush; el badge vive 900 + 300 ms, así que se solapan como mucho en
  la salida del primero).
- La vida del badge la marcan **temporizadores** (900 ms visible, 300 ms de
  salida, luego `onDone` lo quita de la lista), no `animationend`. Así, con
  movimiento reducido (`motion-reduce:animate-none`) aparece, se queda el mismo
  tiempo y desaparece, sin moverse. Con eventos de animación, al anular la
  animación no llegaría ningún `animationend` y el badge no se iría.
- `onDone` se lee de un ref: el padre renderiza cada 100 ms (cronómetro) con una
  flecha nueva y, como dependencia del efecto, reiniciaría los temporizadores
  sin parar.

## D134 — Anuncio "10 segundos de castigo" en `aria-live` discreto

El badge es `aria-hidden` (el "+10 s" leído suelto no dice nada). Junto al
cronómetro hay una región `sr-only aria-live="polite"` montada desde el inicio
del rush, con un `span` por castigo (`key` = id): cada castigo mete un nodo
nuevo, así que dos "10 segundos de castigo" seguidos se anuncian los dos.
`polite` para no cortar el aviso de fallo (`role="alert"`, "La respuesta
correcta es…"), que sigue siendo lo primero. Texto en
`formatPenaltyAnnouncement` (`utils/rush-penalty.ts`), generado desde la
constante. ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #43).
