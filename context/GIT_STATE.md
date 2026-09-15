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

`main` tiene un commit local de más sobre `origin/main`: el merge de
`perf/batch-country-attempts` (`a3655bb`). **Pendiente de push** — el dueño decide
cuándo.

## Ramas de trabajo

`feat/modo-paises` — **experimental, abierta desde `main` (`136c81c`, antes del
merge de `perf/batch-country-attempts`), sin merge previsto al cerrar** salvo que
el dueño lo pida expresamente. Implementa el plan de `context/plans/modo-paises.md`
en 7 fases, cada una con su propio commit y su propia pausa de aprobación. Se le
fusionó `main` encima para heredar el fix de rendimiento de abajo.

`feat/achievements` ya se mergeó (no se borró — el dueño
decide cuándo, ver la regla de "nada destructivo" en `CLAUDE.md`).

`feat/heroui-migration` ya se mergeó y se borró.

## Bloques cerrados

| Rama | Mergeada a | Commit | Push a origin |
|---|---|---|---|
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
no se borró (el dueño decide cuándo).
