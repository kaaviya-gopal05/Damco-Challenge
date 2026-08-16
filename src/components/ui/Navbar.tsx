import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Navbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center justify-between gap-4 border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur sm:px-6',
        className
      )}
    >
      {children}
    </header>
  );
}

export function NavbarSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center gap-2', className)}>{children}</div>;
}
