# PWA assets — qué archivos hacen falta y cómo generarlos

Referenciados desde `src/layouts/Layout.astro` y `public/manifest.webmanifest`.

## Inventario

| Archivo | Tamaño | Formato | `purpose` | Referenciado en | ¿Lo puede dar un agente? |
|---|---|---|---|---|---|
| `public/favicon.svg` | 512×512 (viewBox) | SVG | icono de pestaña | `<link rel="icon">` | **Sí** (SVG es texto) — hay una versión refrescada abajo |
| `public/apple-touch-icon.png` | **180×180** | PNG opaco, sin transparencia, esquinas cuadradas (iOS las redondea) | `apple-touch-icon` | `<link rel="apple-touch-icon">` | No — PNG |
| `public/pwa-192x192.png` | **192×192** | PNG | `any` | `manifest.webmanifest` | No — PNG |
| `public/pwa-512x512.png` | **512×512** | PNG | `any` | `manifest.webmanifest` | No — PNG |
| `public/maskable-icon-512x512.png` | **512×512** | PNG, arte dentro del **safe area** (círculo central del 80% ≈ 410px); el resto es "sangrado" que el SO recorta | `maskable` | `manifest.webmanifest` | No — PNG |
| **`public/og-image.png`** (NUEVO) | **1200×630** | PNG o JPG | — | `og:image` / `twitter:image` (hoy apuntan mal a `pwa-512`) | No — PNG |

Tras crear `og-image.png`, cambiar el default de `image` en `Layout.astro` de
`/pwa-512x512.png` a `/og-image.png` y confirmar que `SITE_URL` en `astro.config.mjs`
ya es el dominio real (si no, la URL absoluta de OG sale rota — ver
`context/CONTENT_CHECKLIST.md` fila 1).

## Identidad visual (para que todo vaya a juego)

- **Color de marca:** morado `#6d5ef0` (primary claro). Gradiente sugerido:
  `#7c6cf6 → #a463ea` (el que ya usa `favicon.svg`).
- **Sobre el morado:** blanco.
- **Tema:** tarjetas de repaso + banderas. Nada de mapas ni globos terráqueos
  fotográficos; estilo **plano, geométrico, limpio**, sin degradados dentro del
  símbolo, sin sombras realistas.
- **Tipografía de marca** (solo si el OG lleva texto): Plus Jakarta Sans, peso 700/800.
- **Tono:** educativo y moderno, con un punto lúdico. No infantil, no corporativo.

## `favicon.svg` refrescado (ya alineado — opcional, mejora leve)

Copia esto a `public/favicon.svg` si quieres un icono un poco más nítido y con el
morado exacto de la marca. El actual también sirve.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c6cf6"/>
      <stop offset="1" stop-color="#a463ea"/>
    </linearGradient>
  </defs>
  <!-- fondo a sangre (sirve también para maskable) -->
  <rect width="512" height="512" fill="url(#g)"/>
  <!-- tarjeta de repaso, redondeada, dentro del safe area -->
  <rect x="96" y="112" width="320" height="288" rx="40" fill="#ffffff"/>
  <!-- bandera: asta + paño ondeado en el morado de marca -->
  <rect x="150" y="150" width="14" height="212" rx="7" fill="#6d5ef0"/>
  <circle cx="157" cy="142" r="10" fill="#6d5ef0"/>
  <path d="M164 168
           C 206 150, 228 190, 272 170
           C 300 158, 320 166, 338 176
           L 338 262
           C 320 252, 300 244, 272 256
           C 228 276, 206 236, 164 254 Z"
        fill="#6d5ef0"/>
  <!-- franja para sugerir "patrón de bandera" -->
  <path d="M164 168
           C 206 150, 228 190, 272 170
           C 300 158, 320 166, 338 176
           L 338 205
           C 320 195, 300 187, 272 199
           C 228 219, 206 179, 164 197 Z"
        fill="#a463ea"/>
</svg>
```

## Prompt para ChatGPT / generador de imágenes (iconos PNG)

> Diseña un **icono de app cuadrado, estilo flat/geométrico, minimalista**, para
> una app educativa llamada "World Flags" que enseña las banderas del mundo con
> repetición espaciada.
>
> - **Fondo:** gradiente diagonal morado, de `#7c6cf6` (arriba-izquierda) a
>   `#a463ea` (abajo-derecha), a sangre completa (edge-to-edge).
> - **Símbolo, centrado, en blanco puro `#ffffff`:** una **tarjeta de repaso
>   (flashcard) redondeada** y, encima o dentro de ella, una **bandera ondeada
>   simple sobre su asta**. Formas planas, sin degradados internos, sin sombras
>   realistas, sin texto.
> - El símbolo ocupa ~60–65% del ancho y queda dentro de un margen de seguridad
>   central (círculo del 80%), para que funcione recortado como icono "maskable".
> - Estética: limpia, moderna, con un punto lúdico. Nada infantil, nada corporativo,
>   nada de mapas ni globos terráqueos realistas.
>
> Entrégalo en estas variantes exactas (mismo diseño, solo cambia el tamaño):
> 1. `pwa-512x512.png` — 512×512, PNG.
> 2. `pwa-192x192.png` — 192×192, PNG.
> 3. `apple-touch-icon.png` — 180×180, PNG **opaco** (fondo lleno, sin
>    transparencia; esquinas cuadradas, iOS las redondea solo).
> 4. `maskable-icon-512x512.png` — 512×512, PNG, con el símbolo un poco más
>    pequeño y el gradiente extendido hasta los bordes (arte dentro del safe area
>    circular del 80%).

## Prompt para la imagen OG (compartir en redes)

> Crea una **imagen para redes sociales de 1200×630 px** (Open Graph / Twitter card)
> para la app "World Flags — Aprende las banderas del mundo".
>
> - **Fondo:** gradiente morado suave `#6d5ef0 → #8b7cf5`, con una textura muy sutil
>   de banderas geométricas planas y de baja opacidad hacia los bordes (no compiten
>   con el texto).
> - **A la izquierda, texto en blanco:** título "World Flags" en una tipografía sans
>   redondeada y contundente tipo Plus Jakarta Sans ExtraBold; debajo, en menor
>   tamaño y opacidad ~85%, "Aprende las banderas del mundo con repetición espaciada".
> - **A la derecha:** el mismo icono de la app (tarjeta de repaso blanca + bandera
>   ondeada), a un tamaño grande pero sin tocar los bordes; deja ~80 px de margen de
>   seguridad en todo el perímetro (algunas plataformas recortan).
> - Estética coherente con el icono: flat, geométrico, limpio, moderno, con un punto
>   lúdico. Sin fotos, sin mapas realistas, sin mockups de teléfono.
> - Contraste del texto sobre el fondo ≥ 4.5:1.
>
> Entrégala como `og-image.png`, 1200×630, PNG (o JPG de alta calidad).
