import { useCallback, useEffect, useState } from 'react';
import { DataLoadError, fetchJson, isAbortError } from '../lib/api';
import {
  isAnalytics,
  isCalendar,
  isGlobalCatalog,
  isWorldCountriesCollection,
} from '../lib/validate';
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

function describeError(e: unknown): string {
  if (e instanceof DataLoadError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Đã xảy ra lỗi khi tải dữ liệu điểm cháy toàn cầu.';
}

/** Loads and validates the worldwide 87,311 harmonized fire dataset and 177 world country boundaries. */
export function useDatasets(): { state: DatasetState; reload: () => void } {
  const [state, setState] = useState<DatasetState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading' });

    // 1. Critical path: Load Catalog, Country Boundaries, and Analytics
    Promise.all([
      fetchJson(
        '/data/fires_global_harmonized.json',
        isGlobalCatalog,
        'Global harmonized active-fire catalog',
        ctrl.signal,
      ),
      fetchJson(
        '/data/world_countries.geojson',
        isWorldCountriesCollection,
        'World countries boundary polygons',
        ctrl.signal,
      ),
      fetchJson(
        '/data/analytics_summary.json',
        isAnalytics,
        'NASA FIRMS analytics summary',
        ctrl.signal,
      ),
    ])
      .then(([globalCatalog, worldCountries, analytics]) => {
        // App is interactive immediately with Map & KPIs
        setState({
          status: 'ready',
          data: { globalCatalog, worldCountries, analytics, calendar: null },
        });

        // 2. Non-blocking Deferred Path: Load heavy calendar matrix (2.7MB) in the background
        fetchJson(
          '/data/calendar_matrix.json',
          isCalendar,
          'Fire regime calendar matrix',
          ctrl.signal,
        )
          .then((calendar) => {
            setState((curr) =>
              curr.status === 'ready'
                ? { ...curr, data: { ...curr.data, calendar } }
                : curr,
            );
          })
          .catch((e: unknown) => {
            if (isAbortError(e)) return;
            console.warn('Deferred calendar data load warning:', describeError(e));
          });
      })
      .catch((e: unknown) => {
        if (isAbortError(e)) return;
        setState({ status: 'error', message: describeError(e) });
      });

    return () => ctrl.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, reload };
}

export type GlobalCatalogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: GlobalCatalog };

/** Legacy backwards-compatible hook for OverviewPage */
export function useGlobalCatalog(_arg?: unknown): GlobalCatalogState {
  const { state } = useDatasets();
  if (state.status === 'ready') return { status: 'ready', data: state.data.globalCatalog };
  if (state.status === 'error') return { status: 'error', message: state.message };
  return { status: 'loading' };
}
