# Component structure & imports

> Inventario concreto de qué componente existe y dónde: `context/COMPONENTS_INVENTORY.md`.

## Cuándo dividir un componente

Si un archivo pasa de ~150 líneas o mezcla 3+ bloques visuales distintos, extráelo
en ese momento (no "después"). Cada pieza extraída recibe su propia interfaz de
props explícita — nada de prop-drilling de objetos completos si el hijo solo
necesita 2–3 campos.

## Carpetas por pantalla

Componentes de una misma pantalla/feature viven en su subcarpeta dentro de
`src/components/game/` (`configuration/`, `session/`, `configuration/configurationModal/`).
Piezas genéricas reutilizables entre pantallas van en `src/components/ui/`.

## Estilos

**Tailwind CSS v4 en el JSX** (no CSS Modules — eso era el sistema viejo). Colores,
radios y sombras salen de tokens (`bg-primary`, `rounded-lg`, `var(--surface)`…),
nunca hex/px sueltos. Ver `docs/design-system.md`.

Los primitivos de `src/components/ui/` envuelven **HeroUI v3** y conservan su API
previa a la migración — amplíala, no la rompas.

## Imports: relativo vs. alias `@/`

- Relativo (`./`, `../`): vecinos directos (mismo folder o uno abajo).
- Alias (`@/`): todo lo que cruce hacia `types/`, `utils/`, `hooks/`, `store/`,
  `styles/`, `data/`, `components/ui/`, `lib/`.

Ejemplo: `@/types/country`, `@/utils/learning-storage`, `@/hooks/useGame`,
`@/components/ui/Button`. (Nota: ya no hay `@/context/*` — el estado pasó a Redux
en `@/store/` y se consume por los hooks de `@/hooks/`.)

## Duplicación a vigilar

- Antes de un modal/confirmación nuevo: `src/components/ui/Modal.tsx` +
  `src/components/game/session/ConfirmationModal.tsx` ya cubren el caso genérico.
- Antes de un botón: `Button` de `ui/` tiene 6 colores × 4 variantes. No dupliques.
- Antes de un tooltip: `ui/Tooltip.tsx` (portal a `<body>`) — no uses el de HeroUI
  directamente (ver `context/decisions/01-heroui-migracion.md` D011).
