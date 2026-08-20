# Ascend

**Your learning. One intelligent workspace.**

Instead of juggling a separate app for roadmaps, notes, flashcards, PDF reading, YouTube
search, and interview prep, Ascend puts all of it in one place — built around **Spaces**: a
chat-first workspace where you describe what you want in plain language (or click a quick-action
widget), and Ascend generates and tracks it for you.

## Key Features

### Learning Workspace

- **Spaces** — the core of the app. Every roadmap, mind map, flashcard deck, document, and career
  analysis is created and organized inside a Space, either by typing what you want or clicking a
  widget (`/roadmap`, `/mindmap`, `/flashcards`, etc.).
- **Personalized Roadmaps** — turn a goal ("Become a Data Scientist") into a structured plan of
  phases and tasks, with real progress tracking and AI-generated notes per task (headings, code
  blocks, math, and diagrams).
- **Mind Maps** — an interactive, pannable/zoomable canvas for organizing concepts visually.
- **Active Flashcards** — spaced repetition with due/new/learning/mastered queues, so cards
  resurface exactly when you're about to forget them.
- **PDF Intelligence** — upload a PDF and get a summary, key points, Q&A, a quiz, and flashcards
  generated directly from it.
- **Learning Videos** — curated, topic-aware YouTube learning resources (falls back to a
  clearly-labeled demo catalogue when no API key is configured).
- **Weekly Plan** — a deterministic scheduler rebalances overdue and upcoming tasks across the
  week; Gemini only ever writes the plain-English recap on top, never the schedule itself.
- **To-do Lists** — just describe what you need to get done in a Space's chat; it's organized and
  prioritized automatically, no separate task app required.

### Career Intelligence (RAG-Grounded)

Upload your resume in a Space, then either type your target role or attach a job description PDF.
Ascend chunks and embeds your resume, retrieves the most relevant excerpts (pgvector similarity
search — retrieval-augmented generation, the same pipeline behind PDF Intelligence), and generates:

- A **skill-gap analysis** — your current vs. required skills for the role, side by side.
- **Interview questions** — technical, behavioral, system design, and coding, grounded in what's
  actually in your resume, with copyable code answers.
- **Ongoing resume chat** — keep asking questions afterward ("Am I a fit for this JD?") and get a
  plain-language answer grounded in your resume, not a generic one.

### Everyday Tools

- **Select & Explain** — highlight any text inside AI-generated notes and press **⌘E** (**Cmd+E**
  on Mac, **Ctrl+E** on Windows/Linux) for an instant, scoped explanation — no menu, no click-through.
- **Memory** — a unified library across every Space: every roadmap, mind map, deck, and document
  you've generated, in one searchable place.
- **Dashboard** — streaks, study hours, weekly activity, and roadmap completion at a glance.
- **Global Search** — `Cmd/Ctrl+K` command palette across every feature.

## Tech Stack

| Layer | Choices |
| --- | --- |
| Frontend | React 18 · Vite · TypeScript (strict) · Tailwind CSS v4 · React Router v7 · TanStack Query · Zustand |
| Backend / Data | Supabase (Postgres, Auth, Storage, Row Level Security, Edge Functions) · pgvector |
| AI | Google Gemini 2.5 Flash (generation) + `gemini-embedding-001` (RAG retrieval), proxied through Supabase Edge Functions so the key never reaches the browser |
| UI details | Lucide React (icons) · Recharts (charts) · react-markdown + remark-gfm + remark-math + rehype-katex (AI markdown, LaTeX) · Mermaid (diagrams) · react-syntax-highlighter (code blocks) |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run every migration in `supabase/migrations/` in order — either via the SQL editor, or with
   the CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

3. Create a **private** Storage bucket named `documents`.
4. Optional: seed demo catalogue data (skills, interview questions) with `supabase/seed/seed.sql`.

### 3. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public API key (never the service role key) |
| `VITE_YOUTUBE_API_KEY` | No | YouTube Data API v3 key. Omit to use the built-in demo video catalogue. Restrict it by HTTP referrer in the Google Cloud Console before shipping publicly — it ships to the browser bundle. |
| `VITE_AI_ENABLED` | No | Set to `true` to use the real Gemini-backed AI service. Omit to use the deterministic mock AI service instead. This is a feature flag, not a secret — see [`docs/ai-workflow.md`](./docs/ai-workflow.md) for the one-time Edge Function deploy it depends on. |

There is no `VITE_AI_API_KEY` — the Gemini key lives server-side as a Supabase Edge Function
secret (`GEMINI_API_KEY`, set via `supabase secrets set`), never in a frontend env var.

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Available Scripts

```bash
npm run dev         # start the dev server
npm run lint         # run ESLint
npm run build        # type-check and build for production
npm run preview      # preview the production build locally
npm test              # run the automated test suite once
npm run test:watch     # run tests in watch mode
```

## Testing

Vitest + @testing-library/react — unit tests for scheduling/layout logic, chat-flow parsing, and
both AI service implementations (mock and Gemini, with the network mocked — no live model calls
run in the test suite), plus a few component tests. Runs automatically on every push/PR via
GitHub Actions (`.github/workflows/ci.yml`). See [`docs/testing.md`](./docs/testing.md) for what's
covered and what isn't.

## Deployment

The app is a static SPA — build it and deploy `dist/` to Vercel, Netlify, Cloudflare Pages, or any
static host:

```bash
npm run build
```

Set the same environment variables in the hosting provider's project settings, and configure the
host to rewrite all paths to `index.html` (SPA fallback) so client-side routing works on
refresh/deep links.

## Project Structure

```
src/
  components/ui/     Reusable design-system primitives
  components/         ErrorBoundary + other app-wide, non-feature components
  layouts/            Public / Auth / App page shells
  routes/             Router configuration + route guards
  pages/              Route-level components
  features/           One folder per product area (spaces, roadmaps, mindmaps, flashcards,
                       documents, youtube, career, dashboard, analytics, search, auth, settings)
  services/            Supabase + external API access layer (one *.service.ts per domain)
    ai.service.ts       barrel: AiService interface + getAiService()
    ai/                  mock.ts, gemini.ts, roadmap-templates.ts, types.ts
  hooks/               Cross-feature reusable hooks
  contexts/            React Context providers (auth)
  lib/                 Supabase client, query client, utilities, constants
  types/               Shared TypeScript types
  utils/               Pure helper functions
  test/                Vitest setup (jsdom + testing-library wiring)
supabase/
  migrations/          SQL schema + RLS migrations, applied in order
  functions/            Edge Functions: ai-complete (Gemini proxy), document-embed (RAG chunking
                        /embedding), career-analyze (resume skill-gap + interview questions),
                        career-chat (RAG resume/JD Q&A)
  seed/                Optional seed data
docs/
  testing.md           Testing strategy and what's/isn't covered
  ai-workflow.md        AI service architecture, mock/real parity, edge function deploy steps
.github/workflows/     CI (lint + typecheck + build + test on every push/PR)
CLAUDE.md              Engineering conventions this project follows
ARCHITECTURE.md        Detailed architecture and data flow documentation
```

## Learn More

- [`CLAUDE.md`](./CLAUDE.md) — engineering conventions this project follows.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — full architectural deep dive.
- [`docs/ai-workflow.md`](./docs/ai-workflow.md) — how the AI layer (mock vs. real, RAG) is built.
- [`docs/testing.md`](./docs/testing.md) — testing strategy.
