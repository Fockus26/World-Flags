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

`main` está **17 commits por delante de `origin/main` y NO se ha hecho push.**
Último commit: `414d137` (merge del sistema de logros, `--no-ff`).

El dueño (`Fockus26`) decide cuándo subir: `git push`.

## Ramas de trabajo

Ninguna abierta. `feat/achievements` ya se mergeó (no se borró — el dueño
decide cuándo, ver la regla de "nada destructivo" en `CLAUDE.md`).

`feat/heroui-migration` ya se mergeó y se borró.

## Bloques cerrados

| Rama | Mergeada a | Commit | Push a origin |
|---|---|---|---|
| `feat/achievements` | `main` | `da042ab` (feature) → `414d137` (merge) | pendiente de decisión del dueño |
| `feat/heroui-migration` | `main` | `a4c2e65` | pendiente de decisión del dueño |
