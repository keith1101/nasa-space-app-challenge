import { create } from 'zustand';
import type { Language } from '../lib/i18n';
import type { GlobalHarmonizedPoint } from '../types/harmonization';

export interface UiState {
  lang: Language;
  selectedPoint: GlobalHarmonizedPoint | null;
  riskHorizon: 6 | 12 | 24;
  is3DMode: boolean;
  terrainEnabled: boolean;
  terrainExaggeration: number;
  isMapFullscreen: boolean;

  // Actions
  setLang: (lang: Language) => void;
  setSelectedPoint: (point: GlobalHarmonizedPoint | null) => void;
  setRiskHorizon: (horizon: 6 | 12 | 24) => void;
  toggle3DMode: () => void;
  set3DMode: (enabled: boolean) => void;
  setTerrainEnabled: (enabled: boolean) => void;
  setTerrainExaggeration: (exaggeration: number) => void;
  toggleMapFullscreen: () => void;
  setMapFullscreen: (enabled: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  lang: 'en',
  selectedPoint: null,
  riskHorizon: 24,
  is3DMode: false,
  terrainEnabled: true,
  terrainExaggeration: 1.5,
  isMapFullscreen: false,

  setLang: () => {
    set({ lang: 'en' });
  },
  setSelectedPoint: (selectedPoint) => set({ selectedPoint }),
  setRiskHorizon: (riskHorizon) => set({ riskHorizon }),
  toggle3DMode: () => set((state) => ({ is3DMode: !state.is3DMode })),
  set3DMode: (is3DMode) => set({ is3DMode }),
  setTerrainEnabled: (terrainEnabled) => set({ terrainEnabled }),
  setTerrainExaggeration: (terrainExaggeration) => set({ terrainExaggeration }),
  toggleMapFullscreen: () => set((state) => ({ isMapFullscreen: !state.isMapFullscreen })),
  setMapFullscreen: (isMapFullscreen) => set({ isMapFullscreen }),
}));
