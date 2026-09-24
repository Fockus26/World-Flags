# Decisiones — Contraste del texto sobre `--accent`

| ID | Decisión | Razón | Estado |
|---|---|---|---|
| D106 | En claro, `--accent-foreground` pasa de `#f7f6ff` a `#ffffff` (en `heroui-theme.css`). `--accent` no cambia, ni el tema oscuro | La opción marcada de `OptionTile` (modo/orden/dificultad/temporizador en `GameTab`, tema en `ThemeSwitcher`, pasos de ajustes del tutorial) pinta `--accent-foreground` sobre `--accent`: `#f7f6ff` sobre `#6d5ef0` = **4,34:1**, falla AA (4,5:1). Blanco da **4,66:1**. Oscuro ya cumplía: `#12101c` sobre `#9b8bff` = **6,74:1** | Implementado (`a11y/contraste-option-tile`) |

## Por qué el token y no el componente

- **Arreglar el token, no el consumidor.** `GameTypeToggle` ya había esquivado el
  mismo fallo usando `--btn-contained-fg` (D066). Hacer lo mismo en `OptionTile`
  dejaba el token roto para los primitivos de HeroUI que lo usan como texto sobre
  `--accent` (botón `primary`, chip/badge `primary`, celdas de calendario, marca
  del checkbox). Cambiando el token se arreglan todos a la vez.
- **Aclarar el texto, no oscurecer el morado.** Oscurecer `--accent` cambiaría el
  color de marca en todos sus consumidores (bordes, anillos, píldora de
  `GameTypeToggle`, `--accent-hover` y `-soft` que HeroUI deriva de él). El
  blanco casi no se distingue a simple vista del `#f7f6ff`.
- **Qué más toca.** HeroUI deriva `--accent-hover` = `accent 90 % + accent-foreground
  10 %` (oklab): con blanco queda un pelo más claro, imperceptible. `bg-accent-foreground`
  (pulgar del switch, etc.) pasa de lavanda casi blanca a blanco. Nada en `src/`
  lee `--accent-foreground` salvo `OptionTile`.
- **Mismo valor que `--btn-contained-fg` en claro** (`#ffffff`): los dos rellenos
  de marca llevan ya el mismo texto, sin crear un color nuevo.

## Pendiente fuera de esta unidad

- Texto blanco sobre `--accent-hover` (hover de un botón HeroUI `primary`) queda
  por debajo de 4,66:1 porque el hover **aclara**. Era peor antes. La app no usa
  el `Button` de HeroUI con `accent` (su wrapper usa `--btn-contained-fg` sobre sus
  propios colores), así que no se toca aquí.
