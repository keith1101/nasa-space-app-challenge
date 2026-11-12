import { useId, useState } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { fmtDay, fmtInt, fmtNum, niceScale } from '../../lib/format';
import type { DailyBreakdownRecord } from '../../types/harmonization';

const COLORS = { modis: '#fb7185', viirs: '#fbbf24', fused: '#22d3ee' } as const;

/**
 * Grouped bars per UTC acquisition day: stacked raw detections (MODIS + VIIRS) next to the harmonized event count.
 * Partial days are hatched. Each day is a keyboard-focusable button.
 */
export function DailyBars({
  data,
  selectedDate,
  onSelect,
}: {
  data: DailyBreakdownRecord[];
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
}) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const uid = useId().replace(/:/g, '');

  const height = 280;
  const m = { l: 52, r: 12, t: 14, b: 40 };
  const w = Math.max(width, 280);
  const innerW = w - m.l - m.r;
  const innerH = height - m.t - m.b;
  const { max, ticks } = niceScale(Math.max(...data.map((d) => d.total_raw), 1), 5);
  const y = (v: number) => m.t + innerH - (v / max) * innerH;
  const band = innerW / Math.max(data.length, 1);
  const barW = Math.min(30, band * 0.36);
  const compact = w < 480;

  const activeRec = active !== null ? data[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(m.l + band * (active + 0.5), 130), w - 130) : 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      {width > 0 && (
        <svg
          width={w}
          height={height}
          role="group"
          aria-label="Daily detections: stacked raw MODIS and VIIRS counts next to harmonized event counts, per UTC day"
          className="block"
        >
          <defs>
            <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#070b14" strokeWidth="2.2" />
            </pattern>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="#1a2842" strokeWidth="1" />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400" fontSize="11" fontFamily="JetBrains Mono, monospace">
                {fmtInt(t)}
              </text>
            </g>
          ))}
          <text
            transform={`translate(13 ${m.t + innerH / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="11"
          >
            Detections per UTC day (count)
          </text>

          {data.map((d, i) => {
            const cx0 = m.l + band * (i + 0.5);
            const modisH = (d.modis_raw / max) * innerH;
            const viirsH = (d.viirs_raw / max) * innerH;
            const harmH = (d.harmonized_events / max) * innerH;
            const baseY = m.t + innerH;
            const selected = selectedDate === d.date;
            const label = `${fmtDay(d.date)}: ${d.total_raw} raw detections (${d.modis_raw} MODIS, ${d.viirs_raw} VIIRS), ${d.harmonized_events} harmonized events, ${d.dedup_rate_percent} percent removed${d.is_partial_day ? '. Partial day.' : ''}`;
            const leftX = cx0 - barW - 2;
            const rightX = cx0 + 2;
            return (
              <g
                key={d.date}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={label}
                className="cursor-pointer outline-none [&:focus-visible>rect.focus-ring]:stroke-cyan-300"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((a) => (a === i ? null : a))}
                onClick={() => onSelect(selected ? null : d.date)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(selected ? null : d.date);
                  }
                }}
              >
                <rect
                  className="focus-ring"
                  x={m.l + band * i + 2}
                  y={m.t}
                  width={band - 4}
                  height={innerH + 22}
                  rx="6"
                  fill={selected ? 'rgba(56,189,248,0.10)' : active === i ? 'rgba(148,163,184,0.07)' : 'transparent'}
                  stroke={selected ? '#38bdf8' : 'transparent'}
                  strokeWidth="1.5"
                />
                <rect x={leftX} y={baseY - modisH} width={barW} height={modisH} fill={COLORS.modis} />
                <rect x={leftX} y={baseY - modisH - viirsH} width={barW} height={viirsH} fill={COLORS.viirs} />
                <rect x={rightX} y={baseY - harmH} width={barW} height={harmH} fill={COLORS.fused} />
                {d.is_partial_day && (
                  <>
                    <rect x={leftX} y={baseY - modisH - viirsH} width={barW} height={modisH + viirsH} fill={`url(#${uid}-hatch)`} />
                    <rect x={rightX} y={baseY - harmH} width={barW} height={harmH} fill={`url(#${uid}-hatch)`} />
                  </>
                )}
                <text
                  x={cx0}
                  y={baseY + 16}
                  textAnchor="middle"
                  className={selected ? 'fill-cyan-200' : 'fill-slate-300'}
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {compact ? d.date.slice(8) : d.date.slice(5)}
                </text>
                {d.is_partial_day && (
                  <text x={cx0} y={baseY + 30} textAnchor="middle" className="fill-amber-300" fontSize="10" fontWeight="600">
                    partial
                  </text>
                )}
              </g>
            );
          })}
          <line x1={m.l} x2={w - m.r} y1={m.t + innerH} y2={m.t + innerH} stroke="#2a3d60" />
        </svg>
      )}

      {activeRec && (
        <div
          role="tooltip"
          style={{ left: tipLeft, top: 8 }}
          className="pointer-events-none absolute z-10 w-[240px] -translate-x-1/2 rounded-lg border border-line-strong bg-ink-850 p-3 text-xs shadow-pop"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-bold text-white">{fmtDay(activeRec.date)}, 2026 (UTC)</span>
            <span className="num text-emerald-300">−{fmtNum(activeRec.dedup_rate_percent, 1)}%</span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-slate-400">MODIS raw</dt>
            <dd className="num text-right text-rose-300">{fmtInt(activeRec.modis_raw)}</dd>
            <dt className="text-slate-400">VIIRS raw</dt>
            <dd className="num text-right text-amber-300">{fmtInt(activeRec.viirs_raw)}</dd>
            <dt className="text-slate-400">Harmonized events</dt>
            <dd className="num text-right text-cyan-300">{fmtInt(activeRec.harmonized_events)}</dd>
            <dt className="text-slate-400">Reconciled FRP</dt>
            <dd className="num text-right text-slate-100">{fmtNum(activeRec.total_frp_mw, 1)} MW</dd>
          </dl>
          <p className="mt-1.5 border-t border-line pt-1.5 text-[11px] leading-snug text-slate-400">{activeRec.coverage_note}</p>
        </div>
      )}

      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-slate-300" aria-label="Chart legend">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.modis }} /> MODIS raw detections
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.viirs }} /> VIIRS raw detections (stacked)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.fused }} /> Harmonized events
        </li>
        <li className="flex items-center gap-1.5">
          <span className="hatch h-2.5 w-2.5 rounded-sm bg-slate-600" /> Partial day
        </li>
      </ul>
    </div>
  );
}
