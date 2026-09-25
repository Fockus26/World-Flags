# Registro de cambios

Todo lo que cambia en World Flags para quien juega, de la versión más nueva a la
más vieja. La app muestra este mismo texto en "Novedades" (Perfil y
configuración).

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
las versiones siguen el [Versionado Semántico](https://semver.org/lang/es/).
Cómo se añade una entrada y cuándo se sube cada número: ver
[CONTRIBUTING.md](./CONTRIBUTING.md#changelog-and-versioning).

## [2.2.2] - 2026-09-24

### Cambiado

- El panel de la racha tiene la misma forma en todas las pantallas: tu racha y
  tu mejor racha arriba y, debajo, el calendario del mes a todo el ancho.

## [2.2.1] - 2026-09-24

### Seguridad

- El ranking rechaza los tiempos imposibles de conseguir jugando, para que nadie
  pueda colarse arriba con un tiempo inventado. Si te pasa con un tiempo tuyo, tu
  marca se queda guardada en tu progreso aunque no aparezca en el ranking.

## [2.2.0] - 2026-09-24

### Añadido

- En el móvil, Logros, Ranking y Elegir países están ahora en un menú (el botón
  de los tres puntos), cada uno con su nombre. Si tienes logros sin ver, el
  botón del menú lo avisa con un número.

### Cambiado

- En el móvil, las ventanas se cierran con una X arriba a la derecha en vez del
  botón "Cerrar".
- En el ordenador y la tableta, el panel de la racha ocupa todo el ancho: tu
  racha y tu mejor racha a un lado y el calendario del mes al otro.
- Las listas desplegables, como la de elegir qué practicar en el móvil, se
  abren y se cierran con una animación que ahora sí se nota.

## [2.1.4] - 2026-09-24

### Cambiado

- Si juegas con el teclado, el contorno que marca dónde estás toma el color del
  botón o de la tarjeta (rojo en "Cerrar" o "Abandonar", el color de tu nota en
  cada continente…) en vez de ser siempre morado.
- En el móvil, al tocar un botón o una tarjeta ves el mismo efecto que al pasar
  el ratón por encima en el ordenador, y desaparece al soltar.

### Corregido

- Algunos controles no marcaban nada al llegar a ellos con el teclado: los
  continentes y las casillas de países al elegir países sueltos, "Gestionar
  sesión" y la X de los avisos de logro. Ahora se ven.

## [2.1.3] - 2026-09-24

### Corregido

- Si empiezas desde cero, tu primer logro ya te avisa (y suena) al ganarlo.
  Antes se guardaba sin decir nada y solo lo veías al abrir la lista de logros.

## [2.1.2] - 2026-09-24

### Corregido

- Al pedir otra vez el correo de confirmación de la cuenta ya no aparece
  "Correo reenviado" si el envío falló: ahora se explica qué pasó para que
  puedas volver a intentarlo.
- El enlace del correo de confirmación te devuelve a la misma dirección desde
  la que te registraste.

## [2.1.1] - 2026-09-24

### Corregido

- En tema claro, el texto de la opción que tienes elegida en los ajustes de
  partida (modo, orden, dificultad, temporizador y tema) se lee mejor: ahora es
  blanco puro sobre el morado. También en la partida guiada.

## [2.1.0] - 2026-09-24

### Añadido

- Ahora suena un sonido corto al acertar y otro al fallar, en Banderas, Países y
  Capitales, en práctica, en competitivo y en la práctica diaria. Saltar una
  pregunta suena como un fallo.
- En el competitivo de Países cada país que encuentras suena con un toque corto,
  para que no se amontonen si escribes rápido.
- Al desbloquear logros suena una pequeña fanfarria, una sola vez aunque
  consigas varios a la vez.
- Puedes apagar los sonidos en Perfil y configuración, pestaña Juego, en
  "Sonidos". Se guarda en este dispositivo.

## [2.0.1] - 2026-09-24

### Cambiado

- En "Cómo se juega", la partida de ejemplo se juega al mismo tamaño que una
  partida normal, en vez de en una ventana pequeña.
- El recorrido ya no repite en cada paso que la partida es de ejemplo: lo dice
  una vez, mientras la juegas.
- En el último paso ya no sale "Saltar tutorial": para cerrar está "Empezar a
  jugar".

## [2.0.0] - 2026-09-24

### Añadido

- El ranking enseña ahora los 20 mejores tiempos, y si estás más abajo sigues
  viendo tu puesto debajo.
- Cada jugador del ranking aparece con su avatar. Si cambias tu nombre o tu
  avatar, el ranking se actualiza solo.
- Mientras el ranking carga, ves la forma de la lista en vez de un "Cargando".

### Cambiado

- El modo competitivo de Banderas y Capitales castiga más: cada respuesta
  incorrecta suma 10 segundos al cronómetro y cada bandera o capital saltada,
  20 segundos. Al fallar ves cuánto se sumó.
- Con el castigo nuevo, los tiempos de antes ya no se pueden comparar con los
  de ahora, así que el ranking de Banderas y el de Capitales empiezan de cero.
  Tu mejor tiempo de "Todo el mundo" en esos dos juegos también vuelve a
  empezar; los de cada continente y los logros que ya tenías se quedan.
- El ranking y los tiempos de Países no cambian: su competitivo no tiene
  castigo.

## [1.3.0] - 2026-09-23

### Cambiado

- La ventana de Logros es más ancha y enseña varias tarjetas por fila, así ves
  más logros de un vistazo sin tener que bajar tanto.
- En Novedades solo se despliega la versión que estás usando; las anteriores
  salen recogidas y se abren de una en una al pulsarlas.

## [1.2.0] - 2026-09-23

### Añadido

- La primera vez que abres la app te ofrece una partida guiada: te cuenta los
  tres juegos, los modos Práctica y Competitivo, el orden, la dificultad y el
  temporizador, y te deja jugar un ejemplo de Norteamérica con tres países.
- La partida de ejemplo no cuenta para nada: ni tu progreso, ni tu racha, ni
  tus mejores tiempos, ni el ranking. Puedes fallarla entera.
- Puedes saltarla cuando quieras, y volver a verla siempre que te apetezca
  desde "Cómo se juega", abajo del todo en Perfil y configuración.
- Si ya tenías progreso guardado, la partida guiada no te aparece sola.

## [1.1.0] - 2026-09-23

### Añadido

- Un tercer juego, Capitales: ves el nombre de un país y escribes su capital.
  Tiene lo mismo que Banderas: práctica con repetición espaciada, competitivo
  contrarreloj con su propio ranking de "Todo el mundo" y práctica diaria.
- En los países con más de una capital valen todas (por ejemplo, Sucre y La
  Paz en Bolivia), y al responder se muestran las otras que también valen y una
  nota cuando hace falta.
- En difícil y en el competitivo de Capitales cuentan las tildes, los guiones y
  los apóstrofos; en fácil no.
- Cuatro logros nuevos: tres de Capitales y "Tres en uno", por aprender un
  continente completo en los tres juegos.

### Cambiado

- El selector de juego tiene tres opciones; en pantallas estrechas es una lista
  desplegable.
- Dos logros compartidos ya no hablan solo de banderas: "Acierta 500 respuestas
  en total" y "Completa 5 sesiones sin un solo fallo".

### Corregido

- El resumen de una práctica de Países decía "banderas a la primera"; ahora
  dice "países".
- En el selector de juego, el marcador de la opción elegida quedaba un poco
  corrido a la derecha.

## [1.0.1] - 2026-09-23

### Corregido

- Al pulsar Enter dos veces seguidas en el competitivo de Banderas ya no se
  salta la bandera siguiente.
- Pulsar dos veces seguidas una tecla del 1 al 4 al calificar (en la práctica
  de Banderas y en la práctica diaria) ya no califica dos veces la misma
  tarjeta.

## [1.0.0] - 2026-09-21

### Añadido

- Dos juegos: Países, para aprender qué países hay en cada continente (cada uno
  vuela a su hueco en un tablero), y Banderas, donde ves una bandera y escribes
  su país.
- Modo práctica con repetición espaciada al estilo Anki: calificas cada
  respuesta y la app te vuelve a preguntar antes lo que olvidas que lo que ya
  dominas. Lo que fallas vuelve en la misma sesión, y cada país se practica una
  vez al día.
- Práctica diaria con todo lo que te toca repasar hoy, en cada juego por
  separado.
- Modo competitivo contrarreloj, con tu mejor tiempo por continente y en todo el
  mundo. En Banderas, fallar o saltar suma segundos; en Países puedes rendirte y
  ver los que te faltaron.
- En la práctica de Países, una tarjeta con el país que falta y pistas letra a
  letra. En la de Banderas, dificultad fácil o difícil (con tildes), orden
  alfabético o aleatorio y un temporizador opcional por bandera.
- Eliges qué practicar: todo el mundo, varios continentes a la vez o países
  sueltos elegidos a mano.
- Nota por continente con el promedio de tus últimas 3 partidas, y nota de Todo
  el mundo cuando ya practicaste los 8 continentes.
- Ranking público del mejor tiempo en Todo el mundo, uno por juego: los 5
  primeros y tu puesto.
- Logros en seis categorías (descubrimiento, continentes, velocidad, precisión,
  constancia y meta), separados por juego y con aviso al desbloquear uno. El
  progreso que ya tenías también cuenta.
- Racha de días seguidos, con un calendario de tu actividad del mes.
- Recordatorio diario opcional por notificación.
- Cuenta con correo y contraseña o con Google para guardar tu progreso en la
  nube y seguir en cualquier dispositivo. Sin cuenta juegas como invitado y el
  progreso se queda en tu navegador.
- Perfil con tu nombre y un avatar a elegir.
- Funciona sin conexión: lo que practiques se guarda y se sube a tu cuenta
  cuando vuelve la red, y la app te avisa del estado de la conexión. Las 197
  banderas se descargan una vez para practicar cualquier continente sin
  internet (no con ahorro de datos ni en redes 2G).
- Se instala como app en el móvil o el ordenador y avisa cuando hay una versión
  nueva.
- Tema claro, oscuro o el del sistema.
- 197 países: los 193 miembros de la ONU, el Vaticano, Palestina, Kosovo y
  Taiwán.
- Novedades: esta lista de cambios dentro de la app, con la versión que estás
  usando. Cuando la app se actualiza, un aviso te ofrece verla.
