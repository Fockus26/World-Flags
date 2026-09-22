## What changes

<!-- 2-5 concrete bullets. One unit of work per PR (a component, a screen, a flow, a scoped fix). -->

-

## Why

<!-- The problem or goal. Link the issue if there is one: Closes #123 -->

## How to test

<!-- Exact steps: which screen, which mode, which settings. -->

1.

## Screenshots

<!-- Required if the UI changes: before/after, light and dark, mobile (320-375px) and desktop. -->

## Checklist

- [ ] `bunx astro check` passes
- [ ] `bunx biome check ./src` passes
- [ ] `bun run test` passes
- [ ] `bun run build` passes
- [ ] User-visible change → version bumped in `package.json` + entry at the top of `CHANGELOG.md` (see `CONTRIBUTING.md` › Changelog and versioning). No visible change → neither
- [ ] UI changes meet WCAG 2.1 AA (keyboard, visible focus, 4.5:1 contrast, no state conveyed by color only, no horizontal scroll at 320px)
- [ ] No magic color/spacing/radius values — only design tokens
- [ ] Persistence only through `src/utils/learning-storage.ts`; Redux only through `src/hooks/`
- [ ] New user-facing copy is marked as a placeholder if it isn't final
- [ ] Docs updated if behavior or setup changed (`README.md`, `docs/`, `context/decisions/`)
