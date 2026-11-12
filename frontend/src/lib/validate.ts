/**
 * Runtime validation for data crossing the network boundary.
 * Static files and the live API are both validated before they reach any component.
 */
import type {
  AnalyticsSummary,
  CalendarData,
  GeoJsonFeatureCollection,
  GlobalCatalog,
  HarmonizationMetrics,
  HarmonizeApiResponse,
  ProvinceCollection,
} from '../types/harmonization';

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isCoordinatePair(v: unknown): boolean {
  return Array.isArray(v) && v.length >= 2 && isFiniteNumber(v[0]) && isFiniteNumber(v[1]);
}

/** Validates the collection envelope and spot-checks the first features' geometry. */
export function isPointCollection<P>(v: unknown): v is GeoJsonFeatureCollection<P> {
  if (!isRecord(v) || v.type !== 'FeatureCollection' || !Array.isArray(v.features)) return false;
  return v.features.slice(0, 25).every((f) => {
    if (!isRecord(f) || f.type !== 'Feature' || !isRecord(f.properties) || !isRecord(f.geometry)) return false;
    return f.geometry.type === 'Point' && isCoordinatePair(f.geometry.coordinates);
  });
}

export function isWorldCountriesCollection(v: unknown): boolean {
  if (!isRecord(v) || v.type !== 'FeatureCollection' || !Array.isArray(v.features)) return false;
  return v.features.slice(0, 10).every(
    (f) =>
      isRecord(f) &&
      isRecord(f.geometry) &&
      isRecord(f.properties) &&
      (typeof f.properties.NAME === 'string' || typeof f.properties.shapeName === 'string'),
  );
}

export function isProvinceCollection(v: unknown): v is ProvinceCollection {
  if (!isRecord(v) || v.type !== 'FeatureCollection' || !Array.isArray(v.features)) return false;
  return v.features.every(
    (f) =>
      isRecord(f) &&
      isRecord(f.geometry) &&
      isRecord(f.properties) &&
      typeof f.properties.shapeName === 'string' &&
      isFiniteNumber(f.properties.harmonized_fires_7d),
  );
}

const METRIC_KEYS: Array<keyof HarmonizationMetrics> = [
  'total_raw_detections',
  'raw_modis_count',
  'raw_viirs_count',
  'harmonized_fire_events',
  'deduplication_rate_percent',
  'dual_confirmed_events',
  'multi_satellite_verified_events',
  'viirs_exclusive_events',
  'modis_exclusive_events',
  'high_resolution_375m_ratio_percent',
  'mean_harmonized_frp',
  'total_harmonized_frp',
  'spatial_eps_km',
  'time_window_hours',
];

export function isMetrics(v: unknown): v is HarmonizationMetrics {
  return isRecord(v) && METRIC_KEYS.every((k) => isFiniteNumber(v[k]));
}

export function isAnalytics(v: unknown): v is AnalyticsSummary {
  if (!isRecord(v)) return false;
  const p = v.provenance;
  return (
    isMetrics(v.metrics) &&
    isMetrics(v.metrics_vietnam_only) &&
    Array.isArray(v.daily_breakdown_7d) &&
    v.daily_breakdown_7d.every((d) => isRecord(d) && typeof d.date === 'string' && isFiniteNumber(d.total_raw)) &&
    Array.isArray(v.key_findings) &&
    Array.isArray(v.sensors) &&
    isRecord(p) &&
    typeof p.retrieval_timestamp === 'string' &&
    typeof p.processing_version === 'string' &&
    isRecord(p.dataset_identifiers) &&
    Array.isArray(p.preprocessing_steps)
  );
}

export function isCalendar(v: unknown): v is CalendarData {
  if (!isRecord(v)) return false;
  const values = Object.values(v);
  return (
    values.length > 0 &&
    values.every((r) => isRecord(r) && Array.isArray(r.records) && typeof r.peak_season === 'string')
  );
}

export function isHarmonizeResponse(v: unknown): v is HarmonizeApiResponse {
  return isRecord(v) && isMetrics(v.metrics) && isPointCollection(v.harmonized_geojson);
}

export function isGlobalCatalog(v: unknown): v is GlobalCatalog {
  return (
    isRecord(v) &&
    isFiniteNumber(v.total_raw) &&
    isFiniteNumber(v.total_harmonized) &&
    isFiniteNumber(v.dedup_rate_percent) &&
    typeof v.timestamp === 'string' &&
    Array.isArray(v.harmonized_points)
  );
}
