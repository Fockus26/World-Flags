# 🌍 World Flags

A web app (installable as a PWA) for learning the world's flags through spaced repetition (Anki-style), with cloud-synced progress, a timed "rush" competitive mode with a public leaderboard, and flexible practice scopes.

---

## 🌍 Overview

World Flags aims to turn flag learning into a sustainable habit, applying the same principle used by tools like Anki: **spaced repetition (SM2 algorithm)**. Instead of reviewing the whole deck equally, the system prioritizes the flags the user tends to forget and spaces out the ones they already master.

The system allows users to:

- Create an account and save progress, synced across devices via Supabase
- Practice with flexible settings: theme, difficulty, order, and geographic scope (whole world, several continents combined, and/or hand-picked individual countries)
- Choose between practice mode (no pressure, spaced repetition) or competitive "rush" mode (the whole session is timed, best time saved)
- Compete on a public leaderboard for the fastest "whole world" rush time
- Track their own progress per continent, thanks to the spaced repetition system and a once-per-day-per-country practice lock

---

## ✨ Features

### 🎮 Gameplay & Configuration

- 🧠 Anki-style spaced repetition (SM2 algorithm) to prioritize flags based on hits/misses, with a daily practice queue (`Práctica diaria`) for whatever is due
- 🔁 Missed flags ("otra vez" / "difícil") are requeued and asked again later in the *same* session, both in daily practice and continent practice
- ✅ Once-per-day-per-country lock for practice mode (based on local calendar day, not a rolling 24h window) — already-practiced countries are auto-excluded from a new session instead of blocking it outright
- 🕹️ Two modes:
  - **Practice** — no pressure, optional per-flag timer (toggle), scored and tracked by the spaced repetition system
  - **Competitive ("rush")** — the whole session is a stopwatch; wrong answers and skips reveal the answer, add a time penalty, and auto-advance. Best time is saved per continent and for the whole world
  - ⏭️ Skip button for flags you don't know, auto-graded as "otra vez"
- 🌎 Flexible practice scope: the whole world, any combination of whole continents, and/or individual countries hand-picked from the country picker (📍) — all combinable in a single session
- 🔤 Alphabetical or random flag order
- 🎚️ Easy or hard difficulty (hard mode requires correct accents in answers)
- 🎨 Light, dark, or system theme

### 🏆 Leaderboard

- Public ranking (🏆) of the best "whole world" rush time, showing the top 5 and — if you're not in it — your own rank below the list (e.g. `#32 · 1:25.59`)
- Backed by its own Supabase table (`leaderboard_entries`, public read / owner-only write via RLS), separate from the private per-user progress table — see [supabase/leaderboard.sql](./supabase/leaderboard.sql)

### 🔐 Account & Progress

- 👤 User authentication (Supabase)
- ☁️ Progress saved and synced to the cloud, with a `localStorage` fallback for guest mode
- 📊 Per-region stats: practice score average, best rush time, and today's practice progress
- 📱 Installable PWA with an offline-capable service worker

---

## 🛠 Tech Stack

- **Base framework:** Astro (static output — a single-page shell mounting one React tree; no SSR/multi-page routing is in use today)
- **Interactive UI:** React 19 + TypeScript (React Compiler enabled via `babel-plugin-react-compiler`)
- **Runtime / toolchain:** Bun
- **Global state:** Redux Toolkit
- **Auth & backend:** Supabase (client in `src/lib/supabase.ts`)
- **Local persistence:** `localStorage`, wrapped by `src/utils/learning-storage.ts`
- **Styling:** Tailwind CSS v4, with shared design tokens in `src/styles/variables.css`
- **Animations:** Framer Motion, with reusable variants centralized in `src/styles/animations.ts`
- **Icons:** [iconoir-react](https://iconoir.com/)
- **PWA:** hand-rolled service worker (`public/sw.js`) + web manifest

---

## 📂 Project Structure

```text
src/
├── components/
│   ├── app/                          # Providers and startup effects
│   │   ├── AuthEffects.tsx           # Supabase session listener
│   │   ├── GameEffects.tsx           # progress hydration/sync + leaderboard push
│   │   ├── Providers.tsx             # <Provider store={store}> + Effects
│   │   └── ThemeEffects.tsx          # theme persistence + prefers-color-scheme
│   ├── game/
│   │   ├── configuration/
│   │   │   ├── configurationModal/   # profile, game settings and account tabs
│   │   │   ├── Configuration.tsx     # main screen: scope, mode, ranking & country-picker icons
│   │   │   ├── CountryPickerModal.tsx
│   │   │   ├── LeaderboardModal.tsx
│   │   │   ├── RegionOption.tsx
│   │   │   ├── RegionSelector.tsx
│   │   │   ├── ThemeSwitcher.tsx
│   │   │   └── UserSummary.tsx
│   │   ├── session/
│   │   │   ├── AnswerForm.tsx
│   │   │   ├── ConfirmationModal.tsx
│   │   │   ├── DailyPractice.tsx
│   │   │   ├── FlagDisplay.tsx
│   │   │   ├── Header.tsx            # live stopwatch in rush mode
│   │   │   ├── Session.tsx           # rush mechanics: penalties, pause/advance, requeue
│   │   │   └── Timer.tsx
│   │   ├── FlagGame.tsx
│   │   └── Results.tsx               # practice score vs. competitive time, by result.mode
│   ├── ui/                           # Button, IconButton, Modal, Select, Tooltip, GradeButtons, ...
│   └── App.tsx
├── data/
│   └── countries.ts                  # countries/flags dataset
├── hooks/
│   ├── useAuth.ts
│   ├── useGame.ts                    # all learningData mutations go through here
│   ├── usePracticeQueue.ts           # shared Anki-style requeue queue (daily + continent)
│   └── useTheme.ts
├── layouts/
│   └── Layout.astro
├── lib/
│   └── supabase.ts                   # Supabase client
├── pages/
│   └── index.astro
├── store/
│   ├── index.ts                      # configureStore, RootState/AppDispatch
│   ├── hooks.ts                      # typed useAppDispatch/useAppSelector
│   └── slices/
│       ├── authSlice.ts
│       ├── gameSlice.ts
│       └── themeSlice.ts
├── styles/
│   ├── animations.ts                 # Framer Motion variants (motionVariants, motionTransition)
│   ├── global.css                    # Tailwind entrypoint + base styles
│   ├── theme.css                     # dark mode token overrides
│   └── variables.css                 # design tokens (colors, radii, transitions)
├── types/
│   ├── country.ts                    # PracticeScope, GameConfiguration, GameResult
│   └── progress.ts                   # UserLearningData, RegionBestTimes, LastPracticeByCountry
├── utils/
│   ├── avatar.ts
│   ├── cloud-storage.ts              # Supabase sync (fetch/push/merge/syncOnLogin) + leaderboard
│   ├── date.ts                       # local calendar-day helpers
│   ├── learning-storage.ts           # single entry point to localStorage
│   ├── normalize-answer.ts           # answer normalization (hard mode, accents)
│   ├── practice-queue.ts             # Anki-style requeue decision logic
│   ├── practice-scope.ts             # PracticeScope → country list / label / region-key helpers
│   ├── prepare-countries.ts
│   ├── region-stats.ts
│   ├── score.ts
│   ├── shuffle.ts
│   └── spaced-repetition.ts          # SM2 algorithm
└── env.d.ts

docs/                                  # deeper dives: state management, design system, components
supabase/                              # SQL migrations to run manually in the Supabase SQL editor
```

---

## 🏗️ Architecture

### State management

In-memory state lives in **Redux Toolkit**, split into three slices: `auth`, `game`, and `theme`. Components never access `useAppDispatch`/`useAppSelector` or `localStorage` directly — they consume dedicated hooks (`useAuth`, `useGame`, `useTheme`), which expose the same public interface the old React Context hooks used to. See [docs/state-management.md](./docs/state-management.md) for the full rules, including why every mutation in `useGame.ts` reads `store.getState()` directly instead of a render-time selector (multiple dispatches in the same event handler would otherwise clobber each other, since `setLearningData` replaces the whole slice rather than merging it).

Three "Effect" components, mounted once at the app root (`components/app/`), handle startup side effects: the Supabase session listener (`AuthEffects`), progress hydration/sync plus leaderboard push (`GameEffects`, with an 800ms debounced push), and theme persistence (`ThemeEffects`).

### Practice scope & scoring

What a session practices is modeled by `PracticeScope` (`src/types/country.ts`): either the whole world, or any combination of whole continents plus individually hand-picked countries. `src/utils/practice-scope.ts` resolves a scope to its country list and decides when it counts as "one continent" for per-continent stats. Practice mode enforces a once-per-day-per-country lock (`lastPracticeByCountry`); competitive mode ("rush") times the whole session and saves a best time per continent and for the world.

### Persistence & sync

`src/utils/learning-storage.ts` is the single entry point to `localStorage`. Syncing with Supabase goes through `src/utils/cloud-storage.ts`, which fetches, pushes, and merges remote progress with local progress, and also reads/writes the public `leaderboard_entries` table. The Supabase client is initialized in `src/lib/supabase.ts`.

### Design system

Styling is done with **Tailwind CSS** utility classes, backed by shared design tokens (colors, radii, transitions) defined in `src/styles/variables.css` — no hardcoded hex/px values. Dark mode reuses the same set of tokens under a theme selector (`theme.css`). Animations are handled with **Framer Motion**, with reusable variants and transitions centralized in `src/styles/animations.ts` rather than defined ad hoc per component. See [docs/design-system.md](./docs/design-system.md) and [docs/components.md](./docs/components.md) for more.

---

## ⚙️ Installation & Setup

1. Create a [Supabase](https://supabase.com) project and set up:
   - Auth (email/password)
   - A private `user_learning_data` table for per-user progress (RLS: owner-only read/write)
   - The public leaderboard table — run [supabase/leaderboard.sql](./supabase/leaderboard.sql) once in the SQL editor
2. Create a `.env` file with:
   ```env
   PUBLIC_SUPABASE_URL=your-project-url
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Install and run:
   ```sh
   bun install       # install dependencies
   bun dev           # start dev server at localhost:4321
   bun build         # build for production to ./dist/
   bun preview       # preview the production build locally
   ```

---

## 🗺️ Roadmap

- **🎨 Visual design pass** — the current UI is functional but hasn't had a dedicated design pass; revisit layout, spacing, and visual polish across the app.
- **🕹️ New related game mode** — a mode that builds on the flag quiz instead of replacing it. Candidates being considered (see [TODO.md](./TODO.md)): naming all countries of a scope against the clock, guessing a country's capital, or clicking a country's location on a map.
- Achievements (e.g. "learned a continent", "first 100 flags", "the whole world")
- Per-continent leaderboards (the `leaderboard_entries` schema already supports it via the `scope` column — only the UI to pick a scope is missing)

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE) — free and open for public use.
