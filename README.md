# 🌍 World Flags

A web app for learning the world's flags through spaced repetition (Anki-style), with cloud-synced progress and multiple configurable game modes.

---

## 🌍 Overview

World Flags aims to turn flag learning into a sustainable habit, applying the same principle used by tools like Anki: **spaced repetition (SM2 algorithm)**. Instead of reviewing the whole deck equally, the system prioritizes the flags the user tends to forget and spaces out the ones they already master.

The system allows users to:

- Create an account and save progress, synced across devices via Supabase
- Practice with different settings: theme, difficulty, order, and geographic scope
- Choose between practice mode (no pressure) or competitive mode (with a timer)
- Track their own progress thanks to the spaced repetition system

---

## ✨ Features

### 🎮 Gameplay & Configuration

- 🧠 Anki-style spaced repetition (SM2 algorithm) to prioritize flags based on hits/misses
- 🕹️ Practice mode and competitive mode (with a 5s, 10s, or 15s timer)
- 🔤 Alphabetical or random flag order
- 🎚️ Easy or hard difficulty (hard mode requires correct accents in answers)
- 🌎 Scope selection: worldwide or a specific continent — North America, Central America, the Caribbean, South America, Europe, Oceania, Asia, and Africa
- 🎨 Light, dark, or system theme

### 🔐 Account & Progress

- 👤 User authentication (Supabase)
- ☁️ Progress saved and synced to the cloud, with a `localStorage` fallback for guest mode
- 📊 User stats summary per region

---

## 🛠 Tech Stack

- **Base framework:** Astro
- **Interactive UI:** React + TypeScript
- **Runtime / toolchain:** Bun
- **Global state:** Redux Toolkit
- **Auth & backend:** Supabase (client in `src/lib/supabase.ts`)
- **Local persistence:** `localStorage`, wrapped by `src/utils/learning-storage.ts`
- **Styling:** Tailwind CSS, with shared design tokens in `src/styles/variables.css`
- **Animations:** Framer Motion, with reusable variants centralized in `src/styles/animations.ts`

---

## 📂 Project Structure

```text
src/
├── components/
│   ├── app/                     # Providers and startup effects
│   │   ├── AuthEffects.tsx      # Supabase session listener
│   │   ├── GameEffects.tsx      # progress hydration/sync
│   │   ├── Providers.tsx        # <Provider store={store}> + Effects
│   │   └── ThemeEffects.tsx     # theme persistence + prefers-color-scheme
│   ├── game/
│   │   ├── configuration/
│   │   │   ├── configurationModal/
│   │   │   ├── Configuration.tsx
│   │   │   ├── RegionOption.tsx
│   │   │   ├── RegionSelector.tsx
│   │   │   ├── ThemeSwitcher.tsx
│   │   │   └── UserSummary.tsx
│   │   ├── session/
│   │   │   ├── AnswerForm.tsx
│   │   │   ├── ConfirmationModal.tsx
│   │   │   ├── DailyPractice.tsx
│   │   │   ├── FlagDisplay.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Session.tsx
│   │   │   └── Timer.tsx
│   │   ├── FlagGame.tsx
│   │   └── Results.tsx
│   ├── ui/                      # Button, Modal, Select, Tooltip, GradeButtons, ...
│   └── App.tsx
├── data/
│   └── countries.ts             # countries/flags dataset
├── hooks/
│   ├── useAuth.ts
│   ├── useGame.ts
│   └── useTheme.ts
├── layouts/
│   └── Layout.astro
├── lib/
│   └── supabase.ts              # Supabase client
├── pages/
│   └── index.astro
├── store/
│   ├── index.ts                 # configureStore, RootState/AppDispatch
│   ├── hooks.ts                 # typed useAppDispatch/useAppSelector
│   └── slices/
│       ├── authSlice.ts
│       ├── gameSlice.ts
│       └── themeSlice.ts
├── styles/
│   ├── animations.ts            # Framer Motion variants (motionVariants, motionTransition)
│   ├── global.css               # Tailwind entrypoint + base styles
│   ├── theme.css                # dark mode token overrides
│   └── variables.css            # design tokens (colors, radii, transitions)
├── types/
│   ├── country.ts
│   └── progress.ts
├── utils/
│   ├── avatar.ts
│   ├── cloud-storage.ts         # Supabase sync (fetch/push/merge/syncOnLogin)
│   ├── learning-storage.ts      # single entry point to localStorage
│   ├── normalize-answer.ts      # answer normalization (hard mode, accents)
│   ├── prepare-countries.ts
│   ├── region-stats.ts
│   ├── score.ts
│   ├── shuffle.ts
│   └── spaced-repetition.ts     # SM2 algorithm
└── env.d.ts
```

---

## 🏗️ Architecture

### State management

In-memory state lives in **Redux Toolkit**, split into three slices: `auth`, `game`, and `theme`. Components never access `useAppDispatch`/`useAppSelector` directly — they consume dedicated hooks (`useAuth`, `useGame`, `useTheme`), which expose the same public interface the old React Context hooks used to.

Three "Effect" components, mounted once at the app root (`components/app/`), handle startup side effects: the Supabase session listener (`AuthEffects`), progress hydration/sync (`GameEffects`, with an 800ms debounced push), and theme persistence (`ThemeEffects`).

### Persistence & sync

`src/utils/learning-storage.ts` is the single entry point to `localStorage`. Syncing with Supabase goes through `src/utils/cloud-storage.ts`, which fetches, pushes, and merges remote progress with local progress. The Supabase client is initialized in `src/lib/supabase.ts`.

### Design system

Styling is done with **Tailwind CSS** utility classes, backed by shared design tokens (colors, radii, transitions) defined in `src/styles/variables.css` — no hardcoded hex/px values. Dark mode reuses the same set of tokens under a theme selector (`theme.css`). Animations are handled with **Framer Motion**, with reusable variants and transitions centralized in `src/styles/animations.ts` rather than defined ad hoc per component.

---

## ⚙️ Installation & Setup

```sh
bun install       # install dependencies
bun dev           # start dev server at localhost:4321
bun build         # build for production to ./dist/
bun preview       # preview the production build locally
```

---

## 🗺️ Roadmap

- **Rush mode** — will replace the current competitive mode: guess as many flags as possible as fast as possible, instead of a fixed per-flag timer.
- **Per-game leaderboard** — a ranking associated with each game mode.
- **New game: countries** — an additional mode focused on learning country names, complementing the flag quiz.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE) — free and open for public use.