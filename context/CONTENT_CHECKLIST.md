# Content Checklist — World Flags

> Placeholders y contenido real pendiente. Ningún agente los inventa como finales.
> Se marca "Resuelto" (no se borra la fila) cuando se confirme.

| # | Qué falta | Dónde | Quién lo marcó | Estado |
|---|---|---|---|---|
| 1 | **Dominio de producción.** `SITE_URL` es `https://world-flags.example.com` → canonical, `og:url`, `sitemap-index.xml` y el `Sitemap:` de `public/robots.txt` salen inválidos al desplegar | `astro.config.mjs` (`SITE_URL`), `public/robots.txt` | skill seo | Pendiente (bloqueado por decisión de despliegue) |
| 2 | **Imagen OG/Twitter 1200×630 dedicada.** Hoy `og:image`/`twitter:image` apuntan a `/pwa-512x512.png` (512×512 cuadrada) con `twitter:card=summary_large_image` → preview recortada al compartir | `src/layouts/Layout.astro` (`image` por defecto), `public/` | skill seo | Pendiente — el dueño va a generarla (ver `docs/pwa-assets.md`) |
| 3 | **Iconos PWA en la temática nueva** (touch-icon, `pwa-192`, `pwa-512`, `maskable-512`). Los actuales son de antes del morado HeroUI y podrían no ir a juego | `public/apple-touch-icon.png`, `public/pwa-*.png`, `public/maskable-icon-512x512.png` | dueño | Pendiente — el dueño los va a generar (ver `docs/pwa-assets.md`) |
| 4 | **Fuente autohospedada.** `Plus Jakarta Sans` se carga render-blocking desde Google Fonts; autohospedar (`@fontsource-variable/...`) mejora LCP | `src/layouts/Layout.astro` (`<link>` de fonts), `src/styles/*` | skill seo | Pendiente (mejora, no bloqueante) |
| 5 | **Peso del CSS.** `@import "@heroui/styles"` mete el CSS de las 84 componentes → ~428 KB crudo / ~43 KB gzip. Opción: imports granulares `@heroui/styles/base` + `/themes/default` + `/utilities` + `/variants` + solo los ~12 `components/*.css` usados | `src/styles/global.css` | skill seo | Pendiente (mejora; requiere re-QA visual + axe) |
| 6 | **`animations.ts` legado.** `motionVariants` / `timerCritical` / `createMotionVariant` mayormente sin uso tras pasar a `tw-animate-css`. Limpiar cuando se decida el futuro de framer | `src/styles/animations.ts` | migración HeroUI | Pendiente |
