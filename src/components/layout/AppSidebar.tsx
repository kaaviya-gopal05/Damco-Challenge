import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Archive,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Briefcase,
  Calendar,
  ListChecks,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Sidebar, SidebarHeader, SidebarSection, Tooltip, Dropdown, DropdownItem, Dialog } from '@/components/ui';
import { NAV_ITEMS } from '@/lib/constants';
import { cn, initialsFromName } from '@/lib/utils';
import { useUiStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useSpaces, useDeleteSpace } from '@/features/spaces/hooks/useSpaces';
import type { Space } from '@/types/database';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  MessageSquare,
  Archive,
  Briefcase,
  Calendar,
  ListChecks,
};

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useUiStore();
  const { signOut, user } = useAuth();
  const { data: profile } = useCurrentProfile();
  const { data: spaces } = useSpaces();
  const deleteSpace = useDeleteSpace();
  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null);
  const navigate = useNavigate();
  const collapsed = isSidebarCollapsed && !onNavigate;

  const canToggle = !onNavigate;

  return (
    <Sidebar collapsed={collapsed}>
      <SidebarHeader className={cn(collapsed ? 'justify-center px-0' : 'justify-between')}>
        {collapsed && canToggle ? (
          <Tooltip content="Expand sidebar" side="right">
            <button
              onClick={toggleSidebarCollapsed}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700"
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
          </Tooltip>
        ) : (
          <>
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="truncate text-base font-bold text-ink-900">Ascend</span>
            </span>
            {canToggle && (
              <button
                onClick={toggleSidebarCollapsed}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </SidebarHeader>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <SidebarSection>
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const isSpaces = item.to === '/app/spaces';
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        isActive ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600'
                      )}
                    />
                    {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                    {!collapsed && isSpaces && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onNavigate?.();
                          navigate('/app/spaces');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onNavigate?.();
                            navigate('/app/spaces');
                          }
                        }}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                        aria-label="New space"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
            const wrappedLink = collapsed ? (
              <Tooltip key={item.to} content={item.label} side="right">
                {link}
              </Tooltip>
            ) : (
              link
            );

            if (!isSpaces || collapsed || !spaces || spaces.length === 0) {
              return wrappedLink;
            }

            return (
              <div key={item.to} className="flex flex-col gap-0.5">
                {wrappedLink}
                <div className="ml-4 flex flex-col gap-0.5 border-l border-ink-100 pl-3">
                  {spaces.map((space) => (
                    <div key={space.id} className="group/space flex items-center gap-0.5">
                      <NavLink
                        to={`/app/spaces/${space.id}`}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-brand-50 text-brand-700'
                              : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
                          )
                        }
                      >
                        {space.title}
                      </NavLink>
                      <Dropdown
                        align="right"
                        trigger={
                          <button
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-400 opacity-0 transition-opacity hover:bg-ink-100 hover:text-ink-700 group-hover/space:opacity-100"
                            aria-label={`Options for ${space.title}`}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        }
                      >
                        <DropdownItem destructive onClick={() => setDeleteTarget(space)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete space
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </SidebarSection>
      </nav>

      <div className={cn('flex flex-col gap-1 border-t border-ink-100 p-3', collapsed && 'items-center px-2')}>
        {collapsed ? (
          <Tooltip content={profile?.full_name ?? user?.email ?? 'Profile'} side="right">
            <button
              onClick={() => navigate('/app/settings')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
            >
              {initialsFromName(profile?.full_name ?? user?.email)}
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => navigate('/app/settings')}
            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-ink-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initialsFromName(profile?.full_name ?? user?.email)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink-800">{profile?.full_name ?? 'Learner'}</span>
              <span className="block truncate text-xs text-ink-400">{user?.email}</span>
            </span>
          </button>
        )}

        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <Tooltip content="Log out" side="right">
              <button
                onClick={() => signOut()}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Settings" side="right">
              <button
                onClick={() => navigate('/app/settings')}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-700"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        ) : (
          <div className="flex w-full items-center gap-1">
            <button
              onClick={() => signOut()}
              className="flex flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-ink-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Log out
            </button>
            <button
              onClick={() => navigate('/app/settings')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteSpace.mutateAsync(deleteTarget.id);
          if (window.location.pathname === `/app/spaces/${deleteTarget.id}`) navigate('/app/spaces');
          setDeleteTarget(null);
        }}
        title="Delete this space?"
        description="This will permanently delete this space and everything generated in it — roadmaps, mind maps, flashcards, and documents."
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteSpace.isPending}
      />
    </Sidebar>
  );
}
