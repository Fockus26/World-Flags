# 13 — Service worker: sin recarga en la primera visita

> Fix acotado, rama `fix/sw-recarga-primera-visita`. Hallazgo (3) de la unidad
> `feat/skeleton-carga` (PR #8), reportado ahí y no tocado.
>
> Verificado con `bunx astro check` / `bunx biome check ./src` /
> `bun run build` y en el navegador embebido con un arnés aislado (scratchpad
> de la sesión, fuera del repo): el `public/sw.js` real y el hook real, antes y
> después, empaquetados con React y servidos por un servidor desechable, cada
> versión en su propio origen. No se usó el dev server del sitio.

## El problema

En la primera visita la página no tiene service worker. `Layout.astro` lo
registra en `load`; al activarse, `sw.js` llama a `self.clients.claim()`, que
toma el control de la página abierta y dispara `controllerchange`.
`useServiceWorkerUpdate` recargaba ante **cualquier** `controllerchange`, sin
distinguir esa primera toma de control de una actualización pedida con el
botón "Actualizar" (`SKIP_WAITING`).

Resultado: ~1 s después de la primera carga la página se recargaba sola; el
usuario volvía a ver la pantalla de carga y perdía lo que hubiera empezado.
Traza del arnés con el hook de `main`: carga #1 sin controlador → hook montado
a 62 ms → `controllerchange` a 74 ms → carga #2 de tipo `reload`.

Lo mismo pasaba tras una recarga forzada (Ctrl+Shift+R, la página queda sin
controlador) si en ese momento se activaba un SW nuevo.

## D047 — Solo se recarga si había un controlador antes del cambio

`handleControllerChange` recarga únicamente si la página ya estaba controlada
antes del evento: ese es el caso de una versión que reemplaza a otra (el
"Actualizar" de esta pestaña o de otra). Sin controlador previo no hay versión
vieja: la página ya es la que el SW acaba de instalar (la navegación es
network-first), así que no se recarga.

El controlador se sigue **en vivo** (se actualiza en cada `controllerchange`),
no se fija al montar: tras la primera toma de control, un "Actualizar" en la
misma sesión sí debe recargar.

Alternativas descartadas:

- **Recargar solo si `applyUpdate` se llamó en esta pestaña.** Las demás
  pestañas dejarían de recargar: seguirían con el bundle viejo bajo el SW nuevo,
  que en `activate` borra la caché vieja, y su aviso quedaría apuntando a un
  worker ya activo (el botón "Actualizar" no haría nada). La recarga de todas
  las pestañas se conserva a propósito.
- **Fijar el controlador al montar el hook.** Arregla la primera visita, pero
  rompe un "Actualizar" posterior en esa misma sesión (seguiría viendo `null`).
- **Quitar `clients.claim()` de `sw.js`.** También evita el evento (una
  activación por `skipWaiting` cambia igualmente el controlador de las páginas
  ya controladas), pero la primera visita quedaría sin SW hasta la siguiente
  navegación, sin cachear lo que cargue en esa sesión, y obliga a subir
  `CACHE_NAME`. Decidir si un cambio de controlador merece recarga es cosa de
  la página, no del SW.

## Efectos del cambio

- **`sw.js` no cambia y `CACHE_NAME` sigue en `v4`.** El fallo solo afecta a
  una primera visita, que ya recibe el bundle nuevo; una pestaña abierta ya pasó
  la suya, así que no hace falta forzar el aviso "Actualizar".
- **El aviso de versión nueva sigue igual**, comprobado en el arnés: con
  `CACHE_NAME` `v5` servido, el aviso aparece (~3 s después de navegar, cuando
  el navegador comprueba el SW), el clic recarga la página y solo queda la caché
  `v5`. Con dos pestañas abiertas, pulsar "Actualizar" en una recarga las dos.
- Con el arreglo, la primera visita queda en una sola carga: hook montado a
  82 ms, `controllerchange` a 96 ms, sin recarga, y la página ya controlada.

## Fuera de alcance

- En la primera visita el hook monta antes del `register` (va en `load`), así
  que `getRegistration()` puede devolver `undefined` y no escuchar
  `updatefound` en esa sesión. En la práctica apenas importa: el navegador
  busca un SW nuevo sobre todo al navegar (la app no llama a
  `registration.update()`), y esa navegación ya monta el hook de nuevo.
  Preexistente, no se toca aquí.
