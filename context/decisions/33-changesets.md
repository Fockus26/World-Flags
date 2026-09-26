# 33 — Versión con Changesets y pool de worktrees

> Unidad `chore/changesets` (2026-09-26), alineación con el web-agent-kit (pool de
> worktrees + Changesets). El dueño eligió adoptar Changesets **con un script propio**
> que conserva el formato del CHANGELOG. Cubre D135–D136. Reemplaza la mecánica de
> D060 (cada PR sube versión) y el "tres sitios a mano" de D107; D057–D059 y el resto
> de D060 (semver, qué es MAJOR/MINOR/PATCH, sin "Sin publicar") siguen igual.

## El problema

Cada PR con cambio visible subía `version`, escribía su entrada arriba de
`CHANGELOG.md` y cambiaba `APP_VERSION` en `public/sw.js`. Con PRs en paralelo
(tandas de 7–8 workers) todos chocaban en esos tres archivos: el orquestador tenía
que dictar un orden de merge por versión ascendente y cada PR renumeraba el suyo al
integrar `main`.

## D135 — Changesets con formato propio: el PR de versión lo abre la Action

- Cada PR con cambio visible agrega `.changeset/<desc>.md`: cabecera
  `"world-flags": patch|minor|major` y como cuerpo **el trozo del CHANGELOG** de ese
  cambio (`### Corregido` + puntos), sin encabezado de versión. Formato en
  `.changeset/README.md`. Nadie toca `version`, `CHANGELOG.md` ni `APP_VERSION`.
- `.github/workflows/release.yml` (`changesets/action@v2`) mantiene abierto el PR
  `chore(release): versión`. Su `version-script` es `bun scripts/release.ts`: lee los
  changesets, corre `changeset version` (sube `version` y los borra) y escribe la
  entrada `## [x.y.z] - AAAA-MM-DD` (secciones de todos, en orden canónico, puntos
  partidos a 80 columnas) y `APP_VERSION`. **Lo mergea el dueño** cuando quiere
  publicar; ningún agente lo edita ni lo mergea.
- `changelog: false` en `.changeset/config.json`: el changelog estándar de Changesets
  (`## x.y.z` / `### Patch Changes`, en inglés, con hashes) rompería "Novedades"
  (`src/utils/changelog.ts`) y `changelog.test.ts`.
- `tests/unit/changesets.test.ts` valida los changesets pendientes con el mismo
  `parseChangelog` (sección válida, texto plano…): el error sale en el CI del PR que lo
  trae, no en el PR de versión, que no corre CI (lo abre `GITHUB_TOKEN`).
- Fecha de la entrada: la del día (UTC) en que la Action rehízo el PR de versión.

**Consecuencia a tener presente:** cada merge a `main` se sigue desplegando, pero la
versión no cambia hasta mergear el PR de versión. Entre medias, el código nuevo ya
está en producción con el número anterior, sin su entrada en "Novedades" y sin que
cambie `sw.js`: las pestañas y PWAs abiertas no reciben "Actualizar" hasta ese merge.
Para que llegue, conviene mergear el PR de versión justo después de cada tanda o de
cada cambio visible suelto.

Descartado: dejar la versión a mano (siguen los choques) y usar el formato estándar
de Changesets adaptando el parser (se pierden la fecha y las secciones en español de
"Novedades", y aún faltaría subir `sw.js`).

## D136 — Pool de worktrees reciclables para las tandas

`orchestrate` ya no crea ni borra un worktree por unidad (`isolation: "worktree"`):
usa un pool fijo `..\world-flags-wt\wt1..wtN` que gestiona `wt.ps1` de la skill
(`init`, `take`, `free`, `status`). Cada slot conserva su `node_modules` (solo
reinstala si cambió `bun.lock`), trae los `.env*` copiados y usa el puerto `4300 + N`.
`context/` local no se copia: se lee y escribe en la carpeta principal. Tras el merge de
cada PR, el orquestador libera el slot con `wt free`. `wt init` lo corre `orchestrate`
la primera vez que lanza una tanda.
