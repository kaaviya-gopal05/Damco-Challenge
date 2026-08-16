import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ProgressBar({
  value,
  max = 100,
  className,
  trackClassName,
  barClassName,
  showLabel = false,
  size = 'md',
}: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-ink-100',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
          trackClassName
        )}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full bg-brand-500 transition-all duration-500 ease-out', barClassName)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-ink-500">
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}
