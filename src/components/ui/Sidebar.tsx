import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Sidebar({
  children,
  className,
  collapsed = false,
}: {
  children: ReactNode;
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-ink-200/70 bg-white transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-64',
        className
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex h-16 items-center gap-2 px-5', className)}>{children}</div>;
}

export function SidebarSection({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-0.5 px-3', className)}>
      {label && (
        <p className="px-2.5 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wider text-ink-400">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

export interface SidebarItemProps {
  icon?: ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: ReactNode;
}

export function SidebarItem({ icon, label, isActive, onClick, badge }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-brand-50 text-brand-700'
          : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
      )}
    >
      {icon && (
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center',
            isActive ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600'
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 truncate text-left">{label}</span>
      {badge}
    </button>
  );
}
