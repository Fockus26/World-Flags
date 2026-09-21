# 10 — Catálogo de países: 197 con Taiwán

> Rama `feat/taiwan-197`. Sale de una auditoría del catálogo (informe local,
> `context/plans/auditoria-paises.md`) y del arreglo preventivo
> `fix/codigos-fuera-de-catalogo` (PR #6), que tenía que estar desplegado antes.

## D041 — Criterio del catálogo: 193 ONU + 2 observadores + Kosovo + Taiwán

Hasta aquí el catálogo tenía 196 entradas sin criterio escrito. Se verificó
contra la lista oficial de la ONU: eran los **193 miembros + Santa Sede
(Vaticano) + Palestina** (los dos Estados observadores) **+ Kosovo**. El dueño
eligió añadir **Taiwán** (`tw`, Asia) → **197**.

Criterio resultante: miembros de la ONU, sus Estados observadores, y los dos
Estados de reconocimiento parcial con control efectivo pleno de su territorio y
bandera de uso internacional (Kosovo, Taiwán).

Alternativas descartadas:

- **Seguir en 196** (criterio implícito: "reconocidos por la mayoría de miembros
  de la ONU"). Defendible, pero Taiwán es una de las banderas que un usuario más
  espera encontrar.
- **197 + territorios de facto como grupo aparte** (Sáhara Occidental, Chipre
  del Norte, Somalilandia, Abjasia, Osetia del Sur, Transnistria, Islas Cook,
  Niue). Exige un modelo nuevo (9.ª región o `status` por país), decisiones de
  UX, y cinco banderas que flagcdn no tiene. Además es la opción políticamente
  más delicada. Si interesa, es una feature aparte.
- **Bajar a 195 quitando Kosovo.** Deja `xk` huérfano en casi todos los
  usuarios activos y quita contenido ya aprendido.

## Continentes

La asignación sigue el esquema geográfico M49 de la ONU (coincide en todos los
países que M49 lista) con **una excepción deliberada: México en Norteamérica**
(M49 lo pone en Centroamérica). Con M49 estricto, Norteamérica tendría 2 países.
Taiwán va a **Asia**, que pasa de 48 a 49 países.

## Efectos del cambio

- **Sin migración de Supabase.** El progreso es jsonb indexado por código; `tw`
  es una clave más.
- **Logros:** "La vuelta al mundo" pide 197 y "Travesía de Asia" 49 (los
  objetivos derivan del catálogo). Nada se des-desbloquea (D017): lo sellado
  sigue sellado.
- **Aprendidos:** quien tenía 196/196 pasa a 196/197 (99 %).
- **Mejores tiempos / ranking:** las marcas de "Todo el mundo" y de Asia se
  hicieron con un país menos. El único usuario del ranking hoy es el dueño, así
  que **no se abre temporada nueva**: tras el despliegue se limpian sus marcas
  de `world` a mano (`leaderboard_entries` + claves `world` en la nube y en
  `localStorage`). Borrar solo las filas del ranking no basta: `GameEffects`
  re-sube `regionBestTimes.world` en cada carga autenticada.
- **Clientes viejos:** desde el PR #6 ignoran códigos fuera de su catálogo al
  contar y al armar colas, así que un cliente sin `tw` no se rompe si le llega.
  `CACHE_NAME` sube a `v4` para que las pestañas abiertas vean el aviso
  "Actualizar".
- `public/flags/tw.svg` sale de flagcdn, igual que el resto de banderas.
