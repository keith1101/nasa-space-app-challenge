import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Filter,
  Flame,
  Globe2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { Header } from './components/Header';
import { MapViewer } from './components/MapViewer';
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
type SortOrder = 'frp_desc' | 'confidence_desc';

export default function App() {
  const { state: datasetState, reload } = useDatasets();
  const [liveRegion, setLiveRegion] = useState<GlobalHarmonizedPoint[] | null>(null);
  const [liveStatus, setLiveStatus] = useState('Đang kiểm tra dữ liệu FIRMS…');
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
  const [sortBy, setSortBy] = useState<SortOrder>('frp_desc');
  const [selectedGlobalPoint, setSelectedGlobalPoint] = useState<GlobalHarmonizedPoint | null>(null);
  const [basemapStyle, setBasemapStyle] = useState<'dark' | 'satellite'>('dark');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  // Confidence threshold filter (default 80% as requested by user)
  const [minConfidence, setMinConfidence] = useState<number>(80);

  // Active countries list
  const countries = useMemo<GlobalCountryInfo[]>(() => {
    if (datasetState.status !== 'ready') return [];
    return datasetState.data.globalCatalog.countries;
  }, [datasetState]);

  // Countries lookup map by ID
  const countryMap = useMemo(() => {
    const map = new Map<number, GlobalCountryInfo>();
    for (const c of countries) {
      map.set(c.id, c);
    }
    return map;
  }, [countries]);

  // Selected country object
  const selectedCountry = useMemo(() => {
    if (selectedCountryId == null) return null;
    return countryMap.get(selectedCountryId) || null;
  }, [selectedCountryId, countryMap]);

  // All 87,311 Harmonized Points
  const allPoints = useMemo<GlobalHarmonizedPoint[]>(() => {
    if (datasetState.status !== 'ready') return [];
    const bundled = datasetState.data.globalCatalog.harmonized_points;
    if (!liveRegion) return bundled;
    return bundled.filter((point) => !(point[0] >= 8.2 && point[0] <= 23.5 && point[1] >= 102.1 && point[1] <= 109.8)).concat(liveRegion);
  }, [datasetState, liveRegion]);

  // Filtered Points
  const filteredPoints = useMemo<GlobalHarmonizedPoint[]>(() => {
    if (allPoints.length === 0) return [];

    let list = allPoints.filter((pt) => {
      const frp = pt[2];
      const conf = pt[3];
      const isDual = pt[4] === 1;
      const countryId = pt[6];
      const country = countryId >= 0 ? countryMap.get(countryId) : null;

      // Filter by confidence threshold (e.g. >= 80%)
      if (minConfidence > 0 && conf < minConfidence) {
        return false;
      }

      // Filter by selected country
      if (selectedCountryId != null) {
        if (countryId !== selectedCountryId) return false;
      }

      // Filter by continent
      if (selectedContinent !== 'all') {
        if (!country || country.continent !== selectedContinent) return false;
      }

      // Filter by category
      if (filterType === 'dual' && !isDual) return false;
      if (filterType === 'high_frp' && frp < 25) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cName = (country ? country.name : 'Offshore').toLowerCase();
        if (!cName.includes(q)) return false;
      }

      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'frp_desc') return b[2] - a[2];
      return b[3] - a[3]; // confidence
    });

    return list;
  }, [allPoints, minConfidence, selectedCountryId, selectedContinent, filterType, searchQuery, sortBy, countryMap]);

  // Dynamic KPI Metrics
  const totalEvents = filteredPoints.length;
  const rawScans = datasetState.status === 'ready' ? datasetState.data.globalCatalog.total_raw : 153948;

  const dualConfirmed = useMemo(
    () => filteredPoints.filter((pt) => pt[4] === 1).length,
    [filteredPoints],
  );

  const totalHarmonizedFrp = useMemo(
    () => filteredPoints.reduce((acc, pt) => acc + pt[2], 0),
    [filteredPoints],
  );

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
                  </div>

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
