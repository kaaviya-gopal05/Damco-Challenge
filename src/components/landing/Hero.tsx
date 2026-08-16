import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-white to-white" />
      <div className="absolute -top-24 right-0 -z-10 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="absolute -top-10 left-0 -z-10 h-72 w-72 rounded-full bg-accent-200/40 blur-3xl" />

      <div className="mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28 lg:px-8">
        <div className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles className="h-3.5 w-3.5" />
          One workspace for every stage of learning
        </div>

        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-ink-900 sm:text-6xl">
          Your Learning. <span className="text-brand-600">One Intelligent Workspace.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink-500">
          Plan what to learn, understand complex concepts, revise smarter, and prepare for your
          career — all in one AI-powered workspace.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/signup">
            <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Start Learning
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline">
              Explore Features
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
