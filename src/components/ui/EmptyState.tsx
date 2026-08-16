import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 px-6 py-14 text-center animate-fade-in',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="max-w-sm">
        <p className="font-semibold text-ink-900">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
