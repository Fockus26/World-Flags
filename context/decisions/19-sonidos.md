# Sonidos de acierto, fallo y logro

> Unidad `feat/sonidos` (1.3.0). Pedido del dueño, literal: *"Agregar sonidos al
> responder correcta e incorrectamente, también en los logros."*

---

## D080 — Sonidos sintetizados con Web Audio, sin archivos

**Qué es.** `src/utils/sound.ts` expone una sola función, `playSound(name)`, con
cuatro sonidos:

| Sonido | Cuándo | Forma | Duración |
|---|---|---|---|
| `correct` | acierto | dos notas ascendentes (Mi5–La5, cuarta justa), triángulo + octava suave | ~0,3 s |
| `incorrect` | fallo o salto | dos notas graves descendentes (Re4–La3) en seno, la última se desliza un poco hacia abajo | ~0,3 s |
| `found` | país encontrado en el rush de Países | un solo toque del La5 del acierto, más corto y más suave | ~0,1 s |
| `achievement` | tanda de logros nuevos | arpegio de Do mayor (Do–Mi–Sol–Do) | ~0,4 s |

Todas las notas llevan envolvente (ataque de 8 ms, caída exponencial) para que no
hagan "clic", y pasan por una ganancia general baja (0,35).

**Por qué sintetizados y no archivos de audio:**

- **0 KB de assets.** Nada que añadir al precache del SW (D054) ni que versionar.
- **Funcionan sin red**, que es la mitad de la gracia de la PWA (D050–D054). Un
  archivo que no llegó a cachearse sería silencio justo sin conexión.
- **Sin licencias** que revisar ni atribuciones que mostrar.
- Se ajustan en código (tono, duración, volumen) sin editar audio.

La alternativa (archivos `.mp3`/`.ogg` de un banco libre) suena más "producida",
pero cuesta peso, precache y una licencia que aprobar. Si algún día se quiere,
`playSound` es el único punto que cambia.

**Contexto y política de reproducción automática.** Un único `AudioContext`,
creado la primera vez que hace falta. `playSound` se llama dentro del manejador
del gesto que lo provoca (enviar, calificar, escribir), que es donde el navegador
deja arrancar el audio. Si el contexto está suspendido se pide `resume()`; si no
se reanuda en 150 ms, ese sonido se descarta — fuera de un gesto `resume()` puede
quedarse esperando al siguiente toque y entonces sonaría todo lo acumulado de
golpe.

**Nunca rompe el juego.** Sin Web Audio, con la pestaña oculta
(`document.hidden`), con el contexto bloqueado o ante cualquier error: no suena y
no pasa nada más.

**Logros: una vez por tanda.** Suena en `AchievementsEffects`, justo después de
encolar los avisos, así que varios logros juntos son un solo arpegio. Además, un
segundo arpegio que llegue mientras suena el primero (un logro que desbloquea
otro en la pasada siguiente) se descarta. El arpegio espera a que termine el
sonido anterior (el acierto que lo desbloqueó) en vez de pisarlo.

**Nunca suena** en la pasada silenciosa de la primera carga (la siembra
retroactiva, o lo que trae un login) ni por logros que llegan de otro
dispositivo: esos llegan ya sellados y no están en `getNewlyUnlocked`. Si una
sincronización trajera progreso que cruza un umbral no sellado en el otro
dispositivo, sonaría igual que ya sale su aviso: el sonido sigue al aviso.

---

## D081 — Interruptor "Sonidos", activado por defecto y por dispositivo

**Dónde.** Pestaña Juego de "Perfil y configuración", encima de "Tema": un
`Fieldset` "Sonidos" con dos `OptionTile` (Desactivados / Activados), el mismo
patrón que "Temporizador". No un `Switch` suelto: la pestaña entera son grupos
de radio con leyenda, y así se lee (y se navega con flechas) igual que el resto.

**Dónde se guarda.** Clave propia `world-flags-sound-enabled` en `localStorage`,
siempre vía `learning-storage.ts` (`getSoundEnabled` / `saveSoundEnabled`). Por
dispositivo, como la marca del tutorial (D071) y la versión vista (D058), no en
`UserLearningData`:

1. Es una preferencia del aparato (el móvil callado en el transporte, el
   portátil con sonido en casa), no de la cuenta.
2. En el blob costaría una columna nueva en Supabase con su SQL a mano.
3. El invitado también tiene que poder apagarlo.

**Activado por defecto.** Solo el valor `"false"` lo apaga: ausente, raro o
ilegible → activado. Es lo que pidió el dueño (que suene), y apagarlo está a un
toque en la configuración. La alternativa (apagado por defecto, se activa a
mano) sería más prudente con quien juega en público, pero casi nadie lo
descubriría.

**En vivo, sin recargar.** `useSoundPreference` usa `useSyncExternalStore`
(también escucha `storage`, para otras pestañas). Quien reproduce vuelve a leer
la preferencia en cada sonido, así que ninguna pantalla de partida necesita
suscribirse: apagarlo surte efecto en el siguiente sonido.

**La partida guiada solo lee.** `CountriesPractice` importa `playSound`, que
solo llama a `getSoundEnabled`. `saveSoundEnabled` y `useSoundPreference`
entran en la lista de imports prohibidos de `tests/unit/tutorial-sandbox.test.ts`,
y `utils/sound.ts` entra en los archivos que revisa.

---

## D082 — El sonido es un refuerzo, nunca la única señal

Todo lo que suena ya se ve y se anuncia: el aviso de respuesta lleva icono y
texto (y su región viva), el rush de Países anuncia cada país encontrado por
`aria-live`, el aviso de logro es un `role="status"`. Quien juega sin sonido (por
elección, por no poder oír o por tener el móvil en silencio) no pierde nada.
WCAG 1.4.2 no aplica (ningún sonido dura más de 3 s), y el interruptor da control
igualmente.

---

## D083 — Qué suena en cada pantalla

**Regla: suena lo que se ve.**

- **Banderas y Capitales (`Session`), práctica y competitivo:** acierto o fallo
  al comprobar la respuesta. Calificar después (Otra vez/Difícil/Bien/Fácil) no
  suena otra vez.
- **Saltar**, en los dos modos, suena como fallo: se ve como fallo (aviso rojo
  con la respuesta). En competitivo además penaliza; en práctica se califica
  "otra vez" sola. Lo mismo cuando se agota el temporizador de práctica (llama al
  mismo salto). La alternativa era no sonar al saltar en práctica (un salto es
  "no lo sé", no un error), pero rompería la regla de que suena lo que se ve.
- **Práctica de Países (`CountriesPractice`, también en la partida guiada):**
  igual que la práctica de Banderas.
- **Práctica diaria:** no se escribe la respuesta, se revela y quien juega se
  califica. Suena al calificar: "Otra vez" como fallo, el resto como acierto (el
  mismo criterio con el que la práctica diaria cuenta aciertos).

---

## D084 — Rush de Países: un toque corto y sin amontonarse

Escribiendo rápido, los países llegan muy seguidos. Cada país encontrado suena
con `found` (un toque de ~0,1 s, más suave que el acierto), y dos `found` a menos
de 70 ms se quedan en uno (el segundo se descarta, no se encola). Así, al
escribir deprisa se oye un "tic" por país, no una pila de acordes.

Fallo en el rush de Países: solo Enter con algo que no es un país del alcance
(lo único que allí se muestra como error). "Ya tienes X" es un recordatorio, no
un fallo, y no suena. No hay penalización que reforzar.
