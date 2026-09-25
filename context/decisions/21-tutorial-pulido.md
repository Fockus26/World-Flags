# Pulido del tutorial — partida a tamaño real, "ejemplo" una vez, sin saltar al final

> Unidad `fix/tutorial-pulido` (1.2.1). Sobre la partida guiada de
> `17-tutorial-inicial.md` (D071–D074). Petición del dueño, literal:
> *"En cómo se juega el botón saltar tutorial no debería de aparecer en el último
> paso ya que es redundante, en muchas partes dice que es una partida ejemplo
> basta con decirlo una vez; en el ejemplo de juego aumentar el ancho y el alto al
> de una partida normal, no se tiene que limitar al del modal"*.

---

## D090 — Mientras se juega, el diálogo hace de `<main>`: la partida mide lo mismo

**Antes.** El diálogo medía `w-[min(58rem,94vw)]`, pero `size="md"` de HeroUI le
pone `max-w-md` (28rem), así que en escritorio se quedaba en **448 px**; la
partida vivía en un hueco fijo `h-[min(60dvh,30rem)]`. En una pantalla de
1440×900 eso es una partida de ~400×480 frente a los 928×800 de la de verdad.

**Qué se hizo.**

- `ui/Modal` gana `fillViewport?: boolean` (por defecto `false`: los consumidores
  de hoy no cambian). En `true` el contenedor de HeroUI deja su margen
  (`p-4 sm:p-10`) y el alto máximo pasa de `90dvh` al viewport entero. Puede
  cambiar con el diálogo abierto.
- `Tutorial` lo activa solo mientras `isPlaying`, y le da al diálogo **el mismo
  padding que `<main>` en `FlagGame`** (`p-[0.4rem]`, desde `sm`
  `p-[clamp(0.5rem,2vh,1.5rem)]`) y un ancho de `min(100vw, 58rem + 2·padding)`.
  La `<section>` de `CountriesPractice` queda así exactamente con el ancho de una
  partida normal. En móvil es una hoja a pantalla entera, sin radio.
- El hueco de la partida recibe el **mismo tope de alto** que la sección tiene en
  `FlagGame` (`45rem`, desde `md` `50rem`) y se deja encoger (`min-h-0` en cada
  nivel del `flex`) cuando no cabe. No se mide nada en JS.
- Jugando, el `<h2>` del paso pasa a `sr-only` (sigue nombrando el diálogo; la
  región viva anuncia el paso) y la cabecera queda en una sola fila: el aviso de
  "partida de ejemplo" y "Saltar tutorial". La partida ya trae su propio
  encabezado con el continente.
- Fuera de la partida, los pasos vuelven al tamaño de antes (los 448 px incluidos:
  "Fuera de la partida, los pasos vuelven al tamaño de hoy"). Ancho y padding
  llevan `transition` de 300 ms; el alto va con el contenido y no se anima. El
  bloque global de `prefers-reduced-motion` la reduce a 0,01 ms.

**Medido** (ancho × alto de la `<section>`, partida real frente al ejemplo):

| Viewport | Partida normal | Ejemplo, antes | Ejemplo, ahora |
|---|---|---|---|
| 320×568 | 307 × 555 | ~270 × 358 | 307 × 482 |
| 390×844 | 378 × 720 | — | 378 × 720 |
| 768×1024 | 727 × 800 | — | 727 × 800 |
| 1280×800 | 928 × 768 | — | 928 × 720 |
| 1440×900 | 928 × 800 | ~400 × 480 | 928 × 800 |

La columna "antes" no se volvió a medir: el alto de 320×568 es el medido en
`feat/tutorial-inicial` y el resto sale de las clases (448 px de diálogo menos su
padding de 24 px, y `30rem`).

El ancho es idéntico siempre. El alto lo es mientras el viewport deja sitio para
la cabecera del recorrido encima; cuando no (320×568, 1280×800), la partida pierde
exactamente lo que ocupa esa fila (48–73 px) en vez de desbordar.

**Coste asumido.** El padding de `<main>` y los topes de la sección están
repetidos en `Tutorial.tsx` (con comentario que lo avisa). Extraerlos a una
constante compartida habría tocado `FlagGame` y `CountriesPractice`, fuera del
alcance.

**Alternativa descartada:** quitar también la cabecera del recorrido mientras se
juega (el aviso dentro de la partida y "Saltar tutorial" solo por Escape) para
igualar el alto también en pantallas bajas. Se pierde el botón visible de salir
del recorrido y habría que meter el aviso dentro de `CountriesPractice`.

---

## D091 — Sin "Saltar tutorial" en el último paso

En el último paso ya está "Empezar a jugar", que cierra igual: dos botones de
cierre sobraban. Escape sigue cerrando. La cabecera lleva `min-h-10` (el alto del
botón, 40 px), así que al desaparecer no encoge: medido, 44 px en los pasos 5 y 6
en escritorio.

---

## D092 — Que la partida es de ejemplo y no cuenta se dice una sola vez

> **Sustituida por D122** (`29-tutorial-modo-de-juego.md`): el aviso de encima
> de la partida desaparece (D120) y la información pasa al texto del paso de la
> partida y al aviso de abandonar.

Se dice en el aviso que se ve **mientras se juega** (`demoBanner`), que absorbe
lo que antes contaba la bienvenida: *no cuenta para tu progreso, tu racha ni el
ranking; puedes fallar sin miedo*. Se reescribió el resto para no repetirlo:

- Bienvenida: anuncia los pasos y que al final se juega una partida corta de
  Norteamérica; sin el párrafo de "nada cuenta".
- Ajustes: "la partida del paso siguiente empieza con lo que dejes aquí".
- Aviso del competitivo: "La partida de este recorrido se juega en Práctica".
- Botones: "Empezar la partida" y "Jugar otra vez".
- Al terminar: "Partida terminada: así es como se juega".
- Aviso de abandonar: "Vuelves al recorrido y puedes empezarla otra vez cuando
  quieras". Sigue sin decir "el progreso se perderá" (D073), pero ya no repite
  que no cuenta: el aviso está a la vista justo encima de "Abandonar".

"Mejores tiempos" se cae del texto: el ejemplo es siempre Práctica (D073), que no
tiene tiempos. Todo sigue siendo copy provisional (`CONTENT_CHECKLIST.md` #24,
#25 y #31).
