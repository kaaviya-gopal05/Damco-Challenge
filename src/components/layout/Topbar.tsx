import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Layers, Sparkles } from 'lucide-react';
import { Navbar, NavbarSection, Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui';
import { useUiStore } from '@/lib/uiStore';
import { useDueCards } from '@/features/flashcards/hooks/useFlashcards';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function Topbar() {
  const { openMobileDrawer, openCommandPalette } = useUiStore();
  const { data: dueCards } = useDueCards();
  const { notifications, unseenCount, markAllSeen } = useNotifications();
  const navigate = useNavigate();

  const dueCount = dueCards?.length ?? 0;
  const badgeCount = unseenCount + (dueCount > 0 ? 1 : 0);

  return (
    <Navbar>
      <NavbarSection>
        <button
          onClick={openMobileDrawer}
          className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={openCommandPalette}
          className="hidden items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-400 transition-colors hover:border-ink-300 hover:text-ink-600 sm:flex sm:w-72"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search everything...</span>
          <kbd className="rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-400">
            ⌘K
          </kbd>
        </button>
        <button
          onClick={openCommandPalette}
          className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 sm:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </NavbarSection>

      <NavbarSection>
        <Dropdown
          align="right"
          trigger={
            <button
              onClick={markAllSeen}
              className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {badgeCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                  {badgeCount}
                </span>
              )}
            </button>
          }
          className="w-80"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
          </div>
          <DropdownSeparator />
          {dueCount > 0 && (
            <DropdownItem onClick={() => navigate('/app/spaces')}>
              <Layers className="h-4 w-4 shrink-0 text-brand-500" />
              <span>
                <strong>{dueCount}</strong> flashcard{dueCount === 1 ? '' : 's'} due for review
              </span>
            </DropdownItem>
          )}
          {notifications.map((n) => (
            <DropdownItem key={n.id} onClick={() => navigate(n.route)}>
              <Sparkles className={cn('h-4 w-4 shrink-0', n.isNew ? 'text-brand-500' : 'text-ink-300')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{n.message}</span>
                <span className="block text-xs text-ink-400">{timeAgo(n.occurredAt)}</span>
              </span>
            </DropdownItem>
          ))}
          {dueCount === 0 && notifications.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-ink-400">You're all caught up 🎉</p>
          )}
        </Dropdown>
      </NavbarSection>
    </Navbar>
  );
}
