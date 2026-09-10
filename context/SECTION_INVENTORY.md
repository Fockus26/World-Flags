# Section Inventory — World Flags

> "Secciones" aquí = bloques de una vista (ver `PAGE_INVENTORY.md`). Todas dentro de `/`.

## Vista: Configuración (`game/configuration/`)

| Bloque | Archivo | Estado | Notas |
|---|---|---|---|
| Resumen de usuario + barra de progreso | `UserSummary.tsx` | Cerrada | `<button>` con forma de píldora (`rounded-full`) que abre el modal de perfil; barra de progreso `aria-hidden` (el % lo anuncia el `aria-label`) |
| Botones icono ranking 🏆 / picker 📍 (con badge) | dentro de `Configuration.tsx` | Cerrada | `IconButton` en `Tooltip` |
| Grid de continentes | `RegionSelector.tsx` + `RegionOption.tsx` | Cerrada | scroll interno (`overflow-y-auto` + `py-1.5` para no cortar el hover-lift). Selección = color por puntuación (`utils/score.ts`), nunca morado |
| CTA "Comenzar práctica" / "Práctica diaria (N)" | `Configuration.tsx` | Cerrada | full-width, `shrink-0` |
| Modal Perfil y configuración | `configurationModal/ConfigurationModal.tsx` | Cerrada | HeroUI `Tabs` (Usuario / Juego), paneles con `animate-in` |
| — tab Usuario | `AccountTab.tsx` (+ `AuthSection.tsx`, `Avatar.tsx`, `EmailConfirmationPending.tsx`) | Cerrada | switch personalización↔sesión con condicional + `animate-in` (framer estaba roto). Divisor "o" = línea–texto–línea |
| — tab Juego | `GameTab.tsx` (+ `ThemeSwitcher.tsx`) | Cerrada | `OptionTile` para modo/orden/timer/dificultad; `HelpHint` `?` con Tooltip; `ThemeSwitcher` |
| Modal Elegir países | `CountryPickerModal.tsx` | Cerrada | acordeón por continente; "Todos" + "Ninguno" por región (Ninguno en selección parcial) + "Limpiar todo (N)" global; scroll del modal |
| Modal Ranking | `LeaderboardModal.tsx` | Cerrada | top 5 + tu puesto si estás fuera; lee `leaderboard_entries` |

## Vista: Sesión (`game/session/`)

| Bloque | Archivo | Notas |
|---|---|---|
| Header (progreso / temporizador / cronómetro / Abandonar) | `Header.tsx` + `Timer.tsx` | cronómetro en vivo en modo rush; "Abandonar" `fullWidth={false}` |
| Bandera | `FlagDisplay.tsx` | `<img>` desde `flagcdn.com` |
| Formulario de respuesta | `AnswerForm.tsx` | `Input` + "Comprobar"/"Saltar" (`grid grid-cols-[2fr_1fr]`) + `FeedbackMessage` + `GradeButtons` en modo práctica |
| Modal confirmar abandono | `ConfirmationModal.tsx` | `role="alertdialog"`, foco a "Continuar practicando" |
| Mecánica rush | `Session.tsx` | penalizaciones de tiempo, pausa/avance, requeue estilo Anki (`usePracticeQueue`) |

## Vista: Práctica diaria (`game/session/DailyPractice.tsx`)

Revelar (Espacio/click) → `GradeButtons`. Cola compartida con la sesión
(`hooks/usePracticeQueue.ts`). Sin framer (condicional + `animate-in`).

## Vista: Resultados (`game/Results.tsx`)

Círculo de puntuación (práctica) o de tiempo (competitivo) según `result.mode`.
`getScoreColor/BackgroundColor` reciben el tema resuelto (`useTheme`). Botones
"Volver al inicio" / "Repetir práctica".
