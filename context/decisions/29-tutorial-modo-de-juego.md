# Tutorial — la partida de ejemplo limpia y a cualquiera de los tres juegos

> Unidad `feat/tutorial-modo-de-juego` (2.3.0), pendiente P9. Sobre
> `17-tutorial-inicial.md` (D071–D074) y `21-tutorial-pulido.md` (D090–D092).
> Pedido del dueño: quitar "Saltar tutorial" y el aviso "Partida de ejemplo…"
> **mientras se juega**, y dejar elegir el juego de la partida de ejemplo
> (hoy solo Países).

---

## D120 — Mientras se juega, nada encima de la partida

**Qué se hizo.** Con la partida de ejemplo en marcha, la cabecera del recorrido
queda entera en `sr-only`: ni aviso de "partida de ejemplo" ni "Saltar
tutorial". El `<h2>` del paso sigue ahí para el lector (nombra el diálogo) y la
región viva sigue anunciando el paso, como en D090.

`sr-only` en la cabecera y no solo en el `<h2>`: es `position: absolute`, así que
sale del `flex` en columna del diálogo y no se come ni su alto (`min-h-10`) ni el
`gap`. Resultado: la partida de ejemplo mide lo mismo que una normal **también
de alto** en pantallas bajas, que era lo que D090 dejaba pendiente ("pierde la
fila de cabecera", 48–73 px) y su alternativa descartada.

**Cómo se sale.** Con el "Abandonar" de la propia partida (vuelve al paso, con
su aviso de confirmación) o con Escape, que sigue cerrando el recorrido entero
(`isKeyboardDismissDisabled` no se toca, D073). Fuera de la partida —antes de
empezarla, tras terminarla y en los demás pasos salvo el último (D091)—
"Saltar tutorial" sigue donde estaba.

**Alternativa descartada:** dejar "Saltar tutorial" visible como botón pequeño
dentro de la cabecera de la partida. Obligaba a meter UI del recorrido dentro
de `CountriesPractice`/`Session` y era justo lo que el dueño pidió quitar.

---

## D121 — El juego de la partida de ejemplo se elige; `Session` recibe `SessionRuntime`

**Selector.** `TutorialSettings` gana un `Fieldset` "Juego" arriba de Orden,
Dificultad y Temporizador, con el mismo patrón (`OptionTile`, `name` propio
`tutorial-game-type`) y las mismas constantes que el selector de la
configuración (`GAME_TYPES`, `GAME_TYPE_LABELS`): Países, Banderas, Capitales,
en ese orden (D030/D066). Entra en la configuración del sandbox
(`configuration.gameType`); por defecto, Países, como hasta ahora. El paso pasa a
llamarse "Juego y ajustes". Los tres países siguen siendo Norteamérica (D074) y
el modo sigue siendo Práctica (D073).

**Banderas y Capitales por el sandbox.** Hasta ahora `Session.tsx` llamaba a
`useGame()` por dentro (D072 lo dejaba así porque el tutorial no la montaba).
Ahora recibe `runtime: SessionRuntime` como **prop obligatoria**, igual que
`CountriesPractice`, y `exitDescription?` para el aviso de abandonar:

- `FlagGame` inyecta el mismo `useGame()` que ya pasaba a `CountriesPractice`.
  El juego real no cambia: es el mismo objeto con las mismas funciones.
- `SessionRuntime` gana `attemptCountry`, que `Session` usa en su competitivo.
  `useGame()` ya lo tenía (lo cumple por estructura); el sandbox lo implementa
  con `recordSandboxAttempts`, que solo cuenta. La partida guiada nunca es
  competitiva, pero el contrato no deja huecos.
- El tutorial monta `CountriesPractice` si el juego es Países y `Session` si no,
  como hace `FlagGame` en Práctica.
- Las instrucciones del paso de la partida dependen del juego
  (`DEMO_INSTRUCTIONS: Record<GameType, …>`, D061): `TutorialStep.body` admite
  una función del juego.

**Tests** (`tests/unit/tutorial-sandbox.test.ts`): la partida entera a cada uno
de los tres juegos (con intentos y calificaciones) deja `localStorage` sin una
escritura y byte a byte igual; el ejemplo por defecto es Países; la guardia de
imports cubre ahora `Session.tsx`, `session-cards.tsx` y `usePracticeQueue.ts`;
y la de "prop obligatoria" se aplica a `CountriesPractice` y a `Session`.

**Alternativa descartada:** un `SessionRuntime` ampliado solo para `Session`
(`CardSessionRuntime`). Dos contratos para lo mismo; `attemptCountry` no escribe
nada en el sandbox, así que no hay riesgo en tenerlo en el común.

---

## D122 — Que no cuenta se dice antes de empezar y al abandonar (sustituye a D092)

D092 lo decía una sola vez, en el aviso visible mientras se juega. Sin ese aviso
(D120), la información pasa a:

- **El texto del paso de la partida**, justo encima de "Empezar la partida":
  "Es una partida de ejemplo: no cuenta para tu progreso, tu racha ni el
  ranking, así que puedes fallar sin miedo. Para dejarla a medias, pulsa
  «Abandonar»; con Escape cierras el recorrido."
- **El aviso de abandonar** de la partida de ejemplo: "Es la partida de
  ejemplo: no se guarda nada. Vuelves al recorrido y puedes empezarla otra vez
  cuando quieras."

El resto de D092 se mantiene (bienvenida, ajustes, aviso del competitivo,
botones y fin no lo repiten). Copy provisional: `CONTENT_CHECKLIST.md` #39.

**Alternativa descartada:** decirlo solo en el paso anterior ("Juego y
ajustes"). Queda a un clic de distancia de la partida y quien vuelve a jugarla
("Jugar otra vez") no lo vería.
