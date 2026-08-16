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
| `VITE_YOUTUBE_API_KEY` | No | YouTube Data API v3 key. Omit to use the built-in demo video catalogue. |
| `VITE_AI_PROVIDER` | No | Set to `gemini`. Google Gemini (`gemini-2.5-flash`, hardcoded) is the only real AI backend supported. |
| `VITE_AI_API_KEY` | No | Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Omit to use the deterministic mock AI service. |

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
npm run dev        # start the dev server (http://localhost:5173)
npm run lint         # run ESLint
npm run build        # type-check and build for production
npm run preview      # preview the production build locally
```

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
  layouts/           Public / Auth / App page shells
  routes/            Router configuration + route guards
  pages/             Route-level components
  features/          One folder per product area (dashboard, roadmaps, mindmaps, flashcards,
                     documents, youtube, career, analytics, search, auth, settings)
  services/           Supabase + external API access layer
  hooks/              Cross-feature reusable hooks
  contexts/           React Context providers (auth)
  lib/                Supabase client, query client, utilities, constants
  types/              Shared TypeScript types
  utils/              Pure helper functions
supabase/
  migrations/         SQL schema + RLS migrations
  seed/               Optional seed data
CLAUDE.md             Engineering conventions this project follows
ARCHITECTURE.md       Detailed architecture and data flow documentation
```

See [`CLAUDE.md`](./CLAUDE.md) for conventions and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a
full architectural deep dive.
