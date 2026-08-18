# Ascend

Your learning. One intelligent workspace.

Plan what to learn, understand complex concepts, revise smarter, and prepare for your career —
all in one AI-powered workspace, instead of scattered across a dozen apps and browser tabs.

## Features

- **Personalized Roadmaps** — turn a goal ("Become a Data Scientist") into a structured plan of
  phases, topics, and tasks with progress tracking.
- **Mind Maps** — an interactive, pannable/zoomable canvas for organizing concepts visually.
- **Active Flashcards** — a spaced-repetition study system with due/new/learning/mastered queues.
- **PDF Intelligence** — upload a PDF and get a summary, key points, Q&A, a quiz, and flashcards
  generated from it.
- **Learning Videos** — curated, topic-aware YouTube learning resources (real API-ready, with a
  clearly-labeled demo dataset when no API key is configured).
- **Career Intelligence** — skill-gap analysis, interview question practice, and a career
  roadmap for a chosen track.
- **Dashboard analytics** — streaks, study hours, weekly activity, and roadmap completion, all
  on the home dashboard.
- **Global Search** — `Cmd/Ctrl+K` command palette across every feature.

## Tech Stack

React 18 · Vite · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, RLS) ·
React Router v7 · TanStack Query · Zustand · Lucide React · Recharts · react-markdown

## Installation

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase project credentials:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public API key (never the service role key) |
| `VITE_YOUTUBE_API_KEY` | No | YouTube Data API v3 key. Omit to use the built-in demo video catalogue. Restrict it by HTTP referrer in the Google Cloud Console before shipping publicly — it ships to the browser bundle. |
| `VITE_AI_ENABLED` | No | Set to `true` to use the real Gemini-backed AI service. Omit to use the deterministic mock AI service. This is a feature flag, not a secret — the Gemini API key itself is never a frontend env var. See [`docs/ai-workflow.md`](./docs/ai-workflow.md) for why, and the one-time Supabase Edge Function deploy this flag depends on. |

There is no `VITE_AI_API_KEY` — the Gemini key lives server-side as a Supabase Edge Function
secret (`GEMINI_API_KEY`, set via `supabase secrets set`), never in frontend env vars. See
[`docs/ai-workflow.md`](./docs/ai-workflow.md).

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the migrations in `supabase/migrations/` in order (or via the CLI,
   see below).
3. Create a **private** Storage bucket named `documents`.
4. Copy your project URL and anon key into `.env`.

Using the Supabase CLI instead:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Optional: seed demo catalogue data (skills, interview questions) with
`supabase/seed/seed.sql`.

## Development Commands

```bash
npm run dev         # start the dev server (http://localhost:5173)
npm run lint         # run ESLint
npm run build        # type-check and build for production
npm run preview      # preview the production build locally
npm test              # run the automated test suite once
npm run test:watch     # run tests in watch mode
```

## Testing

Vitest + @testing-library/react. Unit tests for scheduling/layout logic, the chat-flow parsing
helpers, and both AI service implementations (mock and Gemini, the latter with the network
mocked — no live model calls run in the test suite); a couple of component tests. Runs
automatically on every push/PR via GitHub Actions (`.github/workflows/ci.yml`). See
[`docs/testing.md`](./docs/testing.md) for what's covered, what isn't yet, and why.

## Build Commands

```bash
npm run build
```

Outputs a static bundle to `dist/`, deployable to any static host.

## Deployment

The app is a static SPA — deploy `dist/` to Vercel, Netlify, Cloudflare Pages, or any static
host. Set the same environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.)
in the hosting provider's project settings. Configure the host to rewrite all paths to
`index.html` (SPA fallback) so client-side routing works on refresh/deep links.

## Project Structure

```
src/
  components/ui/    Reusable design-system primitives
  components/        ErrorBoundary + other app-wide, non-feature components
  layouts/           Public / Auth / App page shells
  routes/            Router configuration + route guards
  pages/             Route-level components
  features/          One folder per product area (dashboard, roadmaps, mindmaps, flashcards,
                     documents, youtube, career, analytics, search, auth, settings, spaces)
  services/           Supabase + external API access layer
    ai.service.ts      barrel: AiService interface + getAiService()/isAiConfigured()
    ai/                 mock.ts, gemini.ts, roadmap-templates.ts, types.ts
    youtube.service.ts  barrel: YoutubeService interface + getYoutubeService()
    youtube/             mock-catalogue.ts, data-api.ts, types.ts
  hooks/              Cross-feature reusable hooks
  contexts/           React Context providers (auth)
  lib/                Supabase client, query client, utilities, constants
  types/              Shared TypeScript types
  utils/              Pure helper functions
  test/               Vitest setup (jsdom + testing-library wiring)
  *.test.ts(x)        Co-located next to the module/component each one tests
supabase/
  migrations/         SQL schema + RLS migrations
  functions/           Edge Functions (ai-complete: server-side Gemini proxy)
  seed/               Optional seed data
docs/
  testing.md          Testing strategy and what's/isn't covered
  ai-workflow.md       AI service architecture, mock/real parity, edge function deploy steps
.github/workflows/    CI (lint + typecheck + build + test on every push/PR)
CLAUDE.md             Engineering conventions this project follows
ARCHITECTURE.md       Detailed architecture and data flow documentation
```

See [`CLAUDE.md`](./CLAUDE.md) for conventions and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a
full architectural deep dive.
