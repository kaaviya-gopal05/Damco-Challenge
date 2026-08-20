import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { CommandPalette } from '@/features/search/components/CommandPalette';
import { cn } from '@/lib/utils';

const SPACE_DETAIL_PATTERN = /^\/app\/spaces\/[^/]+$/;

export function AppLayout() {
  const location = useLocation();
  const isFullBleed = SPACE_DETAIL_PATTERN.test(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <div className="hidden lg:flex">
        <AppSidebar />
      </div>
      <MobileDrawer />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className={cn('flex-1', isFullBleed ? 'overflow-hidden' : 'overflow-y-auto scrollbar-thin')}>
          {isFullBleed ? (
            <Outlet />
          ) : (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
