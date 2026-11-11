import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Layers, Pause, Play, RotateCcw, Split, StepForward, ZoomIn } from 'lucide-react';
import { BlinkResponse, MovingCandidate } from '../types';

type SkyMode = 'blink' | 'side_by_side' | 'difference';
type ViewTransform = { zoom: number; panX: number; panY: number };
type CanvasFrameProps = {
  source: string;
  label: string;
  transform: ViewTransform;
  onTransformChange: (next: ViewTransform) => void;
  candidates: MovingCandidate[];
  selectedId?: string;
  epoch: 0 | 1 | 'difference';
  cursor: { x: number; y: number } | null;
  onCursor: (coords: { x: number; y: number; px: number; py: number } | null) => void;
  onSelectCandidate: (candidate: MovingCandidate) => void;
};

const raHms = (degrees: number) => {
  const total = (((degrees % 360) + 360) % 360) / 15 * 3600;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${((total % 60)).toFixed(2).padStart(5, '0')}`;
};

const decDms = (degrees: number) => {
  const abs = Math.abs(degrees);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${degrees < 0 ? '−' : '+'}${String(d).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
};

const CanvasFrame: React.FC<CanvasFrameProps> = ({
  source, label, transform, onTransformChange, candidates, selectedId, epoch, cursor, onCursor, onSelectCandidate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const image = new Image();
    image.onload = () => { imageRef.current = image; draw(); };
    image.src = source;
    return () => { image.onload = null; };
  }, [source]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const draw = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !size.width || !size.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#03050b';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.imageSmoothingEnabled = false;
    const scale = Math.min(size.width / image.naturalWidth, size.height / image.naturalHeight) * transform.zoom;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const left = (size.width - width) / 2 + transform.panX;
    const top = (size.height - height) / 2 + transform.panY;
    ctx.drawImage(image, left, top, width, height);

    const point = (pixel: [number, number]) => ({ x: left + pixel[0] * scale, y: top + pixel[1] * scale });
    if (epoch === 'difference') {
      candidates.forEach((candidate) => {
        ([candidate.epoch1?.pixel, candidate.epoch2?.pixel] as Array<[number, number] | undefined>).forEach((pixel, i) => {
          if (!pixel) return;
          const p = point(pixel);
          ctx.beginPath(); ctx.arc(p.x, p.y, selectedId === candidate.candidate_id ? 12 : 8, 0, Math.PI * 2);
          ctx.strokeStyle = i === 0 ? '#fb7185' : '#67e8f9'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
        });
      });
    } else {
      candidates.forEach((candidate) => {
        const pixel = epoch === 0 ? candidate.epoch1?.pixel : candidate.epoch2?.pixel;
        if (!pixel) return;
        const p = point(pixel);
        ctx.beginPath(); ctx.arc(p.x, p.y, selectedId === candidate.candidate_id ? 11 : 7, 0, Math.PI * 2);
        ctx.strokeStyle = selectedId === candidate.candidate_id ? '#fbbf24' : '#67e8f9'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
      });
    }

    if (cursor) {
      const x = left + cursor.x * width;
      const y = top + cursor.y * height;
      ctx.strokeStyle = 'rgba(226,232,240,.82)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.height); ctx.moveTo(0, y); ctx.lineTo(size.width, y); ctx.stroke();
      ctx.setLineDash([]); ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(226,232,240,.62)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke();
    }
  };

  useEffect(() => { draw(); }, [size, transform, candidates, selectedId, epoch, cursor]);

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const image = imageRef.current;
    if (!image) return null;
    const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight) * transform.zoom;
    const left = (rect.width - image.naturalWidth * scale) / 2 + transform.panX;
    const top = (rect.height - image.naturalHeight * scale) / 2 + transform.panY;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x: (x - left) / (image.naturalWidth * scale), y: (y - top) / (image.naturalHeight * scale), px: (x - left) / scale, py: (y - top) / scale };
  };

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        aria-label={`${label} astronomical image; scroll to zoom and drag to pan`}
        className={`absolute inset-0 h-full w-full touch-none ${dragRef.current ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = { x: event.clientX, y: event.clientY, panX: transform.panX, panY: transform.panY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const p = pointAt(event);
          if (dragRef.current && (event.buttons & 1)) {
            onTransformChange({ ...transform, panX: dragRef.current.panX + event.clientX - dragRef.current.x, panY: dragRef.current.panY + event.clientY - dragRef.current.y });
          } else if (p) onCursor({ x: Math.max(0, Math.min(1, p.x)), y: Math.max(0, Math.min(1, p.y)), px: p.px, py: p.py });
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) return;
          const p = pointAt(event);
          if (!p) return;
          const nearest = candidates.flatMap((candidate) => {
            const pixels = epoch === 'difference' ? [candidate.epoch1?.pixel, candidate.epoch2?.pixel] : [epoch === 0 ? candidate.epoch1?.pixel : candidate.epoch2?.pixel];
            return pixels.filter((value): value is [number, number] => Boolean(value)).map((value) => ({ candidate, distance: Math.hypot(value[0] - p.px, value[1] - p.py) }));
          }).sort((a, b) => a.distance - b.distance)[0];
          if (nearest && nearest.distance < 6) onSelectCandidate(nearest.candidate);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onPointerLeave={() => onCursor(null)}
        onWheel={(event) => {
          event.preventDefault();
          const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
          onTransformChange({ ...transform, zoom: Math.max(1, Math.min(16, transform.zoom * factor)) });
        }}
      />
      <span className="pointer-events-none absolute left-3 top-3 rounded bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-300">{label}</span>
    </div>
  );
};

interface SkyViewerProps {
  blinkData: BlinkResponse | null;
  isLoading: boolean;
  onSelectCandidate: (cand: MovingCandidate) => void;
  selectedCandidate: MovingCandidate | null;
  mode: SkyMode;
  onModeChange: (mode: SkyMode) => void;
  stretch: string;
  onStretchChange: (s: string) => void;
  colormap: string;
  onColormapChange: (c: string) => void;
  sigmaThreshold: number;
  onSigmaChange: (value: number) => void;
  onRequery: () => void;
}

export const SkyViewer: React.FC<SkyViewerProps> = ({
  blinkData, isLoading, onSelectCandidate, selectedCandidate, mode, onModeChange, stretch, onStretchChange,
  colormap, onColormapChange, sigmaThreshold, onSigmaChange, onRequery
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [blinkSpeedHz, setBlinkSpeedHz] = useState(2);
  const [activeEpochIndex, setActiveEpochIndex] = useState<0 | 1>(0);
  const [transform, setTransform] = useState<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [pixel, setPixel] = useState<{ px: number; py: number } | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);

  useEffect(() => {
    if (mode !== 'blink' || !isPlaying) return;
    const timer = window.setInterval(() => setActiveEpochIndex((prev) => prev === 0 ? 1 : 0), 1000 / blinkSpeedHz);
    return () => window.clearInterval(timer);
  }, [mode, isPlaying, blinkSpeedHz]);
  useEffect(() => { setTransform({ zoom: 1, panX: 0, panY: 0 }); }, [blinkData]);

  const updateCursor = (position: { x: number; y: number; px: number; py: number } | null) => {
    setCursor(position ? { x: position.x, y: position.y } : null);
    setPixel(position ? { px: position.px, py: position.py } : null);
  };
  const world = pixel && blinkData ? {
    ra: blinkData.wcs.crval[0] + (pixel.px - 64) * blinkData.wcs.cdelt[0],
    dec: blinkData.wcs.crval[1] + (pixel.py - 64) * blinkData.wcs.cdelt[1]
  } : null;
  const resetView = () => setTransform({ zoom: 1, panX: 0, panY: 0 });
  const modes: { id: SkyMode; label: string; icon: React.ReactNode }[] = [
    { id: 'blink', label: 'Blink', icon: <Play className="h-3.5 w-3.5" /> },
    { id: 'side_by_side', label: 'Epoch compare', icon: <Split className="h-3.5 w-3.5" /> },
    { id: 'difference', label: 'Difference ΔI', icon: <Layers className="h-3.5 w-3.5" /> }
  ];

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#03050b]" aria-label="Astronomical image viewport">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-space-800 bg-space-900/50 px-3 py-2">
        <div role="tablist" aria-label="Image view mode" className="flex items-center gap-1">
          {modes.map((item) => <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} onClick={() => onModeChange(item.id)} className={`focus-ring flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${mode === item.id ? 'bg-slate-100 text-slate-950' : 'text-slate-300 hover:bg-space-800 hover:text-white'}`}>{item.icon}{item.label}</button>)}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'blink' && <>
            <button type="button" aria-label={isPlaying ? 'Pause blink' : 'Play blink'} onClick={() => setIsPlaying(!isPlaying)} className="focus-ring rounded p-1.5 text-slate-300 hover:bg-space-800 hover:text-white">{isPlaying ? <Pause size={15} /> : <Play size={15} />}</button>
            <button type="button" aria-label="Step forward one epoch" onClick={() => setActiveEpochIndex((prev) => prev === 0 ? 1 : 0)} className="focus-ring rounded p-1.5 text-slate-300 hover:bg-space-800 hover:text-white"><StepForward size={15} /></button>
            <label className="flex items-center gap-2 text-[11px] font-mono text-slate-300"><span>{blinkSpeedHz.toFixed(1)} Hz</span><input aria-label="Blink frequency" type="range" min="0.5" max="5" step="0.5" value={blinkSpeedHz} onChange={(e) => setBlinkSpeedHz(Number(e.target.value))} className="accent-cyan-300" /></label>
          </>}
          {mode === 'difference' && <label className="flex items-center gap-2 text-[11px] font-mono text-slate-300"><span>Threshold</span><input aria-label="Sigma threshold" type="range" min="2" max="10" step="0.5" value={sigmaThreshold} onChange={(e) => onSigmaChange(Number(e.target.value))} className="accent-cyan-300"/><strong className="w-10 text-right text-cyan-200">{sigmaThreshold.toFixed(1)}σ</strong></label>}
          {mode === 'difference' && <select aria-label="Difference image colormap" value={colormap} onChange={(e) => { onColormapChange(e.target.value); window.setTimeout(onRequery, 0); }} className="focus-ring rounded border border-space-700 bg-space-950 px-2 py-1 text-[11px] text-slate-200">
            {['magma', 'inferno', 'viridis', 'gray', 'coolwarm'].map((map) => <option key={map} value={map}>{map}</option>)}
          </select>}
          {mode !== 'difference' && <select aria-label="Image stretch" value={stretch} onChange={(e) => { onStretchChange(e.target.value); window.setTimeout(onRequery, 0); }} className="focus-ring rounded border border-space-700 bg-space-950 px-2 py-1 text-[11px] text-slate-200"><option value="asinh">Asinh</option><option value="log">Log</option><option value="linear">Linear</option><option value="zscale">Z-scale</option></select>}
          <button type="button" aria-label="Toggle candidate overlays" aria-pressed={showOverlays} onClick={() => setShowOverlays(!showOverlays)} className={`focus-ring rounded p-1.5 ${showOverlays ? 'text-cyan-200' : 'text-slate-500'} hover:bg-space-800`}><Crosshair size={15}/></button>
          <button type="button" onClick={resetView} className="focus-ring flex items-center gap-1 rounded border border-space-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-space-800"><RotateCcw size={12}/>Reset 1:1 / Fit</button>
          <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400"><ZoomIn size={13}/>{transform.zoom.toFixed(1)}×</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {blinkData ? <>
          {mode === 'side_by_side' ? <div className="grid h-full min-h-0 grid-cols-1 divide-y divide-space-800 md:grid-cols-2 md:divide-x md:divide-y-0">
            <CanvasFrame source={blinkData.epoch1.image_base64} label={`Epoch 1 · ${blinkData.epoch1.epoch_id}`} transform={transform} onTransformChange={setTransform} candidates={showOverlays ? blinkData.candidates_detected : []} selectedId={selectedCandidate?.candidate_id} epoch={0} cursor={cursor} onCursor={updateCursor} onSelectCandidate={onSelectCandidate}/>
            <CanvasFrame source={blinkData.epoch2.image_base64} label={`Epoch 2 · ${blinkData.epoch2.epoch_id}`} transform={transform} onTransformChange={setTransform} candidates={showOverlays ? blinkData.candidates_detected : []} selectedId={selectedCandidate?.candidate_id} epoch={1} cursor={cursor} onCursor={updateCursor} onSelectCandidate={onSelectCandidate}/>
          </div> : <CanvasFrame source={mode === 'difference' ? blinkData.difference.image_base64 : activeEpochIndex === 0 ? blinkData.epoch1.image_base64 : blinkData.epoch2.image_base64} label={mode === 'difference' ? 'Difference · ΔI = E2 − E1' : `${activeEpochIndex ? 'Epoch 2' : 'Epoch 1'} · ${blinkData.wavelength_um.toFixed(2)} μm`} transform={transform} onTransformChange={setTransform} candidates={showOverlays ? blinkData.candidates_detected : []} selectedId={selectedCandidate?.candidate_id} epoch={mode === 'difference' ? 'difference' : activeEpochIndex} cursor={cursor} onCursor={updateCursor} onSelectCandidate={onSelectCandidate}/>}
          {isLoading && <div role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className="flex items-center gap-3 text-sm text-cyan-100"><span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-100/30 border-t-cyan-100"/>Refreshing NASA IRSA cutout…</div></div>}
        </> : <div className="flex h-full animate-pulse items-center justify-center bg-space-950 text-sm text-slate-400" aria-label="Loading astronomical image"><div className="h-40 w-40 rounded-full border border-space-800 bg-space-900/70"/></div>}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-space-800 bg-space-950 px-3 py-1.5 text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-2"><span className="text-slate-200">{mode === 'blink' ? `SURVEY ${activeEpochIndex + 1}` : mode === 'side_by_side' ? 'SYNCHRONIZED EPOCHS' : 'BIPOLAR RESIDUAL'}</span><span>Scroll zoom · drag pan</span></span>
        {world ? <span className="text-right leading-4"><span className="block text-cyan-100">RA {world.ra.toFixed(6)}° ({raHms(world.ra)})</span><span className="block text-cyan-100">Dec {world.dec.toFixed(6)}° ({decDms(world.dec)})</span></span> : <span>WCS HUD · hover image</span>}
      </div>
    </section>
  );
};
