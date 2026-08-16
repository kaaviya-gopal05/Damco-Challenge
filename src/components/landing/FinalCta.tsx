import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-ink-950 px-8 py-16 text-center sm:px-16">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Stop juggling five apps to learn one thing.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-100">
            Set your first goal and get a structured roadmap in minutes — free to start.
          </p>
          <Link to="/signup" className="mt-8 inline-block">
            <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Start Learning
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
