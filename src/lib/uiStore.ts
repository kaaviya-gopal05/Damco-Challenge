import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  isMobileDrawerOpen: boolean;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;

  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isCommandPaletteOpen: false,
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
      toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),

      isMobileDrawerOpen: false,
      openMobileDrawer: () => set({ isMobileDrawerOpen: true }),
      closeMobileDrawer: () => set({ isMobileDrawerOpen: false }),

      isSidebarCollapsed: false,
      toggleSidebarCollapsed: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
    }),
    {
      name: 'ui-store',
      partialize: (s) => ({ isSidebarCollapsed: s.isSidebarCollapsed }),
    }
  )
);
