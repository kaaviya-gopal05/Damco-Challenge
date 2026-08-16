import { Link, Outlet } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-between px-6 py-10 sm:px-12 lg:px-16">
        <Link to="/" className="flex items-center gap-2 text-ink-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold">Ascend</span>
        </Link>

        <div className="mx-auto w-full max-w-sm py-12">
          <Outlet />
        </div>

        <p className="text-center text-xs text-ink-400 lg:text-left">
          © {new Date().getFullYear()} Ascend. All rights reserved.
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-ink-950 lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative z-10 max-w-md px-10 text-white">
          <p className="text-2xl font-semibold leading-snug">
            "Everything I need to learn — roadmap, flashcards, PDFs, and interview prep — finally
            lives in one place."
          </p>
          <p className="mt-6 text-sm text-brand-100">
            Join learners building structured, trackable learning habits.
          </p>
        </div>
      </div>
    </div>
  );
}
