# 09 — Códigos de país fuera del catálogo

> Fix defensivo, rama `fix/codigos-fuera-de-catalogo`. Sin cambio visible hoy:
> el catálogo (`src/data/countries.ts`) no ha cambiado desde el primer commit,
> así que ningún usuario tiene todavía un código que no conozca. Es la
> precondición de cualquier cambio de catálogo (añadir Taiwán, quitar Kosovo…).
> Origen: auditoría del catálogo del 2026-09-21, §5.8 (informe local
> `context/plans/auditoria-paises.md`).
>
> Verificado con `bunx astro check` / `bunx biome check ./src` /
> `bun run build` y con aserciones puras (script temporal, no committeado) en
> dos escenarios: catálogo real + `tw` desconocido, y catálogo sin Kosovo +
> `xk` huérfano. Las mismas aserciones fallan contra `main` (7 de 10).

## El problema

Todo lo guardado por país (`countryHistory`, `lastPracticeByCountry`, los de
`countriesGame`, `lastConfiguration.scope.countryCodes`) es un mapa o una lista
de códigos. La app asumía que todo código guardado existe en el catálogo.
Dejaría de ser cierto:

- **Si se quita un país** (p. ej. Kosovo): `xk` queda en el progreso de casi
  todos los usuarios activos.
- **Si se añade uno** (p. ej. Taiwán): un cliente viejo, todavía en caché del
  SW, recibe `tw` por la nube desde un dispositivo actualizado.

Con un código desconocido: "196/195 · 101 %", "Práctica diaria (N)" con uno de
más, y **pantalla en blanco sin cabecera ni "Salir"** cuando ese código llegaba
a la cabeza de la cola (`DailyPractice`/`Session` hacían `return null`). Y el
riesgo más serio: "La vuelta al mundo" sellada en falso (N-1 países reales + el
huérfano), que por D017 ya no tiene vuelta atrás.

## D040 — Se conservan al guardar, se filtran al leer

Los códigos desconocidos **se conservan** al normalizar, fusionar y subir
(`migrateCountryHistory`, `mergeLearningData`, `pushLearningData`), y **se
ignoran solo al leer, contar y mostrar**. Un único punto de verdad:
`isCatalogCountryCode` (`src/utils/country-catalog.ts`).

Por qué no filtrar al guardar (alternativa descartada):

- Un cliente viejo borraría progreso de versiones nuevas: `pushLearningData`
  sube la fila entera, así que si su `normalizeLearningData` descartara `tw`, la
  próxima subida lo eliminaría de la nube para todos los dispositivos. Es el
  mismo razonamiento que D021 con los ids de logro.
- Quitar un país sería irreversible: si volviera, su progreso ya no estaría.
  Conservándolo, reaparece intacto.
- La limpieza en Supabase tampoco serviría: cualquier `localStorage` o cliente
  viejo lo volvería a subir.

Dónde se filtra (todo lectura):

| Sitio | Qué evita |
|---|---|
| `countLearnedCountries` (y `countLearned` de logros, que ahora la reutiliza) | "101 %", desbloqueos falsos de los logros de "X banderas aprendidas" |
| `getDueCountries` | Contador de práctica diaria inflado; cola con un código sin bandera |
| `isEmptyScope`, `getScopeLabel` | "1 país personalizado" fantasma; un scope que parece no vacío y resuelve a cero países |
| Contador del 📍 (`Configuration`) y "Usar N países" / "Limpiar todo (N)" (`CountryPickerModal`) | El mismo fantasma en la UI. El selector sigue guardando la lista entera: los desconocidos vuelven intactos al confirmar |

Redes de seguridad, por si algo se cuela igual:

- `startGame` no arranca, en ningún modo, un scope que no resuelve a ningún país
  (antes solo lo comprobaba en práctica; en competitivo montaba `Session` con 0
  países). `startDailyPractice` no abre una cola vacía.
- `DailyPractice` vuelve a filtrar la cola al montar, y si no queda nada sale por
  `onAbandon` (no cuenta como sesión). `Session`, si tiene partida pero ningún
  país que mostrar, sale por `exitGame`. En ambos casos: de vuelta a la
  configuración, nunca pantalla en blanco.

Fuera de esta decisión, a propósito:

- `seedStats` (siembra de `activeDays` desde `lastPracticeByCountry` /
  `lastReviewedAt`): cuenta días, no países. Un día practicado con Kosovo sigue
  siendo un día practicado.
- `getExactSingleRegion`: sigue mirando `scope.countryCodes` crudos. Con un
  código desconocido el scope no cuenta como "un solo continente": un rush así
  no registra mejor tiempo de ese continente (la nota de práctica no depende de
  esto, va por `regionBreakdown`). Es conservador y no cambia qué partidas
  registran marca.
- `hasGameProgress` (`hasCountryHistory`): pregunta si hay datos, no cuántos
  países se saben — un huérfano sí es un dato que no hay que perder.

## De paso

- Los `196` de la UI (`Configuration`, "Todo el mundo" de `RegionSelector`)
  salen de `countries.length`. El assert de `countries.ts` sigue en 196: es una
  alarma intencionada que se actualiza junto con el catálogo.
- `CACHE_NAME` del SW `v2 → v3`: un cambio de catálogo no toca `sw.js`, así que
  el navegador no detectaría un SW nuevo y las pestañas/PWA abiertas desde antes
  del deploy no verían el aviso "Actualizar". Contrapartida: la caché vieja se
  borra y las banderas se vuelven a descargar según se usen.
