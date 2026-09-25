# Avisos: sonido de fallo, logros en tanda y permiso de notificaciones

> Unidad `fix/avisos-sonido-notificaciones` (2.2.1). Pendientes P11, P12 y P13 de
> la tanda del 2026-09-24.

---

## D125 — El sonido de fallo, igual de audible que el de acierto

**Problema.** El fallo (D080) eran dos senos graves (Re4–La3, 294 → 220 Hz) con
picos 0,55/0,6, frente al acierto en triángulo (Mi5–La5, 659 → 880 Hz) con pico
0,5. En el papel, el fallo tenía más energía (+2,6 dB sin ponderar), pero el oído
es mucho menos sensible en graves (curvas de igual sonoridad) y los altavoces de
móvil casi no reproducen nada por debajo de ~500 Hz, y un seno no tiene armónicos
que lo rescaten.

**Medido, no supuesto.** Se calculó la energía de cada parcial con la misma
envolvente que `scheduleNote` (ataque 8 ms, caída exponencial) y se ponderó con
la curva A (IEC 61672) y, aparte, con la A más un altavoz de móvil simulado (paso
alto Butterworth de 4.º orden a 500 Hz). Diferencia con el acierto:

| Versión | Sin ponderar | Curva A | Móvil simulado |
|---|---|---|---|
| Fallo de antes (Re4–La3, seno 0,55/0,6) | +2,6 dB | **−5,6 dB** | **−26,6 dB** |
| Fallo nuevo (La4–Mi4, triángulo 0,65/0,7 + octava a ½) | +3,6 dB | +0,6 dB | −1,8 dB |

**Qué cambia.**

- **Notas:** La4 → Mi4 (440 → 330 Hz), cuarta justa descendente: el espejo del
  acierto (Mi5 → La5 ascendente) una octava más abajo. Sigue siendo "abajo" y
  "hacia abajo", con el mismo deslizamiento final (×0,94).
- **Timbre:** triángulo (el del acierto) en vez de seno, más una octava en seno
  a la mitad del pico (`withBody`). Esa octava (660–880 Hz) es lo que suena en el
  móvil; el oído reconstruye la nota grave a partir de ella.
- **Picos:** 0,65 y 0,7 (antes 0,55 y 0,6). Suma de picos en el peor momento
  ≈ 1,05 × 0,35 de volumen general: lejos de saturar.
- **Sin estridencia:** nada por encima de 880 Hz salvo los armónicos impares del
  triángulo (el 3.º a −19 dB); nada de cuadradas ni diente de sierra.

Se descartó subir solo la ganancia del seno: para igualar en el móvil harían
falta ~+27 dB, imposible sin saturar, y en auriculares quedaría atronador.

La alternativa (un fallo más agudo, en la zona del acierto) se oiría igual en
todas partes, pero se confundiría con el acierto; el contorno descendente y el
registro más bajo son lo que lo distingue sin mirar.

---

## D126 — El permiso de notificaciones se pide dentro del gesto, sin nada antes

**Pedido (P13).** El dueño pulsa "Sí, avísame" y el navegador nunca enseña su
diálogo de permiso.

**Qué se revisó y qué se encontró.**

| Punto | Antes | Ahora |
|---|---|---|
| Llamada dentro del gesto | `handleAccept` hacía `setIsSubscribing(true)` y luego llamaba a una función `async` cuya primera línea era `await Notification.requestPermission()`. Técnicamente síncrona (una `async` corre hasta su primer `await`), pero frágil: cualquier `await` que se añadiera antes la sacaba del gesto. | `subscribeToDailyReminder` ya no es `async`: comprueba el soporte (síncrono) y su primera acción asíncrona es la propia petición; el manejador la llama antes de tocar el estado. Medido con Playwright: la petición llega con `navigator.userActivation.isActive === true`. |
| Permiso ya decidido | Se llamaba igual; si estaba `denied` el navegador responde `denied` al instante **sin enseñar nada**, y la app cerraba el aviso como si hubiera ido bien. | Con `granted`/`denied` no se pregunta y se actúa según el caso (D127). |
| Contexto seguro | Sin comprobar. Por `http` fuera de `localhost` (el servidor de desarrollo abierto desde el móvil por la IP de la red) no existen `serviceWorker` ni `PushManager`: `isPushSupported()` daba `false` y el aviso se cerraba en silencio. | `getNotificationSupport()` lo distingue (`insecure-context`) y se explica. |
| Soporte | iPhone/iPad en Safari sin instalar no tienen `PushManager` (iOS solo da Web Push a la app en la pantalla de inicio, 16.4+): mismo cierre silencioso. | `ios-needs-install`, con instrucciones. |
| Safari antiguo | Solo acepta `requestPermission(callback)`. | Se atienden la forma con promesa y con callback. |
| Suscripción del SW | `navigator.serviceWorker.ready` no se resuelve nunca si el SW no se registró: el aviso se quedaba "enviando" para siempre. | Límite de 10 s y se da por fallido. |

**Lo más probable en el caso del dueño**, por orden: el permiso ya estaba en
`denied` para ese origen (un "Bloquear" anterior, o el bloqueo automático de
Chrome tras varios rechazos), Chrome con los avisos "silenciosos" (solo una
campana tachada en la barra de direcciones, sin diálogo), o probar desde el
móvil por `http://<IP>`. En los tres la app callaba; ahora lo dice.

**Fuera del cliente (no se toca aquí):** el `.env` local no tiene
`PUBLIC_VAPID_PUBLIC_KEY`. Sin ella, aunque se conceda el permiso, no hay
suscripción (ahora se ve el aviso de fallo y el motivo en la consola). Hay que
comprobar que esté en el entorno de producción y que las Edge Functions
`subscribe-push` y `send-daily-reminders` estén desplegadas con sus secretos
VAPID.

---

## D127 — Si el recordatorio no se activa, el aviso explica por qué

`subscribeToDailyReminder` devuelve qué pasó en vez de un booleano:
`subscribed`, `dismissed`, `denied`, `failed`, `insecure-context`,
`ios-needs-install` o `unsupported`.

- **`subscribed`** → se guarda la respuesta como sí y se cierra (como antes).
- **`dismissed`** (se cerró el diálogo del navegador sin elegir) → se guarda
  como no y se cierra, sin sermón: fue una decisión.
- **El resto** → el mismo aviso cambia de contenido: icono, título y qué hacer.
  `denied` explica cómo permitirlo en los permisos del sitio y ofrece
  "Reintentar"; `failed` también ofrece "Reintentar"; los que no se arreglan sin
  salir (iPhone sin instalar, sin https, navegador sin soporte) solo
  "Entendido". Cerrar desde aquí guarda la respuesta como **no** (antes se
  guardaba "sí" aunque no hubiera suscripción).

El aviso vive en la región `role="status"` de `SystemSnackbars`, así que el
cambio se anuncia. El botón pulsado desaparece al cambiar de estado: si el foco
estaba en el aviso, pasa a la primera acción del estado nuevo (no cae a `body`);
si estaba en otro sitio no se roba.

⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #41): los cinco textos de
explicación.

**Decisión tomada / alternativa.** Se sigue haciendo la pregunta a todos y se
explica el problema al pulsar "Sí". La alternativa era no preguntar cuando se
sabe de antemano que no puede funcionar (sin soporte, sin https) o preguntar ya
con la explicación (`denied`): menos pasos, pero en iPhone sin instalar
escondería que la función existe. Tampoco hay todavía un sitio en Configuración
para activar el recordatorio más tarde: tras cerrar, no se vuelve a preguntar
(como antes); añadirlo sería una función nueva (MINOR).

---

## D128 — Avisos de logro: la tarjeta se quita al terminar su salida

**Reproducción (P12).** Invitado limpio en el servidor de desarrollo, Chrome sin
cabeza con Playwright. Se despacha un `setLearningData` que cruza tres umbrales a
la vez (5 sesiones perfectas, 500 aciertos, 90 % tras 500 respuestas), así que
entran tres avisos por la ruta real (`AchievementsEffects` → cola →
`AchievementToasts`). Se muestrea en cada fotograma la opacidad, la posición y la
animación de cada tarjeta, y la identidad del nodo (para ver remontajes).

**Qué se midió.**

- **Entrada:** limpia. Las tres tarjetas nacen en opacidad 0 con la animación
  `enter` y llegan a 1 en ~200 ms, sin remontajes ni saltos de posición. La cola
  no cambia de `key` ni de orden. Solo hay una tarea larga de ~130 ms (el propio
  despacho y el sellado) antes del primer fotograma.
- **Salida: el parpadeo.** A los 6 s las tres pasan a `exit` y bajan a
  opacidad 0,01 en 200 ms; en el fotograma siguiente **vuelven las tres a
  opacidad 1 y a su posición inicial** y un fotograma después desaparecen.

**Causa.** Las utilidades de `tw-animate-css` usan
`animation-fill-mode: none`: al terminar la animación de salida el elemento
vuelve a su estilo normal (visible). La tarjeta se quitaba con un
`setTimeout` de 220 ms, 20 ms más que la animación, y ese hueco (más lo que se
retrase el temporizador si el hilo principal va cargado) es el destello. Con un
solo aviso dura un fotograma; con varios, como todas entraron a la vez, salen y
destellan a la vez: un bloque entero que parpadea.

**Arreglo.**

1. La salida lleva `fill-mode-forwards`: se queda en su último fotograma
   (invisible) aunque la tarjeta tarde en quitarse.
2. La tarjeta se quita en `onAnimationEnd` de su propia animación de salida (se
   ignoran las que burbujean de dentro), no por un tiempo que tenga que coincidir
   con `duration-200`. Un temporizador de 400 ms queda solo como red de
   seguridad (pestaña oculta, animaciones apagadas); con movimiento reducido se
   quita al momento, como antes.

Medido después: las tarjetas pasan de 0,01 a desaparecer sin volver a 1; con
movimiento reducido entran y salen sin animación.

**No reproducido:** un parpadeo al **entrar**. Si el dueño lo sigue viendo al
entrar (p. ej. al terminar una partida, con Resultados subiendo a la vez), hace
falta una grabación de ese momento: la ruta de entrada medida no remonta ni
repite la animación.

La alternativa (animar también el hueco que dejan al irse, con una transición de
altura) evitaría el salto de las tarjetas de arriba cuando se va una de abajo
que llegó antes, pero añade medición de alturas para un caso raro (tandas
separadas en el tiempo); se deja fuera.
