import { useMemo, useState, type MouseEvent } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { displayPlace, fmtNum } from '../../lib/format';
import type { ClusterClassification, GeoJsonFeature, HarmonizedFireProperties } from '../../types/harmonization';

const CLASS_META: Record<ClusterClassification, { label: string; color: string }> = {
  HARMONIZED_DUAL: { label: 'Dual-sensor (MODIS + VIIRS)', color: '#22d3ee' },
  VIIRS_EXCLUSIVE: { label: 'VIIRS only', color: '#fbbf24' },
  MODIS_EXCLUSIVE: { label: 'MODIS only', color: '#fb7185' },
};

/** Fused confidence versus reconciled FRP for each harmonized event (log-scaled FRP axis). */
export function ConfidenceScatter({ features }: { features: Array<GeoJsonFeature<HarmonizedFireProperties>> }) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo(
    () =>
      features
        .map((f) => ({ frp: Math.max(f.properties.harmonized_frp, 0.1), conf: f.properties.harmonized_confidence, p: f.properties }))
        .filter((d) => Number.isFinite(d.frp) && Number.isFinite(d.conf)),
    [features],
  );

  const height = 300;
  const m = { l: 52, r: 14, t: 12, b: 44 };
  const w = Math.max(width, 280);
  const innerW = w - m.l - m.r;
  const innerH = height - m.t - m.b;

  const maxFrp = Math.max(...points.map((d) => d.frp), 10);
  const logMin = -1; // 0.1 MW
  const logMax = Math.ceil(Math.log10(maxFrp));
  const x = (v: number) => m.l + ((Math.log10(v) - logMin) / (logMax - logMin)) * innerW;
  const y = (v: number) => m.t + innerH - (v / 100) * innerH;
  const xTicks: number[] = [];
  for (let e = logMin; e <= logMax; e++) xTicks.push(Math.pow(10, e));

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best = -1;
    let bestD = 12 * 12;
    points.forEach((d, i) => {
      const dx = x(d.frp) - mx;
      const dy = y(d.conf) - my;
      const dist = dx * dx + dy * dy;
      if (dist < bestD) {
        bestD = dist;
        best = i;
      }
    });
    setHover(best >= 0 ? best : null);
  };

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      {width > 0 && (
        <svg
          width={w}
          height={height}
          role="img"
          aria-label={`Scatter plot of fused confidence versus reconciled fire radiative power for ${points.length} harmonized events`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          className="block"
        >
          {[0, 20, 40, 60, 80, 100].map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="#1a2842" />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400" fontSize="11" fontFamily="JetBrains Mono, monospace">
                {t}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={m.t} y2={m.t + innerH} stroke="#1a2842" />
              <text x={x(t)} y={m.t + innerH + 16} textAnchor="middle" className="fill-slate-400" fontSize="11" fontFamily="JetBrains Mono, monospace">
                {t >= 1 ? t.toLocaleString('en-US') : t}
              </text>
            </g>
          ))}
          <text x={m.l + innerW / 2} y={height - 6} textAnchor="middle" className="fill-slate-400" fontSize="11">
            Reconciled fire radiative power (MW, log scale)
          </text>
          <text transform={`translate(13 ${m.t + innerH / 2}) rotate(-90)`} textAnchor="middle" className="fill-slate-400" fontSize="11">
            Fused confidence (%)
          </text>

          {(Object.keys(CLASS_META) as ClusterClassification[]).map((cls) =>
            points.map((d, i) =>
              d.p.classification === cls ? (
                <circle
                  key={`${cls}-${i}`}
                  cx={x(d.frp)}
                  cy={y(d.conf)}
                  r={hover === i ? 5.5 : cls === 'HARMONIZED_DUAL' ? 4 : 3}
                  fill={CLASS_META[cls].color}
                  fillOpacity={hover === i ? 1 : 0.55}
                  stroke={hover === i ? '#ffffff' : 'none'}
                />
              ) : null,
            ),
          )}
        </svg>
      )}

      {hovered && (
        <div
          role="tooltip"
          style={{ left: Math.min(Math.max(x(hovered.frp), 120), w - 120), top: Math.max(y(hovered.conf) - 118, 4) }}
          className="pointer-events-none absolute z-10 w-[228px] -translate-x-1/2 rounded-lg border border-line-strong bg-ink-850 p-3 text-xs shadow-pop"
        >
          <div className="mb-1 font-bold text-white">{CLASS_META[hovered.p.classification].label}</div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-slate-400">Fused confidence</dt>
            <dd className="num text-right text-white">{fmtNum(hovered.conf, 1)}%</dd>
            <dt className="text-slate-400">Reconciled FRP</dt>
            <dd className="num text-right text-white">{fmtNum(hovered.p.harmonized_frp, 1)} MW</dd>
            <dt className="text-slate-400">Raw hits fused</dt>
            <dd className="num text-right text-white">{hovered.p.raw_count}</dd>
            <dt className="text-slate-400">Region</dt>
            <dd className="text-right text-white">{displayPlace(hovered.p.province)}</dd>
          </dl>
        </div>
      )}

      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-slate-300" aria-label="Chart legend">
        {(Object.keys(CLASS_META) as ClusterClassification[]).map((cls) => (
          <li key={cls} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASS_META[cls].color }} />
            {CLASS_META[cls].label}
          </li>
        ))}
      </ul>
    </div>
  );
}
