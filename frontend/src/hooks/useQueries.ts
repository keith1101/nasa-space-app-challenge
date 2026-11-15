import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../lib/api';
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
  GlobalHarmonizedPoint,
  WorldCountriesCollection,
} from '../types/harmonization';

export interface GlobalDatasets {
  globalCatalog: GlobalCatalog;
  worldCountries: WorldCountriesCollection;
  analytics: AnalyticsSummary;
  calendar: CalendarData | null;
}

export type VegetationQueryResult = {
  data_mode: string;
  raster_files: string[];
  saved_labels: number;
  land_cover_year: string;
  counts: {
    total: number;
    covered: number;
    vegetation: number;
    nonvegetation: number;
    unknown: number;
    outside: number;
  };
  regions: Record<
    string,
    { total: number; covered: number; vegetation: number; outside: number; unknown: number; source: string }
  >;
  points: GlobalHarmonizedPoint[];
};

export type FireRiskQueryResult = {
  mode: string;
  fetched_at: string;
  latitude: number;
  longitude: number;
  grid: {
    side: number;
    cell_km: number;
    horizons_hours: number[];
    covered_cells: number;
    total_cells: number;
  };
  persistence_index: Record<string, number>;
  multi_horizon_size?: Record<
    string,
    {
      horizon_hours: number;
      expected_area_km2: number;
      expected_area_ha: number;
      high_risk_cells: number;
      active_perimeter_cells: number;
      persistence_confidence: number;
      threat_milestone: string;
    }
  >;
  cells: Array<{
    latitude: number;
    longitude: number;
    lat_half_size: number;
    lon_half_size: number;
    horizon_hours: number;
    relative_risk: number;
  }>;
  limitations: string;
};

export interface FirmsLiveQueryResult {
  mode: 'live' | 'sample' | 'error';
  statusText: string;
  points: GlobalHarmonizedPoint[] | null;
  fetchedAt?: string;
}

/** 1. Core Global Datasets Query with 10-minute cache */
export function useGlobalDatasetsQuery() {
  const catalogQuery = useQuery({
    queryKey: ['datasets', 'catalog'],
    queryFn: ({ signal }) =>
      fetchJson(
        '/data/fires_global_harmonized.json',
        isGlobalCatalog,
        'Global harmonized active-fire catalog',
        signal,
      ),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const countriesQuery = useQuery({
    queryKey: ['datasets', 'world-countries'],
    queryFn: ({ signal }) =>
      fetchJson(
        '/data/world_countries.geojson',
        isWorldCountriesCollection,
        'World countries boundary polygons',
        signal,
      ),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const analyticsQuery = useQuery({
    queryKey: ['datasets', 'analytics'],
    queryFn: ({ signal }) =>
      fetchJson(
        '/data/analytics_summary.json',
        isAnalytics,
        'NASA FIRMS analytics summary',
        signal,
      ),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Non-blocking deferred calendar query (2.7MB)
  const calendarQuery = useQuery({
    queryKey: ['datasets', 'calendar'],
    queryFn: ({ signal }) =>
      fetchJson(
        '/data/calendar_matrix.json',
        isCalendar,
        'Fire regime calendar matrix',
        signal,
      ),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const isPending =
    catalogQuery.isPending || countriesQuery.isPending || analyticsQuery.isPending;
  const isError =
    catalogQuery.isError || countriesQuery.isError || analyticsQuery.isError;
  const error =
    catalogQuery.error || countriesQuery.error || analyticsQuery.error;

  const data: GlobalDatasets | null =
    catalogQuery.data && countriesQuery.data && analyticsQuery.data
      ? {
          globalCatalog: catalogQuery.data,
          worldCountries: countriesQuery.data,
          analytics: analyticsQuery.data,
          calendar: calendarQuery.data ?? null,
        }
      : null;

  const refetch = () => {
    void catalogQuery.refetch();
    void countriesQuery.refetch();
    void analyticsQuery.refetch();
    void calendarQuery.refetch();
  };

  return {
    isPending,
    isError,
    error: error ? (error instanceof Error ? error.message : 'Lỗi tải dữ liệu') : null,
    data,
    refetch,
    calendarData: calendarQuery.data ?? null,
    isCalendarLoading: calendarQuery.isPending,
  };
}

/** 2. FIRMS Real-time Live Query (polls every 15 minutes) */
export function useFirmsLiveQuery() {
  return useQuery<FirmsLiveQueryResult>({
    queryKey: ['firms', 'live'],
    queryFn: async ({ signal }) => {
      const statusRes = await fetch('/api/data-status', { signal });
      if (!statusRes.ok) throw new Error('Cannot fetch FIRMS status');
      const status = await statusRes.json();

      if (status.mode !== 'live') {
        return {
          mode: status.mode || 'sample',
          statusText: status.last_error
            ? 'FIRMS lỗi cập nhật · đang dùng dữ liệu cũ'
            : 'Đang dùng dữ liệu mẫu · đặt FIRMS_MAP_KEY để bật FIRMS',
          points: null,
          fetchedAt: status.fetched_at,
        };
      }

      const harmRes = await fetch('/api/harmonize', { signal });
      if (!harmRes.ok) throw new Error('FIRMS API unavailable');
      const data = await harmRes.json();

      const points: GlobalHarmonizedPoint[] = data.harmonized_geojson.features.map(
        (f: any) => [
          f.geometry.coordinates[1],
          f.geometry.coordinates[0],
          f.properties.harmonized_frp,
          f.properties.harmonized_confidence,
          f.properties.corroboration === 'CROSS_SENSOR' ? 1 : 0,
          f.properties.raw_count,
          -1,
        ],
      );

      return {
        mode: 'live',
        statusText: `FIRMS · vùng Việt Nam cập nhật ${new Date(status.fetched_at).toLocaleString()}`,
        points,
        fetchedAt: status.fetched_at,
      };
    },
    refetchInterval: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
}

/** 3. Vegetation fires query */
export function useVegetationQuery(enabled: boolean) {
  return useQuery<VegetationQueryResult>({
    queryKey: ['vegetation-fires'],
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/vegetation-fires', { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Không tải được thảm thực vật');
      return data;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

/** 4. Experimental Fire Risk Grid query for selected coordinates */
export function useFireRiskGridQuery(lat?: number, lon?: number) {
  const isEnabled = lat != null && lon != null;
  return useQuery<FireRiskQueryResult>({
    queryKey: ['risk-grid', lat, lon],
    queryFn: async ({ signal }) => {
      const res = await fetch(
        `/api/live-experimental-grid?latitude=${lat}&longitude=${lon}`,
        { signal },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi tải lưới lan truyền');
      return data;
    },
    enabled: isEnabled,
    staleTime: 10 * 60 * 1000,
  });
}
