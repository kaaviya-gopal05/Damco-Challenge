import { Map, Share2, Layers, FileText, PlayCircle, Briefcase, type LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Map,
    title: 'Personalized Roadmaps',
    description:
      'Turn any goal into a structured plan of phases, topics, and tasks — with real progress tracking, not just a checklist.',
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
  {
    icon: Briefcase,
    title: 'Career Intelligence',
    description:
      'See your skill gaps against your target role, practice real interview questions, and follow a career roadmap.',
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
            className="rounded-2xl border border-ink-200/70 bg-white p-6 shadow-soft transition-shadow hover:shadow-card"
          >
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
