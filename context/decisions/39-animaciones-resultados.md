# Decisiones — Animaciones de Resultados (P19 ★ Resultados)

> Unidad `style/animaciones-resultados` (tanda 2026-09-26, W7). Del dueño, solo las ★
> de "Resultados" de P19: números que cuentan hacia arriba y confeti + insignia de
> récord sincronizados con el sonido `record` (D146). CSS y `requestAnimationFrame`,
> nunca framer (D006).

| ID | Decisión | Razón | Estado |
|---|---|---|---|
| D154 | El número grande de Resultados (tiempo del rush completo, "encontrados" del rush rendido, nota /10 de la práctica) cuenta de 0 a su valor en 600 ms con salida suave (`easeOutCubic`), por `useCountUp` (`src/hooks/`, `requestAnimationFrame`). Token nuevo `COUNT_UP_DURATION_MS` (600 ms). Lo que se ve va `aria-hidden`; el valor final va en una región `aria-live="polite"` oculta, vacía mientras cuenta y rellenada una sola vez al terminar. Con movimiento reducido, o valor 0, el final sale desde el primer render. Red de seguridad: un `setTimeout` (600 + 100 ms) pone el final aunque `requestAnimationFrame` no corra (pestaña en segundo plano). Detrás del número animado va el final invisible en la misma celda de la rejilla, para que el círculo no crezca mientras cuenta. Las frases de debajo ("Recorriste … en 1:23.45") no cuentan: son el resumen legible | 150–200 ms no deja leer que el número sube; 600 ms es lo que pedía P19 y termina antes que la fanfarria (~1 s). Anunciar cada fotograma inundaría el lector de pantalla. Alternativa: contar también las frases (más movimiento, mismo dato repetido) | Implementado (`style/animaciones-resultados`) |
| D155 | Nuevo récord: confeti de 20 partículas CSS (`RecordConfetti.tsx` + `@keyframes confetti-fall` al final de `global.css`), colores de tokens del tema, caída única de 1,2–1,7 s con retrasos de 0–200 ms, desvanecida al final. Capa `absolute inset-0 overflow-hidden pointer-events-none aria-hidden` sobre la tarjeta (`section` pasa a `relative`); `motion-reduce:hidden`. Parámetros fijos calculados al cargar el módulo (sin `Math.random` en el render, React Compiler) | Sin librería (P19). Dentro de la tarjeta y recortado: no hay scroll horizontal a 320 px y no tapa clics. Dura lo que la fanfarria. Nada parpadea. Alternativa: confeti a pantalla completa (más vistoso, pero sale del overlay de Resultados y hay que cuidar el `inert` de detrás) | Implementado (`style/animaciones-resultados`) |
| D156 | La línea de texto "¡Nuevo récord!" de D146 pasa a insignia: píldora `bg-medal-gold-soft text-medal-gold border-medal-gold` (D147, ≥5,5:1 en claro y oscuro) con `Trophy` de iconoir (`aria-hidden`), entrada `zoom-in-50 fade-in-0` de 300 ms (la misma duración que el badge de castigo, D132) solo con `motion-safe`. Confeti e insignia montan en el mismo render en que `finishGame` pide `record`: arrancan a la vez que la fanfarria (que como mucho espera a que acabe el último acierto) | El oro dice "marca" igual que en el ranking y no depende solo del color (texto + icono). Sin retraso artificial: el sonido puede tardar unas décimas por la cola, pero el confeti dura más que ese margen. Alternativa: retrasar insignia y confeti a que termine de contar el tiempo (600 ms), a costa de quedar desfasados del sonido | Implementado (`style/animaciones-resultados`) |

## Lo que esto no cubre

- La tarjeta de Resultados entra desde abajo (300 ms) a la vez que cuentan los números
  y cae el confeti; se deja así (todo arranca en el mismo instante).
- No verificado en navegador en esta unidad (ver el PR).
