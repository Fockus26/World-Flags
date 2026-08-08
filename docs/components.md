# Component structure & imports

## Cuándo dividir un componente
Si un archivo pasa de ~150 líneas o mezcla 3+ secciones visuales distintas,
extráelo en ese momento (no lo dejes para "después"). Cada pieza extraída
recibe su propia interfaz de props explícita — nada de prop-drilling de
objetos completos si el hijo solo necesita 2-3 campos.

## Carpetas por pantalla
Componentes de una misma pantalla/feature viven en su propia subcarpeta
dentro de components/game/ (ej. configuration/, session/). Piezas
genéricas reutilizables entre pantallas (ej. ConfirmModal) van en
components/ui/, no en game/.

## Imports: relativo vs. alias @/
- Relativo (./, ../): vecinos directos — mismo folder o un nivel abajo.
- Alias (@/): todo lo que cruce hacia types/, utils/, context/, styles/,
  data/ — sin importar la profundidad del archivo que importa.

Ejemplo: @/types/country, @/utils/learning-storage, @/context/GameContext,
@/components/ui/Button.

## Duplicación a vigilar
Antes de escribir un nuevo componente de confirmación/modal, revisa
components/ui/ — ConfirmModal ya cubre el caso genérico (title,
description, confirmLabel, cancelLabel, variant). No crear una copia
con texto hardcodeado.