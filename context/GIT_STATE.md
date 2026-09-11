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

`main` está **14 commits por delante de `origin/main` y NO se ha hecho push.**
Último commit: `a4c2e65` (merge de la migración HeroUI + fix de persistencia).

El dueño (`Fockus26`) decide cuándo subir: `git push`.

## Ramas de trabajo

| Rama | Base | Unidad | Estado |
|---|---|---|---|
| `feat/achievements` | `main` | Sistema de logros | abierta — esperando revisión del dueño |

`feat/heroui-migration` ya se mergeó y se borró.

## Bloques cerrados

| Rama | Mergeada a | Commit | Push a origin |
|---|---|---|---|
| `feat/heroui-migration` | `main` | `a4c2e65` | pendiente de decisión del dueño |
