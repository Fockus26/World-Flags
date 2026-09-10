# World Flags

App web (instalable como PWA) para aprender las banderas del mundo con repetición
espaciada estilo Anki: progreso sincronizado en la nube, modo competitivo
cronometrado ("rush") con ranking público, y alcance de práctica flexible
(mundo / continentes / países sueltos, combinables).

**Tipo:** juego / app · **Estado:** en producción, iterando diseño y features
**Dueño:** Alejandro (`alejandrorey2654@gmail.com`, git `Fockus26`)

---

## Antes de tocar código, lee en este orden

1. `context/PROJECT_CONTEXT.md` — qué es, stack, alcance
2. `context/CURRENT_PHASE.md` — dónde quedó todo y qué está abierto
3. `context/DESIGN_RULES.md` — lo que no se negocia
4. `context/GIT_STATE.md` — cuál es la rama base ahora mismo
5. `context/DECISIONS_INDEX.md` — buscador de decisiones ya tomadas (no las re-litigues)

Detalle técnico más profundo en `docs/` (estado, tokens, componentes) y en el
`README.md`.

---

## Stack

- **Astro 7** (output estático: una sola página `/` que monta **un** árbol React
  con `client:load`; no hay SSR ni routing multipágina)
- **React 19** + **TypeScript** estricto · **React Compiler** activo
  (`babel-plugin-react-compiler`, solo sobre `src/`)
- **HeroUI v3** (`@heroui/react` + `@heroui/styles`) como librería de componentes,
  sobre **Tailwind CSS v4** (CSS-first, sin `tailwind.config`)
- **Redux Toolkit** para estado en memoria · **Supabase** para auth + sync
- **Bun** para todo (install / dev / build) — nunca npm/yarn/pnpm
- **iconoir-react** para iconos · PWA con SW propio (`public/sw.js`)
- `framer-motion` está instalado pero **deprecado en la práctica** (ver
  `context/decisions/03-animaciones.md`): sus animaciones no corren en este stack.
  Las animaciones nuevas van con `tw-animate-css` (`animate-in fade-in / slide-in…`,
  ya incluido por `@heroui/styles`) o transiciones CSS.

```bash
bun install
bun run build          # sí puedes correr esto
bunx astro check       # typecheck — sí
bunx biome check ./src # lint — sí
bun run test:e2e       # Playwright (necesita el server corriendo)
```

**El servidor de desarrollo (`bun run dev`) lo levanta el dueño, no un agente.**
Si necesitas el sitio corriendo para verificar algo, pídelo y espera.

**Documentación de librerías:** consulta **Context7** antes de usar cualquier API
de HeroUI, Astro, React Aria, Supabase o Tailwind — cambian rápido.

---

## Cómo se trabaja aquí

Una unidad a la vez (un componente, una pantalla, un flujo, un fix acotado).

```
[git-flow: rama]  →  implementar  →  [skill a11y]  →  [skill seo si aplica]
   →  bunx astro check + bun run build  →  actualizar context/
   →  PAUSA: el dueño revisa y aprueba  →  commit (Conventional Commits) → merge
```

- **Nada se commitea sin aprobación explícita del dueño.**
- Rama base = lo que diga `context/GIT_STATE.md` (hoy: `main`, sin rama madre).
- Contra `main` se mergea con `--no-ff` y **no se hace push** — el dueño decide cuándo.
- Nada destructivo: sin `reset --hard`, sin `push --force`, sin reescribir historia,
  sin borrar ramas ajenas.

### Puertas de calidad (skills)

| Skill | Cuándo |
|---|---|
| `a11y` | Siempre que se toque UI, antes de pedir revisión. Objetivo axe-core limpio + checklist manual |
| `seo` | Al cerrar contenido/página. Ojo: `SITE_URL` sigue siendo un placeholder (ver `CONTENT_CHECKLIST.md`) |
| `git-flow` | Al abrir y al cerrar cada unidad |

### Subagentes de QA

`design-qa` y `functional-qa` — al cerrar una pantalla completa o un flujo. Corren
aislados (Playwright real). **Nota de entorno:** en Windows aquí Playwright y el
preview embebido fallan de forma intermitente (Chromium se cuelga al arrancar;
`window.innerHeight` puede reportar `0`). Si un subagente no puede ejecutar, su
reporte es revisión de código — vale, pero márcalo como no verificado en navegador.

---

## Reglas no negociables

- **Cero valores mágicos de color/espaciado/radio.** Todo sale de tokens (ver
  `context/COLORS.md`, `context/DESIGN_TOKENS.md`). `text-[#6d5ef0]` o `mt-[13px]`
  = o falta un token, o falta registrar una decisión.
  - Excepción tolerada hoy: tamaños de fuente arbitrarios (`text-[0.82rem]`, etc.)
    heredados de antes de HeroUI. No agregues más; consolida cuando toques un archivo.
- **HeroUI antes que reimplementar** un primitivo (foco/teclado ya resueltos).
  Los wrappers propios viven en `src/components/ui/` y **conservan su API previa**
  para no tocar los ~17 consumidores — respeta ese contrato.
- **Persistencia solo por `src/utils/learning-storage.ts`.** Nunca `window.localStorage`
  directo desde componentes. Nunca leer/escribir el store de Redux fuera de
  `store/slices/` — usa los hooks de `src/hooks/`.
- **WCAG 2.1 AA** mínimo. Contraste 4.5:1 texto normal, foco visible siempre,
  ningún estado solo por color, sin scroll horizontal a 320px.
- **Cero contenido final inventado** (copy, `alt` real, dominios, precios). Placeholder
  marcado + fila en `context/CONTENT_CHECKLIST.md`.
- **El SW (`public/sw.js`) cachea agresivo.** En dev, tras cada cambio:
  `serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()))` +
  `caches.keys().then(k=>k.forEach(c=>caches.delete(c)))` y recargar. También puede
  servir bundle viejo a usuarios tras un deploy.

---

## Cuándo parar y preguntar

- Falta un dato para decidir algo visual/UX → 3 opciones con pros/contras reales, y esperar.
- Algo choca con una regla de a11y → gana la regla, se escala.
- Se encuentra un bug en código ya cerrado → se reporta, no se arregla dentro de la unidad actual.
- Un archivo quedó sin uso → se señala, **no se borra**.
