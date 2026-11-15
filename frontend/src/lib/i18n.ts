export type Language = 'en' | 'vi';

export const CONTINENTS = [
  { id: 'all', vi: 'All Continents', en: 'All Continents', center: [15, 10] as [number, number], zoom: 2 },
  { id: 'Africa', vi: 'Africa', en: 'Africa', center: [-2, 22] as [number, number], zoom: 4 },
  { id: 'Oceania', vi: 'Australia & Oceania', en: 'Australia & Oceania', center: [-24, 134] as [number, number], zoom: 4 },
  { id: 'South America', vi: 'South America', en: 'South America', center: [-14, -56] as [number, number], zoom: 4 },
  { id: 'Asia', vi: 'Asia', en: 'Asia', center: [20, 95] as [number, number], zoom: 4 },
  { id: 'North America', vi: 'North America', en: 'North America', center: [40, -100] as [number, number], zoom: 4 },
  { id: 'Europe', vi: 'Europe', en: 'Europe', center: [45, 15] as [number, number], zoom: 4 },
] as const;

const EN_TRANSLATIONS = {
  appTitle: 'NASA FIRMS · Global Active Fire Monitoring',
  appSubtitle: 'Multi-sensor active-fire harmonization & monitoring across 143 countries (MODIS 1km & VIIRS 375m)',
  fusedBadge: '143 Countries · ST-DBSCAN',
  eventsCountBadge: (count: number) => `${count.toLocaleString('en-US')} global harmonized events`,

  basemapSatellite: 'Satellite Imagery',
  basemapDark: 'Dark Canvas',
  methodologyBtn: 'Methodology',
  methodologyTitle: 'Inspect mathematical formulation and harmonization architecture',

  // KPI Cards
  kpiTotalLabel: 'Harmonized Fire Events (Global)',
  kpiTotalUnit: 'events',
  kpiTotalSub: (raw: number) => `From ${raw.toLocaleString('en-US')} raw satellite scans`,
  kpiDualLabel: 'Multi-Satellite Corroborated',
  kpiDualUnit: (dual: number) => `(${dual.toLocaleString('en-US')} dual)`,
  kpiDualSub: (dual: number) =>
    dual > 0 ? `${dual.toLocaleString('en-US')} MODIS + VIIRS verified` : 'High confidence corroboration',
  kpiFrpLabel: 'Reconciled Radiative Power (FRP)',
  kpiFrpSub: 'Pass-reconciled (no double-counting)',
  kpiHighResLabel: '375m Ground Precision',
  kpiHighResSub: 'Localized via VIIRS I-band',
  kpiDedupLabel: 'Deduplication Savings',
  kpiDedupSub: 'Orbital overlap redundancy removed',

  // Map Viewer
  spotlightBtn: 'Spotlight Top Fire Event',
  spotlightTooltip: 'Fly directly to the highest-energy dual-sensor confirmed fire cluster',
  resetViewBtn: 'Worldwide View',
  resetViewTooltip: 'Reset map view to worldwide overview',
  legendTitle: 'Global Fire Hotspot Legend (Harmonized)',
  legendDual: 'Dual-Sensor Confirmed (MODIS + VIIRS)',
  legendMulti: 'High Energy (FRP ≥ 25 MW)',
  legendHighFrp: 'Moderate Energy (10–25 MW)',
  legendStandard: 'Standard Single-Sensor (<10 MW)',
  tooltipFRP: (frp: string) => `FRP: ${frp} MW`,
  tooltipConf: (conf: string) => `Confidence: ${conf}%`,
  popupClassDual: '🛡️ Dual-Sensor Confirmed (MODIS + VIIRS)',
  popupClassSingle: '⚡ Harmonized Fire Event',
  popupFRP: 'Radiative Power (FRP):',
  popupConfidence: 'Fused Confidence:',
  popupCountry: 'Country / Region:',
  popupContinent: 'Continent:',
  popupRawFused: 'Raw Detections Fused:',
  popupRawDetail: (raw: number) => `${raw} raw satellite hits`,
  popupCoords: 'Coordinates:',
  borderZone: 'Offshore / Border Zone',
  globalEventTitle: 'Global Fire Event',

  // Country Tooltip on map
  countryTooltipFires: (fires: number) => `Harmonized fires: ${fires.toLocaleString('en-US')} events`,
  countryTooltipFRP: (frp: string) => `Total FRP: ${frp} MW`,

  // Sidebar & Filters
  filterHeading: 'Global Fire Filters',
  resetFilters: 'Reset Filters',
  searchPlaceholder: 'Search country (e.g. Brazil, Australia, United States, Canada, India...)',
  countryLabel: 'Country',
  countryAll: (total: number, _count?: number) => `All Countries (${total.toLocaleString('en-US')} events)`,
  continentLabel: 'Continent',
  continentAll: 'All Continents',
  pillAll: 'All Points',
  pillDual: 'Dual-Sensor',
  pillHighFrp: 'FRP ≥ 25 MW',

  // Confidence Filter
  confFilterHeading: 'Fused Confidence Filter:',
  pillConf80: 'Conf ≥ 80% (Recommended)',
  pillConfAll: 'All Confidence Levels',
  confSliderLabel: (min: number) => `Min Confidence: ≥ ${min}%`,
  kpiConfFilterActive: (min: number) => `Filtered: Confidence ≥ ${min}%`,
  confPresetLabel: 'Quick Presets:',
  confSummaryNote: (count: number) => `${count.toLocaleString('en-US')} high-confidence events (false alarms filtered)`,

  // Calendar Heatmap Card
  calendarHeading: 'Forest Fire Regime & Seasonal Calendar',
  calendarSub: '2018–2026 Seasonal Matrix & Jackknife Z-Score Anomaly',
  calendarRegionLabel: 'Region / Biome:',
  calendarMacroLabel: 'Global Macro-Regions (7 Fire Biomes)',
  calendarVnLabel: 'Key Wildfire Sovereign Nations',
  calendarPeakSeason: (peak: string) => `Peak Season: ${peak}`,
  calendarTabMatrix: '2018–2026 Matrix',
  calendarTabSeasonal: '12-Month Profile',
  calendarYearHeader: 'Year',
  calendarMonthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  calendarSelectedMonth: (m: number, y: number) =>
    `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`,
  calendarEventsCount: (cnt: number) => `${cnt.toLocaleString('en-US')} events`,
  calendarDedupSaving: (pct: number) => `Deduplicated: −${pct.toFixed(1)}%`,
  calendarZScore: (z: number) => `Anomaly: ${z >= 0 ? '+' : ''}${z.toFixed(2)}σ`,
  calendarStatusNormal: 'Normal Range',
  calendarStatusElevated: 'Elevated (> +1σ)',
  calendarStatusSevere: 'Severe Anomaly (> +2σ)',
  calendarLegendLow: 'Low',
  calendarLegendMod: 'Moderate',
  calendarLegendElevated: 'Elevated (> +1σ)',
  calendarLegendSevere: 'Severe (> +2σ)',
  calendarLegendPeak: 'Peak Month',
  calendarEstBadge: 'Scaled FIRMS Observation',
  calendarSeasonalAvg: 'Multi-Year Monthly Average',
  calendarSimulatedNotice: '2018–2025 climatological baseline based on ENSO reference model; Nov 2026 scaled from observed NASA FIRMS telemetry.',

  // Event List
  eventListHeading: (count: number) => `Global Event Catalog (${count.toLocaleString('en-US')} events)`,
  sortLabel: 'Sort by:',
  sortFrpDesc: 'Highest FRP',
  sortConfDesc: 'Confidence',
  emptyList: 'No fire events match the current filter criteria.',
  badgeDual: 'Dual-Sensor',
  fusedHits: (count: number) => (count > 1 ? `Fused ${count} hits` : 'Single pass'),
  cardConf: (conf: string) => `Conf: ${conf}%`,

  // Loading / Errors
  loadingMsg: 'Loading 87,311 harmonized fire events across 143 countries...',
  loadingSub: 'Verifying WGS84 point geometries, 177 country boundary polygons, and flux-weighted centroids.',
  errorTitle: 'Dataset Load Error',
  retryBtn: 'Retry Loading',

  // Footer
  footerTitle: 'MODIS · VIIRS Global Active-Fire Harmonization & Monitoring Platform',
  footerSub: 'Worldwide 143 Countries Feed · Developed for NASA Space Apps Challenge 2026.',
  footerDataSource: 'Data Source: NASA FIRMS Active Fire Archive (Terra, Aqua, NOAA-20, NOAA-21).',
};

export const TRANSLATIONS = {
  vi: EN_TRANSLATIONS,
  en: EN_TRANSLATIONS,
} as const;
