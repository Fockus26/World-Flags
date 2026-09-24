# Registro de cambios

Todo lo que cambia en World Flags para quien juega, de la versión más nueva a la
más vieja. La app muestra este mismo texto en "Novedades" (Perfil y
configuración).

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
las versiones siguen el [Versionado Semántico](https://semver.org/lang/es/).
Cómo se añade una entrada y cuándo se sube cada número: ver
[CONTRIBUTING.md](./CONTRIBUTING.md#changelog-and-versioning).

## [2.0.0] - 2026-09-23

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
