## Claude assistant context for world-flags

This repo is an Astro + React project for a world flags quiz app.
When working in this codebase, use the existing style system and motion setup instead of introducing new animation libraries or CSS keyframes.

### Style system
- Theme tokens are defined in `src/styles/variables.css`
- Global CSS lives in `src/styles/global.css` and imports `variables.css`
- Component styles use CSS Modules in `src/components/**/*.module.css`
- Prefer CSS variables like `var(--color-primary)`, `var(--radius-lg)` and `var(--transition)`
- Keep component styles consistent with the current design system and shared utility tokens

### Animation approach
- Animations are centralized in `src/styles/animations.ts`
- Use `motionVariants` and `motionTransition` for `framer-motion` variants
- Components already using motion:
  - `src/components/game/GameConfiguration.tsx`
  - `src/components/game/GameSession.tsx`
  - `src/components/ui/Modal.tsx`
- Avoid direct CSS animations; add motion variants rather than keyframes
- `framer-motion` is the source of truth for motion behavior

### Component structure
- Shared UI primitives: `src/components/ui/`
- Game screens and logic: `src/components/game/`
- Data and types: `src/types/`, `src/utils/`

### Best practices for code changes
- Keep motion and styling separated: variants in `src/styles/animations.ts`, layout/styles in CSS Modules
- Maintain accessibility: forms, buttons, labels, modal ARIA attributes
- Reuse existing patterns instead of adding duplicate styles or animation definitions
- Use `bun` scripts for local workflows where possible

### Helpful file references
- `src/styles/global.css`
- `src/styles/variables.css`
- `src/styles/animations.ts`
- `src/components/ui/Modal.tsx`
- `src/components/game/GameSession.tsx`
- `src/components/game/GameConfiguration.tsx`
