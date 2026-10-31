// src/stores/brandingStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BrandingConfig, defaultBranding } from '@/config/branding';

interface BrandingStore {
  branding: BrandingConfig;
  updateBranding: (branding: BrandingConfig) => void;
  resetBranding: () => void;
}

export const useBrandingStore = create<BrandingStore>()(
  persist(
    (set) => ({
      branding: defaultBranding,
      updateBranding: (branding) => set({ branding }),
      resetBranding: () => set({ branding: defaultBranding }),
    }),
    {
      name: 'yyc3-branding',
    }
  )
);

export const useBranding = () => useBrandingStore((state) => state.branding);
export const useUpdateBranding = () => useBrandingStore((state) => state.updateBranding);
