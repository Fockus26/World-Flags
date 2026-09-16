# TODO

> Lista de trabajo interna. La versión pública y resumida del roadmap está en el
> `README.md`. Cada fase se trabaja en unidades pequeñas, una rama y un PR por unidad
> (ver `CONTRIBUTING.md`).

## Roadmap

### 1. Modo de juego: Capitales

Se muestra un país y se responde su capital. Debe encajar en el flujo existente igual
que Países: alcance, práctica / competitivo, práctica diaria, SRS, logros y ranking.

- [ ] Dataset de capitales en `src/data/` — fuente con licencia clara, y decidir casos
      especiales (países con varias capitales, nombres alternativos, tildes en modo difícil)
- [ ] Nuevo `GameType` + etiqueta, y su lugar en el selector de juego
- [ ] Sesión de práctica (con SRS y reencolado de fallos)
- [ ] Rush cronometrado + mejores tiempos por continente / mundo
- [ ] Práctica diaria de capitales
- [ ] Persistencia y sync del progreso nuevo (local + Supabase)
- [ ] Scope propio en el ranking (como `countries:world`)
- [ ] Logros de capitales
- [ ] Copy provisional marcado para aprobación del dueño
- [ ] a11y + e2e del flujo completo

### 2. Modo de juego: Mapa

Se muestra un país y se ubica en un mapa mundial que se va coloreando.

- [ ] Elegir fuente del mapa (SVG / TopoJSON): licencia, peso del bundle, países pequeños
      e islas (zonas de clic mínimas)
- [ ] Interacción accesible: alternativa por teclado al clic (WCAG 2.1 AA — no puede
      depender solo del puntero)
- [ ] Zoom / paneo usable en mobile y sin scroll horizontal a 320px
- [ ] Práctica, rush y práctica diaria sobre el patrón de los otros juegos
- [ ] Estados del mapa que no dependan solo del color (acierto / fallo / pendiente)
- [ ] Ranking y logros del modo

### 3. Rediseño de la app

- [ ] Brief y exploración en Claude Design sobre los tokens actuales
- [ ] Decidir el alcance: tokens/tema, pantalla de inicio, sesiones, modales, resultados
- [ ] Implementar por unidades sin romper la API de los wrappers de `src/components/ui/`
- [ ] Imagen OG 1200×630 e iconos PWA acordes a la identidad nueva
- [ ] QA visual (claro/oscuro, 320px → escritorio) + axe-core limpio

### 4. Monetización

Decidir la estrategia antes de escribir código.

- [ ] Evaluar opciones: anuncios, premium sin anuncios, donaciones / "invítame un café",
      packs de contenido — impacto en la experiencia de aprendizaje de cada una
- [ ] Prerrequisitos si hay anuncios: dominio propio (hoy `SITE_URL` en
      `astro.config.mjs` es un placeholder), política de privacidad y banner de
      consentimiento de cookies
- [ ] Nunca anuncios dentro de una sesión de juego activa ni que tapen controles
- [ ] Implementación y medición

## Backlog / ideas

- **Modo Burst**: variante a contrarreloj aplicable a todos los juegos
- **Ranking por continente**: el schema ya lo soporta vía `scope`, falta la UI para elegirlo
- **Correr la app sin Supabase**: modo invitado puro cuando faltan las variables de
  entorno, para que colaborar no exija un proyecto de Supabase
- **Biome en verde**: arreglar los errores previos de lint/formato, añadir
  `.gitattributes` (`eol=lf`) y volver bloqueante el paso de lint del CI
- **Autohospedar la fuente** (`Plus Jakarta Sans`) para mejorar LCP
- **Reducir el CSS de HeroUI** con imports granulares

## Hecho

- Repetición espaciada SM-2 con práctica diaria y reencolado de fallos en la misma sesión
- Práctica una vez por día por país (día calendario local); timer opcional en práctica
- Modo competitivo cronometrado con penalizaciones y mejores tiempos por región
- Alcance flexible: mundo, continentes combinados y países sueltos
- Ranking público del mejor rush de "Todo el mundo"
- Logros en 6 categorías, retroactivos
- Modo **Países** (tablero, vuelo, tarjeta con pistas, rush con "Rendirme") — cubre la
  idea original de "todos los países de un tirón"
- Rachas con calendario, recordatorio diario por push y aviso de versión nueva
- Migración a HeroUI v3 + Tailwind v4 y banderas autohospedadas
