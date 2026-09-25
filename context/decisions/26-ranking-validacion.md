# Decisiones — Validación del ranking en el servidor

> Fix, rama `fix/ranking-validacion-servidor` (pendiente P5 y aviso 3 de P1,
> tanda 2026-09-24). El dueño eligió el enfoque: trigger con mínimos verosímiles
> por scope (no edge function que valide la partida).

| ID | Decisión | Razón | Estado |
|---|---|---|---|
| D112 | Mínimo de cada scope vigente del ranking = nº de países del scope × **300 ms**. Hoy los tres (`countries:world`, `flags:world@2`, `capitals:world@2`) recorren los 197 países: **59 100 ms**. Los números viven en `src/utils/leaderboard-validation.ts` y un test los compara con el catálogo (y con el SQL local si existe) | Tiene que ser imposible para un humano, no solo difícil: batirlo exige teclear sin pensar a más de ~27 teclas/s sostenidas (Países 1648 letras; Banderas 1648 + 197 Enter; Capitales 1386 + 197 Enter), más del doble del récord de mecanografía. Mejor dejar pasar un tramposo que rechazar a alguien honesto | Implementado (`fix/ranking-validacion-servidor`); SQL sin aplicar |
| D113 | Trigger `before insert or update` en `leaderboard_entries` (`supabase/leaderboard-validacion.sql`, local). Rechaza `best_time_ms` nulo o ≤ 0 y el que queda bajo el mínimo, con SQLSTATE `PT422` (PostgREST: HTTP 422, `code: "PT422"`). En un update solo valida si cambia el tiempo o el scope. El cliente trata `PT422` como rechazo **definitivo**: `upsertLeaderboardEntry` devuelve `rejected` y `GameEffects` no la reintenta (sí sigue reintentando `failed`, D050) | El `update` de nombre y avatar (D079) toca todas las filas del usuario y no debe fallar por una fila antigua. Antes, una subida fallida se reintentaba con cada cambio de `learningData` (cada respuesta de la partida): con un rechazo que siempre se repite eso era un bucle de peticiones. El rechazo no es fallo de sincronización: no toca `hydrationStatus` ni el progreso local | Implementado (`fix/ranking-validacion-servidor`); SQL sin aplicar |
| D114 | Scope sin mínimo (los viejos `world` y `capitals:world`, o uno nuevo aún no listado en el SQL): **se deja pasar**, solo con la regla de tiempo > 0 | Los viejos nadie los lee (D076) y los siguen escribiendo clientes viejos que no saben tolerar el rechazo. Uno nuevo que el cliente estrene antes que el SQL perdería marcas honestas en silencio; un tramposo en un scope que nadie lee no hace daño | Implementado (`fix/ranking-validacion-servidor`); SQL sin aplicar |

## Lo que esto no cubre

- **No valida que la partida existiera.** Un tramposo puede subir cualquier
  tiempo ≥ 59,1 s. Lo real sería subir la partida (respuestas con marcas de
  tiempo) a una edge function que la reproduzca; el dueño lo descartó por ahora.
- **Un tiempo local imposible de verdad** (p. ej. si el reloj del sistema salta
  hacia atrás a mitad de un rush) se queda como mejor marca local y bloquea las
  siguientes: ninguna marca real la mejora, así que nada más sube al ranking.
  Caso raro; no se toca aquí.
- **Filas que ya existían** por debajo del mínimo no se borran (el trigger solo
  mira escrituras). En la comprobación en seco del 2026-09-24 no había ninguna.

## Alternativa descartada

- `check (best_time_ms >= …)` en la tabla: no puede depender del scope sin
  una tabla auxiliar y, al añadirse, falla si alguna fila vieja no cumple.
- Tabla auxiliar `leaderboard_scope_limits` en vez de `case`: más fácil de
  cambiar sin redefinir la función, pero una tabla más con RLS y grants para
  tres números que cambian solo con el catálogo o la regla.
