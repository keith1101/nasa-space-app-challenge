export interface StageInputItem {
  name: string;
  specs: string;
  tag: string;
  mathTex?: string;
}

export interface ArchitectureStageData {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  color: 'cyan' | 'emerald' | 'amber' | 'rose';
  borderColor: string;
  bgColor: string;
  textColor: string;
  strokeColor: string;
  iconName: 'Satellite' | 'Layers' | 'Cpu' | 'Activity';
  svgBullets: string[];
  inputs: StageInputItem[];
  operations: string[];
  output: string;
}

export const ARCHITECTURE_STAGES: ArchitectureStageData[] = [
  {
    id: 1,
    badge: 'STAGE 01',
    title: 'Raw Multi-Sensor Ingestion',
    subtitle: 'Polar-orbiting raw telemetry',
    color: 'cyan',
    borderColor: 'border-cyan-500/40 hover:border-cyan-400',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-300',
    strokeColor: '#06b6d4',
    iconName: 'Satellite',
    svgBullets: ['LANCE EOSDIS ingestion', 'Cloud mask & UTC epoch', 'Unified multi-sat schema'],
    inputs: [
      {
        name: 'MODIS (Terra & Aqua)',
        specs: '1,000m Nadir · Bowtie 4.8×2.0km · 2,330km swath',
        tag: '1,000m',
      },
      {
        name: 'VIIRS (Suomi-NPP, NOAA-20, NOAA-21)',
        specs: '375m I-band · Aggregation 0.8km · 3,040km swath',
        tag: '375m',
      },
    ],
    operations: [
      'Ingest NRT streams from NASA LANCE EOSDIS FIRMS',
      'Standardize UTC epoch timestamps and thermal coordinates',
      'Screen low-quality flags and thick cloud obscurations',
    ],
    output: 'Raw telemetry vector: lat, lon, frp, scan, track, sat, time',
  },
  {
    id: 2,
    badge: 'STAGE 02',
    title: 'Geometric & Prior Calibration',
    subtitle: 'Anisotropic ellipse & Laplace calibration',
    color: 'emerald',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-300',
    strokeColor: '#10b981',
    iconName: 'Layers',
    svgBullets: ['Laplace mapping [0.05, 0.99]', 'Bowtie ellipse (a_scan, b_track)', 'O(N) Spatial grid index'],
    inputs: [
      {
        name: 'Laplace Confidence Mapping',
        specs: 'MODIS: conf/100 · VIIRS: 0.30 / 0.70 / 0.95',
        mathTex: '\\max\\left(0.05, \\min\\left(0.99, \\frac{\\text{conf}}{100}\\right)\\right)',
        tag: 'Laplace',
      },
      {
        name: 'Anisotropic Swath Footprint',
        specs: 'Dynamic elliptical semi-axes adapt to scan angle',
        mathTex: 'a_{\\text{scan}}, b_{\\text{track}}',
        tag: 'Ellipse',
      },
    ],
    operations: [
      'Transform discrete confidence ratings into rigorous prior probabilities',
      'Compute dynamic elliptical bounding radii based on scan geometry',
      'Build O(N) spatial grid index for accelerated neighbor queries',
    ],
    output: 'Calibrated candidate set with geometric footprint bounds',
  },
  {
    id: 3,
    badge: 'STAGE 03',
    title: 'ST-DBSCAN v2.2 Fusion Engine',
    subtitle: 'Centroid localization & Bayesian fusion',
    color: 'amber',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-300',
    strokeColor: '#f59e0b',
    iconName: 'Cpu',
    svgBullets: ['Adaptive ST-DBSCAN clustering', 'Flux-density centroid w_i', 'Pass-grouped Noisy-OR (≥ 0.92)'],
    inputs: [
      {
        name: 'Flux-Density Centroid',
        specs: 'Flux-density weighted by unit ground pixel footprint',
        mathTex: 'w_i = \\frac{\\text{FRP}_i + 0.1}{\\max(0.05, \\text{scan}_i \\times \\text{track}_i)}',
        tag: 'w_i centroid',
      },
      {
        name: 'Pass-Grouped Bayesian Noisy-OR',
        specs: 'Inter-pass noisy-OR aggregation with dual-sensor floor',
        mathTex: 'P_{\\text{fused}} = 1 - \\prod_{s}(1 - p_{\\text{sat}, s}) \\ge 0.92',
        tag: 'Noisy-OR',
      },
    ],
    operations: [
      'Spatio-temporal clustering: Haversine ≤ 1.25km ∨ Anisotropic Ellipse, Δt ≤ 3.0h',
      'Anchor physical fire front towards fine 375m VIIRS radiative hotspots',
      'Reconcile instantaneous radiative energy: FRP_reconciled = max_s(∑ FRP_i)',
    ],
    output: 'Fused physical fire events (43.29% redundancy eliminated)',
  },
  {
    id: 4,
    badge: 'STAGE 04',
    title: 'Distribution & Real-Time Telemetry',
    subtitle: 'Jackknife Z-score & WebGL2 visualization',
    color: 'rose',
    borderColor: 'border-rose-500/40 hover:border-rose-400',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-300',
    strokeColor: '#f43f5e',
    iconName: 'Activity',
    svgBullets: ['Jackknife Z-score anomaly', 'Deck.gl WebGL2 60 FPS', 'GeoJSON streaming (< 95ms)'],
    inputs: [
      {
        name: 'Jackknife Climatological Z-Score',
        specs: 'Leave-One-Year-Out baseline climatology with ENSO teleconnection',
        mathTex: 'Z_y = \\frac{x_y - \\bar{x}_{(-y)}}{s_{(-y)}}',
        tag: 'Z-score',
      },
      {
        name: 'WebGL2 Real-Time Rendering',
        specs: 'Deck.gl Scatterplot & Heatmap 60 FPS · GeoJSON Streaming',
        tag: '60 FPS',
      },
    ],
    operations: [
      'Stratify fire severity against 20+ year baseline climatology',
      'Stream optimized GeoJSON to high-performance GIS client (< 95ms latency)',
      'Provide complete provenance audit trail for every fused cluster',
    ],
    output: 'Deck.gl interactive map, analytics reports, and risk early warnings',
  },
];
