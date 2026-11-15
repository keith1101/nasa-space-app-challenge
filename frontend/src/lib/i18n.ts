export type Language = 'en';

export const CONTINENTS = [
  { id: 'all', en: 'All Continents', center: [15, 10] as [number, number], zoom: 2 },
  { id: 'Africa', en: 'Africa', center: [-2, 22] as [number, number], zoom: 4 },
  { id: 'Oceania', en: 'Australia & Oceania', center: [-24, 134] as [number, number], zoom: 4 },
  { id: 'South America', en: 'South America', center: [-14, -56] as [number, number], zoom: 4 },
  { id: 'Asia', en: 'Asia', center: [20, 95] as [number, number], zoom: 4 },
  { id: 'North America', en: 'North America', center: [40, -100] as [number, number], zoom: 4 },
  { id: 'Europe', en: 'Europe', center: [45, 15] as [number, number], zoom: 4 },
] as const;

const EN_TRANSLATIONS = {
  appTitle: 'NASA FIRMS · Wildfire Intelligence',
  appSubtitle: 'Multi-Sensor Thermal Harmonization (MODIS & VIIRS)',
  fusedBadge: '143 Countries · ST-DBSCAN',
  eventsCountBadge: (count: number) => `${count.toLocaleString('en-US')} events`,

  basemapSatellite: 'Satellite',
  basemapDark: 'Dark',
  methodologyBtn: 'Methodology',
  methodologyTitle: 'Inspect mathematical formulation and architecture',

  // KPI Cards
  kpiTotalLabel: 'Harmonized Events',
  kpiTotalUnit: 'events',
  kpiTotalSub: (raw: number) => `From ${raw.toLocaleString('en-US')} raw detections`,
  kpiDualLabel: 'Dual-Sensor Verified',
  kpiDualUnit: (dual: number) => `(${dual.toLocaleString('en-US')} dual)`,
  kpiDualSub: (dual: number) =>
    dual > 0 ? `${dual.toLocaleString('en-US')} MODIS + VIIRS corroborated` : 'Multi-sensor corroboration',
  kpiFrpLabel: 'Reconciled FRP',
  kpiFrpSub: 'Peak pass reconciled',
  kpiHighResLabel: '375m Precision',
  kpiHighResSub: 'VIIRS I-band anchored',
  kpiDedupLabel: 'Deduplication',
  kpiDedupSub: 'Orbital overlaps removed',

  // Map Viewer
  spotlightBtn: 'Spotlight Fire',
  spotlightTooltip: 'Zoom to highest-energy fire cluster',
  resetViewBtn: 'Reset View',
  resetViewTooltip: 'Reset map to global view',
  legendTitle: 'Fire Hotspot Legend',
  legendDual: 'Dual-Sensor (MODIS + VIIRS)',
  legendMulti: 'High Energy (FRP ≥ 25 MW)',
  legendHighFrp: 'Moderate (10–25 MW)',
  legendStandard: 'Standard (<10 MW)',
  tooltipFRP: (frp: string) => `FRP: ${frp} MW`,
  tooltipConf: (conf: string) => `Confidence: ${conf}%`,
  popupClassDual: '🛡️ Dual-Sensor (MODIS + VIIRS)',
  popupClassSingle: '⚡ Harmonized Fire Event',
  popupFRP: 'Radiative Power (FRP):',
  popupConfidence: 'Confidence:',
  popupCountry: 'Country:',
  popupContinent: 'Continent:',
  popupRawFused: 'Raw Detections:',
  popupRawDetail: (raw: number) => `${raw} satellite hits`,
  popupCoords: 'Coordinates:',
  borderZone: 'Border / Offshore',
  globalEventTitle: 'Global Fire Event',

  // Country Tooltip on map
  countryTooltipFires: (fires: number) => `${fires.toLocaleString('en-US')} fire events`,
  countryTooltipFRP: (frp: string) => `Total FRP: ${frp} MW`,

  // Sidebar & Filters
  filterHeading: 'Filters',
  resetFilters: 'Reset',
  searchPlaceholder: 'Search country...',
  countryLabel: 'Country',
  countryAll: (total: number, _count?: number) => `All Countries (${total.toLocaleString('en-US')})`,
  continentLabel: 'Continent',
  continentAll: 'All Continents',
  pillAll: 'All',
  pillDual: 'Dual-Sensor',
  pillHighFrp: 'FRP ≥ 25 MW',

  // Confidence Filter
  confFilterHeading: 'Confidence Filter:',
  pillConf80: 'Conf ≥ 80%',
  pillConfAll: 'All Levels',
  confSliderLabel: (min: number) => `Min Confidence: ≥ ${min}%`,
  kpiConfFilterActive: (min: number) => `Conf ≥ ${min}%`,
  confPresetLabel: 'Presets:',
  confSummaryNote: (count: number) => `${count.toLocaleString('en-US')} high-confidence events`,

  // Calendar Heatmap Card
  calendarHeading: 'Seasonal Fire Regime',
  calendarSub: 'Jackknife Z-Score Anomaly & Monthly Matrix',
  calendarRegionLabel: 'Region / Biome:',
  calendarMacroLabel: 'Global Biomes',
  calendarVnLabel: 'Key Wildfire Nations',
  calendarPeakSeason: (peak: string) => `Peak: ${peak}`,
  calendarTabMatrix: '2018–2026 Matrix',
  calendarTabSeasonal: 'Seasonal Profile',
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
  en: EN_TRANSLATIONS,
} as const;
