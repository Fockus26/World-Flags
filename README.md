# 🌍 World Flags

[![CI](https://github.com/Fockus26/World-Flags/actions/workflows/ci.yml/badge.svg)](https://github.com/Fockus26/World-Flags/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Learn every country and flag in the world with Anki-style spaced repetition.
An installable PWA with cloud-synced progress, a timed competitive mode with a public
leaderboard, streaks, achievements and daily reminders.

**▶ Play it:** [world-flags-hazel.vercel.app](https://world-flags-hazel.vercel.app)

> The app's interface is in Spanish. Code, issues and PRs can be in English or Spanish.

---

## ✨ Features

### Three games

- **🗺️ Countries** — learn which countries belong to each continent. Countries fly into
  their slot on a board as you name them. Practice mode shows a fill-in-the-blank card
  with letter hints; rush mode is "name them all" against the clock, with a *give up*
  option that reveals what you missed.
- **🏳️ Flags** — see a flag, type the country. Easy or hard difficulty (hard requires
  correct accents), alphabetical or random order.
- **🏛️ Capitals** — see a country, type its capital. Countries with more than one
  capital accept all of them, and the answer shows the alternatives and a short note
  when needed. Hard difficulty and rush count accents, hyphens and apostrophes.

### Two modes for each game

- **Practice** — no pressure, optional per-card timer, graded with the SM-2 spaced
  repetition algorithm. Cards you miss come back later in the same session. Each country
  can be practiced once per calendar day.
- **Competitive ("rush")** — the whole session is a stopwatch (in Flags and Capitals,
  wrong answers and skips add a time penalty). Best times are saved per continent and
  for the whole world.

### Learning & progress

- 🧠 **Daily practice** queue with every card that is due today
- 🌎 **Flexible scope:** whole world, any mix of continents, and/or hand-picked countries
- 🏆 **Leaderboard** of the best whole-world rush time, separate for each game
- 🏅 **Achievements** across six categories (discovery, continents, speed, accuracy,
  consistency, meta), unlocked retroactively from existing progress
- 🔥 **Streaks** with a monthly activity calendar
- 🔔 **Daily reminders** via push notifications
- ☁️ **Cloud sync** across devices with a Supabase account, or play as a guest
  (progress stays in `localStorage`)

### App

- 📱 Installable PWA with offline support and an "update available" prompt
- 📰 In-app "what's new" dialog that reads [`CHANGELOG.md`](./CHANGELOG.md) (in Spanish),
  with the running version in the settings dialog
- 🎨 Light, dark or system theme
- ♿ Built to WCAG 2.1 AA: full keyboard support, visible focus, no state conveyed by
  color only, usable down to 320px

---

## 🛠 Tech stack

| Area | Choice |
|---|---|
| Framework | [Astro 7](https://astro.build) — static output, a single page mounting one React island |
| UI | React 19 + TypeScript (strict), with the React Compiler |
| Components | [HeroUI v3](https://www.heroui.com/) on top of Tailwind CSS v4 (CSS-first, no config file) |
| State | Redux Toolkit, accessed only through hooks in `src/hooks/` |
| Backend | [Supabase](https://supabase.com) — auth, progress sync, leaderboard, edge functions for push |
| Animations | `tw-animate-css` + CSS transitions |
| Icons | [iconoir-react](https://iconoir.com/) |
| PWA | Hand-rolled service worker (`public/sw.js`) + web manifest |
| Tooling | [Bun](https://bun.sh), Biome, Playwright |
| Hosting | Vercel |

---

## 🚀 Getting started

**Requirements:** [Bun](https://bun.sh) 1.3+ and Node.js 22.12+.

```sh
git clone https://github.com/Fockus26/World-Flags.git
cd World-Flags
bun install
cp .env.example .env   # then fill in your Supabase URL and anon key
bun run dev            # http://localhost:4321
```

The Supabase client needs `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` to start.
The database schema is private — see [`supabase/README.md`](./supabase/README.md) for
what works without it and how to request access.

### Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Start the dev server |
| `bun run build` | Production build to `./dist/` |
| `bun run preview` | Preview the production build |
| `bunx astro check` | Type-check |
| `bunx biome check ./src` | Lint and format check |
| `bun run test` | Unit tests of the progress merge/sync layer, the changelog and pending changesets (`tests/unit`) |
| `bun run test:e2e` | Playwright end-to-end tests (needs the dev server running) |

> **Service worker tip:** the SW caches aggressively. If you don't see your changes in dev,
> unregister it and clear caches from DevTools (Application → Service workers / Storage).

---

## 📂 Project structure

```text
src/
├── components/
│   ├── app/            # Providers, startup effects (auth, sync, theme, achievements), snackbars
│   ├── game/
│   │   ├── configuration/   # Home screen: game type, scope, mode, modals (settings, leaderboard, achievements, streak)
│   │   ├── session/         # Flags session, daily practice, timer
│   │   │   └── countries/   # Countries board, cloze card, practice and rush
│   │   ├── FlagGame.tsx
│   │   └── Results.tsx
│   └── ui/             # Wrappers over HeroUI (Button, Modal, Select, Tooltip…) — keep their API stable
├── data/               # Countries dataset
├── hooks/              # The only way components touch Redux (useGame, useAuth, useAchievements…)
├── store/              # Redux Toolkit store and slices
├── styles/             # Tailwind entry, design tokens, HeroUI theme bridge
├── types/              # Game configuration, scope, progress types
└── utils/              # SM-2, practice queue, scope resolution, storage, cloud sync, achievements

public/                 # Flags, PWA icons, manifest, service worker
docs/                   # State management, design system, components, PWA assets
context/                # Design rules, tokens and decision records (ADRs)
e2e/                    # Playwright tests
```

Deeper dives:

- [State management](./docs/state-management.md)
- [Design system](./docs/design-system.md) and [components](./docs/components.md)
- [Decision records](./context/DECISIONS_INDEX.md) — read before re-opening a settled decision

---

## 🗺️ Roadmap

1. **📍 Map mode** — locate each country on a world map that fills in as you go, with a
   keyboard-accessible alternative to clicking.
2. **🎨 Redesign** — a full visual pass over the app, built on the existing design tokens.
3. **💰 Monetization** — evaluate ads and alternatives (ad-free premium, donations)
   without hurting the learning experience.

The detailed task list lives in [`TODO.md`](./TODO.md).

---

## 🤝 Contributing

Contributions are welcome! Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the workflow
(branches, Conventional Commits, pull requests) and the project's non-negotiable rules.

---

## 📜 License

[MIT](./LICENSE)
