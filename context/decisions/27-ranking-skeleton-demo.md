# Ranking — skeleton inmediato, altura animada y ranking de demostración

> Unidad `feat/ranking-skeleton-demo` (2.2.1), pendientes P7 y P8 de la tanda del
> 2026-09-24. Del dueño: el skeleton del ranking **desde el primer frame**, **animar
> la altura** del modal (anulada con movimiento reducido) y un ranking de prueba
> de 30 personas **solo en el cliente, en desarrollo** (nada en la base). El resto
> de detalles son del agente, justificados aquí.

---

## D115 — El skeleton del ranking se ve desde el primer frame

`ui/Skeleton` gana la prop opcional `immediate`: sin la espera de
`SKELETON_DELAY_MS` (300 ms, D042) ni el fundido de entrada. Por defecto `false`,
así que el resto de consumidores (pantalla de inicio, avatares) no cambian.

La usan solo las 5 filas de carga de `LeaderboardModal` (D077). El umbral de D042
existe para no hacer parpadear un gris en cargas casi instantáneas (el invitado,
que hidrata de `localStorage`); el ranking va **siempre** a la red, y la espera
dejaba ver durante 300 ms una caja vacía del alto del skeleton.

Se mantiene con umbral:

- **`LoadingAnnouncer`**: sigue anunciando "Cargando el ranking…" solo si la
  carga pasa de 300 ms. Anunciar cada apertura con red rápida sería ruido para el
  lector de pantalla; lo que ve la vista y lo que se oye ya no coinciden en ese
  primer tramo, a propósito.
- **El avatar de cada fila (`UserAvatar`)**: con caché HTTP carga al instante y un
  skeleton inmediato parpadearía.

Alternativa: dejar el umbral y aceptar el hueco (lo que había). Descartada por el
dueño.

## D116 — La altura del ranking se anima al llegar los datos

Todo lo que cambia con la carga (skeleton, filas, aviso de error / sin conexión /
ranking vacío, tu fila bajo el separador, "Todavía no tienes un tiempo…") va dentro
de `ui/AnimatedHeight`, un contenedor nuevo que mide su contenido con
`ResizeObserver` y transiciona `height` (300 ms, `ease-in-out`, como las pestañas
de `ConfigurationModal`, D010). Así 5 filas de skeleton → 20 filas crece, y
5 → 1 fila encoge, sin salto. Como el diálogo está centrado, crece hacia los dos
lados a la vez.

- **Movimiento reducido**: `motion-reduce:transition-none` (además del bloque de
  `global.css`): el alto cambia de golpe.
- **Medida con `offsetHeight`**, no `getBoundingClientRect`: la entrada del
  diálogo de HeroUI escala el contenido y la medida transformada se quedaría fija.
- **Hasta la primera medida el alto es `auto`**: al abrir no crece desde 0.
- **`flow-root`** en la caja medida: los márgenes de los hijos cuentan en la medida.
- **`shrink-0`** en la caja: el diálogo de HeroUI es flex en columna, y con
  `overflow-hidden` la caja pierde el mínimo por contenido y encogía hasta caber
  en el 90dvh (406 px de 1109 con 30 personas), recortando filas en vez de dejar
  el scroll al diálogo. Encontrado al verificar con la demo.
- **Sin efecto en foco ni lectura**: el contenido nuevo está en el DOM desde el
  primer momento; la caja solo recorta visualmente durante 300 ms. No hay nada
  enfocable dentro. Con 20 filas el alto final pasa del 90dvh del diálogo y el
  scroll sigue siendo el del propio diálogo (D077).
- **No es `AutoHeight`** (D009): ese abre y cierra un bloque siempre montado con
  `grid-template-rows`; aquí el contenido es arbitrario y hay que medirlo.

Alternativa: reservar un alto fijo (p. ej. el de 20 filas) desde el skeleton;
evita el movimiento pero deja un hueco grande cuando hay poca gente.

## D117 — Ranking de demostración solo en desarrollo

`configuration/leaderboard-demo.ts` genera un ranking falso para ver cómo luce
con mucha gente, sin tocar `leaderboard_entries` (tabla de producción, pública).

- **Activación**: `import.meta.env.DEV` **y** `?demo-ranking` en la URL.
  `LeaderboardModal.loadLeaderboard` hace un `import()` del archivo dentro de la
  rama `DEV`: en producción Vite sustituye `DEV` por `false`, la rama se elimina y
  el archivo no se empaqueta (comprobado buscando sus cadenas en `dist/`).
  `cloud-storage.ts` no se toca.
- **Datos**: 30 personas con nombres variados (nombre, nombre + inicial, apodos),
  tiempos verosímiles por juego ordenados, avatares de los 5 estilos y ~12 % sin
  avatar (se ve la inicial, D078). Generador con semilla fija por scope: cada
  juego tiene su ranking, igual en cada recarga.
- **Tu fila**: en la demo tu fila es una de las falsas ("Tu nombre", id
  `demo-ranking-tu`), tengas sesión o no, para poder verla como invitado. Por
  defecto en el puesto 27 (fuera del top 20, bajo el separador).
- **Opciones** (separadas por comas): `lento` (3 s de respuesta en vez de 250 ms,
  para ver el skeleton y la altura), `top` (tu fila en el puesto 4), `sin-mi` (sin
  tu fila), y un número 0–30 de personas. Ej.: `?demo-ranking=1,sin-mi,lento`
  para una sola fila con red lenta.
- **Nada en la base**: no hay SQL de inserción ni de borrado.

Alternativas del pendiente P8, descartadas por el dueño: filas reales en un scope
de prueba, o insertarlas en los scopes reales y borrarlas después.
