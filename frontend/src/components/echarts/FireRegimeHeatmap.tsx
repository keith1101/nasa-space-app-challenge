import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import * as Tabs from '@radix-ui/react-tabs';
import type { Language } from '../../lib/i18n';
import { TRANSLATIONS } from '../../lib/i18n';
import { displayPlace, fmtInt, fmtNum } from '../../lib/format';
import type { CalendarData, CalendarMonthlyRecord } from '../../types/harmonization';
import { Spinner, cx } from '../ui';

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_VI = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export interface FireRegimeHeatmapProps {
  lang: Language;
  calendarData: CalendarData | null;
  initialRegion?: string;
  className?: string;
}

export function FireRegimeHeatmap({
  lang,
  calendarData,
  initialRegion = 'Global (Worldwide)',
  className,
}: FireRegimeHeatmapProps) {
  const t = TRANSLATIONS[lang];
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);
  const [activeTab, setActiveTab] = useState<'matrix' | 'seasonal'>('matrix');

  useEffect(() => {
    if (initialRegion) {
      setSelectedRegion(initialRegion);
    }
  }, [initialRegion]);

  // Separate macro regions vs VN provinces
  const { macroKeys, vnKeys } = useMemo(() => {
    if (!calendarData) return { macroKeys: [], vnKeys: [] };
    const allKeys = Object.keys(calendarData);
    const macro = allKeys.filter((k) => calendarData[k]?.scope === 'global_macro_region');
    const vn = allKeys
      .filter((k) => calendarData[k]?.scope !== 'global_macro_region')
      .sort((a, b) => displayPlace(a).localeCompare(displayPlace(b)));
    return { macroKeys: macro, vnKeys: vn };
  }, [calendarData]);

  const activeData = calendarData
    ? calendarData[selectedRegion] ||
      calendarData['Global (Worldwide)'] ||
      calendarData[Object.keys(calendarData)[0]]
    : null;

  const records = activeData?.records ?? [];

  // ECharts Heatmap Option
  const heatmapOption = useMemo<EChartsOption>(() => {
    if (!records.length) return {};

    const months = lang === 'vi' ? MONTHS_VI : MONTHS_EN;
    const yearLabels = YEARS.map(String);

    // Prepare data items: [xIdx, yIdx, value] with custom metadata
    const data: Array<{ value: [number, number, number]; raw: CalendarMonthlyRecord }> = [];
    let maxVal = 10;

    for (const r of records) {
      const yIdx = YEARS.indexOf(r.year);
      const mIdx = r.month - 1;
      if (yIdx >= 0 && mIdx >= 0 && mIdx < 12) {
        data.push({
          value: [mIdx, yIdx, r.harmonized_count],
          raw: r,
        });
        if (r.harmonized_count > maxVal) {
          maxVal = r.harmonized_count;
        }
      }
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: '#070b14',
        borderColor: '#22385c',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: (params: any) => {
          const rec = params.data?.raw as CalendarMonthlyRecord | undefined;
          if (!rec) return '';
          const monthName = months[rec.month - 1];
          const isAnchor = rec.is_empirical_anchor;
          const statusBadge =
            rec.severity === 'extreme'
              ? '<span style="color:#fb7185;font-weight:bold;">⚡ Dị thường cực đoan</span>'
              : rec.severity === 'high'
              ? '<span style="color:#fbbf24;font-weight:bold;">▲ Cao hơn trung bình</span>'
              : '<span style="color:#38bdf8;">● Mức bình thường</span>';

          return `
            <div style="font-family: ui-sans-serif, system-ui; padding: 4px 6px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                <strong style="color: #38bdf8; font-size: 13px;">${monthName} ${rec.year}</strong>
                ${isAnchor ? '<span style="background: rgba(52, 211, 153, 0.2); color: #34d399; font-size: 10px; padding: 1px 4px; border-radius: 4px;">Quan trắc FIRMS</span>' : ''}
              </div>
              <div style="font-size: 11px; color: #cbd5e1; line-height: 1.5;">
                <div>Sự kiện cháy: <b style="color: #fff;">${fmtInt(rec.harmonized_count)}</b></div>
                <div>Khử trùng lặp: <b style="color: #34d399;">${fmtNum(rec.dedup_percent, 1)}%</b> (-${fmtInt(rec.dedup_savings)})</div>
                <div>Z-score: <b>${fmtNum(rec.z_score, 2)}σ</b> (TB: ${fmtInt(Math.round(rec.historical_mean))})</div>
                <div style="margin-top: 4px;">${statusBadge}</div>
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 20,
        bottom: 40,
        left: 45,
        right: 15,
      },
      xAxis: {
        type: 'category',
        data: months,
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.01)', 'rgba(0,0,0,0.15)'] } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#22385c' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: yearLabels,
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.01)', 'rgba(0,0,0,0.15)'] } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#22385c' } },
        axisTick: { show: false },
      },
      visualMap: {
        min: 0,
        max: maxVal,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 10,
        itemHeight: 120,
        text: ['Cao', 'Thấp'],
        textStyle: { color: '#64748b', fontSize: 10 },
        inRange: {
          color: ['#0b162c', '#0369a1', '#0284c7', '#f59e0b', '#ef4444', '#b91c1c'],
        },
      },
      series: [
        {
          name: 'Điểm cháy hợp nhất',
          type: 'heatmap',
          data: data as any,
          label: {
            show: false,
          },
          itemStyle: {
            borderColor: '#0a0f1d',
            borderWidth: 1,
            borderRadius: 2,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 8,
              shadowColor: 'rgba(56, 189, 248, 0.6)',
              borderColor: '#38bdf8',
              borderWidth: 1.5,
            },
          },
        },
      ],
    };
  }, [records, lang]);

  // ECharts 12-Month Seasonal Climatology Option
  const seasonalOption = useMemo<EChartsOption>(() => {
    if (!activeData?.baseline_by_month) return {};
    const months = lang === 'vi' ? MONTHS_VI : MONTHS_EN;
    const means: number[] = [];
    const lowerStd: number[] = [];
    const upperStd: number[] = [];

    for (let m = 1; m <= 12; m++) {
      const b = activeData.baseline_by_month[String(m)] || { mean: 0, std: 0 };
      const mean = Math.round(b.mean);
      means.push(mean);
      lowerStd.push(Math.max(0, Math.round(mean - b.std)));
      upperStd.push(Math.round(b.mean + b.std));
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#070b14',
        borderColor: '#22385c',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const mIdx = params[0].dataIndex;
          const monthName = months[mIdx];
          const mean = means[mIdx];
          const low = lowerStd[mIdx];
          const high = upperStd[mIdx];
          return `
            <div style="font-family: ui-sans-serif, system-ui; padding: 4px 6px;">
              <strong style="color: #38bdf8; font-size: 13px;">${monthName} · Chu kỳ mùa</strong>
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; line-height: 1.6;">
                <div>Trung bình lịch sử: <b style="color: #38bdf8;">${fmtInt(mean)}</b> sự kiện</div>
                <div>Dao động chuẩn (&plusmn;1&sigma;): <b>${fmtInt(low)} &ndash; ${fmtInt(high)}</b></div>
              </div>
            </div>
          `;
        },
      },
      grid: {
        top: 25,
        bottom: 25,
        left: 45,
        right: 15,
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#22385c' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#13233f', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: 'Trung bình lịch sử',
          type: 'bar',
          data: means,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#38bdf8' },
                { offset: 1, color: 'rgba(14, 165, 233, 0.2)' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [activeData, lang]);

  return (
    <div
      className={cx(
        'flex flex-col rounded-xl border border-line bg-ink-900 shadow-panel overflow-hidden',
        className,
      )}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-ink-850 px-3.5 py-2">
        <span className="text-xs font-bold text-white tracking-wide">
          {lang === 'vi' ? 'Ma Trận Chế Độ Cháy 2018–2026' : 'Wildfire Regime Matrix 2018–2026'}
        </span>

        {/* Region selector */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="rounded-md border border-line-strong bg-ink-950 px-2 py-1 text-xs text-white outline-none focus:border-cyan-400 max-w-[190px] truncate"
            aria-label={t.calendarRegionLabel}
          >
            {macroKeys.length > 0 && (
              <optgroup label={t.calendarMacroLabel}>
                {macroKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </optgroup>
            )}
            {vnKeys.length > 0 && (
              <optgroup label={t.calendarVnLabel}>
                {vnKeys.map((k) => (
                  <option key={k} value={k}>
                    {displayPlace(k)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Radix Tabs Navigation */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'matrix' | 'seasonal')}
        className="flex flex-col flex-1"
      >
        <div className="flex items-center justify-between border-b border-line/60 bg-ink-900/60 px-3.5 py-1.5">
          <Tabs.List className="flex items-center gap-1">
            <Tabs.Trigger
              value="matrix"
              className={cx(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                activeTab === 'matrix'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              <span>{t.calendarTabMatrix}</span>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="seasonal"
              className={cx(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                activeTab === 'seasonal'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              <span>{t.calendarTabSeasonal}</span>
            </Tabs.Trigger>
          </Tabs.List>

          <span className="text-[11px] text-slate-400">
            {activeData?.peak_season
              ? `${lang === 'vi' ? 'Đỉnh mùa:' : 'Peak:'} ${activeData.peak_season}`
              : 'Apache ECharts'}
          </span>
        </div>

        {/* Content Views */}
        <div className="relative flex-1 p-2">
          {!calendarData ? (
            <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
              <Spinner label={t.loadingMsg} />
              <p className="text-xs text-slate-400">{t.loadingSub}</p>
            </div>
          ) : (
            <>
              <Tabs.Content value="matrix" className="h-[230px] w-full outline-none">
                {activeTab === 'matrix' && (
                  <ReactECharts
                    key={`matrix-${selectedRegion}`}
                    option={heatmapOption}
                    style={{ height: '230px', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                    notMerge
                  />
                )}
              </Tabs.Content>

              <Tabs.Content value="seasonal" className="h-[230px] w-full outline-none">
                {activeTab === 'seasonal' && (
                  <ReactECharts
                    key={`seasonal-${selectedRegion}`}
                    option={seasonalOption}
                    style={{ height: '230px', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                    notMerge
                  />
                )}
              </Tabs.Content>
            </>
          )}
        </div>
      </Tabs.Root>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-line/60 bg-ink-950/60 px-3.5 py-1.5 text-[10px] text-slate-400">
        <span className="text-slate-400">
          {lang === 'vi'
            ? 'Mô hình bán thực nghiệm (FIRMS C6.1 / VIIRS)'
            : 'Semi-empirical model (FIRMS C6.1 / VIIRS)'}
        </span>
        <span className="font-mono text-slate-500">NASA EOSDIS · ECharts Engine</span>
      </div>
    </div>
  );
}
