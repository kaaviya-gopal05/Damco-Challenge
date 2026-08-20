import { Map, Share2, Layers, FileText, PlayCircle, Briefcase, CalendarClock, type LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}

const FEATURES: Feature[] = [
  {
    icon: Map,
    title: 'Personalized Roadmaps',
    description:
      'Turn any goal into a structured plan of phases, topics, and tasks — with real progress tracking, not just a checklist.',
  },
  {
    icon: CalendarClock,
    title: 'Weekly Plan',
    description:
      'An autonomous agent rebalances your overdue and upcoming tasks across the week and writes a plain-English recap of what changed and why.',
    badge: 'Agent',
  },
  {
    icon: Briefcase,
    title: 'Career Intelligence',
    description:
      'Upload your resume in a chat, then type your target role or attach a job description — get a RAG-grounded skill-gap analysis and interview questions, and keep asking follow-up questions about your fit afterward.',
    badge: 'RAG',
  },
  {
    icon: Share2,
    title: 'Mind Maps',
    description:
      'Organize concepts visually. Expand, collapse, and connect ideas on an interactive, pannable canvas.',
  },
  {
    icon: Layers,
    title: 'Active Flashcards',
    description:
      'Study with spaced repetition. Cards resurface exactly when you\'re about to forget them, not on a fixed schedule.',
  },
  {
    icon: FileText,
    title: 'PDF Intelligence',
    description:
      'Upload any PDF and get a summary, key points, Q&A, and a quiz — generated directly from the document.',
  },
  {
    icon: PlayCircle,
    title: 'Learning Videos',
    description:
      'Discover curated educational YouTube content by topic and difficulty, and save it straight to your workspace.',
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Everything scattered across a dozen tabs. Now in one place.
        </h2>
        <p className="mt-4 text-ink-500">
          Every tool a learner actually needs, designed to work together instead of against each
          other.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="relative rounded-2xl border border-ink-200/70 bg-white p-6 shadow-soft transition-shadow hover:shadow-card"
          >
            {feature.badge && (
              <span className="absolute right-4 top-4 rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-600">
                {feature.badge}
              </span>
            )}
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-ink-900">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
