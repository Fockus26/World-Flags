# Avisos: sonido de fallo, logros en tanda y permiso de notificaciones

> Unidad `fix/avisos-sonido-notificaciones` (2.2.1). Pendientes P11, P12 y P13 de
> la tanda del 2026-09-24.

---

## D125 — El sonido de fallo, igual de audible que el de acierto

**Problema.** El fallo (D080) eran dos senos graves (Re4–La3, 294 → 220 Hz) con
picos 0,55/0,6, frente al acierto en triángulo (Mi5–La5, 659 → 880 Hz) con pico
0,5. En el papel, el fallo tenía más energía (+2,6 dB sin ponderar), pero el oído
es mucho menos sensible en graves (curvas de igual sonoridad) y los altavoces de
móvil casi no reproducen nada por debajo de ~500 Hz, y un seno no tiene armónicos
que lo rescaten.

**Medido, no supuesto.** Se calculó la energía de cada parcial con la misma
envolvente que `scheduleNote` (ataque 8 ms, caída exponencial) y se ponderó con
la curva A (IEC 61672) y, aparte, con la A más un altavoz de móvil simulado (paso
alto Butterworth de 4.º orden a 500 Hz). Diferencia con el acierto:

| Versión | Sin ponderar | Curva A | Móvil simulado |
|---|---|---|---|
| Fallo de antes (Re4–La3, seno 0,55/0,6) | +2,6 dB | **−5,6 dB** | **−26,6 dB** |
| Fallo nuevo (La4–Mi4, triángulo 0,65/0,7 + octava a ½) | +3,6 dB | +0,6 dB | −1,8 dB |

**Qué cambia.**

- **Notas:** La4 → Mi4 (440 → 330 Hz), cuarta justa descendente: el espejo del
  acierto (Mi5 → La5 ascendente) una octava más abajo. Sigue siendo "abajo" y
  "hacia abajo", con el mismo deslizamiento final (×0,94).
- **Timbre:** triángulo (el del acierto) en vez de seno, más una octava en seno
  a la mitad del pico (`withBody`). Esa octava (660–880 Hz) es lo que suena en el
  móvil; el oído reconstruye la nota grave a partir de ella.
- **Picos:** 0,65 y 0,7 (antes 0,55 y 0,6). Suma de picos en el peor momento
  ≈ 1,05 × 0,35 de volumen general: lejos de saturar.
- **Sin estridencia:** nada por encima de 880 Hz salvo los armónicos impares del
  triángulo (el 3.º a −19 dB); nada de cuadradas ni diente de sierra.

Se descartó subir solo la ganancia del seno: para igualar en el móvil harían
falta ~+27 dB, imposible sin saturar, y en auriculares quedaría atronador.

La alternativa (un fallo más agudo, en la zona del acierto) se oiría igual en
todas partes, pero se confundiría con el acierto; el contorno descendente y el
registro más bajo son lo que lo distingue sin mirar.
