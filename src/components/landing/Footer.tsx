import { GraduationCap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-ink-200/70 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-ink-700">Ascend</span>
        </div>
        <p className="text-xs text-ink-400">
          © {new Date().getFullYear()} Ascend. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
