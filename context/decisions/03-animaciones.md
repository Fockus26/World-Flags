# Decisiones — Animaciones

| ID | Decisión | Razón | Estado |
|---|---|---|---|
| D006 | Dejar de depender de **framer-motion** para todo lo que sea carga útil. Animaciones de entrada de vista → `initial={false}` (renderizan el estado final ya). Cambios de vista (`AnimatePresence mode="wait"/"popLayout"`) → condicionales de React + `tw-animate-css` (`animate-in fade-in-0 slide-in-from-*`). Paneles de tabs → mismo `animate-in` | **framer-motion 13 no ejecuta sus animaciones en este stack** (React 19.2 + HeroUI 3 / react-aria sobre islands de Astro). Síntomas, reproducibles también en build de producción: (1) las de **entrada** se quedan clavadas en `initial` (opacity 0); (2) las de **salida** de `AnimatePresence` nunca terminan → la vista saliente queda montada y el cambio de vista parece congelado (rompía "Gestionar sesión" y el "revelar" de práctica diaria); (3) las de **`layout`** tampoco interpolan. `tw-animate-css` es CSS `@keyframes` puro (sin frameloop de JS) y ya viene con `@heroui/styles` | Implementado |
| D007 | `<MotionConfig reducedMotion="user">` en `src/components/app/Providers.tsx` | El bloque `prefers-reduced-motion` de `global.css` solo cubre transiciones/animaciones CSS; esto cubre lo que quede de framer (p. ej. el pulso del `Timer`) | Implementado |

## Causa raíz (no confirmada al 100%)

Stack en el filo: **framer-motion 13** (era post-rebrand "Motion") + **React 19.2**
+ **@heroui/react 3** (mete `react-aria-components` con sus providers/portales) sobre
**islands de Astro** (una isla `client:load`, hidratación diferida controlada por Astro).
Además, en el navegador embebido del preview de este equipo `window.innerHeight` /
`window.visualViewport.height` devuelven **0**, y framer hace mediciones de viewport
para su frameloop. Es específico del entorno de preview — **en un navegador normal
podría comportarse distinto**, pero el build de producción daba el mismo resultado y
no se pudo probar en un navegador real limpio.

Descartado: copia duplicada de React o de framer en `node_modules` (no hay), regla
CSS global que mate animaciones (no hay).

## Si se quiere recuperar framer (por orden de probabilidad)

1. Envolver la isla en `<LazyMotion features={domAnimation}>` y/o `<MotionConfig>` — a veces fuerza el arranque del frameloop.
2. Bajar a `framer-motion@^11` (último major antes del rebrand); la mayoría de reportes "no arranca con React 19" se resuelven ahí.
3. Cambiar el import a `motion/react` en vez de `framer-motion`.
4. Probar primero en un navegador real: si ahí `window.innerHeight` no es 0, las de entrada podrían funcionar y el problema era solo el entorno.

Mientras tanto: `src/styles/animations.ts` (`motionVariants`, `motionTransition`,
`timerCritical`, `createMotionVariant`) es **legado mayormente inerte** — no se usa
para nada nuevo. Limpiar cuando se decida el futuro de framer (fila 6 en `CONTENT_CHECKLIST.md`).
