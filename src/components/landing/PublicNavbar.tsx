import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui';

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/60 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="hidden text-base font-bold text-ink-900 sm:inline">Ascend</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-ink-600 hover:text-ink-900">
            Features
          </a>
          <a href="#preview" className="text-sm font-medium text-ink-600 hover:text-ink-900">
            Product Preview
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Start Learning</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
