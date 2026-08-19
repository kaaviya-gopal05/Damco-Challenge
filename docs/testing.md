# Testing

## Stack

- **[Vitest](https://vitest.dev)** — test runner, integrates directly with the existing Vite
  config (`vite.config.ts`'s `test` block) rather than needing a parallel toolchain.
- **[@testing-library/react](https://testing-library.com/react)** + **@testing-library/user-event**
  — for the handful of component tests, testing behavior (what's on screen, what a click does)
  rather than implementation details.
- **jsdom** — DOM environment for component tests.

No E2E framework (Playwright/Cypress) or live-database integration suite is set up yet. See
"Not covered yet" below for what that would add and why it's a deliberate next step rather than
part of this pass.

## Running tests

```bash
npm test          # run once (CI mode)
npm run test:watch # watch mode while developing
```

## What's tested, and why

Tests are co-located with the code they cover (`foo.ts` + `foo.test.ts` in the same folder)
rather than mirrored into a separate `tests/` tree, so a change to a module and its test always
show up together in a diff.

### Pure logic (`src/utils/*.test.ts`, `src/lib/utils.test.ts`)

The spaced-repetition scheduler, roadmap date scheduler, mind-map tree layout, calendar grid/event
mapping, and small formatting helpers are all pure functions with real edge cases (ease-factor
floors, zero-hour tasks, collapsed tree nodes, null durations) — exactly the kind of logic that's
cheap to test in isolation and easy to silently break during a refactor.

Two of these were deliberately extracted out of a stateful hook/service specifically to make them
testable this way, the same pattern as `commandFlowParsing.ts` below:

- **`weeklyPlanSchedule.test.ts`** — the day-load-balancing scheduler behind the Weekly Plan
  feature (`scheduleTasksAcrossWeek`, extracted from `weeklyPlan.service.ts`). Covers: undated and
  completed tasks are left alone, an overdue task gets pulled forward to today, same-day overflow
  is ordered by priority, a day at capacity (`MAX_TASKS_PER_DAY`) spills into the next open day,
  and no assignment ever lands outside the 7-day window even when every day is flooded.
- **`autoScanSchedule.test.ts`** — the "how long until the next background email scan" math
  (`computeNextScanDelayMs`, extracted from the `useAutoScanEmails` hook in `useAgents.ts`).
  Covers: first-ever load scans immediately, a fully-elapsed interval scans immediately, a scan
  moments ago waits out the remainder, and a future timestamp (clock skew) waits a full interval
  rather than looping.

### Chat-flow parsing (`src/features/spaces/hooks/commandFlowParsing.test.ts`)

The roadmap Q&A flow in a Space (`useCommandFlow`) parses free-text chat replies into structured
answers — "yes"/"sure"/"please" as affirmative, "December 1, 2026" as a deadline, "2 hours" as a
number. These were previously private functions inside the hook; they were extracted into
`commandFlowParsing.ts` specifically so they could be tested directly without mounting the hook,
a query client, and a fake space.

### Email Monitoring (`src/services/agentService.test.ts`, `src/utils/agentErrorHandler.test.ts`)

`agentService.test.ts` mocks the `supabase.functions.invoke`/`.from` boundary (never a real
Supabase project) and covers: `classifyEmails` invokes the edge function with the right body and
surfaces its error message on failure; `fetchEmailMonitoringJobs` maps snake_case rows to the
domain shape *and* sorts them urgency-first with recency as the tiebreaker, independent of
whatever order the database returned them in; `autoScanAndClassify` (the background auto-poll's
entry point) is a true no-op — it never calls `classify-emails` — when the inbox scan finds
nothing new, and chains into classification when it does. `agentErrorHandler.test.ts` covers
`classifyError`'s message-sniffing into typed `AgentErrorType`s (rate-limited, timeout, network,
invalid input) that the UI uses to show the right retry behavior.

### Task due-date parsing (`src/services/tasks.service.test.ts`)

`parseTaskDueDate` turns a free-text chat reply into an ISO date or `null` — explicit dates,
dates embedded in a sentence, and a list of "no date" phrasings ("skip", "n/a", "not sure") all
need to resolve correctly for the to-do chat flow to feel conversational rather than form-like.

### AI service contract (`src/services/ai/mock.test.ts`, `src/services/ai/gemini.test.ts`, `src/services/ai.service.test.ts`)

See [`docs/ai-workflow.md`](./ai-workflow.md) for the full rationale — in short: `AiService` is
one interface with two implementations (mock and Gemini-backed), and the tests hold both to that
contract without ever making a real network or model call:

- `mock.test.ts` exercises `mockAiService`'s heuristics against real and edge-case input (empty
  text, unreadable resumes, an unrecognized roadmap goal) and asserts the *shape* of what comes
  back stays well-formed (valid `correctIndex` in every quiz question, positive
  `estimatedHours` on every task, etc.) — this is what runs by default for anyone who clones the
  repo without an AI key configured, so its correctness matters on its own.
- `gemini.test.ts` mocks the network boundary (`supabase.functions.invoke`, not `fetch` directly,
  since Gemini is called through the `ai-complete` edge function — see ai-workflow.md) and checks:
  a well-formed response parses into the exact expected TypeScript shape; an edge-function error
  throws a clear message; an empty response throws; malformed JSON from the model surfaces as a
  parse error rather than silently returning garbage.
- `ai.service.test.ts` locks down the mock-vs-real selection switch itself
  (`VITE_AI_ENABLED=true` → Gemini, anything else → mock), since that's the literal on/off switch
  for the security fix described in ai-workflow.md.

### Components (`src/components/ui/EmptyState.test.tsx`, `src/components/ErrorBoundary.test.tsx`)

A couple of representative component tests to prove the testing-library setup works end to end:
`EmptyState` (conditional description, action slot wiring) and `ErrorBoundary` (renders children
normally; catches a thrown render error and shows the fallback instead of a blank screen).

## What this deliberately does *not* test

- **JSX renders without behavior** — no snapshot tests, no "does this div exist" tests with no
  behavioral assertion attached.
- **AI-generated prose content** — the tests assert *shape* (valid JSON parses into the right
  type, a quiz has 4 options with a valid `correctIndex`), never the literal wording a model or
  the mock's templates produce, since that's inherently non-deterministic for the real service
  and would make tests brittle for no real signal.
- **Prompt string contents** — tests check that a prompt is *sent* and that structured-output
  calls request JSON mode, not the exact wording of any prompt, so prompt-copy tweaks don't
  spuriously break tests.

## Edge functions aren't part of this suite

`supabase/functions/**` runs on Deno, not Node, and imports from `https://esm.sh/...` URL
specifiers Vitest/Node can't resolve — so the classification prompt, RAG retrieval, and Gmail
token refresh logic that live there aren't unit-tested directly. What *is* tested is every
frontend call site's contract with them (`agentService.test.ts`, `ai/gemini.test.ts`,
`documentAsk.service.ts`'s error-unwrapping): the request shape sent, and every response/error
shape handled correctly. The functions themselves are exercised by hand end-to-end (see the
per-feature verification notes in `INTERVIEW_NOTES.txt`) rather than by an automated suite — a
Deno test runner for `supabase/functions/_shared/*.ts` (`emailClassifier.ts`'s extraction schema,
`crypto.ts`'s encrypt/decrypt round-trip) is the natural next step if this suite grows to cover
the server side too.

## Not covered yet — recommended next steps

- **RLS integration tests.** Every table's real security boundary is a Postgres Row Level
  Security policy (see `ARCHITECTURE.md` §10), and that boundary is currently only verified by
  hand. A suite running against `supabase start`'s local Postgres, asserting that user A's session
  genuinely cannot read/write user B's rows even bypassing the client's own `.eq('user_id', ...)`
  filters, would directly test the thing that actually protects user data.
- **E2E tests (Playwright).** The highest-value flows to cover first: sign up → log in → create a
  space → generate a roadmap through the chat flow; upload a PDF → get AI insights; delete a
  space → confirm it (and its content) no longer appears in Memory. That last one is a direct
  regression test for a real bug this project hit once already.
