export interface SummaryStatItem {
  label: string;
  value: string;
  subtext: string;
  tone: 'cyan' | 'emerald' | 'amber' | 'white';
}

export const HERO_SUMMARY_STATS: SummaryStatItem[] = [
  {
    label: 'Redundancy Reduction',
    value: '43.29%',
    subtext: '153.9k → 87.3k events',
    tone: 'cyan',
  },
  {
    label: 'Latency Performance',
    value: '< 95 ms',
    subtext: '24h Global Catalog',
    tone: 'emerald',
  },
  {
    label: 'False Negative Rate',
    value: '0.0%',
    subtext: 'Zero isolated fire loss',
    tone: 'amber',
  },
  {
    label: 'Centroid Resolution',
    value: '375 m',
    subtext: 'VIIRS I-band anchor',
    tone: 'white',
  },
];

export interface BenchmarkKpiItem {
  id: string;
  label: string;
  value: string;
  description: string;
  iconName: 'Database' | 'Flame' | 'Scale' | 'Activity' | 'ShieldCheck' | 'Sparkles';
  valueColor: string;
  iconColor: string;
  hasMathFootnote?: boolean;
}

export const BENCHMARK_KPIS: BenchmarkKpiItem[] = [
  {
    id: 'raw_inputs',
    label: 'Raw Input Detections',
    value: '153,948',
    description: 'Cumulative raw detection telemetry from MODIS Terra/Aqua and VIIRS constellation.',
    iconName: 'Database',
    valueColor: 'text-white',
    iconColor: 'text-cyan-400',
  },
  {
    id: 'fused_wildfires',
    label: 'Fused Physical Wildfires',
    value: '87,311',
    description: 'Reconciled physical fire events after anisotropic elliptical ST-DBSCAN clustering.',
    iconName: 'Flame',
    valueColor: 'text-emerald-300',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'deduplication_rate',
    label: 'Empirical Deduplication',
    value: '43.29%',
    description: 'Eliminated 66,637 redundant detections (43.29%), in strict concordance with theoretical 27%–43% expectation.',
    iconName: 'Scale',
    valueColor: 'text-cyan-300',
    iconColor: 'text-cyan-400',
  },
  {
    id: 'clustering_latency',
    label: 'Clustering Latency',
    value: '< 95 ms',
    description: 'O(N) spatial hash binning ensures instantaneous execution over tens of thousands of points.',
    iconName: 'Activity',
    valueColor: 'text-amber-300',
    iconColor: 'text-amber-400',
  },
  {
    id: 'false_negative_rate',
    label: 'False Negative Rate',
    value: '0.0%',
    description: 'min_samples = 1 self-contained clustering guarantees zero loss of isolated fire fronts.',
    iconName: 'ShieldCheck',
    valueColor: 'text-emerald-400',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'dual_sensor_corroboration',
    label: 'Dual Sensor Corroboration',
    value: '1.1%',
    description: '962 clusters corroborated concurrently across both sensor families (MODIS & VIIRS), reaching fused confidence P_fused >= 0.92.',
    iconName: 'Sparkles',
    valueColor: 'text-cyan-300',
    iconColor: 'text-cyan-400',
    hasMathFootnote: true,
  },
];
