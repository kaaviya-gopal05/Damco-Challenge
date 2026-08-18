# AI Workflow

## Shape of the system

Every AI-dependent feature (roadmap generation, task notes, mind maps, PDF summaries/Q&A/quiz,
flashcards, resume analysis, interview questions, skill-improvement plans, chat replies, chat
intent classification) is a **single-shot prompt → structured response** call, defined once as
the `AiService` interface in `src/services/ai/types.ts` and implemented twice:

```
src/services/ai.service.ts        barrel: re-exports the interface/types, getAiService(), isAiConfigured()
src/services/ai/
  types.ts                        the AiService interface + every request/response shape
  mock.ts                         mockAiService — deterministic, heuristic, no network
  gemini.ts                       GeminiService — calls the ai-complete Supabase Edge Function
  roadmap-templates.ts            hand-written roadmap templates mockAiService.generateRoadmap draws from
```

Every component/hook calls `getAiService()` and only ever talks to the `AiService` interface —
never a concrete class — so which implementation is active is decided in exactly one place.

There is no multi-step agent, tool-calling loop, or iterative retry/critique chain anywhere in
this app — each method is one prompt in, one parsed response out. **This is why the project does
not use LangGraph or a similar graph-orchestration library**: that class of tool earns its keep
when there's real branching, multi-agent handoff, or tool selection to orchestrate, none of which
exists here today. The one thing that could be mistaken for a "workflow" —
`useCommandFlow.ts`'s sequential Q&A (level → deadline → hours/day → optional material upload)
before generating a roadmap — is a small explicit state machine over a `Record<FlowKind,
FlowQuestion[]>` table, which is already the right amount of machinery for 3 flow kinds and at
most 4 linear questions.

## Mock vs. real: the parity rule

`mockAiService` exists so the product works and demos coherently with **zero configuration** —
no API key, no deployed infrastructure. Every one of its methods derives output from the actual
input (sentence-split document text, keyword-matched roadmap templates, etc.), never random
Lorem Ipsum, and every mock response is clearly labeled ("Demo notes — connect a Gemini API key
for real, topic-specific explanations.") so it's never ambiguous to the user that they're looking
at demo content.

**The rule when changing anything here:** `mockAiService` and `GeminiService` must implement the
exact same `AiService` interface and return the exact same TypeScript shape for the exact same
method. If you add a field to `GeneratedRoadmap`, both `pickTemplate()` (used by the mock) and the
Gemini prompt + its expected JSON schema (in `gemini.ts`) need to produce it. The tests in
`src/services/ai/mock.test.ts` and `src/services/ai/gemini.test.ts` exist specifically to catch
drift between the two — see [`docs/testing.md`](./testing.md).

## Why Gemini is called through an Edge Function, not directly

Every `VITE_*`-prefixed environment variable is baked into the built client JS by Vite. That's
correct and expected for `VITE_SUPABASE_ANON_KEY` (a public key that RLS constrains — see
`ARCHITECTURE.md` §10), but it is **not** an acceptable place for a billed, per-token Gemini API
key: anyone who opens the Network tab or reads the bundle can extract it and run up usage on your
account.

So `GeminiService` (`src/services/ai/gemini.ts`) never talks to
`generativelanguage.googleapis.com` directly. It calls `supabase.functions.invoke('ai-complete',
...)` — a Supabase Edge Function (`supabase/functions/ai-complete/index.ts`) that:

1. Requires a valid Supabase auth session (rejects the call with 401 otherwise) — defense in
   depth, the same principle as RLS everywhere else, even though the anon key alone can't do
   anything harmful.
2. Reads `GEMINI_API_KEY` from `Deno.env.get(...)` — a **server-side secret**, set via
   `supabase secrets set`, never shipped to any client.
3. Proxies the prompt to Gemini and returns `{ text: string }` (or a JSON error body) back to the
   browser.

The client-side switch is now a non-secret feature flag, not a key:

```bash
VITE_AI_ENABLED=true   # use the deployed edge function (GeminiService)
# unset / anything else → mockAiService
```

### Deploying the edge function

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) logged in and linked to your
project (`supabase login`, `supabase link --project-ref <ref>`):

```bash
# Deploy the function
supabase functions deploy ai-complete

# Set the server-side secret (never goes in .env / never gets a VITE_ prefix)
supabase secrets set GEMINI_API_KEY=your-gemini-key

# In your frontend .env / hosting provider's env vars — a flag, not a secret
VITE_AI_ENABLED=true
```

To test the function locally before deploying:

```bash
supabase functions serve ai-complete --env-file supabase/.env.local
# supabase/.env.local (gitignored) should contain: GEMINI_API_KEY=your-key
```

### If you don't deploy it

The app still works — it just runs on `mockAiService`, which is the default for anyone who
clones the repo and hasn't set `VITE_AI_ENABLED`. This is intentional: a reviewer or interviewer
should be able to `npm install && npm run dev` and see a fully-functional, clearly-labeled demo
without needing your Gemini key or a deployed edge function.

## YouTube: a smaller version of the same trade-off

`src/services/youtube.service.ts` follows an identical mock/real split
(`mockYoutubeService`/`YoutubeDataApiService`, selected by `VITE_YOUTUBE_API_KEY`), but the real
implementation still calls the YouTube Data API v3 directly from the browser. That's a
deliberately smaller risk than the Gemini key: the Data API is designed for client-side use, and
the key can (and should) be restricted by HTTP referrer in the Google Cloud Console, which
neutralizes the "someone copies it out of the bundle" risk without needing a proxy function.
