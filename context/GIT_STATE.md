# Git State — World Flags

> Fuente de verdad de "¿a qué rama mergeo cuando termine?". `git-flow` lee esto
> antes de crear ninguna rama. **Nunca deduzcas la base de `git branch --show-current`.**

## Rama madre activa

**Ninguna.** Las unidades salen directo de `main`.

## Rama base de la próxima unidad

`main`

## Regla de push

| Base | Al cerrar la unidad |
|---|---|
| = `main` | commit → merge `--no-ff` → **sin push**. El dueño decide cuándo. |
| ≠ `main` | (no aplica hoy — no hay rama madre) |

## Estado de `main` ahora mismo

`main` tiene commits locales de más sobre `origin/main`, incluido el merge de
`feat/modo-paises` de abajo. **Pendiente de push** — el dueño decide cuándo.

## Ramas de trabajo

`feat/achievements` ya se mergeó (no se borró — el dueño
decide cuándo, ver la regla de "nada destructivo" en `CLAUDE.md`).

`feat/heroui-migration` ya se mergeó y se borró.

## Bloques cerrados

| Rama | Mergeada a | Commit | Push a origin |
|---|---|---|---|
| `fix/foco-input-sesion` | `main` | `77e672b` (feature) → `f1980d5` (merge) | pendiente de decisión del dueño |
| `feat/notificaciones` | `main` | `ca82d0e` (feature) → `487376a` (merge) | pendiente de decisión del dueño |
| `feat/racha-tab-usuario` | `main` | `bcc107c` (racha) + `60f9939` (alto tarjetas/h1) → `15e65ec` (merge) | pendiente de decisión del dueño |
| `fix/pulido-modo-paises` | `main` | `6846314` → `f8f9404` (merge) | pendiente de decisión del dueño |
| `feat/modo-paises` | `main` | `5a125aa`…`e890429` (unidad completa, 7 fases + ronda de feedback) → `8d7c564` (merge) | pendiente de decisión del dueño |
| `perf/batch-country-attempts` | `main` | `04160f0` (feature) → `a3655bb` (merge) | pendiente de decisión del dueño |
| `feat/achievements` | `main` | `da042ab` (feature) → `414d137` (merge) | pendiente de decisión del dueño |
| `feat/heroui-migration` | `main` | `a4c2e65` | pendiente de decisión del dueño |
| `fix/region-option-altura-seleccion` | `main` | `edc34b3` → `e928543` (merge) | ✅ hecho |
| `fix/practica-diaria-no-marca-continente` | `main` | `18e7a66` → `dfe6290` (merge) | ✅ hecho |
| `fix/deselecciona-continentes-practicados` | `main` | `1bfc0b1` → `4f65c58` (merge) | ✅ hecho |
| `feat/logros-highlight-scroll-fix-deteccion` | `main` | `e2f0157` → `fe348c1` (merge) | ✅ hecho |
| `feat/banderas-autohospedadas` | `main` | `2ca54bc` → `79715df` (merge) | ✅ hecho |
| `fix/timer-rush-doble-skip` | `main` | `0a76041` → `524e9c8` (merge) | ✅ hecho |
| `feat/transiciones-ui` | `main` | `f20f63c` → `136c81c` (merge) | ✅ hecho |

Las 6 ramas de arriba (hasta `fix/timer-rush-doble-skip`) ya se borraron localmente
(mergeadas). `fix/snackbars-logros-limite-apilado` no tenía commits propios (el
hallazgo era síntoma del bug de logros) y también se borró. `feat/transiciones-ui`
no se borró (el dueño decide cuándo). `feat/racha-tab-usuario` y `feat/notificaciones`
tampoco (recién mergeadas). `fix/foco-input-sesion` se borró tras el merge (el
dueño pidió explícitamente limpiar todas las ramas salvo `main` en esta unidad).

**Nota sobre el merge de `feat/notificaciones`:** `main` estaba checked out en otro
worktree (`fix-pulido-modo-paises`) en el momento de cerrar esta unidad, así que el
merge `--no-ff` se hizo con plumbing (`commit-tree` + `update-ref`) desde el worktree
`strange-easley-3bcf2f` en vez de `git checkout main && git merge`. El resultado es
un merge commit normal (`487376a`, dos padres); si esa otra sesión ve `main` como
"detrás" al hacer `git status`, es porque su working tree no se refrescó — sigue
apuntando a un commit válido, sin conflicto ni pérdida.

**Mismo caso en el merge de `fix/foco-input-sesion`:** `main` seguía checked out en
`fix-pulido-modo-paises` con cambios propios sin commitear (trabajo de otra sesión,
no tocado). Mismo plumbing (`commit-tree` + `update-ref`) desde una rama nueva
(`fix/foco-input-sesion`) creada a partir de `main` en el worktree principal.

**Conflicto resuelto en el merge de `feat/racha-tab-usuario`:** `UserSummary.tsx`
lo tocaron dos unidades en paralelo — `fix/pulido-modo-paises` le agregó el
truncado de nombre a 15 caracteres en mobile (`truncateName`) y ocultar el correo
ahí; `feat/racha-tab-usuario` le agregó el badge de racha como botón hermano. Se
combinaron los dos (por decisión explícita del dueño): se conservó el bloque de
nombre/correo de `fix/pulido-modo-paises` tal cual, y el badge de racha se insertó
después, sin tocar ese bloque.
