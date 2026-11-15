import { create } from 'zustand';

export type FilterType = 'all' | 'dual' | 'high_frp';
export type ActiveLayerMode = 'hotspots' | 'density' | 'both';
export type BasemapStyle = 'dark' | 'satellite';

export interface FilterState {
  minConfidence: number;
  filterType: FilterType;
  selectedCountryId: number | null;
  selectedContinent: string;
  searchQuery: string;
  activeLayerMode: ActiveLayerMode;
  basemapStyle: BasemapStyle;
  vegetationOnly: boolean;

  // Actions
  setMinConfidence: (val: number) => void;
  setFilterType: (type: FilterType) => void;
  setSelectedCountryId: (id: number | null) => void;
  setSelectedContinent: (continent: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveLayerMode: (mode: ActiveLayerMode) => void;
  setBasemapStyle: (style: BasemapStyle) => void;
  toggleBasemapStyle: () => void;
  setVegetationOnly: (updater: boolean | ((prev: boolean) => boolean)) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  minConfidence: 80,
  filterType: 'all',
  selectedCountryId: null,
  selectedContinent: 'all',
  searchQuery: '',
  activeLayerMode: 'both',
  basemapStyle: 'dark',
  vegetationOnly: false,

  setMinConfidence: (minConfidence) => set({ minConfidence }),
  setFilterType: (filterType) => set({ filterType }),
  setSelectedCountryId: (selectedCountryId) => set({ selectedCountryId }),
  setSelectedContinent: (selectedContinent) => set({ selectedContinent, selectedCountryId: null }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveLayerMode: (activeLayerMode) => set({ activeLayerMode }),
  setBasemapStyle: (basemapStyle) => set({ basemapStyle }),
  toggleBasemapStyle: () =>
    set((state) => ({ basemapStyle: state.basemapStyle === 'dark' ? 'satellite' : 'dark' })),
  setVegetationOnly: (updater) =>
    set((state) => ({
      vegetationOnly: typeof updater === 'function' ? updater(state.vegetationOnly) : updater,
    })),
  resetFilters: () =>
    set({
      minConfidence: 80,
      filterType: 'all',
      selectedCountryId: null,
      selectedContinent: 'all',
      searchQuery: '',
      vegetationOnly: false,
    }),
}));
