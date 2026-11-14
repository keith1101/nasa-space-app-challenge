import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Filter,
  Flame,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { Header } from './components/Header';
import { MapViewer } from './components/MapViewer';
import type { RiskCell } from './components/MapViewer';
import { MethodologyModal } from './components/MethodologyModal';
import { FireCalendarCard } from './components/FireCalendarCard';
import {
  Card,
  Notice,
  Spinner,
  StatCard,
  buttonPrimary,
  cx,
} from './components/ui';
import { useDatasets } from './hooks/useDatasets';
import { fmtInt, fmtNum } from './lib/format';
import type { Language } from './lib/i18n';
import { CONTINENTS, TRANSLATIONS } from './lib/i18n';
import type {
  GlobalCountryInfo,
  GlobalHarmonizedPoint,
} from './types/harmonization';

type FilterType = 'all' | 'dual' | 'high_frp';

type VegetationResult = {
  data_mode: string;
  raster_files: string[];
  saved_labels: number;
  land_cover_year: string;
  counts: { total: number; covered: number; vegetation: number; nonvegetation: number; unknown: number; outside: number };
  regions: Record<string, { total: number; covered: number; vegetation: number; outside: number; unknown: number; source: string }>;
  points: GlobalHarmonizedPoint[];
};

type FireRisk = {
  mode: string;
  fetched_at: string;
  latitude: number;
  longitude: number;
  grid: { side: number; cell_km: number; horizons_hours: number[]; covered_cells: number; total_cells: number };
  persistence_index: Record<string, number>;
  cells: RiskCell[];
  limitations: string;
};

export default function App() {
  const { state: datasetState, reload } = useDatasets();
  const [liveRegion, setLiveRegion] = useState<GlobalHarmonizedPoint[] | null>(null);
  const [liveStatus, setLiveStatus] = useState('Đang kiểm tra dữ liệu FIRMS…');
  const [vegetationOnly, setVegetationOnly] = useState(false);
  const [vegetationData, setVegetationData] = useState<VegetationResult | null>(null);
  const [vegetationError, setVegetationError] = useState('');
  const [fireRisk, setFireRisk] = useState<FireRisk | null>(null);
  const [riskHorizon, setRiskHorizon] = useState<6 | 12 | 24>(24);

  useEffect(() => {
    if (!vegetationOnly) return;
    let active = true;
    async function loadVegetation() {
      try {
        const res = await fetch('/api/vegetation-fires');
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Không tải được thảm thực vật');
        if (active) {
          setVegetationData(data);
          setVegetationError('');
        }
      } catch (err: any) {
        if (active) {
          setVegetationData(null);
          setVegetationError(err.message || 'Lỗi thảm thực vật');
        }
      }
    }
    void loadVegetation();
    return () => { active = false; };
  }, [vegetationOnly]);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const status = await fetch('/api/data-status').then((r) => r.json());
        if (!active) return;
        if (status.mode !== 'live') {
          setLiveStatus(status.last_error ? `FIRMS lỗi cập nhật · đang dùng dữ liệu cũ` : 'Đang dùng dữ liệu mẫu · đặt FIRMS_MAP_KEY để bật FIRMS');
          return;
        }
        const response = await fetch('/api/harmonize');
        if (!response.ok) throw new Error('FIRMS API unavailable');
        const data = await response.json();
        const points: GlobalHarmonizedPoint[] = data.harmonized_geojson.features.map((feature: any) => [
          feature.geometry.coordinates[1], feature.geometry.coordinates[0],
          feature.properties.harmonized_frp, feature.properties.harmonized_confidence,
          feature.properties.corroboration === 'CROSS_SENSOR' ? 1 : 0,
          feature.properties.raw_count, -1,
        ]);
        if (active) {
          setLiveRegion(points);
          setLiveStatus(`FIRMS · vùng Việt Nam cập nhật ${new Date(status.fetched_at).toLocaleString()}`);
        }
      } catch {
        if (active) setLiveStatus('Không tải được FIRMS · đang dùng dữ liệu đã có');
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  // Bilingual state with localStorage persistence
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      if (urlLang === 'en' || urlLang === 'vi') return urlLang;
      const saved = localStorage.getItem('nasa_firms_lang');
      if (saved === 'en' || saved === 'vi') return saved;
    }
    return 'vi';
  });

  const handleSelectLang = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem('nasa_firms_lang', newLang);
    } catch {
      // Ignore storage errors
    }
  };

  const t = TRANSLATIONS[lang];

  // Country & Continent Filters
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGlobalPoint, setSelectedGlobalPoint] = useState<GlobalHarmonizedPoint | null>(null);
  const [basemapStyle, setBasemapStyle] = useState<'dark' | 'satellite'>('dark');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  // Confidence threshold filter (default 80% as requested by user)
  const [minConfidence, setMinConfidence] = useState<number>(80);

  // Active countries list
  const countries = useMemo<GlobalCountryInfo[]>(() => {
    if (datasetState.status !== 'ready') return [];
    if (Array.isArray(datasetState.data.globalCatalog.countries) && datasetState.data.globalCatalog.countries.length > 0) {
      return datasetState.data.globalCatalog.countries;
    }
    if (datasetState.data.worldCountries?.features) {
      return datasetState.data.worldCountries.features.map((f: any, idx: number) => {
        const p = f.properties || {};
        let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
        const walk = (coords: any) => {
          if (!coords) return;
          if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            const lon = coords[0];
            const lat = coords[1];
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          } else if (Array.isArray(coords)) {
            for (const item of coords) walk(item);
          }
        };
        walk(f.geometry?.coordinates);
        const hasValidBounds = minLat <= maxLat && minLon <= maxLon;
        const bounds: [[number, number], [number, number]] = hasValidBounds
          ? [[minLat, minLon], [maxLat, maxLon]]
          : [[-60, -170], [75, 170]];
        const center: [number, number] = hasValidBounds
          ? [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
          : [20, 0];

        return {
          id: idx,
          name: p.NAME || p.ADMIN || p.shapeName || 'Unknown',
          code: p.ISO_A3 || '',
          continent: p.CONTINENT || 'Other',
          center,
          bounds,
          fires: p.harmonized_fires || 0,
          frp: p.total_frp_mw || 0,
          dual: p.dual_confirmed || 0,
        };
      });
    }
    return [];
  }, [datasetState]);

  // Countries lookup map by ID
  const countryMap = useMemo(() => {
    const map = new Map<number, GlobalCountryInfo>();
    if (Array.isArray(countries)) {
      for (const c of countries) {
        map.set(c.id, c);
      }
    }
    return map;
  }, [countries]);

  // Selected country object
  const selectedCountry = useMemo(() => {
    if (selectedCountryId == null) return null;
    return countryMap.get(selectedCountryId) || null;
  }, [selectedCountryId, countryMap]);

  // Fetch live experimental risk grid when point is selected
  useEffect(() => {
    if (!selectedGlobalPoint) {
      setFireRisk(null);
      return;
    }
    const lat = selectedGlobalPoint[0];
    const lon = selectedGlobalPoint[1];
    let active = true;
    async function loadRisk() {
      try {
        const res = await fetch(`/api/live-experimental-grid?latitude=${lat}&longitude=${lon}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Lỗi tải lưới');
        if (active) setFireRisk(data);
      } catch {
        if (active) setFireRisk(null);
      }
    }
    void loadRisk();
    return () => { active = false; };
  }, [selectedGlobalPoint]);

  // All 87,311 Harmonized Points (or filtered by vegetation)
  const allPoints = useMemo<GlobalHarmonizedPoint[]>(() => {
    if (datasetState.status !== 'ready') return [];
    if (vegetationOnly && vegetationData?.points) {
      return vegetationData.points;
    }
    const bundled = datasetState.data.globalCatalog.harmonized_points;
    if (!liveRegion) return bundled;
    return bundled.filter((point) => !(point[0] >= 8.2 && point[0] <= 23.5 && point[1] >= 102.1 && point[1] <= 109.8)).concat(liveRegion);
  }, [datasetState, liveRegion, vegetationOnly, vegetationData]);

  // High-performance single-pass filtering & metric aggregation (O(N) without redundant passes or array sorts)
  const { filteredPoints, totalHarmonizedFrp, dualConfirmed } = useMemo(() => {
    if (allPoints.length === 0) {
      return { filteredPoints: [], totalHarmonizedFrp: 0, dualConfirmed: 0 };
    }

    const trimmedQuery = searchQuery.toLowerCase().trim();
    const hasQuery = trimmedQuery.length > 0;
    const isDualFilter = filterType === 'dual';
    const isHighFrpFilter = filterType === 'high_frp';
    const hasContinentFilter = selectedContinent !== 'all';
    const hasCountryFilter = selectedCountryId != null;

    const result: GlobalHarmonizedPoint[] = [];
    let frpSum = 0;
    let dualCount = 0;

    for (let i = 0; i < allPoints.length; i++) {
      const pt = allPoints[i];
      const frp = pt[2];
      const conf = pt[3];
      const isDual = pt[4] === 1;
      const countryId = pt[6];

      // 1. Confidence threshold check (fastest numerical guard)
      if (minConfidence > 0 && conf < minConfidence) continue;

      // 2. Selected country ID check (fallback to geographic bounding box if countryId unassigned)
      if (hasCountryFilter) {
        if (countryId != null && countryId >= 0) {
          if (countryId !== selectedCountryId) continue;
        } else if (selectedCountry) {
          const [[minLat, minLon], [maxLat, maxLon]] = selectedCountry.bounds;
          if (pt[0] < minLat || pt[0] > maxLat || pt[1] < minLon || pt[1] > maxLon) continue;
        }
      }

      // 3. Category flag check
      if (isDualFilter && !isDual) continue;
      if (isHighFrpFilter && frp < 25) continue;

      // 4. Continent and/or search query checks (look up country only when needed)
      if (hasContinentFilter || hasQuery) {
        const country = (countryId != null && countryId >= 0)
          ? countryMap.get(countryId)
          : countries.find(
              (c) =>
                pt[0] >= c.bounds[0][0] &&
                pt[0] <= c.bounds[1][0] &&
                pt[1] >= c.bounds[0][1] &&
                pt[1] <= c.bounds[1][1],
            );

        if (hasContinentFilter && (!country || country.continent !== selectedContinent)) {
          continue;
        }
        if (hasQuery) {
          const cName = (country ? country.name : 'Offshore').toLowerCase();
          if (!cName.includes(trimmedQuery)) continue;
        }
      }

      result.push(pt);
      frpSum += frp;
      if (isDual) dualCount++;
    }

    return {
      filteredPoints: result,
      totalHarmonizedFrp: frpSum,
      dualConfirmed: dualCount,
    };
  }, [allPoints, minConfidence, selectedCountryId, selectedCountry, selectedContinent, filterType, searchQuery, countries, countryMap]);

  // Dynamic KPI Metrics
  const totalEvents = filteredPoints.length;
  const rawScans = datasetState.status === 'ready' ? datasetState.data.globalCatalog.total_raw : 153948;

  return (
    <div className="min-h-screen flex flex-col bg-ink-950 text-slate-100">
      {/* Header */}
      <Header
        lang={lang}
        onSelectLang={handleSelectLang}
        basemapStyle={basemapStyle}
        onToggleBasemap={() => setBasemapStyle((s) => (s === 'dark' ? 'satellite' : 'dark'))}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        totalEvents={totalEvents}
        countryName={selectedCountry ? selectedCountry.name : undefined}
      />

      <main className="mx-auto w-full max-w-[1720px] flex-1 px-4 py-4 lg:px-6 space-y-4">
        <p className="text-xs text-slate-300" role="status">{liveStatus}</p>
        {/* Loading State */}
        {datasetState.status === 'loading' && (
          <Card className="my-16 p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <Spinner label={t.loadingMsg} />
              <p className="text-xs text-slate-400">
                {t.loadingSub}
              </p>
            </div>
          </Card>
        )}

        {/* Error State */}
        {datasetState.status === 'error' && (
          <Card className="my-16 mx-auto max-w-xl p-6">
            <Notice tone="error" title={t.errorTitle}>
              <p className="mb-3">{datasetState.message}</p>
              <button type="button" onClick={reload} className={buttonPrimary}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>{t.retryBtn}</span>
              </button>
            </Notice>
          </Card>
        )}

        {/* Ready State */}
        {datasetState.status === 'ready' && (
          <>
            {/* Top KPI Summary Metrics Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard
                label={t.kpiTotalLabel}
                value={fmtInt(totalEvents)}
                unit={t.kpiTotalUnit}
                tone="cyan"
                icon={Flame}
                sub={
                  <span>
                    {selectedCountry
                      ? `${selectedCountry.name} · ${selectedCountry.continent}`
                      : minConfidence > 0
                      ? `${t.kpiConfFilterActive(minConfidence)} (${fmtInt(totalEvents)} / ${fmtInt(allPoints.length)})`
                      : liveRegion ? "FIRMS vùng Việt Nam + dữ liệu toàn cầu đã lưu" : t.kpiTotalSub(rawScans)}
                  </span>
                }
              />
              <StatCard
                label={t.kpiDualLabel}
                value={fmtInt(dualConfirmed)}
                unit={t.kpiDualUnit(dualConfirmed)}
                tone="emerald"
                icon={ShieldCheck}
                sub={
                  <span>
                    {dualConfirmed > 0 ? (
                      <span className="text-emerald-300 font-semibold">{t.kpiDualSub(dualConfirmed)}</span>
                    ) : (
                      t.kpiDualSub(0)
                    )}
                  </span>
                }
              />
              <StatCard
                label={t.kpiFrpLabel}
                value={fmtNum(totalHarmonizedFrp, 1)}
                unit="MW"
                tone="amber"
                icon={Activity}
                sub={t.kpiFrpSub}
              />
              <StatCard
                label={t.kpiHighResLabel}
                value={liveRegion ? "—" : "87.0%"}
                tone="blue"
                icon={Sparkles}
                sub={t.kpiHighResSub}
              />
              <StatCard
                label={t.kpiDedupLabel}
                value={liveRegion ? "—" : "−43.3%"}
                tone="emerald"
                icon={TrendingDown}
                sub={t.kpiDedupSub}
              />
            </div>

            {/* Main Interactive Split Dashboard: Map (8 cols) + Country Event Explorer (4 cols) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left Column: Interactive GIS Map */}
              <div className="h-[520px] lg:col-span-8 lg:h-[720px]">
                <MapViewer
                  lang={lang}
                  worldCountriesGeojson={datasetState.data.worldCountries}
                  countries={countries}
                  selectedCountryId={selectedCountryId}
                  onSelectCountry={(cid) => {
                    setSelectedCountryId(cid);
                    setSelectedGlobalPoint(null);
                  }}
                  basemapStyle={basemapStyle}
                  globalPoints={filteredPoints}
                  selectedGlobalPoint={selectedGlobalPoint}
                  onSelectGlobalPoint={(pt) => setSelectedGlobalPoint(pt)}
                  riskCells={fireRisk?.cells || []}
                  riskHorizon={riskHorizon}
                />
              </div>

              {/* Right Column: Clean Sidebar Controls & Event List */}
              <div className="flex flex-col gap-3 lg:col-span-4 h-[720px]">
                {/* Search & Filter Card */}
                <Card className="p-3.5 space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                      {t.filterHeading}
                    </span>
                    {(selectedCountryId != null ||
                      selectedContinent !== 'all' ||
                      filterType !== 'all' ||
                      searchQuery.trim().length > 0 ||
                      minConfidence !== 80) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCountryId(null);
                          setSelectedContinent('all');
                          setFilterType('all');
                          setSearchQuery('');
                          setMinConfidence(80);
                          setSelectedGlobalPoint(null);
                        }}
                        className="text-[11px] font-semibold text-cyan-300 hover:underline"
                      >
                        {t.resetFilters}
                      </button>
                    )}
                  </div>

                  {/* Search by country */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder={t.searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-line-strong bg-ink-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Country & Continent Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="country-select" className="mb-1 block text-[11px] font-semibold text-slate-300">
                        {t.countryLabel}
                      </label>
                      <select
                        id="country-select"
                        value={selectedCountryId ?? 'all'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCountryId(val === 'all' ? null : Number(val));
                          setSelectedGlobalPoint(null);
                        }}
                        className="w-full rounded-lg border border-line-strong bg-ink-900 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                      >
                        <option value="all">
                          {t.countryAll(allPoints.length, countries.length)}
                        </option>
                        {countries
                          .filter((c) => c.fires > 0)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.fires.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="continent-select" className="mb-1 block text-[11px] font-semibold text-slate-300">
                        {t.continentLabel}
                      </label>
                      <select
                        id="continent-select"
                        value={selectedContinent}
                        onChange={(e) => {
                          setSelectedContinent(e.target.value);
                          setSelectedCountryId(null);
                          setSelectedGlobalPoint(null);
                        }}
                        className="w-full rounded-lg border border-line-strong bg-ink-900 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                      >
                        {CONTINENTS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {lang === 'vi' ? c.vi : c.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Category Filter Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className={cx(
                        'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                        filterType === 'all'
                          ? 'bg-cyan-400 text-ink-950 font-bold'
                          : 'border border-line bg-ink-900 text-slate-300 hover:text-white',
                      )}
                    >
                      {t.pillAll}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('dual')}
                      className={cx(
                        'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors flex items-center gap-1',
                        filterType === 'dual'
                          ? 'bg-emerald-400 text-ink-950 font-bold'
                          : 'border border-emerald-400/30 bg-ink-900 text-emerald-300 hover:bg-emerald-400/10',
                      )}
                    >
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      <span>{t.pillDual}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('high_frp')}
                      className={cx(
                        'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors flex items-center gap-1',
                        filterType === 'high_frp'
                          ? 'bg-rose-400 text-ink-950 font-bold'
                          : 'border border-rose-400/30 bg-ink-900 text-rose-300 hover:bg-rose-400/10',
                      )}
                    >
                      <Flame className="h-3 w-3" aria-hidden="true" />
                      <span>{t.pillHighFrp}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVegetationOnly((v) => !v)}
                      className={cx(
                        'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors flex items-center gap-1',
                        vegetationOnly
                          ? 'bg-emerald-400 text-ink-950 font-bold'
                          : 'border border-line bg-ink-900 text-slate-300 hover:text-white',
                      )}
                    >
                      <span>🌱 {lang === 'vi' ? 'Thảm thực vật' : 'Vegetation'}</span>
                    </button>
                  </div>

                  {/* Experimental Fire Risk Grid Horizon Controls */}
                  {fireRisk && fireRisk.cells && fireRisk.cells.length > 0 && (
                    <div className="pt-2 border-t border-line space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-amber-300 flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {lang === 'vi' ? 'Lưới lan truyền' : 'Spread Grid'}
                        </span>
                        <div className="flex gap-1">
                          {([6, 12, 24] as const).map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setRiskHorizon(h)}
                              className={cx(
                                'px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors',
                                riskHorizon === h
                                  ? 'bg-amber-400 text-ink-950'
                                  : 'bg-ink-900 border border-line text-slate-300 hover:text-white',
                              )}
                            >
                              {h}h
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {lang === 'vi'
                          ? `Hiển thị ${fireRisk.cells.filter((c) => c.horizon_hours === riskHorizon).length} ô lưới 1-km xung quanh điểm cháy.`
                          : `Displaying ${fireRisk.cells.filter((c) => c.horizon_hours === riskHorizon).length} 1-km grid cells around hotspot.`}
                      </p>
                    </div>
                  )}

                  {vegetationOnly && vegetationData && (
                    <div className="text-[10px] text-emerald-400 font-medium">
                      ✓ {lang === 'vi' ? 'Đã lọc theo thảm thực vật MCD12Q1:' : 'Filtered by MCD12Q1 vegetation:'}{' '}
                      {vegetationData.counts.vegetation.toLocaleString()} / {vegetationData.counts.total.toLocaleString()}
                    </div>
                  )}

                  {vegetationOnly && vegetationError && (
                    <div className="text-[10px] text-rose-400 font-medium">
                      ⚠ {vegetationError}
                    </div>
                  )}

                  {/* Fused Confidence Filter (User Request: > 80% default filter) */}
                  <div className="pt-2.5 border-t border-line space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                        {t.confFilterHeading}
                      </span>
                      <span
                        className={cx(
                          'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
                          minConfidence >= 80
                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-ink-800 text-slate-300',
                        )}
                      >
                        {minConfidence > 0 ? `≥ ${minConfidence}%` : t.pillConfAll}
                      </span>
                    </div>

                    {/* Main Confidence Toggle Buttons */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMinConfidence(80)}
                        className={cx(
                          'rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 text-center',
                          minConfidence === 80
                            ? 'bg-emerald-500 text-ink-950 font-bold shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                            : 'border border-emerald-500/30 bg-ink-900 text-emerald-300 hover:bg-emerald-500/10',
                        )}
                      >
                        <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{t.pillConf80}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMinConfidence(0)}
                        className={cx(
                          'rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all text-center',
                          minConfidence === 0
                            ? 'bg-slate-200 text-ink-950 font-bold shadow-sm'
                            : 'border border-line bg-ink-900 text-slate-300 hover:text-white hover:bg-ink-850',
                        )}
                      >
                        {t.pillConfAll}
                      </button>
                    </div>

                    {/* Quick Presets: 0%, 50%, 70%, 80%, 90% */}
                    <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 pt-0.5">
                      <span>{t.confPresetLabel}</span>
                      <div className="flex gap-1">
                        {[
                          { val: 0, label: 'All' },
                          { val: 50, label: '≥50%' },
                          { val: 70, label: '≥70%' },
                          { val: 80, label: '≥80%' },
                          { val: 90, label: '≥90%' },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setMinConfidence(item.val)}
                            className={cx(
                              'rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors',
                              minConfidence === item.val
                                ? 'bg-cyan-400 text-ink-950 font-bold'
                                : 'bg-ink-850 text-slate-400 hover:text-slate-200',
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {minConfidence >= 80 && (
                      <p className="text-[10px] text-emerald-300/80 leading-tight">
                        ✓ {t.confSummaryNote(totalEvents)}
                      </p>
                    )}
                  </div>
                </Card>

                {/* Forest Fire Regime Calendar (Bottom-Right Panel) */}
                <FireCalendarCard
                  lang={lang}
                  calendarData={datasetState.data.calendar}
                  initialRegion={
                    selectedCountry?.name === 'Vietnam' || selectedCountryId === 176
                      ? 'An Giang'
                      : selectedContinent === 'South America'
                      ? 'South America (Amazon & Cerrado)'
                      : selectedContinent === 'Africa'
                      ? 'Central & Southern Africa'
                      : selectedContinent === 'Oceania'
                      ? 'Australia & Oceania'
                      : selectedContinent === 'North America'
                      ? 'North America (Western US & Canada)'
                      : selectedContinent === 'Asia'
                      ? 'Southeast Asia & Indochina'
                      : selectedContinent === 'Europe'
                      ? 'Europe & Mediterranean'
                      : 'Global (Worldwide)'
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-line bg-ink-900/90 py-3 text-xs text-slate-400">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
          <div>
            <strong className="text-slate-200">{t.footerTitle}</strong> — {t.footerSub}
          </div>
          <div className="text-[11px]">
            {t.footerDataSource}
          </div>
        </div>
      </footer>

      {/* Methodology Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        lang={lang}
      />
    </div>
  );
}
