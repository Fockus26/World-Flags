# Design system

- Tokens: src/styles/variables.css (leer ese archivo para valores actuales — no los dupliques aquí)
- Convención: nunca hardcodear hex/px; usar var(--color-*), var(--radius-*), var(--transition)
- Dark mode: mismo set de variables, redefinidas bajo [data-theme="dark"] (o el selector que uses)
- Estilos por componente: CSS Modules co-ubicados (Button.module.css junto a Button.tsx)

## Animations
- Fuente de verdad: src/styles/animations.ts (motionVariants, motionTransition)
- Patrón: importar variant existente, no crear keyframes ni animar con CSS directo
- Componentes ya usando motion: GameConfiguration, GameSession, Modal — úsalos como referencia de patrón