import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useUiStore } from '@/lib/uiStore';
import { AppSidebar } from '@/components/layout/AppSidebar';

export function MobileDrawer() {
  const { isMobileDrawerOpen, closeMobileDrawer } = useUiStore();

  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileDrawerOpen]);

  if (!isMobileDrawerOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink-950/40 animate-fade-in" onClick={closeMobileDrawer} />
      <div className="relative z-10 h-full w-72 animate-slide-up shadow-popover">
        <button
          onClick={closeMobileDrawer}
          className="absolute -right-11 top-4 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <AppSidebar onNavigate={closeMobileDrawer} />
      </div>
    </div>,
    document.body
  );
}
