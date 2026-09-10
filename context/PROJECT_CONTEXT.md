# Project Context — World Flags

> Primer archivo que lee cualquier agente. Si un dato no existe, dice `PENDIENTE` y
> tiene fila en `CONTENT_CHECKLIST.md`.

## Resumen

App web / PWA para aprender las 196 banderas del mundo con repetición espaciada
(SM2, estilo Anki). Convierte el estudio de banderas en un hábito sostenible:
prioriza lo que el usuario olvida y espacia lo que ya domina.

## Tipo de proyecto

Juego / app instalable (PWA). No es landing ni sitio de contenido.

## Negocio

- **Qué hace:** entrena el reconocimiento de banderas por país.
- **Qué debe lograr:** que el usuario vuelva a practicar día tras día (retención).
- **Acción principal:** empezar y completar una sesión de práctica.

## Público objetivo

Gente que quiere memorizar banderas/geografía: estudiantes, aficionados a trivia,
gente preparando concursos. Uso principal declarado: **móvil**.

## Tono de marca

Educativo, motivador, moderno, con un punto lúdico (morado de marca, avatares
"dicebear", emojis funcionales 🏆 📍). **No debe parecer:** infantil, corporativo/frío,
ni un test académico severo.

## Idioma y mercado

- UI en **español**. `<html lang="es">`, `og:locale=es_ES`.
- El README del repo está en inglés (para GitHub); todo lo demás en español.

## Restricciones de marca

- **Color obligatorio:** morado `#6d5ef0` (primary light). Ya es `theme_color` del
  manifest y del `<meta name="theme-color">`.
- **Tipografía:** Plus Jakarta Sans (Google Fonts, hoy render-blocking — ver
  `CONTENT_CHECKLIST.md`).
- Logo: solo `public/favicon.svg` (bandera estilizada sobre gradiente morado). No hay logotipo con texto.

## Stack técnico

- Framework: **Astro 7** (`output` estático; una sola ruta `/` con una isla React `client:load`)
- Lenguaje: **TypeScript** estricto · **React 19** + React Compiler
- Componentes: **HeroUI v3** (`@heroui/react` 3.2.x + `@heroui/styles`) — razón:
  el dueño lo pidió explícitamente; el tema propio ya iba "HeroUI-ish"
- Estilos: **Tailwind CSS v4** (CSS-first, sin `tailwind.config.js`); tokens propios
  puenteados a los de HeroUI (ver `context/decisions/02-tokens-y-tema.md`)
- Gestor: **bun**. Docs de librerías: **Context7**
- Estado en memoria: **Redux Toolkit** (`src/store/`, slices `auth`/`game`/`theme`)
- Base de datos / Auth: **Supabase** (`user_learning_data` privada + `leaderboard_entries` pública)
- Persistencia local: `localStorage` vía `src/utils/learning-storage.ts`
- Pagos / correo: N/A
- Despliegue: **PENDIENTE** (aún sin dominio; `astro.config.mjs` `SITE_URL` es placeholder)

## Alcance de "páginas"

| "Página" | Ruta | Estado |
|---|---|---|
| App (shell único) | `/` | Cerrada |

No hay más rutas. Dentro de `/` hay 4 **vistas** que alternan por estado de Redux, no por URL — ver `PAGE_INVENTORY.md` / `SECTION_INVENTORY.md`.

## Funcionalidad más allá de lo estático

- [x] Autenticación de usuarios (Supabase, email/password + Google OAuth)
- [x] Persistencia de progreso de usuario (local + nube, con merge)
- [x] Ranking público (leaderboard competitivo "mundo")
- [x] Formularios con envío real (auth)
- [ ] Pagos / carrito / CMS / multi-idioma — no aplica

## Track de fases

No sigue el track de fases del kit (Tokens→Layout→…) porque **el proyecto ya
existía y estaba en producción** cuando entró el kit. Lo que se hizo fue una
**unidad grande de migración + fixes** (ver `PHASE_LOG/heroui-migracion.md`).
El track por fases aplicaría a partir de un rediseño mayor o modos de juego nuevos.

## Modo de trabajo

- Dark mode: **sí** (claro / oscuro / sistema, `[data-theme]` en `<html>`).
- Rama madre: **no** — las unidades salen de `main`. Ver `GIT_STATE.md`.

## Particularidades

- **Astro islands:** toda la app React es una isla única (`src/pages/index.astro` →
  `App.tsx` con `client:load`). No hay Server Components; el patrón "`'use client'`
  abajo" del kit no aplica.
- **El SW cachea muy agresivo** (dev y prod). Ver la nota en `CLAUDE.md`.
- **Entorno de este equipo (Windows):** Playwright / navegador embebido fallan a
  ratos (`window.innerHeight === 0`, Chromium cuelga). Afecta a QA automatizada,
  no al producto.
- Banderas y avatares vienen de CDNs externos (`flagcdn.com`, `dicebear`) — riesgo
  offline en el primer uso.
