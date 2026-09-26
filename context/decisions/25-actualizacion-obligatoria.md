# 25 — Aviso "Actualizar" en cada versión y actualización obligatoria

> Unidad `feat/actualizacion-obligatoria` (pendientes P1). Versión 2.3.0 (MINOR).
> El dueño eligió el enfoque (versión en `sw.js` vigilada por test + versión
> mínima en una tabla de Supabase, valor inicial 2.0.0, SQL escrito y no
> aplicado); el resto de decisiones son del agente, justificadas aquí.

## El problema

`public/sw.js` no cambiaba de bytes desde 1.2.0: lo único que lo movía era un
comentario escrito a mano. Sin bytes nuevos el navegador no instala un service
worker nuevo, así que las pestañas (y PWAs) abiertas no recibieron el aviso
"Actualizar" en 1.3.0, 2.0.0, 2.1.x ni 2.2.0, y seguían con su bundle viejo.
Además no había forma de impedir que un cliente viejo siguiera jugando con
reglas ya retiradas (la regla del ranking de 2.0.0).

## D107 — `sw.js` lleva la versión de `package.json`, vigilada por test

> Desde D135 (`33-changesets.md`) `APP_VERSION` no se toca a mano: lo sube `scripts/release.ts`
> en el PR de versión, junto con `package.json` y el CHANGELOG. El test sigue vigilándolo.

`public/sw.js` declara `const APP_VERSION = "x.y.z";` y
`tests/unit/sw-version.test.ts` falla si no es la de `package.json` (como
`changelog.test.ts` con la primera entrada del `CHANGELOG.md`). Al subir la
versión en un PR hay que tocar tres sitios (package, changelog, sw.js) y el
test lo recuerda en CI. `CACHE_NAME` sigue en `v4` (D054; el test también lo
vigila).

Descartado: generar `sw.js` desde una plantilla en el build (plugin de Vite /
integración de Astro que reemplace `__APP_VERSION__`). Quita el paso manual,
pero en `bun run dev` el SW se sirve desde `public/` sin pasar por el build,
así que habría que mantener dos caminos (dev y build) y el archivo del repo
dejaría de ser el que se ejecuta. El test es más simple y no toca el registro.

## D108 — La mínima vive en `public.app_config` (clave/valor, lectura pública)

Tabla `app_config (key text primary key, value text, updated_at)`, una fila
`min_version = '2.0.0'`. RLS con `select` para `anon` y `authenticated` y sin
políticas de escritura (más `revoke` de insert/update/delete): se cambia desde
el dashboard sin desplegar. Clave/valor y no una fila con columnas para no
necesitar otra migración con el próximo ajuste. SQL en
`supabase/app-config.sql` (local, no se aplica en esta unidad).

La lectura va en un archivo nuevo, `src/utils/app-config.ts` (no en
`cloud-storage.ts`): no hay cuenta ni progreso, y un fallo no se clasifica.
La lógica pura (validar y comparar versiones) va aparte, en
`src/utils/min-version.ts`, para que `tests/unit` la pruebe sin importar el
cliente de Supabase. La comparación reutiliza `compareVersions` del changelog
(número a número: 2.10.0 > 2.9.0).

Descartado: un `/min-version.json` servido por red por el SW. Obliga a
desplegar para cambiarlo y a tocar la estrategia de caché de `sw.js`.

## D109 — Se consulta al cargar y al volver a primer plano; bloquea con un diálogo

`useRequiredUpdate` consulta al montar y en cada `visibilitychange` a
`visible` (una PWA puede pasar días abierta sin recargar), sin apilar
consultas. El hook vive en `FlagGame`: si `APP_VERSION` < mínima, monta
`RequiredUpdateDialog`, que tapa el juego (también el tutorial: se monta el
último), y desmonta `SystemSnackbars`. Los avisos de sistema van en `z-[300]`,
por encima del diálogo, y React Aria no los oculta (son región `status`): sin
esto quedaban visibles y pulsables ("Ahora no", "Ver novedades") sobre el
bloqueo (visto en el navegador).

## D110 — Ante la duda, no bloquear

Sin red, tope de 5 s agotado, error del servidor, tabla inexistente (SQL sin
aplicar), fila ausente o valor que no es exactamente `MAJOR.MINOR.PATCH` →
`null` → no se bloquea. Solo una respuesta válida cambia el estado: al arrancar
eso es "no bloquear"; si ya estaba bloqueado, perder la red no lo desbloquea
(volver a primer plano sin red no abre la puerta a seguir jugando). Si la
mínima baja, la siguiente consulta sí lo quita. Un error al escribir la mínima
en el dashboard nunca deja a todo el mundo sin jugar.

## D111 — Diálogo no descartable con un solo botón, y "Actualizar" forzado

`ui/Modal` con `role="alertdialog"`, nombrado por su `<h2>` y descrito por su
texto, `isDismissable={false}` y la nueva prop `isKeyboardDismissDisabled`
(ampliación de la API del wrapper; por defecto `false`, los consumidores no
cambian): ni clic fuera ni Escape lo cierran. El foco entra directo en el
botón, la única acción. Un segundo clic no hace nada y el texto pasa a
"Actualizando…" (sin `disabled`, que le quitaría el foco).

"Actualizar" usa `forceUpdate` (nuevo en `useServiceWorkerUpdate`): si no hay
SW esperando, pide `registration.update()` y espera a que se instale (tope
5 s); con uno esperando y la página controlada, `SKIP_WAITING` y la recarga
del `controllerchange` de siempre (D047); en cualquier otro caso, o si la
recarga no llega en 5 s, `location.reload()`. La navegación es network-first,
así que recargar ya trae el HTML y el bundle nuevos.

## Verificación

`bunx astro check`, `bunx biome check` sobre lo tocado, `bun run test` (tests
nuevos `sw-version` y `min-version`) y `bun run build`. En el navegador
integrado, con `bun run dev` (puerto 4341) como invitado: sin tabla (404
`PGRST205`) no bloquea; con la respuesta interceptada, sin red / valor
`latest` / `2.0.0` no bloquean, `9.0.0` bloquea (foco en "Actualizar", Escape
y clic fuera no cierran, Tab no sale, avisos de sistema ocultos); ya bloqueado,
sin red sigue bloqueado y `2.0.0` lo quita. axe-core 4.10 sin violaciones en
claro y oscuro; a 320 px sin scroll horizontal. "Actualizar" sin SW recarga.

No verificado en navegador: la rama con SW en espera (`SKIP_WAITING`). El
navegador integrado no deja registrar el SW ("unknown error when fetching the
script", también con `bun run preview`). Reutiliza el camino ya probado de
D047.

## Aviso

Esto frena a clientes viejos **honestos**, no a un tramposo: las políticas RLS
de `leaderboard_entries` dejan a cualquier usuario autenticado escribir el
tiempo que quiera en su fila llamando directo a la API. La protección real es
validar en el servidor (P5, unidad `fix/ranking-validacion-servidor`).
