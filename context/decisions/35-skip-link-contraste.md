# Decisiones — Contraste del skip link y aviso VAPID único

| ID | Decisión | Razón | Estado |
|---|---|---|---|
| D142 | Skip link enfocado: texto `accent-foreground` (antes `primary-soft`) sobre `bg-primary`. Además, el aviso de consola por falta de `PUBLIC_VAPID_PUBLIC_KEY` se escribe una sola vez por carga (flag a nivel de módulo en `push-notifications.ts`) | `#ecebfe` sobre `#6d5ef0` = **3,96:1**, falla AA (axe `color-contrast`). `accent-foreground` es el token de D106 para texto sobre el morado: `#ffffff` en claro (**4,66:1**) y `#12101c` en oscuro sobre `#9b8bff` (**6,74:1**). El aviso VAPID salía una vez por intento de activar el recordatorio (×4 en prod); se conserva porque es la única pista de que el build salió sin la clave | En curso (`fix/skip-link-contraste-aviso-vapid`) |

## Por qué así

- **El texto, no el fondo.** La otra salida era fondo `primary-hover` con el texto de
  antes. Cambiar el fondo hacía que el relleno coincidiera con el anillo de foco
  (`outline-primary-hover`, D101) y se fundieran; cambiar el texto deja el anillo
  como estaba (≥3:1 sobre el fondo de la página).
- **`accent-foreground` y no `--btn-contained-fg`.** Los dos valen lo mismo en claro
  (blanco). `accent-foreground` tiene utilidad de Tailwind (`text-accent-foreground`,
  la registra HeroUI) y es el token que D106 fijó para texto sobre `--accent`, que es
  el mismo morado que `--color-primary` en los dos temas. Sin valor arbitrario.
- **Tema oscuro sin `data-theme`.** El script bloqueante del `<head>` fija
  `data-theme` antes de pintar; solo si `localStorage` está bloqueado queda sin él
  (y entonces HeroUI tampoco aplica su oscuro). Es el mismo caso que ya tienen todos
  los consumidores de `accent-foreground`.
- **Flag de módulo, no de componente.** Vive en `src/utils/`, fuera de cualquier
  componente o hook, así que el React Compiler no lo transforma (la trampa de las
  copias locales de variables de módulo es dentro de componentes).

## Medido

Con el servidor de desarrollo, skip link enfocado con Tab al cargar, axe-core 4.10
`color-contrast` sobre el enlace: claro `#ffffff` sobre `#6d5ef0` = 4,65:1 (axe
redondea; 4,66:1 en D106), oscuro `#12101c` sobre `#9b8bff` = 6,74:1, sin
violaciones. Anillo sin cambios: `#5b4bdb` sobre `#f2f1f8` y `#b3a6ff` sobre
`#14121f`. Aviso VAPID: cuatro intentos seguidos de activar el recordatorio (sin
clave en el `.env`) escriben un solo `console.error`.
