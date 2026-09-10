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
| primary-hover | `#5b4bdb` | |
| primary-soft | `#ecebfe` | fondos suaves, botón `soft` |
| secondary | `#b34bd1` | acentos secundarios (botón "Práctica diaria", enlaces del picker) |
| background (`--background`) | `#f2f1f8` | fondo de página (gris lavanda) |
| surface (`--app-color-surface` / `--surface`) | `#ffffff` | tarjetas, modales |
| surface-hover | `#f1eff9` | |
| foreground / surface-soft (texto) | `#1c1b2e` | texto principal (ojo: el token se llama `-soft` pero ES el texto) |
| text-placeholder / muted | `#6b6880` | texto secundario (5.36:1 sobre blanco, AA ok) |
| border (`--app-color-surface-border` / `--border`) | `#e2dff1` / `#e4e2f2` | bordes de tarjeta |
| field-background (`--field-background`) | `#f1eff8` | relleno de inputs/selects (gris, para separarse del blanco) |
| field-border | `#9c96c4` | borde de input (≥3:1 sobre blanco) |
| success | `#1fa971` · soft `#e3f8ee` | correcto, "Bien"/"Fácil" |
| warning | `#d97a13` · soft `#fdf0dc` | "Difícil" |
| danger | `#e0435f` · soft `#fde8ec` | incorrecto, "Otra vez", "Cerrar"/"Abandonar" |
| neutral | `#57536b` · soft `#eeedf6` | botones neutros, "Cancelar" |
| overlay (`--overlay`) | `#ffffff` | **fondo** de modal/popover/tooltip de HeroUI (opaco) |
| backdrop (`--backdrop`) | `rgb(28 20 46 / 55%)` | scrim tras el modal |
| btn-contained-fg | `#ffffff` | texto de botones `contained` (blanco en claro) |

## Dark mode (roles principales)

| Rol | Hex |
|---|---|
| primary / accent | `#9b8bff` (pastel — texto de botón `contained` va oscuro: `--btn-contained-fg: #14121f`) |
| primary-soft | `#2c2650` |
| secondary | `#e19bec` |
| background | `#14121f` |
| surface / overlay | `#1b1930` |
| foreground (texto) | `#f1eefc` |
| muted | `#a29cc0` |
| border | `#34304a` |
| field-background | `#2b2740` · field-border `#6f6a94` |
| success | `#4fd399` · warning `#f2a53d` · danger `#f2748c` (soft = versiones oscuras) |
| neutral | `#c8c4dc` |
| backdrop | `rgb(8 6 16 / 70%)` |

## Notas de contraste

- Botones sin relleno pleno (`soft`/`outline`/`text`): el texto se calcula con
  `color-mix(in oklab, <color> 62%, var(--foreground))` (`readableFg` en `Button.tsx`)
  para dar AA en ambos temas. El hover de `soft` **ahonda el tinte** en vez de saltar
  al color pleno, para no romper el contraste del texto.
- `RegionOption` (grid de continentes): el color por puntuación (`utils/score.ts`)
  se usa para el **borde izquierdo, el anillo de selección y la casilla** — NUNCA
  para el texto (fallaba 2.2–2.7:1). El nombre/contador van en `text-surface-soft` fijo.
- El texto danger como `text` variant (`#e0435f` sobre blanco = 4.09:1) queda al
  filo; si vuelve a aparecer un fallo, subir a `--color-danger-hover` (`#c22e49`).
