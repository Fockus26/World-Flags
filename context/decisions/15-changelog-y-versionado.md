# 15 — Changelog, versión y "Novedades"

> Unidad `feat/changelog`. El dueño eligió el enfoque (**`CHANGELOG.md` en el
> repo + modal "Novedades" en la app + semver en `package.json`, escrito a
> mano**, no generado desde commits) y el número de arranque (**1.0.0**). El
> resto de decisiones de abajo son del agente, justificadas aquí.
>
> Verificado con `bunx astro check` / `bunx biome check ./src` /
> `bun run test` / `bun run build` y en el navegador embebido sobre el build
> de producción (`bun run preview`, autorizado por el dueño; Supabase de
> relleno, como invitado): los cinco casos de la tabla de D058, foco con
> teclado en los dos caminos, anidado (Escape y clic fuera cierran solo el de
> arriba), axe-core 4.10 en claro y oscuro, 320 px sin scroll horizontal.

## D057 — `CHANGELOG.md` es la única fuente; la versión sale de `package.json`

**Contenido.** El modal lee `CHANGELOG.md` directamente: `src/data/changelog.ts`
lo importa con `?raw` (Vite lo incrusta como texto en el bundle; el plugin de
Markdown de Astro no intercepta imports con query) y `src/utils/changelog.ts`
lo interpreta (Keep a Changelog: `## [x.y.z] - AAAA-MM-DD`, `### Sección`,
`- punto`, con puntos partidos en varias líneas).

Descartado: un módulo TS tipado mantenido en paralelo. Serían dos textos del
mismo cambio en cada PR, y la única forma de mantenerlos iguales sería un test
que compare los dos... que ya es un parser del Markdown. Con el Markdown como
fuente, ese parser es el que usa la app y no hay nada que sincronizar.

Lo que el Markdown no garantiza por sí solo lo garantiza `bun run test` (CI):
`tests/unit/changelog.test.ts` interpreta el archivo real y falla si hay una
línea con otro formato, una sección que no es de Keep a Changelog (en español:
Añadido, Cambiado, Obsoleto, Eliminado, Corregido, Seguridad), una sección o
versión vacía, versiones o fechas fuera de orden, formato Markdown dentro de un
punto (el modal pinta texto plano) o **una primera entrada distinta de la
versión de `package.json`**. Ese último es el que impide que número y
changelog se desincronicen. En la app, lo que no se entiende se ignora en vez
de romper el modal.

**Versión.** `import { version } from "../../package.json"`: import con nombre
de JSON, que Vite resuelve al compilar y sacude el resto del archivo (verificado
en el build: `APP_VERSION` sale como la cadena `1.0.0` y ningún otro campo de
`package.json` llega al bundle). Descartado `vite.define` en `astro.config.mjs`:
también es una sola fuente, pero necesita una global declarada a mano y no
existe al correr `bun test`.

**Por qué del bundle y no de la red.** `sw.js` sirve los assets con hash desde
caché (stale-while-revalidate), así que una pestaña puede correr un bundle
anterior al último despliegue. La versión y el texto viajan en el mismo chunk:
lo que se muestra es siempre lo que de verdad corre. Leer un `version.json`
por red diría la versión desplegada, no la ejecutada.

## D058 — Tras actualizar, un aviso (no el modal) y "visto" por dispositivo

**Aviso y no modal automático.** Al arrancar con una versión posterior a la
vista, `ReleaseNotesSnackbar` (en `SystemSnackbars`, junto a los demás avisos
de sistema) dice "Novedades de la versión X" con "Ahora no" / "Ver novedades".
Abrir el modal solo al cargar le quitaría el foco y taparía la pantalla a quien
abrió la app para practicar, por algo que puede esperar; el aviso no bloquea y
se anuncia por la región `role="status"` que ya existe. Mientras el modal está
abierto, el aviso se oculta (si no, flotaría sobre el fondo del modal).

Cuándo se da por visto: al responder al aviso ("Ahora no" o cerrar las
novedades), no al mostrarse. Si se recarga sin tocarlo, vuelve a salir. No se
auto-descarta (WCAG 2.2.1).

**Foco.** El aviso desaparece al responderle, así que no puede recibir el foco
de vuelta, y cerrar el modal que abrió lo dejaba en `<body>` (visto en el
navegador). Ahora vuelve a donde estaba antes de entrar en el aviso, como en
los toasts de React Aria: se recuerda en el `onFocus` de sus botones
(`relatedTarget`) y se mueve ahí antes de que el aviso desaparezca; al abrir
las novedades, justo antes de abrirlas, para que el modal lo tome como el
elemento al que devolver el foco al cerrarse. Sin foco previo (un clic), se
queda en `<body>`, como antes de entrar. Para eso `Button` gana una prop
`onFocus` (ampliación de su API, sin tocar a los consumidores). Un `onFocus` en
el contenedor del aviso chocaba con la regla de Biome de elementos estáticos,
y el `role` que pide (`group` → `<fieldset>`) no corresponde a un aviso.

**Por dispositivo, no en `UserLearningData`.** Clave propia en `localStorage`
(`world-flags-seen-release`), leída y escrita solo por `learning-storage.ts`
(`getSeenReleaseVersion` / `saveSeenReleaseVersion`), como el id de
dispositivo y la base de sincronización. Razones:

- Lo que se anuncia es el bundle que acaba de llegar a **este** navegador, y
  cada dispositivo se actualiza en su momento (el SW de cada uno puede seguir
  sirviendo uno anterior). Sincronizado, verlo en el móvil lo daría por visto
  en un portátil que todavía no se ha actualizado, y ahí nunca se avisaría.
- Sincronizarlo costaría una columna nueva en Supabase (con su SQL manual antes
  de desplegar), reglas de fusión y fecha por campo (D055), para un dato que no
  es progreso.
- El invitado no tiene cuenta y también se actualiza.

Es el caso contrario a `DailyReminderPreference`, que sí se sincroniza porque
es una respuesta del usuario ("no me preguntes más") y no un hecho del
dispositivo.

**La decisión** es pura y está probada (`checkRelease` en `utils/changelog.ts`):

| Versión vista | Resultado |
|---|---|
| Ninguna (primera carga en el dispositivo, o la primera desde que existe el changelog) | Se guarda la actual **sin avisar**: no hay "antes" con el que comparar. Por eso nadie ve un aviso por la 1.0.0 |
| Ilegible | Igual que ninguna |
| Anterior a la actual | Aviso con la entrada de la actual |
| Igual | Nada |
| Posterior (pestaña con un bundle viejo) | Nada, y no se rebaja lo guardado |

El modal lista todas las entradas, de la más nueva a la más vieja; quien se
saltó varias versiones las tiene justo debajo. Si con el tiempo la lista se
hace larga, la opción natural es plegar las versiones viejas en un disclosure;
hoy no hace falta.

## D059 — Punto de entrada: pie de "Perfil y configuración"

"Versión X · Novedades" va en un pie de `ConfigurationModal`, fuera de las
pestañas. Descartado:

- **Cuarto icono junto a 🏅 🏆 📍.** Esa fila a 320 px no está verificada y va
  justa (`UserSummary` lleva `whitespace-nowrap` + `shrink-0`): un icono más
  es la forma más directa de provocar scroll horizontal.
- **Dentro de la pestaña Usuario (`AccountTab`).** La versión no es de la
  cuenta, solo se vería en una pestaña (y en una de sus dos vistas), y el
  contenido de las pestañas entra en la medición de alto animada del modal.
- **Pie de la tarjeta principal.** Siempre visible, pero añade una fila a la
  pantalla más apretada de la app (y al skeleton de carga, D042) para algo que
  se usa poco.

La configuración es donde se busca la versión y el "acerca de" en casi
cualquier app; el descubrimiento lo cubre el aviso de D058. Desde ahí el modal
se abre **anidado** sobre el de configuración (React Aria apila los overlays:
Escape y el clic fuera cierran solo el de arriba, y al cerrar el foco vuelve al
botón "Novedades").

## D060 — Cuándo se sube la versión

- Arranca en **1.0.0** (decisión del dueño): la app ya está en producción con
  progreso real de usuarios; la FAQ de semver dice que en ese caso ya debería
  ser 1.0.0. `0.x` habría vaciado de significado la regla de abajo.
- **Cada PR con un cambio que nota quien juega sube la versión y añade su
  entrada** en el mismo PR. Cada merge a `main` se despliega, así que cada PR
  es una publicación: una sección "Sin publicar" nunca llegaría a existir en
  producción, y la app estaría mostrando el número anterior con código nuevo.
  Por eso el formato no la admite (el test la rechaza).
- **MAJOR**: rompe la compatibilidad con el progreso guardado (algo que un
  cliente anterior no puede leer, un reinicio del ranking) o quita algo que la
  gente usaba. **MINOR**: una función nueva visible (un modo, una opción, logros
  nuevos). **PATCH**: arreglos y ajustes sin función nueva.
- PRs sin cambio visible (docs, tests, CI, refactor, tooling) no suben la
  versión ni añaden entrada.
- Fecha de la entrada: la del día en que se abre el PR. Si dos PRs abiertos a
  la vez suben la misma versión, el segundo en mergearse renumera la suya al
  actualizarse desde `main` (el conflicto en `package.json` y `CHANGELOG.md`
  lo hace evidente).
- Sin etiquetas de git por ahora: el enlace de cada versión en el changelog es
  opcional. Si el dueño quiere etiquetas `vX.Y.Z` al mergear, no cambia nada
  de lo de arriba.

Las reglas para quien contribuye están en `CONTRIBUTING.md` › *Changelog and
versioning* y en `CLAUDE.md`.
