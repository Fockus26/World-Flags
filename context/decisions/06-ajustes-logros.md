# 06 — Ajustes al sistema de logros: verde, snackbars, scrollbar, select de avatar

> Ronda de feedback del dueño sobre `05-logros.md`. Cubre D024–D027.

## D024 — Verde para "desbloqueado", nunca como color de texto

Se pidió que los logros completados se vean en verde. `text-success` sobre
`bg-success-soft` da **2.71:1** en claro — falla AA para texto, el mismo error
que ya se había corregido para `text-primary` en `05-logros.md`. Mismo patrón
de solución:

- **Tarjeta** (modal y snackbar): `bg-success-soft` + borde
  `color-mix(in oklab, var(--success) 45%, transparent)` — el mismo idioma que
  ya usa `FeedbackMessage.tsx` para sus variantes, no un verde inventado.
- **Nombre**: se queda en `text-surface-soft` (alto contraste, neutro). Nunca
  coloreado — ni verde ni morado.
- **Icono** (`CheckCircle`, `text-success-hover`): un icono informativo solo
  necesita 3:1, no 4.5:1, así que aquí sí puede llevar el acento de color.
- **Texto de estado/etiqueta** ("Desbloqueado el...", "Logro desbloqueado" del
  snackbar): se queda en `text-text-placeholder`, neutro — a ese tamaño ni
  `success` (2.71:1) ni `success-hover` (3.92:1 en claro) llegan a 4.5:1.

Se añadió `--color-success-hover` al puente Tailwind (`theme.css`) — era la
única familia de color sin su tono `-hover` expuesto (`primary`, `secondary`,
`warning`, `danger` ya lo tenían). El valor (`--app-color-success-hover`) ya
existía en `variables.css`, solo faltaba conectarlo.

## D025 — Los avisos de logro salen como snackbar, no en `Results`

Antes los desbloqueos de la sesión se mostraban como tarjetas dentro de
`Results`. Eso los dejaba invisibles si el logro se ganaba en la práctica
diaria (que no pasa por `Results`) o a mitad de un rush.

Ahora `AchievementToasts` (nuevo, montado una sola vez en `FlagGame.tsx`, fuera
del router de vistas) se apila abajo a la derecha — "si hay varios se
acoplan", estilo Xbox/PS5 — y aparece sin importar qué pantalla esté activa.

**Cómo se decide qué se anuncia y qué no.** El mismo dato (`getNewlyUnlocked`)
sirve tanto para sellar como para avisar, pero avisar de TODO lo sellado
inundaría de golpe a cualquiera que actualice la app con progreso viejo: abrir
la app con 120 países ya aprendidos desbloquearía media docena de logros a la
vez. `AchievementsEffects` distingue con un ref (`isNextPassSilentRef`):

- La primera evaluación tras **cada** transición a `hydrationStatus === "ready"`
  (arranque, o un login/logout que trae datos nuevos) sella lo que corresponda
  pero **no** encola snackbar — es una reconciliación retroactiva, no algo que
  "acaba de pasar".
- Cualquier evaluación posterior, con los datos ya asentados, sí encola.
- Salir de `"ready"` (a `"loading"`/`"idle"`) vuelve a armar la siguiente pasada
  como silenciosa, así que un login que trae logros fusionados desde otro
  dispositivo tampoco los anuncia de golpe.

La cola de avisos vive en un slice de Redux **nuevo y deliberadamente aparte**
de `game.learningData`: `store/slices/achievementToastSlice.ts`. No es
`UserLearningData` — no se persiste, no se sincroniza, se vacía al recargar.
Es la primera pieza de estado "solo UI" del store; documentado en
`docs/state-management.md` para que no se intente colar en el patrón de campos
persistidos por error.

Cada snackbar se autodescarta a los 6 s (con botón de cierre manual — sin eso
sería un límite de tiempo no ajustable, WCAG 2.2.1) y respeta
`prefers-reduced-motion` saltándose la espera de la animación de salida.

## D026 — Scrollbar temática

`*` a nivel global en `global.css`: `scrollbar-color`/`scrollbar-width`
(Firefox) + `::-webkit-scrollbar-*` (Chromium/Safari), con
`--color-surface-border` en reposo y `--color-primary-border` al hover — tokens
que ya existían, ninguno nuevo. Global a propósito: cualquier contenedor con
scroll interno (el `Modal`, el picker de países, la lista de logros) la
hereda sin tener que aplicarla contenedor por contenedor.

No se le exige el 3:1 de `1.4.11` (no es información necesaria para completar
ninguna tarea: rueda del mouse, touch y teclado siguen funcionando sin verla),
igual que el resto del sistema no se lo exige a los bordes de tarjeta
(`surface-border` da bastante menos de 3:1 contra blanco, y es una decisión ya
asumida en el resto del diseño).

## D027 — Fondo del select de avatar, un poco más oscuro que el modal

`--field-background` en claro pasa de `#f1eff8` a `#e2dff1` (el mismo tono que
`--app-color-surface-border`, reutilizado — no un gris nuevo). Antes daba
**1.14:1** contra el blanco del modal, casi imperceptible; ahora **1.31:1**.
Sigue siendo sutil a propósito: es la separación de un campo dentro de una
tarjeta, no la de la tarjeta misma.

**El oscuro se queda igual, y es intencional, no un olvido:** hoy
`--field-background` (`#2b2740`) ya es más CLARO que la superficie del modal
(`#1b1930`) — al revés de lo pedido. En un tema oscuro, "elevar" un control se
lee aclarándolo; oscurecerlo más lo hundiría contra un fondo que ya es casi
negro. Se documenta explícitamente en el CSS para que no parezca una
inconsistencia entre temas.

**No tocado, pre-existente:** `--field-border` (`#9c96c4`) da 2.77:1 contra
blanco puro, por debajo del 3:1 que su propio comentario reclama. No se
corrigió aquí — no es lo que se pidió y cambiarlo de paso mezclaría un fix de
borde con un cambio de fondo. Reportado en `CURRENT_PHASE.md`.
