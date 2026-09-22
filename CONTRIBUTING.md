# Contributing to World Flags

Thanks for wanting to help! This guide covers how to set up the project, how work flows
from a branch to `main`, and the rules every change has to follow.

Issues, PRs and commit messages can be written in **English or Spanish**. The app's UI
is in Spanish.

---

## 1. Setup

**Requirements:** [Bun](https://bun.sh) 1.3+ and Node.js 22.12+.
Use Bun for everything — never npm, yarn or pnpm (there is only a `bun.lock`).

```sh
git clone https://github.com/Fockus26/World-Flags.git
cd World-Flags
bun install
cp .env.example .env
bun run dev
```

`.env` needs a Supabase project URL and anon key. The database schema is private: read
[`supabase/README.md`](./supabase/README.md) to see what works without it, and open an
issue if your change needs the backend.

---

## 2. Before you start

- **Look for an existing issue** or open one first for anything bigger than a small fix,
  so we can agree on the approach before you write code.
- Check the roadmap in the [README](./README.md) and [`TODO.md`](./TODO.md).
- Read the [decision records](./context/DECISIONS_INDEX.md). If a decision is marked as
  implemented, don't reopen it inside a PR — open an issue to discuss it instead.

---

## 3. Workflow

All changes reach `main` through a **pull request**. `main` is protected: nobody pushes
to it directly.

### Branches

Branch off an up-to-date `main`, one unit of work per branch (a component, a screen, a
flow, or a scoped fix):

```sh
git switch main
git pull
git switch -c feat/capitals-dataset
```

Format: `<type>/<short-kebab-case-description>` — lowercase, no accents, about five words max.

| Type | Use for |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fixes |
| `refactor` | Code changes that don't change behavior |
| `perf` | Performance improvements |
| `style` | Formatting only |
| `design` | Visual / UI design changes |
| `a11y` | Accessibility improvements |
| `seo` | Metadata, sitemap, Core Web Vitals |
| `docs` | Documentation |
| `test` | Tests |
| `chore` | Tooling, dependencies, config |

### Commits

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`

```text
feat(capitales): agrega el dataset de capitales
fix(sesion): asegura el foco del input al entrar a cualquier partida
```

- Imperative mood ("add", not "added"; "agrega", not "agregado").
- First line under 72 characters, no trailing period.
- Explain the *why* in the body when it isn't obvious.
- Stage only the files of your unit — avoid `git add -A` with unrelated changes around.
- If a change mixes unrelated topics, split it into separate commits (or PRs).

### Pull requests

1. Push your branch and open a PR against `main`. Fill in the template. If players will
   notice the change, it bumps the version and adds a changelog entry (see
   [Changelog and versioning](#changelog-and-versioning)).
2. CI must be green (type-check and build; lint is being brought to green — see below).
3. Add screenshots for any UI change: light and dark, mobile (320–375px) and desktop.
4. Address review feedback with **new commits** on the same branch — don't force-push
   commits that were already reviewed.
5. The maintainer merges with **squash**, so the PR title becomes the commit on `main`:
   write it as a Conventional Commit too.

Never rewrite shared history (`push --force`, `reset --hard` on pushed branches).

### Changelog and versioning

[`CHANGELOG.md`](./CHANGELOG.md) is written by hand, in **Spanish**, for players — not
generated from commits. The app shows the same text in its "Novedades" dialog, so every
line is something a player notices. Rationale:
[`context/decisions/15-changelog-y-versionado.md`](./context/decisions/15-changelog-y-versionado.md).

**Every PR with a user-visible change bumps the version and adds its own entry, in the
same PR.** Each merge to `main` is deployed, so each PR is a release: there is no
"Unreleased" section.

1. Bump `version` in `package.json` ([Semantic Versioning](https://semver.org/)):
   - **MAJOR** — breaks compatibility with saved progress (something an older client
     can't read, a leaderboard reset) or removes something players used.
   - **MINOR** — new visible functionality (a game mode, an option, new achievements).
   - **PATCH** — fixes and small adjustments with no new functionality.
2. Add the entry at the top of `CHANGELOG.md`, dated the day you open the PR. For example:

   ```md
   ## [1.1.0] - 2026-10-02

   ### Añadido

   - Modo Capitales: ves un país y escribes su capital.

   ### Corregido

   - El temporizador ya no se congela al volver a la app.
   ```

   Sections (only the ones you need, in this order): `Añadido`, `Cambiado`, `Obsoleto`,
   `Eliminado`, `Corregido`, `Seguridad`. Plain text only — no bold, code or links inside
   an item (the dialog shows it as-is). Long items can wrap onto indented lines.
3. PRs with no user-visible change (docs, tests, CI, refactors, tooling) don't bump the
   version and don't add an entry.

`bun run test` fails if the changelog doesn't follow this format or if its first entry
isn't the version in `package.json`. If two open PRs claim the same version, whoever
merges second renumbers theirs when updating from `main`.

---

## 4. Quality checks

Run these before opening a PR:

```sh
bunx astro check         # type-check
bunx biome check ./src   # lint + format (bun run lint applies safe fixes)
bun run build            # production build
bun run test             # unit tests (sync/merge layer, changelog format) in tests/unit
bun run test:e2e         # Playwright, with the dev server running
```

> `src/` currently has some pre-existing Biome errors, so the lint step in CI doesn't
> block yet. Don't add new ones. On Windows, CRLF line endings make Biome report extra
> format errors locally.

---

## 5. Project rules

These are non-negotiable. A PR that breaks one will be asked to change.

### Design system

- **No magic values** for color, spacing, radius or shadow (`text-[#6d5ef0]`, `mt-[13px]`).
  Everything comes from the tokens in `src/styles/variables.css` / `theme.css` (see
  [`context/COLORS.md`](./context/COLORS.md) and
  [`context/DESIGN_TOKENS.md`](./context/DESIGN_TOKENS.md)). If a token is missing,
  propose one in the PR. Arbitrary font sizes exist for historical reasons — don't add more.
- **HeroUI before reimplementing** a primitive: focus and keyboard handling are already
  solved there.
- The wrappers in `src/components/ui/` **keep their public API** — many components
  depend on it.
- **Animations** use `tw-animate-css` (`animate-in fade-in …`) or CSS transitions.
  `framer-motion` is installed but doesn't run in this stack (see
  [`context/decisions/03-animaciones.md`](./context/decisions/03-animaciones.md)).

### Architecture

- **Persistence only through `src/utils/learning-storage.ts`.** Never call
  `window.localStorage` from a component.
- **Redux only through the hooks in `src/hooks/`.** Don't use `useAppSelector` /
  `useAppDispatch` or touch the store outside `src/store/slices/`.
- Adding a synced field? Follow the checklist in
  [`docs/state-management.md`](./docs/state-management.md).
- New game modes follow the existing pattern: their own `GameType`, session components
  under `src/components/game/session/`, and reuse of scope, practice queue, SRS,
  achievements and leaderboard.

### Accessibility — WCAG 2.1 AA minimum

- 4.5:1 contrast for normal text, 3:1 for large text and UI components.
- Everything works with the keyboard, and focus is always visible.
- No state conveyed by color alone (correct/wrong, selected, locked…).
- No horizontal scroll at 320px.
- Respect `prefers-reduced-motion`.

### Content

- Don't invent final copy, domains or prices. Use a clearly marked placeholder and
  mention it in the PR so the maintainer can approve or rewrite it.

### Security

- Only `PUBLIC_*` variables go to the client. Never commit `.env`, service role keys,
  VAPID private keys or any other secret.
- Don't add files from `supabase/` (other than its README) or local planning files
  from `context/` — they are gitignored on purpose.

---

## 6. Development tips

- **Service worker:** `public/sw.js` caches aggressively. If changes don't show up in dev,
  run this in the browser console and reload:

  ```js
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  ```

- **Library docs change fast** (HeroUI v3, Astro 7, Tailwind v4, React Aria): check the
  current documentation instead of relying on older examples.

---

## 7. Working with AI agents

If you use Claude Code or another coding agent, it must read [`CLAUDE.md`](./CLAUDE.md)
first. The same PR workflow applies: agents open PRs, they never push to or merge into `main`.

---

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/Fockus26/World-Flags/issues/new/choose).
For security issues, please don't open a public issue — contact the maintainer through
their GitHub profile instead.
