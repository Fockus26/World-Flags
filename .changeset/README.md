# Changesets

Cada PR que cambia algo que **nota quien juega** agrega aquí un archivo
`<descripcion-kebab-case>.md` (nombre único, p. ej. `castigo-animado.md`). El cuerpo es
el trozo de `CHANGELOG.md` de ese cambio, **sin** el encabezado de versión:

```md
---
"world-flags": patch
---

### Corregido

- El sonido de respuesta incorrecta se oye ahora tan fuerte como el de acierto,
  también en el altavoz del móvil.
```

- **patch**: arreglo. **minor**: función nueva. **major**: rompe el progreso guardado
  (algo que un cliente viejo no puede leer, un reinicio del ranking) o quita algo.
- Secciones, solo las que hagan falta: `Añadido`, `Cambiado`, `Obsoleto`, `Eliminado`,
  `Corregido`, `Seguridad`. En español, en lenguaje de jugador, texto plano (sin
  negritas, código ni enlaces: "Novedades" lo muestra tal cual).
- Docs, tests, CI, tooling y refactors: sin changeset.
- Nadie toca `version`, `CHANGELOG.md` ni `APP_VERSION` de `public/sw.js`. La Action
  `release.yml` mantiene abierto el PR "chore(release): versión": `scripts/release.ts`
  junta los changesets en una entrada `## [x.y.z] - AAAA-MM-DD`, sube la versión y
  `APP_VERSION`. Se publica una versión cuando se mergea ese PR.
- `bun run test` valida los changesets pendientes con las mismas reglas que el CHANGELOG.

`bunx changeset` hace preguntas y escribe otro formato: los changesets se escriben a mano.
