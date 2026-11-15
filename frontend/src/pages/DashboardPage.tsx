import { useMemo, useRef } from 'react';
import {
  RefreshCw,
  Search,
} from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { FireDeckMap } from '../components/deck/FireDeckMap';
import { FireRegimeHeatmap } from '../components/echarts/FireRegimeHeatmap';
import { FireDetailDialog } from '../components/ui/FireDetailDialog';
import {
  Card,
  Notice,
  Spinner,
  StatCard,
  buttonPrimary,
  cx,
} from '../components/ui';
import { useDatasets } from '../hooks/useDatasets';
import {
  useFirmsLiveQuery,
  useVegetationQuery,
  useFireRiskGridQuery,
} from '../hooks/useQueries';
import { useFilterStore } from '../stores/useFilterStore';
import { useUiStore } from '../stores/useUiStore';
import { fmtInt, fmtNum } from '../lib/format';
import { CONTINENTS, TRANSLATIONS } from '../lib/i18n';
import { isPointInGeoJson } from '../lib/geo';
import type {
  GlobalCountryInfo,
  GlobalHarmonizedPoint,
} from '../types/harmonization';

export function DashboardPage() {
  const { state: datasetState, reload } = useDatasets();
  const {
    lang,
    selectedPoint,
    setSelectedPoint,
    riskHorizon,
    setRiskHorizon,
    isMapFullscreen,
  } = useUiStore();
  const t = TRANSLATIONS[lang];

  // Store filters
  const {
    minConfidence,
    setMinConfidence,
    filterType,
    setFilterType,
    selectedCountryId,
    setSelectedCountryId,
    selectedContinent,
    setSelectedContinent,
    searchQuery,
    setSearchQuery,
    basemapStyle,
    toggleBasemapStyle,
    vegetationOnly,
    setVegetationOnly,
    resetFilters,
  } = useFilterStore();

  // 1. TanStack Query for Live FIRMS Telemetry (Auto-polling every 15 mins)
  const { data: firmsLive } = useFirmsLiveQuery();
  const liveRegion = firmsLive?.points ?? null;
  const liveStatus = firmsLive?.statusText ?? 'Checking NASA FIRMS connection…';

  // 2. TanStack Query for Vegetation Fire Masks (Cached 10 mins)
  const { data: vegetationData, error: vegError } = useVegetationQuery(vegetationOnly);
  const vegetationError = vegError ? (vegError instanceof Error ? vegError.message : 'Vegetation layer error') : '';

  // 3. TanStack Query for Experimental Fire Risk Grid (Cached by Lat/Lon)
  const { data: fireRisk } = useFireRiskGridQuery(
    selectedPoint ? selectedPoint[0] : undefined,
    selectedPoint ? selectedPoint[1] : undefined,
  );

  // Scramble 3D Flight mission ref hook
  const scrambleMissionRef = useRef<((point?: any) => void) | null>(null);

  // Countries metadata
  const countries = useMemo<GlobalCountryInfo[]>(() => {
    if (datasetState.status !== 'ready') return [];
    if (
      Array.isArray(datasetState.data.globalCatalog.countries) &&
      datasetState.data.globalCatalog.countries.length > 0
    ) {
      return datasetState.data.globalCatalog.countries;
    }
    if (datasetState.data.worldCountries?.features) {
      return datasetState.data.worldCountries.features.map((f: any, idx: number) => {
        const p = f.properties || {};
        let minLat = 90,
          maxLat = -90,
          minLon = 180,
          maxLon = -180;
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
          ? [
              [minLat, minLon],
              [maxLat, maxLon],
            ]
          : [
              [-60, -170],
              [75, 170],
            ];
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

  // Lookup map
  const countryMap = useMemo(() => {
    const map = new Map<number, GlobalCountryInfo>();
    if (Array.isArray(countries)) {
      for (const c of countries) {
        map.set(c.id, c);
      }
    }
    return map;
  }, [countries]);

  const selectedCountry = useMemo(() => {
    if (selectedCountryId == null) return null;
    return countryMap.get(selectedCountryId) || null;
  }, [selectedCountryId, countryMap]);

  // Determine actual sovereign country for the selected fire point using Point-in-Polygon (PIP)
  const activePointCountry = useMemo<GlobalCountryInfo | null>(() => {
    if (!selectedPoint) return null;
    const lat = selectedPoint[0];
    const lon = selectedPoint[1];
    const worldFeatures = datasetState.status === 'ready' ? datasetState.data?.worldCountries?.features : null;

    const candidates = countries.filter(
      (c) =>
        lat >= c.bounds[0][0] &&
        lat <= c.bounds[1][0] &&
        lon >= c.bounds[0][1] &&
        lon <= c.bounds[1][1],
    );

    if (candidates.length === 0) return null;
    if (candidates.length === 1 && !worldFeatures) return candidates[0];

    if (worldFeatures) {
      for (const c of candidates) {
        const feat = worldFeatures[c.id];
        if (feat && isPointInGeoJson(lat, lon, feat.geometry)) {
          return c;
        }
      }
    }
    return candidates[0] || null;
  }, [selectedPoint, countries, datasetState]);

  // Points pool
  const allPoints = useMemo<GlobalHarmonizedPoint[]>(() => {
    if (datasetState.status !== 'ready') return [];
    if (vegetationOnly && vegetationData?.points) {
      return vegetationData.points;
    }
    const bundled = datasetState.data.globalCatalog.harmonized_points;
    if (!liveRegion) return bundled;
    return bundled
      .filter(
        (point) =>
          !(
            point[0] >= 8.2 &&
            point[0] <= 23.5 &&
            point[1] >= 102.1 &&
            point[1] <= 109.8
          ),
      )
      .concat(liveRegion);
  }, [datasetState, liveRegion, vegetationOnly, vegetationData]);

  // Filter pass
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
    const worldFeatures = datasetState.status === 'ready' ? datasetState.data?.worldCountries?.features : null;

    const result: GlobalHarmonizedPoint[] = [];
    let frpSum = 0;
    let dualCount = 0;

    for (let i = 0; i < allPoints.length; i++) {
      const pt = allPoints[i];
      const frp = pt[2];
      const conf = pt[3];
      const isDual = pt[4] === 1;
      const countryId = pt[6];

      // Confidence threshold check
      if (minConfidence > 0 && conf < minConfidence) continue;

      // Country check with true Point-in-Polygon validation against sovereign border
      if (hasCountryFilter && selectedCountry) {
        const [[minLat, minLon], [maxLat, maxLon]] = selectedCountry.bounds;
        // Step 1: O(1) Fast bounding box rejection (filters out 99% of global points)
        if (pt[0] < minLat || pt[0] > maxLat || pt[1] < minLon || pt[1] > maxLon) continue;

        // Step 2: Accurate Point-in-Polygon test against Natural Earth sovereign geometry
        if (worldFeatures) {
          const feat = worldFeatures[selectedCountry.id];
          if (feat && !isPointInGeoJson(pt[0], pt[1], feat.geometry)) {
            continue;
          }
        }
      }

      // Category check
      if (isDualFilter && !isDual) continue;
      if (isHighFrpFilter && frp < 25) continue;

      // Continent & Search check
      if (hasContinentFilter || hasQuery) {
        const country =
          countryId != null && countryId >= 0
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
  }, [
    allPoints,
    minConfidence,
    selectedCountryId,
    selectedCountry,
    selectedContinent,
    filterType,
    searchQuery,
    countries,
    countryMap,
  ]);

  const totalEvents = filteredPoints.length;
  const rawScans =
    datasetState.status === 'ready' ? datasetState.data.globalCatalog.total_raw : 153948;

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 py-4 lg:px-6 space-y-4">
      {/* Live status bar */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <p role="status">{liveStatus}</p>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px] text-slate-300">
            {datasetState.status === 'ready'
              ? `${fmtInt(totalEvents)} / ${fmtInt(allPoints.length)} events rendered`
              : 'Initializing...'}
          </span>
        </div>
      </div>

      {/* Loading state */}
      {datasetState.status === 'loading' && (
        <Card className="my-16 p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner label={t.loadingMsg} />
            <p className="text-xs text-slate-400">{t.loadingSub}</p>
          </div>
        </Card>
      )}

      {/* Error state */}
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

      {/* Ready state */}
      {datasetState.status === 'ready' && (
        <>
          {/* Top 5 KPI Summary Metrics */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label={t.kpiTotalLabel}
              value={fmtInt(totalEvents)}
              unit={t.kpiTotalUnit}
              tone="cyan"
              sub={
                <span>
                  {selectedCountry
                    ? `${selectedCountry.name} · ${selectedCountry.continent}`
                    : minConfidence > 0
                    ? `${t.kpiConfFilterActive(minConfidence)} (${fmtInt(totalEvents)} / ${fmtInt(allPoints.length)})`
                    : liveRegion
                    ? 'FIRMS Live + Global Catalog'
                    : t.kpiTotalSub(rawScans)}
                </span>
              }
            />
            <StatCard
              label={t.kpiDualLabel}
              value={fmtInt(dualConfirmed)}
              unit={t.kpiDualUnit(dualConfirmed)}
              tone="emerald"
              sub={dualConfirmed > 0 ? t.kpiDualSub(dualConfirmed) : t.kpiDualSub(0)}
            />
            <StatCard
              label={t.kpiFrpLabel}
              value={fmtNum(totalHarmonizedFrp, 1)}
              unit="MW"
              tone="amber"
              sub={t.kpiFrpSub}
            />
            <StatCard
              label={t.kpiHighResLabel}
              value={liveRegion ? '—' : '87.0%'}
              tone="blue"
              sub={t.kpiHighResSub}
            />
            <StatCard
              label={t.kpiDedupLabel}
              value={liveRegion ? '—' : '−43.3%'}
              tone="emerald"
              sub={t.kpiDedupSub}
            />
          </div>

          {/* Main Workspace: DeckGL Map (8 cols) + Controls & Calendar (4 cols) */}
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
            {/* Left Column: Deck.gl WebGL Map */}
            <div
              className={cx(
                'rounded-xl overflow-hidden border border-line-strong/60 shadow-panel transition-all duration-300',
                isMapFullscreen
                  ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none bg-ink-950'
                  : 'h-[500px] lg:col-span-8 lg:h-[calc(100vh-190px)] min-h-[580px]'
              )}
            >
              <FireDeckMap
                lang={lang}
                worldCountriesGeojson={datasetState.data.worldCountries}
                countries={countries}
                selectedCountryId={selectedCountryId}
                onSelectCountry={(cid) => {
                  setSelectedCountryId(cid);
                  setSelectedPoint(null);
                }}
                basemapStyle={basemapStyle}
                onToggleBasemap={toggleBasemapStyle}
                globalPoints={filteredPoints}
                selectedGlobalPoint={selectedPoint}
                onSelectGlobalPoint={(pt) => setSelectedPoint(pt)}
                riskCells={fireRisk?.cells || []}
                riskHorizon={riskHorizon}
                multiHorizonSize={fireRisk?.multi_horizon_size}
                onScrambleRef={(fn) => {
                  scrambleMissionRef.current = fn;
                }}
              />
            </div>

            {/* Right Column: Filters & ECharts Regime Matrix */}
            <div className="flex flex-col gap-2.5 lg:col-span-4 lg:h-[calc(100vh-190px)] min-h-[580px] overflow-hidden">
              {/* Search & Filter Card */}
              <Card className="p-3 space-y-2.5 shrink-0 border-line-strong/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {t.filterHeading}
                  </span>
                  {(selectedCountryId != null ||
                    selectedContinent !== 'all' ||
                    filterType !== 'all' ||
                    searchQuery.trim().length > 0 ||
                    minConfidence !== 80 ||
                    vegetationOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        resetFilters();
                        setSelectedPoint(null);
                      }}
                      className="text-[11px] font-semibold text-cyan-300 hover:underline"
                    >
                      {t.resetFilters}
                    </button>
                  )}
                </div>

                {/* Search by country */}
                <div className="relative">
                  <Search
                    className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400"
                    aria-hidden="true"
                  />
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
                    <label
                      htmlFor="country-select"
                      className="mb-1 block text-[11px] font-medium text-slate-300"
                    >
                      {t.countryLabel}
                    </label>
                    <select
                      id="country-select"
                      value={selectedCountryId ?? 'all'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCountryId(val === 'all' ? null : Number(val));
                        setSelectedPoint(null);
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
                            {c.name} ({c.fires.toLocaleString('en-US')})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="continent-select"
                      className="mb-1 block text-[11px] font-medium text-slate-300"
                    >
                      {t.continentLabel}
                    </label>
                    <select
                      id="continent-select"
                      value={selectedContinent}
                      onChange={(e) => {
                        setSelectedContinent(e.target.value);
                        setSelectedCountryId(null);
                        setSelectedPoint(null);
                      }}
                      className="w-full rounded-lg border border-line-strong bg-ink-900 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      {CONTINENTS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category Filter Pills (clean text pills without icon clutter) */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
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
                      'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                      filterType === 'dual'
                        ? 'bg-emerald-400 text-ink-950 font-bold'
                        : 'border border-emerald-400/30 bg-ink-900 text-emerald-300 hover:bg-emerald-400/10',
                    )}
                  >
                    <span>{t.pillDual}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('high_frp')}
                    className={cx(
                      'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                      filterType === 'high_frp'
                        ? 'bg-rose-400 text-ink-950 font-bold'
                        : 'border border-rose-400/30 bg-ink-900 text-rose-300 hover:bg-rose-400/10',
                    )}
                  >
                    <span>{t.pillHighFrp}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVegetationOnly((v) => !v)}
                    className={cx(
                      'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                      vegetationOnly
                        ? 'bg-emerald-400 text-ink-950 font-bold'
                        : 'border border-line bg-ink-900 text-slate-300 hover:text-white',
                    )}
                  >
                    <span>Vegetation</span>
                  </button>
                </div>

                {vegetationOnly && vegetationError && (
                  <div className="text-[10px] text-rose-400 font-medium">
                    ⚠ {vegetationError}
                  </div>
                )}

                {/* Experimental Fire Risk Grid Horizon Controls */}
                {fireRisk && fireRisk.cells && fireRisk.cells.length > 0 && (
                  <div className="pt-2 border-t border-line space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-semibold text-amber-300 block">
                          Spread Projection
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Horizon ring targets
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {[
                          { h: 6 as const, label: '6h', color: 'border-rose-500 text-rose-400', active: 'bg-rose-500 text-white shadow-rose-500/30' },
                          { h: 12 as const, label: '12h', color: 'border-orange-500 text-orange-400', active: 'bg-orange-500 text-white shadow-orange-500/30' },
                          { h: 24 as const, label: '24h', color: 'border-emerald-500 text-emerald-400', active: 'bg-emerald-500 text-ink-950 shadow-emerald-500/30' },
                        ].map((item) => (
                          <button
                            key={item.h}
                            type="button"
                            onClick={() => setRiskHorizon(item.h)}
                            className={cx(
                              'px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all border',
                              riskHorizon === item.h
                                ? `${item.active} font-extrabold shadow-sm scale-105`
                                : `bg-ink-900 ${item.color} hover:bg-ink-800`,
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Multi-horizon Burn Size Milestone Badge */}
                    {fireRisk.multi_horizon_size?.[`${riskHorizon}h`] && (
                      <div className="rounded-lg border border-line bg-ink-900/80 p-2 text-[10px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            Expected Area ({riskHorizon}h):
                          </span>
                          <span className="font-mono font-bold text-amber-300">
                            {fireRisk.multi_horizon_size[`${riskHorizon}h`].expected_area_ha} ha
                            <span className="text-slate-400 font-normal ml-1">
                              ({fireRisk.multi_horizon_size[`${riskHorizon}h`].expected_area_km2} km²)
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-line/50 pt-1">
                          <span className="text-slate-400">
                            Milestone:
                          </span>
                          <span className="font-semibold text-rose-300">
                            {fireRisk.multi_horizon_size[`${riskHorizon}h`].threat_milestone}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Radix Slider for Confidence Filter */}
                <div className="pt-2 border-t border-line space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-300">
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

                  {/* Radix UI Slider Component */}
                  <div className="px-1 py-1">
                    <Slider.Root
                      className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
                      value={[minConfidence]}
                      onValueChange={(val) => setMinConfidence(val[0])}
                      max={100}
                      min={0}
                      step={1}
                      aria-label="Confidence threshold slider"
                    >
                      <Slider.Track className="bg-ink-800 relative grow rounded-full h-1.5 border border-line">
                        <Slider.Range className="absolute bg-emerald-400 rounded-full h-full" />
                      </Slider.Track>
                      <Slider.Thumb
                        className="block w-4 h-4 bg-emerald-300 shadow-lg rounded-full hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-grab active:cursor-grabbing"
                        aria-label="Confidence threshold"
                      />
                    </Slider.Root>
                  </div>

                  {/* Quick Presets */}
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
                </div>
              </Card>

              {/* Apache ECharts Fire Regime Heatmap */}
              <FireRegimeHeatmap
                lang={lang}
                calendarData={datasetState.data.calendar}
                initialRegion={
                  selectedCountry?.name === 'Vietnam'
                    ? 'Vietnam'
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

          {/* Floating Tactical Fire Detail Card */}
          <FireDetailDialog
            point={selectedPoint}
            country={activePointCountry}
            lang={lang}
            onClose={() => setSelectedPoint(null)}
            onFilterCountry={(cid) => {
              setSelectedCountryId(cid);
              if (minConfidence > 50) setMinConfidence(0);
            }}
            riskPersistence={
              fireRisk?.persistence_index
                ? fireRisk.persistence_index[String(riskHorizon)]
                : undefined
            }
            multiHorizonSize={fireRisk?.multi_horizon_size}
            initialHorizon={riskHorizon}
            onScramble={(pt) => {
              scrambleMissionRef.current?.(pt);
            }}
          />
        </>
      )}
    </div>
  );
}
