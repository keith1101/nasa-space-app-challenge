import { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Flame, Globe2, Info, MapPin, TrendingUp } from 'lucide-react';
import { displayPlace, fmtInt, fmtNum } from '../lib/format';
import type {
  CalendarData,
  CalendarMonthlyRecord,
  DailyBreakdownRecord,
} from '../types/harmonization';
import { DailyBars } from './charts/DailyBars';
import { Badge, Card, DataKindTag, Notice, PanelHeader, cx } from './ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

export interface CalendarHeatmapProps {
  calendarData: CalendarData;
  selectedProvince: string;
  onSelectProvince: (provinceKey: string) => void;
  dailyBreakdown: DailyBreakdownRecord[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

export function CalendarHeatmap({
  calendarData,
  selectedProvince,
  onSelectProvince,
  dailyBreakdown,
  selectedDate,
  onSelectDate,
}: CalendarHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<CalendarMonthlyRecord | null>(null);

  const { macroKeys, vnKeys } = useMemo(() => {
    const allKeys = Object.keys(calendarData);
    const macro = allKeys.filter((k) => calendarData[k]?.scope === 'global_macro_region');
    const vn = allKeys
      .filter((k) => calendarData[k]?.scope !== 'global_macro_region')
      .sort((a, b) => displayPlace(a).localeCompare(displayPlace(b)));
    return { macroKeys: macro, vnKeys: vn };
  }, [calendarData]);

  const activeRegion =
    calendarData[selectedProvince] ||
    calendarData['Global (Worldwide)'] ||
    calendarData[Object.keys(calendarData)[0]];

  const records = activeRegion?.records ?? [];
  const maxFireCount = useMemo(
    () => Math.max(...records.map((r) => r.harmonized_count), 10),
    [records],
  );

  const recordMap = useMemo(() => {
    const map: Record<string, CalendarMonthlyRecord> = {};
    for (const r of records) {
      map[`${r.year}-${r.month}`] = r;
    }
    return map;
  }, [records]);

  const defaultSelectedCell = useMemo(() => {
    return (
      recordMap['2026-11'] ||
      records.find((r) => r.severity === 'extreme' || r.severity === 'high') ||
      records[records.length - 1] ||
      null
    );
  }, [recordMap, records]);

  const activeCell = hoveredCell ?? defaultSelectedCell;

  const getCellColor = (count: number, severity: CalendarMonthlyRecord['severity']): string => {
    if (count === 0) return 'bg-ink-900/90 text-slate-500 border-line';
    const ratio = count / maxFireCount;
    if (severity === 'extreme' || ratio > 0.75) {
      return 'bg-rose-500/85 text-white border-rose-300 font-bold';
    }
    if (severity === 'high' || ratio > 0.5) {
      return 'bg-amber-500/80 text-ink-950 border-amber-300 font-semibold';
    }
    if (ratio > 0.25) {
      return 'bg-amber-400/35 text-amber-100 border-amber-400/50';
    }
    return 'bg-sky-500/20 text-sky-200 border-sky-400/35';
  };

  const isGlobalMacro = activeRegion?.scope === 'global_macro_region';

  return (
    <div className="space-y-4">
      {/* Empirical 7-Day Daily Breakdown Panel */}
      <Card aria-labelledby="daily-empirical-heading">
        <PanelHeader
          icon={Flame}
          eyebrow="Empirical Satellite Telemetry · Nov 3–10, 2026 (UTC)"
          title="Daily Sensor Redundancy & Harmonization Timeline"
          titleId="daily-empirical-heading"
          right={
            <>
              <DataKindTag kind="observed" detail="MODIS + VIIRS raw" />
              <DataKindTag kind="derived" detail="ST-DBSCAN events" />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => onSelectDate(null)}
                  className="rounded-md border border-cyan-400/40 bg-cyan-400/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/25"
                >
                  Clear date filter ({selectedDate})
                </button>
              )}
            </>
          }
        />
        <div className="p-4">
          <p className="mb-3 text-xs text-slate-300">
            Select any UTC acquisition day bar below to filter the geospatial map and metrics to that day.
            Notice <span className="font-mono text-amber-300">2026-11-10</span> is hatched because the NASA FIRMS
            pull concluded mid-day at ~07:13 UTC.
          </p>
          <DailyBars
            data={dailyBreakdown}
            selectedDate={selectedDate}
            onSelect={onSelectDate}
          />
        </div>
      </Card>

      {/* Climatological Reference Matrix (2018-2026) */}
      <Card aria-labelledby="climatology-heading">
        <PanelHeader
          icon={Calendar}
          eyebrow="Multi-Year Seasonal Context & Leave-One-Year-Out Jackknife Z-Scores"
          title={`Climatological Fire Regime Matrix — ${displayPlace(activeRegion?.province_name || selectedProvince)}`}
          titleId="climatology-heading"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <DataKindTag kind="simulated" detail="2018–2025 ENSO reference" />
              <DataKindTag kind="estimated" detail="Nov 2026 30-day scaled anchor" />
            </div>
          }
        />

        <div className="space-y-4 p-4">
          {/* Explicit Provenance & Simulation Disclosure Banner */}
          <Notice tone="warning" title="Data Provenance & Parametric Reference Disclosure">
            Empirical NASA FIRMS CSV archives in this repository cover <strong>November 3–10, 2026</strong>.
            In the matrix below, the <strong>November 2026 cell</strong> (<span className="font-mono text-cyan-300">EST</span>) is an
            <strong> estimated 30-day rate</strong> scaled from the observed FIRMS window, whereas all other 2018–2026 cells are generated by a
            <strong> deterministic parametric ENSO &amp; biome seasonality reference model</strong> (`seed=42`) to illustrate Leave-One-Year-Out Jackknife Z-score anomaly detection.
          </Notice>

          {/* Region Selector + Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-900/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                {isGlobalMacro ? (
                  <Globe2 className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                ) : (
                  <MapPin className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                )}
                Inspect Region or Province:
              </span>
              <select
                aria-label="Select macro-region or Vietnam province for climatological matrix"
                value={selectedProvince}
                onChange={(e) => onSelectProvince(e.target.value)}
                className="rounded-lg border border-line-strong bg-ink-950 px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-cyan-400"
              >
                <optgroup label="Global Macro-Regions (7 Fire Biomes)">
                  {macroKeys.map((k) => (
                    <option key={k} value={k}>
                      {displayPlace(k)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Vietnam Provinces (63 Administrative Units)">
                  {vnKeys.map((k) => (
                    <option key={k} value={k}>
                      {displayPlace(k)} Province ({calendarData[k]?.peak_season})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="amber">Peak window: {activeRegion?.peak_season}</Badge>
              {typeof activeRegion?.observed_7d_harmonized === 'number' && (
                <Badge tone="cyan">
                  Observed 7d harmonized: {fmtInt(activeRegion.observed_7d_harmonized)} events
                </Badge>
              )}
            </div>
          </div>

          {activeRegion?.description && (
            <p className="text-xs leading-relaxed text-slate-300">{activeRegion.description}</p>
          )}

          {/* Matrix Grid + Selected Cell Inspector */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {/* 9x12 Matrix Table */}
            <div className="overflow-x-auto xl:col-span-8">
              <div className="min-w-[560px]">
                <div className="mb-1.5 grid grid-cols-[44px_repeat(12,minmax(0,1fr))] gap-1 text-center font-mono text-[11px] font-semibold text-slate-400">
                  <div className="text-left">Year</div>
                  {MONTHS.map((m) => (
                    <div key={m}>{m}</div>
                  ))}
                </div>

                <div className="space-y-1" role="grid" aria-label="Monthly fire activity matrix from 2018 to 2026">
                  {YEARS.map((year) => (
                    <div key={year} role="row" className="grid grid-cols-[44px_repeat(12,minmax(0,1fr))] items-center gap-1">
                      <div
                        role="rowheader"
                        className="font-mono text-xs font-bold text-slate-300"
                      >
                        {year}
                      </div>
                      {MONTHS.map((monthName, idx) => {
                        const monthNum = idx + 1;
                        const rec = recordMap[`${year}-${monthNum}`];
                        if (!rec) {
                          return (
                            <div
                              key={monthNum}
                              role="gridcell"
                              className="h-8 rounded border border-line bg-ink-900/40"
                            />
                          );
                        }
                        const isSelected =
                          activeCell?.year === rec.year && activeCell?.month === rec.month;
                        const isEmpirical = Boolean(rec.is_empirical_anchor);
                        return (
                          <button
                            key={monthNum}
                            type="button"
                            role="gridcell"
                            aria-label={`${monthName} ${year}: ${rec.harmonized_count} harmonized events, Z-score ${rec.z_score >= 0 ? '+' : ''}${rec.z_score} sigma (${isEmpirical ? 'Estimated from 7-day FIRMS observation' : 'Simulated climatological reference'})`}
                            onMouseEnter={() => setHoveredCell(rec)}
                            onFocus={() => setHoveredCell(rec)}
                            onClick={() => setHoveredCell(rec)}
                            className={cx(
                              'relative flex h-8 items-center justify-center rounded border font-mono text-[11px] transition-transform',
                              getCellColor(rec.harmonized_count, rec.severity),
                              isEmpirical && 'ring-2 ring-cyan-300',
                              isSelected && 'scale-105 z-10 ring-2 ring-white',
                              !isEmpirical && 'hatch',
                            )}
                          >
                            <span>{rec.harmonized_count}</span>
                            {rec.is_year_peak && (
                              <span
                                className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-white"
                                title="Annual peak month"
                              />
                            )}
                            {isEmpirical && (
                              <span
                                className="absolute -top-1.5 left-0.5 rounded bg-cyan-400 px-1 text-[8px] font-extrabold leading-tight text-ink-950"
                                title="Scaled 30-day estimate anchored to 7-day empirical FIRMS telemetry"
                              >
                                EST
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-[11px] text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded border border-sky-400/40 bg-sky-500/20" /> Low
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded border border-amber-400/50 bg-amber-400/35" /> Moderate
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded border border-amber-300 bg-amber-500/80" /> Elevated (&gt; +1σ)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded border border-rose-300 bg-rose-500/85" /> Severe Anomaly (&gt; +2σ)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-white" /> Annual Peak
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <span className="rounded bg-cyan-400 px-1 font-mono text-[9px] font-bold text-ink-950">EST</span> Nov 2026 Empirical Anchor
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Cell Inspector */}
            <div className="xl:col-span-4">
              {activeCell ? (
                <div className="flex h-full flex-col justify-between rounded-xl border border-line-strong bg-ink-900/90 p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b border-line pb-2.5">
                      <div>
                        <div className="eyebrow">Selected Month Inspector</div>
                        <h3 className="text-base font-bold text-white">
                          {MONTHS[activeCell.month - 1]} {activeCell.year}
                        </h3>
                      </div>
                      <DataKindTag
                        kind={activeCell.is_empirical_anchor ? 'estimated' : 'simulated'}
                        detail={activeCell.is_empirical_anchor ? '7d FIRMS scaled' : 'ENSO model'}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-lg border border-line bg-ink-800/90 p-2.5">
                        <div className="text-[11px] text-slate-400">Harmonized Events</div>
                        <div className="num mt-0.5 text-xl font-bold text-cyan-300">
                          {fmtInt(activeCell.harmonized_count)}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          Raw: {fmtInt(activeCell.modis_count + activeCell.viirs_count)} (−{fmtNum(activeCell.dedup_percent, 1)}%)
                        </div>
                      </div>

                      <div className="rounded-lg border border-line bg-ink-800/90 p-2.5">
                        <div className="text-[11px] text-slate-400">Jackknife Z-Score</div>
                        <div
                          className={cx(
                            'num mt-0.5 flex items-center gap-1 text-xl font-bold',
                            activeCell.z_score > 2
                              ? 'text-rose-300'
                              : activeCell.z_score > 1
                                ? 'text-amber-300'
                                : 'text-emerald-300',
                          )}
                        >
                          <TrendingUp className="h-4 w-4" aria-hidden="true" />
                          {activeCell.z_score >= 0 ? `+${fmtNum(activeCell.z_score, 2)}` : fmtNum(activeCell.z_score, 2)}σ
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          Out-of-fold μ = {fmtNum(activeCell.historical_mean, 1)}, σ = {fmtNum(activeCell.historical_std, 1)}
                        </div>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg border border-line bg-ink-950/70 p-3 text-xs">
                      <dt className="text-slate-400">MODIS (1 km)</dt>
                      <dd className="num text-right font-semibold text-rose-300">
                        {fmtInt(activeCell.modis_count)}
                      </dd>
                      <dt className="text-slate-400">VIIRS (375 m)</dt>
                      <dd className="num text-right font-semibold text-amber-300">
                        {fmtInt(activeCell.viirs_count)}
                      </dd>
                      <dt className="text-slate-400">Duplicates Removed</dt>
                      <dd className="num text-right font-semibold text-emerald-300">
                        −{fmtInt(activeCell.dedup_savings)} ({fmtNum(activeCell.dedup_percent, 1)}%)
                      </dd>
                      <dt className="text-slate-400">Regime Status</dt>
                      <dd className="text-right font-semibold text-white">{activeCell.status}</dd>
                    </dl>
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-ink-850 p-2.5 text-[11px] text-slate-300">
                    {activeCell.z_score > 1.5 ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    ) : (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                    )}
                    <span>
                      Z-score is computed via Leave-One-Year-Out Jackknife baseline (excluding{' '}
                      <span className="font-mono text-white">{activeCell.year}</span> from reference mean and
                      standard deviation) to prevent self-inclusion attenuation.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
