/**
 * Explicit TypeScript contracts for the MODIS / VIIRS active-fire harmonization platform.
 * These mirror the JSON actually produced by backend/build_dataset.py,
 * backend/build_global_dataset.py and backend/server.py.
 */

export type SensorFamily = 'MODIS' | 'VIIRS';
export type SatellitePlatform = 'Terra' | 'Aqua' | 'NOAA-20' | 'NOAA-21' | 'Suomi-NPP';
export type DayNightFlag = 'D' | 'N';
export type DayNightFilter = 'all' | DayNightFlag;
export type ClusterClassification = 'HARMONIZED_DUAL' | 'VIIRS_EXCLUSIVE' | 'MODIS_EXCLUSIVE';
export type CorroborationLevel = 'DUAL_SENSOR_FAMILY' | 'MULTI_SATELLITE' | 'SINGLE_SATELLITE';
export type AnomalySeverity = 'extreme' | 'high' | 'normal' | 'low';

/** Map layer shown in the Analysis workspace. */
export type ViewMode = 'harmonized' | 'modis' | 'viirs' | 'comparison';

/** Where the currently displayed harmonization result was computed. */
export type ComputeSource = 'precomputed' | 'api' | 'browser';

export interface GeoJsonPointGeometry {
  type: 'Point';
  /** [longitude, latitude] in WGS84 (EPSG:4326). */
  coordinates: [number, number];
}

export interface GeoJsonFeature<P> {
  type: 'Feature';
  geometry: GeoJsonPointGeometry;
  properties: P;
}

export interface GeoJsonFeatureCollection<P> {
  type: 'FeatureCollection';
  features: Array<GeoJsonFeature<P>>;
}

/** Raw MODIS / VIIRS detection as exported to GeoJSON. MODIS confidence is 0-100, VIIRS is l / n / h. */
export interface RawFireProperties {
  sensor: string;
  satellite: SatellitePlatform | string;
  acq_date: string;
  acq_time: string;
  confidence: number | string;
  frp: number;
  brightness: number;
  scan: number;
  track: number;
  spatial_res_m: 375 | 1000;
  daynight: DayNightFlag;
  province: string;
  in_vietnam: boolean;
}

export interface HarmonizedFireProperties {
  cluster_id: number;
  classification: ClusterClassification;
  corroboration: CorroborationLevel;
  satellites: string;
  sensors: string;
  satellite_count: number;
  acq_date: string;
  acq_time: string;
  daynight: DayNightFlag;
  /** Fused confidence in percent (0-100). A heuristic score, not a calibrated probability. */
  harmonized_confidence: number;
  /** Pass-reconciled fire radiative power in MW. */
  harmonized_frp: number;
  max_brightness: number;
  spatial_resolution_m: 375 | 1000;
  max_scan_km: number;
  max_track_km: number;
  raw_count: number;
  modis_count: number;
  viirs_count: number;
  is_deduplicated: boolean;
  province: string;
  in_vietnam: boolean;
}

export interface ProvinceProperties {
  shapeName: string;
  shapeISO: string;
  modis_fires_7d: number;
  viirs_fires_7d: number;
  harmonized_fires_7d: number;
  dual_confirmed_7d: number;
  dedup_savings_7d: number;
  dedup_pct: number;
  total_frp_mw: number;
  has_active_fires: boolean;
}

export interface ProvinceFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown };
  properties: ProvinceProperties;
}

export interface ProvinceCollection {
  type: 'FeatureCollection';
  features: ProvinceFeature[];
}

export interface HarmonizationMetrics {
  total_raw_detections: number;
  raw_modis_count: number;
  raw_viirs_count: number;
  harmonized_fire_events: number;
  deduplication_rate_percent: number;
  dual_confirmed_events: number;
  multi_satellite_verified_events: number;
  viirs_exclusive_events: number;
  modis_exclusive_events: number;
  high_resolution_375m_ratio_percent: number;
  mean_harmonized_frp: number;
  total_harmonized_frp: number;
  spatial_eps_km: number;
  time_window_hours: number;
}

export interface DatasetProvenance {
  dataset_name: string;
  source_url: string;
  dataset_identifiers: {
    MODIS_C6_1: string;
    VIIRS_NOAA20_C2: string;
    VIIRS_NOAA21_C2: string;
    boundaries: string;
  };
  retrieval_timestamp: string;
  processing_version: string;
  preprocessing_steps: string[];
}

export interface DailyBreakdownRecord {
  date: string;
  modis_raw: number;
  viirs_raw: number;
  total_raw: number;
  harmonized_events: number;
  dedup_rate_percent: number;
  total_frp_mw: number;
  is_partial_day: boolean;
  coverage_note: string;
}

export interface SensorSummary {
  name: string;
  satellites: string[];
  spatial_resolution: string;
  detection_count: number;
}

export interface AnalyticsSummary {
  title: string;
  nasa_challenge: string;
  data_period: string;
  provenance: DatasetProvenance;
  sensors: SensorSummary[];
  metrics: HarmonizationMetrics;
  metrics_vietnam_only: HarmonizationMetrics;
  daily_breakdown_7d: DailyBreakdownRecord[];
  key_findings: string[];
}

export interface CalendarMonthlyRecord {
  year: number;
  month: number;
  modis_count: number;
  viirs_count: number;
  harmonized_count: number;
  dedup_savings: number;
  dedup_percent: number;
  /** True when the cell is scaled from the 7 observed FIRMS days (an estimate, not a full-month observation). */
  is_empirical_anchor: boolean;
  /** True when the cell comes from the parametric climatological reference model (simulated, not observed). */
  is_simulated_baseline: boolean;
  historical_mean: number;
  historical_std: number;
  z_score: number;
  status: string;
  severity: AnomalySeverity;
  is_year_peak: boolean;
}

export interface RegionCalendar {
  province_name: string;
  scope: 'vietnam_province' | 'global_macro_region';
  peak_season: string;
  data_provenance: string;
  description?: string;
  observed_7d_harmonized?: number;
  records: CalendarMonthlyRecord[];
  baseline_by_month: Record<string, { mean: number; std: number }>;
}

export type CalendarData = Record<string, RegionCalendar>;

export interface GlobalCountryInfo {
  id: number;
  name: string;
  code: string;
  continent: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  fires: number;
  frp: number;
  dual: number;
}

/** Compact point tuple: [lat, lon, frp_mw, confidence_pct, is_dual (0|1), raw_count, country_id]. */
export type GlobalHarmonizedPoint = [number, number, number, number, number, number, number];

export interface GlobalCatalog {
  title: string;
  timestamp: string;
  total_raw: number;
  raw_modis_count: number;
  raw_viirs_count: number;
  total_harmonized: number;
  dedup_rate_percent: number;
  dual_confirmed_count: number;
  high_res_375m_percent: number;
  total_frp_mw: number;
  mean_frp_mw: number;
  countries_count: number;
  countries: GlobalCountryInfo[];
  harmonized_points: GlobalHarmonizedPoint[];
}

/** Response of GET /api/harmonize (parameters are not echoed back by the server). */
export interface HarmonizeApiResponse {
  metrics: HarmonizationMetrics;
  harmonized_geojson: GeoJsonFeatureCollection<HarmonizedFireProperties>;
}

export interface AnalysisParams {
  epsKm: number;
  timeWindowHours: number;
  useFootprint: boolean;
  vietnamOnly: boolean;
  /** 'all' or an ISO date (YYYY-MM-DD). */
  dateFilter: string;
  dayNight: DayNightFilter;
}

export interface HarmonizationResult {
  geojson: GeoJsonFeatureCollection<HarmonizedFireProperties>;
  metrics: HarmonizationMetrics;
  source: ComputeSource;
}

export interface Datasets {
  harmonized: GeoJsonFeatureCollection<HarmonizedFireProperties>;
  provinces: ProvinceCollection;
  analytics: AnalyticsSummary;
}
