# CLAUDE.md

This file governs how work is done in this repository. Read it before making changes.

## 1. Project Overview

**AI Learning Workspace** is a unified, production-quality SaaS web app that replaces the
fragmented tool-chain learners currently use (separate apps for roadmaps, notes, flashcards,
PDF reading, YouTube search, and interview prep) with one intelligent workspace.

## 2. Product Goals

- Let a learner turn a goal ("Become a Data Scientist") into a structured, trackable roadmap.
- Support active recall via a spaced-repetition flashcard system.
- Turn uploaded PDFs into summaries, key points, Q&A, flashcards, and quizzes.
- Surface curated YouTube learning resources without inventing fake data.
- Provide career intelligence: skill gap analysis, interview prep, career roadmaps.
- Visualize progress across every feature in one analytics view.
- Feel like a premium, minimal educational SaaS product — not a generic admin panel.

## 3. Tech Stack

- **React 18 + Vite + TypeScript** — strict mode, no unnecessary `any`.
- **Tailwind CSS v4** — theme tokens defined in `src/index.css` via `@theme`, no separate
  `tailwind.config.js` (v4 is CSS-first).
- **Supabase** — Postgres, Auth, Storage, Row Level Security. No custom backend server.
- **React Router v7** — route-based code organization under `src/routes`.
- **TanStack Query** — all Supabase reads/writes go through query/mutation hooks, never raw
  `useEffect` fetching.
- **Zustand** — small, local UI state only (e.g. command palette open/closed). Server state
  always lives in TanStack Query, never duplicated into Zustand.
- **Lucide React** — icons only, no other icon library.
- **Recharts** — all charts.
- **react-markdown + remark-gfm** — rendering AI-generated markdown (summaries, notes).
- **react-hot-toast** — all user-facing success/error notifications.

## 4. Folder Structure

```
src/
  components/ui/        Design-system primitives (Button, Card, Modal, ...). Framework-agnostic,
                         no Supabase or feature imports here.
  layouts/               Page shells: PublicLayout, AuthLayout, AppLayout.
  routes/                Router config + ProtectedRoute.
  pages/                 Thin route components. Compose feature components, no business logic.
  features/<name>/       Feature UI: components/, hooks/, types.ts. One folder per product area
                         (dashboard, roadmaps, mindmaps, flashcards, documents, youtube, career,
                         analytics, search, auth, settings).
  services/              Data-access + integration layer. Every Supabase query and every external
                         API call (AI, YouTube) lives here, never inline in components.
  hooks/                 Cross-feature reusable hooks (useDebounce, useDisclosure, useMediaQuery).
  contexts/              React Context providers (AuthContext).
  lib/                   Supabase client, TanStack Query client, `cn()` class helper, constants.
  types/                 Shared domain + database types.
  utils/                 Pure helper functions (date formatting, spaced-repetition scheduler).
supabase/
  migrations/            Numbered SQL migrations (schema + RLS), applied in order.
  seed/                  Optional seed data for local development.
```

## 5. Component Conventions

- One component per file, named export matching the file name (`Button.tsx` exports `Button`).
- Props typed with an explicit `interface <Component>Props`.
- `src/components/ui` components must be generic and reusable — no feature-specific logic,
  no direct Supabase calls.
- Feature components live in `src/features/<feature>/components` and may use `ui` primitives
  and feature hooks, but should not reach into another feature's internals.
- Keep components small. If a component's JSX exceeds ~150 lines or mixes more than one concern,
  split it.
- Loading, empty, and error states are not optional — every data-driven component must render
  a `Skeleton` while loading, an `EmptyState` when there is no data, and a readable error message
  on failure.

## 6. Database Conventions

- UUID primary keys (`gen_random_uuid()`), `created_at` / `updated_at` timestamps on every table.
- Foreign keys use `on delete cascade` where the child row is meaningless without the parent
  (e.g. `roadmap_phases.roadmap_id`), and `on delete set null` where it should survive (rare).
- Every user-owned table has a `user_id uuid references auth.users(id)` column.
- Enums are Postgres `check` constraints on `text` columns (not Postgres `enum` types) so values
  can evolve without a migration that rewrites the type.
- Add indexes on every foreign key and on columns used in `where`/`order by` in the app
  (e.g. `flashcards.next_review_at`).

## 7. Supabase Rules

- **Row Level Security is mandatory on every table.** A table without RLS enabled is a bug.
- Policy pattern: `using (auth.uid() = user_id)` for select/update/delete, and
  `with check (auth.uid() = user_id)` for insert. Join tables (e.g. `roadmap_tasks`) check
  ownership through their parent (`exists (select 1 from roadmaps where ...)`).
- The Supabase **anon key** is the only key ever present in frontend code/env vars. The
  **service role key** must never be imported into `src/`.
- All client access goes through the single client instance in `src/lib/supabase.ts`.
- Storage buckets use per-user folder prefixes (`{user_id}/{filename}`) with storage policies
  mirroring table RLS.

## 8. API / Service Layer Conventions

- Components and hooks never call `supabase.from(...)` directly — they call a function exported
  from `src/services/*.service.ts`.
- External/AI-dependent functionality (document insights, roadmap generation, YouTube search)
  is defined as a TypeScript **interface** with a mock implementation and a real implementation
  behind the same shape, selected in one place based on env vars. This keeps the UI identical
  whether the real API key is configured or not.
- Never hardcode API keys. Always read from `import.meta.env.VITE_*`.
- Service functions return typed domain objects (from `src/types`), never raw Supabase rows,
  so schema changes don't ripple into every component.

## 9. UI/UX Principles

- Premium educational SaaS aesthetic: generous whitespace, rounded-2xl cards, soft shadows,
  a single accent color used sparingly, no visual noise.
- Reuse the `src/components/ui` primitives everywhere — never hand-roll a one-off button or card.
- Every async action gives feedback: disabled/loading state on the trigger, a toast on
  success/failure.
- Empty states explain what the feature does and offer a primary action, they are never a bare
  "No data".
- Fully responsive: design mobile and desktop layouts intentionally (see `ARCHITECTURE.md`),
  don't just let desktop grids reflow.

## 10. Development Commands

```bash
npm run dev        # start Vite dev server
npm run build       # type-check (tsc -b) + production build
npm run lint         # eslint
npm run preview      # preview production build locally
```

## 11. Testing Expectations

This project does not ship an automated test suite (out of scope for the interview timeline).
Instead, every feature is manually verified end-to-end before being marked done:
loading state, empty state, populated state, and error state are each checked in the browser.
`npm run build` and `npm run lint` must both pass with zero errors before a feature is considered
complete.

## 12. Important Implementation Rules

- Do not fake functionality to make the UI look done. If a real integration isn't wired up
  (no AI key, no YouTube key), the mock service must produce clearly-labeled, realistic data,
  and the UI should make it visually obvious real data isn't connected where relevant
  (e.g. the Learning Videos tab shows a "Demo data — connect an API key" notice). Everything
  else — roadmaps, tasks, flashcards, mind maps, documents — is real data persisted in
  Supabase, never local-only component state.
- No `any` unless justified with a comment explaining why a precise type isn't possible.
- No dead code, no commented-out blocks, no leftover console.logs in committed code.
- Every new route must be registered in `src/routes` and reachable from the sidebar or a link —
  no orphan pages.
