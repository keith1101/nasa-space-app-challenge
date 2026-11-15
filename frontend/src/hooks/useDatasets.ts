import { useGlobalDatasetsQuery } from './useQueries';
import type {
  AnalyticsSummary,
  CalendarData,
  GlobalCatalog,
  WorldCountriesCollection,
} from '../types/harmonization';

export interface GlobalAllCountriesDatasets {
  globalCatalog: GlobalCatalog;
  worldCountries: WorldCountriesCollection;
  analytics: AnalyticsSummary;
  calendar: CalendarData | null;
}

export type DatasetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: GlobalAllCountriesDatasets };

/**
 * Loads and validates the worldwide 87,311 harmonized fire dataset and 177 world country boundaries
 * using TanStack React Query for optimal in-memory caching and zero-delay route navigation.
 */
export function useDatasets(): { state: DatasetState; reload: () => void } {
  const { isPending, isError, error, data, refetch } = useGlobalDatasetsQuery();

  if (isPending) {
    return {
      state: { status: 'loading' },
      reload: refetch,
    };
  }

  if (isError || !data) {
    return {
      state: {
        status: 'error',
        message: error || 'Đã xảy ra lỗi khi tải dữ liệu điểm cháy toàn cầu.',
      },
      reload: refetch,
    };
  }

  return {
    state: {
      status: 'ready',
      data,
    },
    reload: refetch,
  };
}

export type GlobalCatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: GlobalCatalog };

/** Legacy backwards-compatible hook */
export function useGlobalCatalog(_arg?: unknown): GlobalCatalogState {
  const { state } = useDatasets();
  if (state.status === 'ready') return { status: 'ready', data: state.data.globalCatalog };
  if (state.status === 'error') return { status: 'error', message: state.message };
  return { status: 'loading' };
}
