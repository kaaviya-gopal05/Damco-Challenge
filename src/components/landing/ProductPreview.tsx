import { Flame, CheckCircle2, Layers, TrendingUp } from 'lucide-react';

export function ProductPreview() {
  return (
    <section id="preview" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          A dashboard that actually shows your progress
        </h2>
        <p className="mt-4 text-ink-500">
          Streaks, active roadmaps, due flashcards, and career readiness — at a glance.
        </p>
      </div>

      <div className="mt-14 overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-popover">
        <div className="flex items-center gap-1.5 border-b border-ink-100 bg-ink-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-4">
          <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 sm:col-span-1">
            <Flame className="h-5 w-5 text-amber-500" />
            <p className="mt-3 text-2xl font-bold text-ink-900">12</p>
            <p className="text-xs text-ink-500">Day streak</p>
          </div>
          <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 sm:col-span-1">
            <CheckCircle2 className="h-5 w-5 text-accent-500" />
            <p className="mt-3 text-2xl font-bold text-ink-900">68%</p>
            <p className="text-xs text-ink-500">Roadmap complete</p>
          </div>
          <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 sm:col-span-1">
            <Layers className="h-5 w-5 text-brand-500" />
            <p className="mt-3 text-2xl font-bold text-ink-900">9</p>
            <p className="text-xs text-ink-500">Cards due today</p>
          </div>
          <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 sm:col-span-1">
            <TrendingUp className="h-5 w-5 text-rose-500" />
            <p className="mt-3 text-2xl font-bold text-ink-900">4.5h</p>
            <p className="text-xs text-ink-500">Studied this week</p>
          </div>

          <div className="sm:col-span-2">
            <p className="mb-3 text-sm font-semibold text-ink-700">Weekly activity</p>
            <div className="flex h-32 items-end gap-2 rounded-xl border border-ink-100 bg-ink-50/50 p-4">
              {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-brand-400/80" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <p className="mb-3 text-sm font-semibold text-ink-700">Active roadmap</p>
            <div className="flex flex-col gap-2 rounded-xl border border-ink-100 bg-ink-50/50 p-4">
              <p className="text-sm font-medium text-ink-900">Become a Data Scientist</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-200">
                <div className="h-full w-2/3 rounded-full bg-brand-500" />
              </div>
              <p className="text-xs text-ink-400">Phase 3 of 5 — Machine Learning</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
