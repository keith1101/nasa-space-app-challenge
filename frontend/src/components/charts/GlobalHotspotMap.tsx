import { useEffect, useRef } from 'react';
import { useElementWidth } from '../../hooks/useElementWidth';
import { fmtInt } from '../../lib/format';
import type { GlobalCatalog } from '../../types/harmonization';

const LAT_MIN = -60;
const LAT_MAX = 80;
const PAD = { l: 34, r: 8, t: 8, b: 20 };

/** Colour for fire radiative power on a log scale (warm = more radiant). */
function frpColor(frp: number): string {
  const t = Math.min(1, Math.max(0, (Math.log10(Math.max(frp, 0.1)) + 1) / 3.5));
  const r = Math.round(180 + 75 * t);
  const g = Math.round(60 + 150 * t * t);
  const b = Math.round(30 + 90 * t * t * t);
  return `rgba(${r},${g},${b},${0.28 + 0.4 * t})`;
}

/** Equirectangular density plot of the 24-hour global snapshot (fused event centroids). */
export function GlobalHotspotMap({ catalog }: { catalog: GlobalCatalog }) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const plotW = Math.max(width - PAD.l - PAD.r, 100);
  const plotH = Math.round((plotW * (LAT_MAX - LAT_MIN)) / 360);
  const height = plotH + PAD.t + PAD.b;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const gx = (lon: number) => PAD.l + ((lon + 180) / 360) * plotW;
    const gy = (lat: number) => PAD.t + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * plotH;

    // Plot area
    ctx.fillStyle = '#060a13';
    ctx.fillRect(PAD.l, PAD.t, plotW, plotH);

    // Graticule and axis labels
    ctx.strokeStyle = 'rgba(42,61,96,0.55)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let lon = -180; lon <= 180; lon += 60) {
      ctx.beginPath();
      ctx.moveTo(gx(lon), PAD.t);
      ctx.lineTo(gx(lon), PAD.t + plotH);
      ctx.stroke();
      ctx.fillText(lon === 0 ? '0°' : `${Math.abs(lon)}°${lon < 0 ? 'W' : 'E'}`, gx(lon), PAD.t + plotH + 14);
    }
    ctx.textAlign = 'right';
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      ctx.moveTo(PAD.l, gy(lat));
      ctx.lineTo(PAD.l + plotW, gy(lat));
      ctx.stroke();
      ctx.fillText(lat === 0 ? '0°' : `${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'}`, PAD.l - 5, gy(lat) + 3);
    }

    // Events, additive blending so dense regions glow
    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD.l, PAD.t, plotW, plotH);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const size = plotW > 700 ? 1.6 : 1.3;
    for (const [lat, lon, frp, , isDual] of catalog.harmonized_points) {
      if (isDual) continue;
      ctx.fillStyle = frpColor(frp);
      ctx.fillRect(gx(lon) - size / 2, gy(lat) - size / 2, size, size);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(34,211,238,0.95)';
    for (const [lat, lon, , , isDual] of catalog.harmonized_points) {
      if (!isDual) continue;
      ctx.beginPath();
      ctx.arc(gx(lon), gy(lat), 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = '#2a3d60';
    ctx.strokeRect(PAD.l + 0.5, PAD.t + 0.5, plotW, plotH);
  }, [catalog, width, height, plotW, plotH]);

  return (
    <figure className="w-full">
      <div ref={wrapRef} className="w-full">
        {width > 0 && (
          <canvas
            ref={canvasRef}
            style={{ width, height }}
            role="img"
            aria-label={`Global map of ${fmtInt(catalog.total_harmonized)} harmonized fire events detected in a 24-hour snapshot, with ${fmtInt(catalog.dual_confirmed_count)} confirmed by both MODIS and VIIRS`}
            className="block rounded-md"
          />
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-slate-300">
        <span className="flex items-center gap-1.5">
          Fused event, radiative power:
          <span
            className="inline-block h-2 w-20 rounded-sm"
            style={{ background: 'linear-gradient(90deg, rgb(180,60,30), rgb(230,120,40), rgb(255,210,120))' }}
            aria-hidden="true"
          />
          <span className="text-slate-400">low → high (log scale)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> Dual-sensor (MODIS + VIIRS)
        </span>
        <span className="text-slate-400">Equirectangular projection, 60°S to 80°N</span>
      </figcaption>
    </figure>
  );
}
