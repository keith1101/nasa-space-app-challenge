import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Flame,
  Globe2,
  Info,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { displayPlace, fmtInt, fmtNum } from '../lib/format';
import type { Language } from '../lib/i18n';
import { TRANSLATIONS } from '../lib/i18n';
import type {
  CalendarData,
  CalendarMonthlyRecord,
} from '../types/harmonization';
import { Card, cx } from './ui';

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

export interface FireCalendarCardProps {
  lang: Language;
  calendarData: CalendarData;
  initialRegion?: string;
  className?: string;
}

export function FireCalendarCard({
  lang,
  calendarData,
  initialRegion = 'Global (Worldwide)',
  className,
}: FireCalendarCardProps) {
  const t = TRANSLATIONS[lang];
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);
  const [activeTab, setActiveTab] = useState<'matrix' | 'seasonal'>('matrix');
  const [hoveredCell, setHoveredCell] = useState<CalendarMonthlyRecord | null>(null);

  // Separate macro regions vs VN provinces
  const { macroKeys, vnKeys } = useMemo(() => {
    const allKeys = Object.keys(calendarData);
    const macro = allKeys.filter((k) => calendarData[k]?.scope === 'global_macro_region');
    const vn = allKeys
      .filter((k) => calendarData[k]?.scope !== 'global_macro_region')
      .sort((a, b) => displayPlace(a).localeCompare(displayPlace(b)));
    return { macroKeys: macro, vnKeys: vn };
  }, [calendarData]);

  const activeData =
    calendarData[selectedRegion] ||
    calendarData['Global (Worldwide)'] ||
    calendarData[Object.keys(calendarData)[0]];

  const records = activeData?.records ?? [];

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

  // Default selected cell is Nov 2026 (the active FIRMS anchor)
  const defaultSelectedCell = useMemo(() => {
    return (
      recordMap['2026-11'] ||
      records.find((r) => r.is_year_peak) ||
      records[records.length - 1] ||
      null
    );
  }, [recordMap, records]);

  const activeCell = hoveredCell ?? defaultSelectedCell;

  const getCellColor = (count: number, severity: CalendarMonthlyRecord['severity']): string => {
    if (count === 0) return 'bg-ink-950/80 text-slate-600 border-line/30';
    const ratio = count / maxFireCount;
    if (severity === 'extreme' || ratio > 0.75) {
      return 'bg-rose-500/90 text-white border-rose-300 font-bold';
    }
    if (severity === 'high' || ratio > 0.5) {
      return 'bg-amber-500/85 text-ink-950 border-amber-300 font-bold';
    }
    if (ratio > 0.25) {
      return 'bg-amber-400/35 text-amber-200 border-amber-400/50';
    }
    return 'bg-sky-500/25 text-sky-200 border-sky-400/40';
  };

  const isGlobalMacro = activeData?.scope === 'global_macro_region';

  // 12-month baseline data for seasonal bar chart
  const seasonalBars = useMemo(() => {
    if (!activeData?.baseline_by_month) return [];
    const arr = [];
    let maxMean = 1;
    for (let m = 1; m <= 12; m++) {
      const val = activeData.baseline_by_month[String(m)]?.mean || 0;
      if (val > maxMean) maxMean = val;
    }
    for (let m = 1; m <= 12; m++) {
      const val = activeData.baseline_by_month[String(m)]?.mean || 0;
      const std = activeData.baseline_by_month[String(m)]?.std || 0;
      arr.push({
        month: m,
        name: t.calendarMonthNames[m - 1],
        mean: val,
        std,
        heightPct: Math.max(8, Math.round((val / maxMean) * 100)),
      });
    }
    return arr;
  }, [activeData, t]);

  return (
    <Card className={cx('flex flex-col min-h-0 overflow-hidden', className)}>
      {/* Header Bar */}
      <div className="border-b border-line px-3.5 py-2.5 bg-ink-850/70 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
            <Calendar className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
            <span>{t.calendarHeading}</span>
          </div>

          {/* View mode toggle */}
          <div className="flex rounded-md border border-line bg-ink-900 p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={cx(
                'rounded px-2 py-0.5 font-semibold transition-colors',
                activeTab === 'matrix'
                  ? 'bg-amber-400 text-ink-950 font-bold'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              {t.calendarTabMatrix}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seasonal')}
              className={cx(
                'rounded px-2 py-0.5 font-semibold transition-colors',
                activeTab === 'seasonal'
                  ? 'bg-amber-400 text-ink-950 font-bold'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              {t.calendarTabSeasonal}
            </button>
          </div>
        </div>

        {/* Region / Biome Selector */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setHoveredCell(null);
              }}
              className="w-full rounded-lg border border-line-strong bg-ink-900 px-2 py-1 text-xs font-semibold text-white outline-none focus:border-amber-400"
            >
              <optgroup label={t.calendarMacroLabel}>
                {macroKeys.map((k) => (
                  <option key={k} value={k}>
                    {k === 'Global (Worldwide)' ? `🌐 ${k}` : `🌍 ${k}`}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t.calendarVnLabel}>
                {vnKeys.map((k) => (
                  <option key={k} value={k}>
                    📍 {displayPlace(k)}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {activeData?.peak_season && (
            <span
              className="shrink-0 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-300"
              title={activeData.peak_season}
            >
              🔥 {t.calendarPeakSeason(activeData.peak_season)}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area (Scrollable if needed) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'matrix' ? (
          /* TAB 1: 2018–2026 Monthly Matrix */
          <div className="space-y-2">
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[340px]">
                {/* Column Month Headers */}
                <div className="grid grid-cols-[38px_repeat(12,minmax(0,1fr))] gap-1 text-center font-mono text-[10px] font-bold text-slate-400 mb-1">
                  <div className="text-left pl-1">{t.calendarYearHeader}</div>
                  {t.calendarMonthNames.map((m) => (
                    <div key={m}>{m}</div>
                  ))}
                </div>

                {/* 9 Years Rows (2018 to 2026) */}
                <div className="space-y-1">
                  {YEARS.map((year) => (
                    <div
                      key={year}
                      className="grid grid-cols-[38px_repeat(12,minmax(0,1fr))] items-center gap-1"
                    >
                      <div className="font-mono text-[10px] font-bold text-slate-400 pl-1">
                        {year}
                      </div>

                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                        const rec = recordMap[`${year}-${m}`];
                        if (!rec) {
                          return (
                            <div
                              key={m}
                              className="h-6 rounded border border-line/30 bg-ink-950/40"
                            />
                          );
                        }

                        const isSelected =
                          activeCell?.year === rec.year && activeCell?.month === rec.month;
                        const isEmpirical = Boolean(rec.is_empirical_anchor);

                        return (
                          <button
                            key={m}
                            type="button"
                            onMouseEnter={() => setHoveredCell(rec)}
                            onClick={() => setHoveredCell(rec)}
                            title={`${t.calendarMonthNames[m - 1]} ${year}: ${fmtInt(rec.harmonized_count)} ${lang === 'vi' ? 'điểm cháy' : 'events'} (${rec.z_score >= 0 ? '+' : ''}${rec.z_score.toFixed(1)}σ)`}
                            className={cx(
                              'relative flex h-6 items-center justify-center rounded border font-mono text-[9px] transition-all cursor-pointer',
                              getCellColor(rec.harmonized_count, rec.severity),
                              isEmpirical && 'ring-1.5 ring-cyan-300 font-bold',
                              isSelected
                                ? 'scale-110 z-20 ring-2 ring-white shadow-lg'
                                : 'hover:scale-105 hover:z-10',
                            )}
                          >
                            {/* Peak month dot */}
                            {rec.is_year_peak && (
                              <span
                                className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-white ring-1 ring-ink-950"
                                title="Peak"
                              />
                            )}

                            {/* Small EST label for empirical anchor */}
                            {isEmpirical && (
                              <span className="absolute -top-1.5 -left-1 rounded bg-cyan-400 px-0.5 text-[7px] font-extrabold text-ink-950 leading-none">
                                EST
                              </span>
                            )}

                            <span className="truncate px-0.5">
                              {rec.harmonized_count >= 1000
                                ? `${Math.round(rec.harmonized_count / 1000)}k`
                                : rec.harmonized_count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-line/70 pt-2 text-[10px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded border border-sky-400/40 bg-sky-500/25" />
                  {t.calendarLegendLow}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded border border-amber-400/50 bg-amber-400/35" />
                  {t.calendarLegendMod}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded border border-amber-300 bg-amber-500/85" />
                  {t.calendarLegendElevated}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded border border-rose-300 bg-rose-500/90" />
                  {t.calendarLegendSevere}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="flex items-center gap-1 text-cyan-300">
                  <span className="rounded bg-cyan-400 px-1 font-mono text-[8px] font-bold text-ink-950">
                    EST
                  </span>
                  {lang === 'vi' ? 'Số liệu FIRMS' : 'FIRMS Actual'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: 12-Month Seasonal Profile Bar Chart */
          <div className="space-y-3">
            <div className="text-[11px] text-slate-300 flex items-center justify-between">
              <span>{t.calendarSeasonalAvg}</span>
              <span className="text-amber-300 font-semibold">{activeData?.peak_season}</span>
            </div>

            <div className="h-40 flex items-end gap-1.5 pt-4 pb-2 border-b border-line">
              {seasonalBars.map((b) => {
                const isSelected = activeCell?.month === b.month;
                return (
                  <div
                    key={b.month}
                    onClick={() => {
                      // find rec for this month in latest year
                      const rec = recordMap[`2026-${b.month}`] || recordMap[`2025-${b.month}`];
                      if (rec) setHoveredCell(rec);
                    }}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-pointer group"
                  >
                    <div className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {b.mean >= 1000 ? `${Math.round(b.mean / 1000)}k` : Math.round(b.mean)}
                    </div>
                    <div
                      style={{ height: `${b.heightPct}%` }}
                      className={cx(
                        'w-full rounded-t transition-all',
                        isSelected
                          ? 'bg-cyan-400 ring-2 ring-white shadow-lg'
                          : b.heightPct > 70
                          ? 'bg-rose-500 group-hover:bg-rose-400'
                          : b.heightPct > 40
                          ? 'bg-amber-400 group-hover:bg-amber-300'
                          : 'bg-sky-500/60 group-hover:bg-sky-400',
                      )}
                    />
                    <span
                      className={cx(
                        'text-[10px] font-mono font-semibold',
                        isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400',
                      )}
                    >
                      {b.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Month Inspector Panel */}
        {activeCell && (
          <div className="rounded-lg border border-line-strong bg-ink-900/90 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-line pb-1.5">
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-bold text-white text-xs">
                  {t.calendarSelectedMonth(activeCell.month, activeCell.year)}
                </span>
                {activeCell.is_empirical_anchor && (
                  <span className="rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 px-1 py-0.2 text-[9px] font-bold">
                    {t.calendarEstBadge}
                  </span>
                )}
              </div>

              <div
                className={cx(
                  'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold flex items-center gap-1',
                  activeCell.z_score > 2
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : activeCell.z_score > 1
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
                )}
              >
                <TrendingUp className="h-3 w-3" />
                <span>
                  {activeCell.z_score >= 0 ? `+${fmtNum(activeCell.z_score, 2)}` : fmtNum(activeCell.z_score, 2)}σ
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-line bg-ink-850 p-2">
                <div className="text-[10px] text-slate-400">
                  {lang === 'vi' ? 'Điểm cháy đã gộp' : 'Harmonized Events'}
                </div>
                <div className="font-mono text-sm font-bold text-cyan-300 mt-0.5">
                  {fmtInt(activeCell.harmonized_count)}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Raw: {fmtInt(activeCell.modis_count + activeCell.viirs_count)} ({t.calendarDedupSaving(activeCell.dedup_percent)})
                </div>
              </div>

              <div className="rounded border border-line bg-ink-850 p-2">
                <div className="text-[10px] text-slate-400">
                  {lang === 'vi' ? 'Độ lệch chuẩn & Trạng thái' : 'Deviation & Status'}
                </div>
                <div
                  className={cx(
                    'font-semibold text-xs mt-0.5',
                    activeCell.z_score > 2
                      ? 'text-rose-400 font-bold'
                      : activeCell.z_score > 1
                      ? 'text-amber-400 font-bold'
                      : 'text-emerald-400',
                  )}
                >
                  {activeCell.z_score > 2
                    ? t.calendarStatusSevere
                    : activeCell.z_score > 1
                    ? t.calendarStatusElevated
                    : t.calendarStatusNormal}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  μ = {fmtNum(activeCell.historical_mean, 1)}, σ = {fmtNum(activeCell.historical_std, 1)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Small Notice */}
        <p className="text-[10px] text-slate-500 leading-tight">
          ℹ️ {t.calendarSimulatedNotice}
        </p>
      </div>
    </Card>
  );
}
