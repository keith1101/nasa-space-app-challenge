import React, { useEffect, useRef, useState } from 'react';
import { Activity, Crosshair } from 'lucide-react';
import { SpectralPoint } from '../types';

interface SpectralProfileProps {
  spectralProfile?: SpectralPoint[];
  currentChannelId: number;
  onSelectChannel: (channelId: number) => void;
  imageBase64?: string;
  wcs?: { crval: [number, number]; cdelt: [number, number] };
  onPickCoordinate?: (ra: number, dec: number) => void;
  ra?: number;
  dec?: number;
}

const Picker: React.FC<Pick<SpectralProfileProps, 'imageBase64' | 'wcs' | 'onPickCoordinate' | 'ra' | 'dec'>> = ({ imageBase64, wcs, onPickCoordinate, ra, dec }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!imageBase64) return;
    const image = new Image();
    image.onload = () => { imageRef.current = image; render(); };
    image.src = imageBase64;
    return () => { image.onload = null; };
  }, [imageBase64]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  const render = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !size.width || !size.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr; canvas.height = size.height * dpr;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#03050b'; ctx.fillRect(0, 0, size.width, size.height);
    const scale = Math.min(size.width / image.naturalWidth, size.height / image.naturalHeight);
    const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
    const left = (size.width - width) / 2; const top = (size.height - height) / 2;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(image, left, top, width, height);
    if (wcs && typeof ra === 'number' && typeof dec === 'number') {
      const x = left + ((ra - wcs.crval[0]) / wcs.cdelt[0] + 64) * scale;
      const y = top + ((dec - wcs.crval[1]) / wcs.cdelt[1] + 64) * scale;
      ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
    }
  };
  useEffect(() => { render(); }, [size, imageBase64, wcs, ra, dec]);
  return <canvas ref={canvasRef} aria-label="Clickable sky cutout for spectral coordinate selection" className="h-full w-full cursor-crosshair" onClick={(event) => {
    if (!wcs || !onPickCoordinate || !imageRef.current) return;
    const image = imageRef.current; const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const left = (rect.width - image.naturalWidth * scale) / 2; const top = (rect.height - image.naturalHeight * scale) / 2;
    const px = (event.clientX - rect.left - left) / scale; const py = (event.clientY - rect.top - top) / scale;
    onPickCoordinate(wcs.crval[0] + (px - 64) * wcs.cdelt[0], wcs.crval[1] + (py - 64) * wcs.cdelt[1]);
  }} />;
};

export const SpectralProfile: React.FC<SpectralProfileProps> = ({ spectralProfile = [], currentChannelId, onSelectChannel, imageBase64, wcs, onPickCoordinate, ra, dec }) => {
  const [hoveredPoint, setHoveredPoint] = useState<SpectralPoint | null>(null);
  const svgWidth = 960; const svgHeight = 360; const padLeft = 54; const padRight = 20; const padTop = 24; const padBottom = 38;
  const plotWidth = svgWidth - padLeft - padRight; const plotHeight = svgHeight - padTop - padBottom;
  const values = spectralProfile.map((point) => point.flux_density);
  const minFlux = Math.min(...values, 0); const maxFlux = Math.max(...values, 10); const fluxRange = maxFlux - minFlux || 1;
  const points = spectralProfile.map((point) => ({ x: padLeft + (point.wavelength_um - 0.75) / 4.25 * plotWidth, y: padTop + plotHeight - (point.flux_density - minFlux) / fluxRange * plotHeight, point }));
  const path = points.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const activePoint = points.find((point) => point.point.channel_id === currentChannelId) || points[0];
  const lines = [{ label: 'H₂O ice', wavelength: 3.05 }, { label: 'CH₄ ice', wavelength: 3.32 }, { label: 'CO₂ ice', wavelength: 4.27 }];

  return <section className="flex h-full min-h-0 flex-col overflow-auto bg-[#060913] p-4 lg:p-6" aria-label="Spectral profile and coordinate picker">
    <header className="mb-4 flex shrink-0 items-center justify-between gap-4">
      <div><div className="flex items-center gap-2 text-cyan-200"><Activity size={16}/><h2 className="text-sm font-semibold tracking-wide">SPECTRAL PROFILE</h2></div><p className="mt-1 text-xs text-slate-400">SPHEREx 102-channel SED · 0.75–5.00 μm</p></div>
      <div className="text-right font-mono text-xs text-slate-300">{activePoint ? `CH ${activePoint.point.channel_id} · ${activePoint.point.wavelength_um.toFixed(3)} μm · ${activePoint.point.flux_density.toFixed(2)} MJy/sr` : 'Awaiting spectral data'}</div>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-h-[330px] flex-col border-y border-space-800 bg-space-950/60 p-3">
        <div className="mb-2 flex justify-between font-mono text-[10px] text-slate-400"><span>FLUX DENSITY · MJy/sr</span><span>{hoveredPoint ? `CH ${hoveredPoint.channel_id} · ${hoveredPoint.wavelength_um.toFixed(3)} μm · ${hoveredPoint.flux_density.toFixed(2)}` : 'Select a channel to inspect'}</span></div>
        {spectralProfile.length ? <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="min-h-0 flex-1 w-full select-none" role="img" aria-label="Interactive spectral energy distribution with water, methane, and carbon dioxide ice absorption lines">
          {[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line x1={padLeft} x2={padLeft + plotWidth} y1={padTop + plotHeight * fraction} y2={padTop + plotHeight * fraction} stroke="#263248" strokeDasharray="3 5"/><text x={padLeft - 8} y={padTop + plotHeight * fraction + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontFamily="monospace">{(maxFlux - fluxRange * fraction).toFixed(1)}</text></g>)}
          {lines.map((line) => { const x = padLeft + (line.wavelength - .75) / 4.25 * plotWidth; return <g key={line.label}><line x1={x} x2={x} y1={padTop} y2={padTop + plotHeight} stroke="#fbbf24" strokeDasharray="5 4"/><text x={x} y={padTop - 7} textAnchor="middle" fill="#fde68a" fontSize="11" fontFamily="sans-serif">{line.label} · {line.wavelength.toFixed(2)} μm</text></g>; })}
          {path && <path d={path} fill="none" stroke="#67e8f9" strokeWidth="2.5" strokeLinejoin="round"/>}
          {activePoint && <g><line x1={activePoint.x} x2={activePoint.x} y1={padTop} y2={padTop + plotHeight} stroke="#e2e8f0" strokeDasharray="2 4"/><circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#67e8f9" stroke="#03050b" strokeWidth="2"/></g>}
          {points.map((point) => <rect key={point.point.channel_id} x={point.x - plotWidth / 204} y={padTop} width={plotWidth / 102} height={plotHeight} fill="transparent" tabIndex={0} role="button" aria-label={`Channel ${point.point.channel_id}, ${point.point.wavelength_um.toFixed(3)} micrometers`} onClick={() => onSelectChannel(point.point.channel_id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectChannel(point.point.channel_id); }} onMouseEnter={() => setHoveredPoint(point.point)} onMouseLeave={() => setHoveredPoint(null)} className="cursor-pointer hover:fill-cyan-100/10 focus:fill-cyan-100/20"/>)}
          <text x={padLeft} y={svgHeight - 10} fill="#94a3b8" fontSize="11" fontFamily="monospace">0.75 μm</text><text x={padLeft + plotWidth / 2} y={svgHeight - 10} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">2.875 μm</text><text x={padLeft + plotWidth} y={svgHeight - 10} textAnchor="end" fill="#94a3b8" fontSize="11" fontFamily="monospace">5.00 μm</text>
        </svg> : <div className="flex flex-1 animate-pulse items-center justify-center text-xs text-slate-400">Loading 102 SPHEREx channels…</div>}
      </div>
      <aside className="flex min-h-[220px] flex-col border-y border-space-800 bg-space-950/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200"><Crosshair size={14} className="text-cyan-200"/>2D COORDINATE PICKER</div>
        <p className="mb-2 text-[11px] leading-4 text-slate-400">Select a point in the SPHEREx cutout to extract its 102-channel spectrum.</p>
        <div className="min-h-[160px] flex-1 overflow-hidden border border-space-800 bg-black"><Picker imageBase64={imageBase64} wcs={wcs} onPickCoordinate={onPickCoordinate} ra={ra} dec={dec}/></div>
        <p className="mt-2 font-mono text-[10px] text-cyan-100">RA {ra?.toFixed(5) ?? '—'}° · Dec {dec?.toFixed(5) ?? '—'}°</p>
      </aside>
    </div>
  </section>;
};
