# Colors — World Flags

> Fuente real: `src/styles/variables.css` (paleta propia `--app-color-*`) +
> `src/styles/heroui-theme.css` (tokens de HeroUI, `--accent`/`--surface`/etc.).
> Este archivo resume; ante duda, gana el CSS.

## Cómo está montado

1. `variables.css` define `--app-color-*` para claro (`:root`) y oscuro
   (`[data-theme="dark"]` + `@media prefers-color-scheme`).
2. `theme.css` (`@theme inline`) los expone como utilidades Tailwind: `--color-primary`,
   `--color-surface`, `--color-danger-soft`, … → clases `bg-primary`, `text-danger`, etc.
3. `heroui-theme.css` reescribe los tokens **base** de HeroUI con la paleta de marca
   (HeroUI deriva solo `-hover`/`-soft`/`-foreground`).

`[data-theme]` en `<html>` (lo pone `ThemeEffects`) controla ambos sistemas a la vez
— es el mismo selector que usa HeroUI.

## Light mode (roles principales)

| Rol | Hex | Uso |
|---|---|---|
| primary / accent | `#6d5ef0` | CTAs, selección, marca. **Como texto sobre blanco falla AA (~3.97:1)** — no usar como color de texto |
| accent-foreground | `#ffffff` | texto sobre relleno `--accent` (opción marcada de `OptionTile`, primitivos HeroUI). 4,66:1. Antes `#f7f6ff` = 4,34:1, fallaba AA (D106) |
| primary-hover | `#5b4bdb` | |
| primary-soft | `#ecebfe` | fondos suaves, botón `soft` |
| secondary | `#b34bd1` | acentos secundarios (botón "Práctica diaria", enlaces del picker) |
| background (`--background`) | `#f2f1f8` | fondo de página (gris lavanda) |
| surface (`--app-color-surface` / `--surface`) | `#ffffff` | tarjetas, modales |
| surface-hover | `#f1eff9` | |
| foreground / surface-soft (texto) | `#1c1b2e` | texto principal (ojo: el token se llama `-soft` pero ES el texto) |
| text-placeholder / muted | `#6b6880` | texto secundario (5.36:1 sobre blanco, AA ok) |
| border (`--app-color-surface-border` / `--border`) | `#e2dff1` / `#e4e2f2` | bordes de tarjeta |
| field-background (`--field-background`) | `#e2dff1` | relleno de inputs/selects — mismo tono que `border` (surface-border), reutilizado a propósito. `1.31:1` contra el blanco del modal, sutil pero perceptible |
| field-border | `#9c96c4` | borde de input. **Pre-existente sin arreglar aquí:** da `2.77:1` contra blanco, por debajo del `≥3:1` que su propio comentario en el CSS reclama |
| success | `#1fa971` · soft `#e3f8ee` · hover `#178a5c` | correcto, "Bien"/"Fácil". **Como texto da 2.71:1 y falla AA** — igual que `primary`, usar `success-hover` para texto/icono con acento y reservar `success` para fondo/borde |
| warning | `#d97a13` · soft `#fdf0dc` | "Difícil" |
| danger | `#e0435f` · soft `#fde8ec` | incorrecto, "Otra vez", "Cerrar"/"Abandonar" |
| neutral | `#57536b` · soft `#eeedf6` | botones neutros, "Cancelar" |
| medal-gold / -silver / -bronze | `#835600` · soft `#fcefc7` / `#545d6e` · soft `#e9edf3` / `#8f481e` · soft `#f9e4d6` | podio del ranking (D147): el tono vale como texto, icono y borde (≥4,5:1 sobre su soft, el modal y `primary-soft`); el soft es el fondo de la fila |
| overlay (`--overlay`) | `#ffffff` | **fondo** de modal/popover/tooltip de HeroUI (opaco) |
| skeleton (`--surface-tertiary`) | = `surface-border` (`#e2dff1`) | relleno del `Skeleton` de HeroUI (al 70 %, brillo al 100 %). Puenteado con `var()`, no es un color nuevo — en oscuro sale `#34304a` solo (D043) |
| backdrop (`--backdrop`) | `rgb(28 20 46 / 55%)` | scrim tras el modal |
| btn-contained-fg | `#ffffff` | texto de botones `contained` (blanco en claro) |

## Dark mode (roles principales)

| Rol | Hex |
|---|---|
| primary / accent | `#9b8bff` (pastel — texto de botón `contained` va oscuro: `--btn-contained-fg: #14121f`; `--accent-foreground: #12101c` = 6,74:1) |
| primary-soft | `#2c2650` |
| secondary | `#e19bec` |
| background | `#14121f` |
| surface / overlay | `#1b1930` |
| foreground (texto) | `#f1eefc` |
| muted | `#a29cc0` |
| border | `#34304a` |
| field-background | `#2b2740` · field-border `#6f6a94` — **más claro** que `surface`/`overlay` (`#1b1930`) a propósito: en oscuro, elevar un control se lee aclarándolo, no oscureciéndolo. No se tocó al ajustar el de claro |
| success | `#4fd399` · hover `#7fe0b5` · warning `#f2a53d` · danger `#f2748c` (soft = versiones oscuras) |
| neutral | `#c8c4dc` |
| medal-gold / -silver / -bronze | `#f2c94c` · soft `#3a3015` / `#c5ccd8` · soft `#2c2f3d` / `#eba273` · soft `#3e2619` |
| backdrop | `rgb(8 6 16 / 70%)` |

## Notas de contraste

- **Anillos de foco** (D101–D102): el tono `-hover` de cada color (en claro más
  oscuro, en oscuro más claro) es el que pasa 3:1 en los dos temas; el base de
  `success` y `warning` no llega en claro (2,68/2,77:1 contra `--background`).
  Tabla completa en `decisions/23-foco-y-toque.md`.

- Botones sin relleno pleno (`soft`/`outline`/`text`): el texto se calcula con
  `color-mix(in oklab, <color> 62%, var(--foreground))` (`readableFg` en `Button.tsx`)
  para dar AA en ambos temas. El hover de `soft` **ahonda el tinte** en vez de saltar
  al color pleno, para no romper el contraste del texto.
- `RegionOption` (grid de continentes): el color por puntuación (`utils/score.ts`)
  se usa para el **borde izquierdo, el anillo de selección y la casilla** — NUNCA
  para el texto (fallaba 2.2–2.7:1). El nombre/contador van en `text-surface-soft` fijo.
- El texto danger como `text` variant (`#e0435f` sobre blanco = 4.09:1) queda al
  filo; si vuelve a aparecer un fallo, subir a `--color-danger-hover` (`#c22e49`).
- Los logros desbloqueados (`AchievementsModal`, `AchievementToasts`) van en
  verde por fondo/borde/icono — nunca por texto: `success` sobre `success-soft`
  da 2.71:1 en claro. El nombre se queda en `text-surface-soft`, el icono en
  `text-success-hover` (icono informativo, solo necesita 3:1). Ver
  `decisions/06-ajustes-logros.md`.
- Medallas del podio (D147–D148): el color del puesto nunca va solo; el número
  ("#1") es texto real y la medalla de `iconoir-react` es `aria-hidden`. Con el
  hover de la fila encima (D149, 6 % del texto mezclado en el fondo) el tono de
  medalla sigue ≥4,8:1 en claro. Tabla medida en `decisions/37-ranking-podio.md`.
