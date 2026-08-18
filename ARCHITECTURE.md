# ARCHITECTURE.md

## 1. High-Level Architecture

Ascend is a single-page application with **no custom backend server** — the one exception is a
single, narrow Supabase Edge Function (`ai-complete`) that exists purely to keep the Gemini API
key off the client; it holds no business logic of its own. Everything else talks directly to
Supabase (Postgres + Auth + Storage) from the browser, protected by Row Level Security.
AI-dependent and third-party-API-dependent features are isolated behind a service layer so they
can run on mock data today and a real API tomorrow without touching UI code.

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                     │
│                                                                  │
│  pages/ ──uses──▶ features/*/components ──uses──▶ components/ui │
│       │                    │                                    │
│       │                    ▼                                    │
│       │           features/*/hooks (TanStack Query)             │
│       │                    │                                    │
│       ▼                    ▼                                    │
│  routes/ (React Router)   services/*.service.ts                 │
│                             │              │                    │
│                    supabase-js client   ai / youtube             │
│                             │           service (interface)      │
└─────────────┬───────────────┴───────────────┬───────────────────┘
              │                                │
              ▼                                ▼
   ┌─────────────────────────┐      ┌───────────────────────────┐
   │ Supabase                  │      │ YouTube Data API (optional) │
   │  - Postgres + RLS          │      │  called directly — public    │
   │  - Auth                    │      │  read API, key restricted     │
   │  - Storage (PDFs)          │      │  by HTTP referrer              │
   │  - Edge Fn: ai-complete ───┼─┐    └───────────────────────────┘
   └─────────────────────────┘ │
                                ▼
                     ┌────────────────────────┐
                     │ Google Gemini API          │
                     │  (gemini-2.5-flash)          │
                     │  key held server-side only,   │
                     │  never sent to the browser      │
                     └────────────────────────┘
```

## 2. Frontend Architecture

- **Routing**: `react-router-dom` v7 with a single router config in `src/routes/router.tsx`.
  Routes are grouped by layout: the landing page renders standalone (its own nav/footer),
  `AuthLayout` wraps login/signup/forgot-password/reset-password with a shared split-screen
  shell, and `AppLayout` wraps everything behind auth (sidebar + topbar + `ProtectedRoute`).
- **Server state**: TanStack Query owns all Supabase data. Every feature exposes hooks like
  `useRoadmaps()`, `useCreateFlashcard()` that wrap `services/*.service.ts` calls. Query keys are
  namespaced per feature (`['roadmaps', userId]`) so cache invalidation stays predictable.
- **Client/UI state**: local `useState` for component-local concerns; Zustand only for state that
  must be shared across distant components without prop drilling (currently: command palette
  open state, mobile drawer state).
- **Auth state**: `AuthContext` wraps the app, subscribes to
  `supabase.auth.onAuthStateChange`, and exposes `{ user, session, loading }` plus
  `signIn/signUp/signOut/resetPassword`. `ProtectedRoute` reads this context and redirects to
  `/login` when there is no session, preserving the intended destination.
- **Design system**: `src/components/ui` is a self-contained primitive library (Button, Card,
  Modal, Dialog, Input, Select, Badge, ProgressBar, Sidebar, Navbar, Dropdown, Tabs, Tooltip,
  Skeleton, EmptyState). Every feature is built from these; no feature introduces competing
  visual patterns.

## 3. Supabase Architecture

- One Supabase project. Client instantiated once in `src/lib/supabase.ts` using
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Auth: email/password via Supabase Auth. `profiles` table mirrors `auth.users` (1:1, created via
  a Postgres trigger on user signup) to hold app-specific profile fields without touching the
  protected `auth` schema.
- Storage: one bucket, `documents`, for uploaded PDFs, path-namespaced per user
  (`{user_id}/{document_id}.pdf`). Bucket is private; access is via signed URLs generated
  on demand, gated by storage RLS policies that check the folder prefix matches `auth.uid()`.

## 4. Database Architecture

See `supabase/migrations/0001_initial_schema.sql` for the authoritative schema. Summary of the
core entity graph:

```
auth.users (Supabase managed)
  └─ profiles (1:1)
  └─ learning_goals (1:N)
       └─ roadmaps (1:1 per goal, or standalone)
            └─ roadmap_phases (1:N, ordered)
                 └─ roadmap_tasks (1:N, ordered, has resources jsonb)
  └─ mind_maps (1:N)
       └─ mind_map_nodes (1:N, self-referencing parent_id for tree/graph edges)
  └─ flashcard_decks (1:N, optionally linked to a roadmap or document)
       └─ flashcards (1:N)
            └─ flashcard_reviews (1:N, append-only review log)
  └─ documents (1:N, file lives in Storage, row holds metadata)
       └─ document_chunks (1:N, extracted text chunks for future retrieval)
       └─ document_insights (1:N, typed by `kind`: summary | key_points | qa | quiz)
  └─ youtube_resources (cache of fetched/mocked video metadata, not user-owned)
  └─ saved_resources (N:N join between a user and a youtube_resource, plus notes/category)
  └─ career_profiles (1:1 per selected career track)
       └─ user_skills (N:1 skills, current_level vs target_level)
  └─ skills (global catalogue, not user-owned)
  └─ interview_questions (global catalogue, category + career_track)
  └─ interview_question_attempts (1:N per user, tracks practice progress)
  └─ learning_activity (append-only event log: task_completed, card_reviewed, video_watched, ...
    used to derive streaks and the weekly activity chart)
  └─ user_progress (denormalized daily rollup, one row per user per day, updated by the app on
    each activity event — keeps the dashboard/analytics queries cheap)
```

Design choices:
- **`learning_activity` as an event log** rather than only relying on derived counts lets the
  streak calculation and weekly activity chart be recomputed accurately and lets future features
  (e.g. notifications, gamification) consume the same stream.
- **`user_progress` as a daily rollup** avoids aggregating the full activity log on every
  dashboard load; it's updated incrementally when an activity event is recorded.
- **`document_insights` uses a `kind` discriminator** instead of five separate tables (summary,
  key_points, qa, quiz, flashcard-source) so new insight types don't require new tables, and a
  document's AI-generated content can be fetched with one query.

## 5. Authentication Flow

1. User submits the signup form → `supabase.auth.signUp({ email, password })`.
2. A Postgres trigger (`handle_new_user`) inserts a matching row into `profiles`.
3. Supabase sends a confirmation email (or auto-confirms, depending on project auth settings).
4. On login, `supabase.auth.signInWithPassword` returns a session; `AuthContext` picks it up via
   `onAuthStateChange` and persists it (Supabase's default `localStorage` persistence).
5. `ProtectedRoute` gates every route under `AppLayout`; unauthenticated users are redirected to
   `/login?redirect=<original path>`.
6. Forgot password uses `supabase.auth.resetPasswordForEmail`, landing the user on a
   `/reset-password` route that calls `supabase.auth.updateUser({ password })`.

## 6. Storage Flow (PDF Intelligence)

1. User selects a PDF in the upload dialog → client-side validation (type = `application/pdf`,
   size limit).
2. File uploaded to `documents/{user_id}/{uuid}.pdf` via `supabase.storage`.
3. A `documents` row is inserted with metadata (title, size, page count placeholder, storage
   path, status = `processing`).
4. The document service calls the AI service to generate insights (summary, key points, Q&A,
   quiz, flashcards); each result is stored as a row in `document_insights` and, for flashcards,
   also written into `flashcards` linked to a deck tagged with the document.
5. Document status flips to `ready`; the UI polls/subscribes via TanStack Query invalidation
   after the mutation resolves (no background job infra in this scope — generation happens
   synchronously from the client's perspective, with a loading state).

## 7. AI Service Architecture

`src/services/ai.service.ts` is a barrel re-exporting the contract every AI-dependent feature
depends on, plus `getAiService()`/`isAiConfigured()`. The implementation is split across
`src/services/ai/`:

```
ai.service.ts          barrel — AiService type re-exports, getAiService(), isAiConfigured()
ai/types.ts             the AiService interface + every request/response shape
ai/mock.ts               mockAiService
ai/gemini.ts             GeminiService
ai/roadmap-templates.ts  hand-written templates mockAiService.generateRoadmap draws from
```

```ts
interface AiService {
  generateRoadmap(goal: string, options?: RoadmapOptions): Promise<GeneratedRoadmap>
  generateTaskNotes(context: TaskNotesContext): Promise<string>
  generateMindMapTree(topic: string): Promise<MindMapTreeNode>
  summarizeDocument(text: string, title: string): Promise<string>
  extractKeyPoints(text: string): Promise<string[]>
  generateQa(text: string): Promise<QaPair[]>
  generateQuiz(text: string): Promise<QuizQuestion[]>
  generateFlashcards(text: string, count: number): Promise<FlashcardDraft[]>
  // ...generateFlashcardsForTopic, analyzeResume, generateInterviewQuestions,
  // generateSkillImprovementPlan, chatReply, interpretChatIntent
}
```

- `mockAiService` implements this deterministically from the input text/topic (heuristic
  templates, not random Lorem Ipsum) so the product demos coherently offline, with zero
  configuration required.
- `GeminiService` is the sole real implementation, targeting the **gemini-2.5-flash** model — no
  other provider or model is wired in. It never calls `generativelanguage.googleapis.com`
  directly from the browser; every call goes through the `ai-complete` Supabase Edge Function
  (`supabase/functions/ai-complete`), which holds the Gemini API key server-side. See §10 and
  `docs/ai-workflow.md` for why. Structured outputs (roadmaps, key points, Q&A, quiz, flashcards,
  mind map trees) request `responseMimeType: "application/json"` from Gemini and are parsed
  directly into the corresponding TypeScript shape.
- `getAiService()` returns `mockAiService` unless `VITE_AI_ENABLED=true`, in which case it
  returns `GeminiService`. `VITE_AI_ENABLED` is a plain feature flag, not a secret — it only
  decides which implementation runs; the actual Gemini key never reaches the client. Components
  only ever call `getAiService()`, never a concrete implementation.
- `RoadmapOptions` (`level`, `deadline`) let the roadmap-generation UI ask the learner two
  clarifying questions — current skill level and an optional target date — before generating,
  which the prompt uses to size `difficulty` and `estimatedDurationWeeks`.
- `generateTaskNotes` powers on-demand, cached AI notes when a learner clicks into a roadmap
  task (see `roadmap_tasks.ai_notes` in the schema).
- `generateMindMapTree` powers "Generate with AI" on mind map creation: a topic is expanded into
  a nested branch structure, then walked recursively to create `mind_map_nodes` rows with an
  auto-computed layout.
- Both implementations are covered by automated tests (`src/services/ai/mock.test.ts`,
  `src/services/ai/gemini.test.ts`) that hold them to the same contract without any live network
  or model call — see `docs/testing.md`.

## 8. YouTube Recommendation Service

`src/services/youtube.service.ts` mirrors the same barrel + split-implementation pattern as the
AI service: the barrel re-exports the interface and `getYoutubeService()`, while
`src/services/youtube/mock-catalogue.ts` (`mockYoutubeService`) and
`src/services/youtube/data-api.ts` (`YoutubeDataApiService`) hold the two implementations.

```ts
interface YoutubeService {
  searchLearningVideos(params: VideoSearchParams): Promise<YoutubeVideo[]>
}
```

- `mockYoutubeService` returns a curated, hand-written catalogue of real, well-known educational
  videos/channels filtered by topic/difficulty keywords — never randomly invented titles/stats.
- `YoutubeDataApiService` calls the YouTube Data API v3 `search` + `videos` endpoints directly
  from the browser when `VITE_YOUTUBE_API_KEY` is configured, mapped into the same `YoutubeVideo`
  shape. Unlike the Gemini key, this one is *not* proxied through an Edge Function — the Data API
  is designed for client-side use, and the key should instead be restricted by HTTP referrer in
  the Google Cloud Console (see `docs/ai-workflow.md` for the full reasoning).
- The UI (`features/youtube`) renders a small "Demo data" badge when the mock service is active,
  so it's never ambiguous whether recommendations are live.

## 9. Data Flow (typical read)

```
Component → useXyzQuery() hook (TanStack Query)
          → services/xyz.service.ts function
          → supabase.from('table').select(...).eq('user_id', user.id)
          → RLS enforces row ownership at the database level (defense in depth even though
            the client already filters by user_id)
          → typed domain object returned → cached by TanStack Query → rendered
```

## 10. Security Model

- **RLS everywhere.** Every table enforces `auth.uid() = user_id` (directly or via a parent-table
  `exists` check). This is the actual security boundary — client-side filtering is a UX
  convenience, not the guarantee.
- **No service-role key in the frontend.** Only the anon key ships to the browser; it can do
  nothing RLS doesn't allow.
- **No billed API key in the frontend either.** The Gemini API key is a server-side secret on the
  `ai-complete` Edge Function, never a `VITE_*` variable — see §7 and `docs/ai-workflow.md`. Every
  `VITE_*`-prefixed variable is baked into the built client JS by Vite and is trivially readable
  by anyone inspecting the bundle or the Network tab; that's an acceptable place for a public,
  RLS-constrained anon key, but not for a billed, per-token AI provider key.
- **Storage policies** mirror table RLS: a user can only read/write objects under their own
  `{user_id}/` prefix.
- **Env vars** for every credential (`.env`, gitignored); `.env.example` documents the required
  shape with placeholder values only.
- **Global catalogues** (`skills`, `interview_questions`, `youtube_resources`) are readable by any
  authenticated user but writable by none from the client (managed via migrations/seed only).
- **No client-side React error boundary gap.** `ErrorBoundary` (`src/components/ErrorBoundary.tsx`)
  wraps the whole app in `App.tsx` so an unhandled render error shows a readable fallback instead
  of leaving a blank white screen — not a security control per se, but part of the same "fail
  predictably" posture as the rest of this section.

## 11. Folder Structure

See `CLAUDE.md` §4 for the authoritative, enforced structure.

## 12. Major Components

- `AppLayout` — sidebar + topbar shell wrapping every authenticated route.
- `CommandPalette` — global `Cmd/Ctrl+K` search across roadmaps, tasks, flashcards, documents,
  mind maps, saved videos, career resources.
- `RoadmapBoard` — phase/task tree with completion tracking, list and timeline views.
- `MindMapCanvas` — SVG/pan-zoom canvas rendering `mind_map_nodes` as a tree, drag to reposition,
  click to expand/collapse.
- `FlashcardStudySession` — the active-recall study loop (flip, rate, spaced-repetition
  scheduling).
- `DocumentWorkspace` — split view: PDF viewer pane + AI insights tabs (summary, key points, Q&A,
  flashcards, quiz).
- `VideoRecommendations` — search form + categorized video grid.
- `SkillGapMatrix` — current vs. required skill comparison for a selected career track.

## 13. Future Scalability Considerations

- **Document chunking/embeddings**: `document_chunks` is already modeled so a future retrieval-
  augmented "ask questions about this document" feature can add a `vector` column (pgvector)
  without a schema redesign.
- **Background processing**: PDF insight generation is synchronous today; the `documents.status`
  column (`processing` → `ready` → `failed`) is designed so a future queue/worker could update it
  asynchronously without changing the read path.
- **Pagination**: list queries are written with `.range()` from day one so large datasets
  (many flashcards, many documents) don't require a later rewrite.
- **RLS integration tests + E2E coverage**: the automated test suite (`docs/testing.md`) covers
  pure logic and the AI service contract today; a suite running against a local Supabase instance
  to verify RLS actually blocks cross-user access, plus Playwright coverage of the critical
  sign-up → generate → delete flows, are the natural next additions.
