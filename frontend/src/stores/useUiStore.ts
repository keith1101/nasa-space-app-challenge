import { create } from 'zustand';
import type { Language } from '../lib/i18n';
import type { GlobalHarmonizedPoint } from '../types/harmonization';

export interface UiState {
  lang: Language;
  selectedPoint: GlobalHarmonizedPoint | null;
  riskHorizon: 6 | 12 | 24;

  // Actions
  setLang: (lang: Language) => void;
  setSelectedPoint: (point: GlobalHarmonizedPoint | null) => void;
  setRiskHorizon: (horizon: 6 | 12 | 24) => void;
}

const getInitialLang = (): Language => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang === 'en' || urlLang === 'vi') return urlLang;
    try {
      const saved = localStorage.getItem('nasa_firms_lang');
      if (saved === 'en' || saved === 'vi') return saved;
    } catch {
      // Ignore local storage error
    }
  }
  return 'vi';
};

export const useUiStore = create<UiState>((set) => ({
  lang: getInitialLang(),
  selectedPoint: null,
  riskHorizon: 24,

  setLang: (lang) => {
    try {
      localStorage.setItem('nasa_firms_lang', lang);
    } catch {
      // Ignore storage error
    }
    set({ lang });
  },
  setSelectedPoint: (selectedPoint) => set({ selectedPoint }),
  setRiskHorizon: (riskHorizon) => set({ riskHorizon }),
}));
