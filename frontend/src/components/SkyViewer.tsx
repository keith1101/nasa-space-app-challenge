import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Layers, Pause, Play, RotateCcw, Split, StepForward, ZoomIn } from 'lucide-react';
import { BlinkResponse, MovingCandidate, Language } from '../types';
import { workstationTranslations } from '../data/workstationData';

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
    ctx.fillStyle = '#0c0f18';
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
          ctx.beginPath();
          ctx.arc(p.x, p.y, selectedId === candidate.candidate_id ? 12 : 8, 0, Math.PI * 2);
          ctx.strokeStyle = i === 0 ? '#e52207' : '#00F0FF';
          ctx.lineWidth = selectedId === candidate.candidate_id ? 2 : 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
        });
      });
    } else {
      candidates.forEach((candidate) => {
        const pixel = epoch === 0 ? candidate.epoch1?.pixel : candidate.epoch2?.pixel;
        if (!pixel) return;
        const p = point(pixel);
        const isSelected = selectedId === candidate.candidate_id;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSelected ? 12 : 7, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#e7f434' : '#00F0FF';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSelected ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      });
    }

    if (cursor) {
      const x = left + cursor.x * width;
      const y = top + cursor.y * height;
      ctx.strokeStyle = 'rgba(231, 244, 52, 0.75)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.height);
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(231, 244, 52, 0.85)';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x + 7, y);
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x, y + 7);
      ctx.stroke();
    }
  };

  useEffect(() => { draw(); }, [size, transform, candidates, selectedId, epoch, cursor]);

  // Non-passive wheel event listener to safely preventDefault and handle zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
      onTransformChange({
        ...transform,
        zoom: Math.max(0.5, Math.min(20, transform.zoom * factor))
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [transform, onTransformChange]);

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
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-spaceapps-nearblack">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label={`${label} astronomical image; scroll to zoom, drag to pan, or use arrow keys and +/-`}
        className={`focus-ring absolute inset-0 h-full w-full touch-none focus:outline-hidden ${dragRef.current ? 'cursor-grabbing' : 'cursor-crosshair'}`}
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
          if (nearest && nearest.distance < 8) onSelectCandidate(nearest.candidate);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onPointerLeave={() => onCursor(null)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            onTransformChange({ ...transform, panX: transform.panX + 25 });
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            onTransformChange({ ...transform, panX: transform.panX - 25 });
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            onTransformChange({ ...transform, panY: transform.panY + 25 });
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            onTransformChange({ ...transform, panY: transform.panY - 25 });
          } else if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            onTransformChange({ ...transform, zoom: Math.min(20, transform.zoom * 1.25) });
          } else if (event.key === '-' || event.key === '_') {
            event.preventDefault();
            onTransformChange({ ...transform, zoom: Math.max(0.5, transform.zoom / 1.25) });
          } else if (event.key === '0') {
            event.preventDefault();
            onTransformChange({ zoom: 1, panX: 0, panY: 0 });
          }
        }}
      />
      <span className="pointer-events-none absolute left-3 top-3 rounded-btn border border-spaceapps-electricblue bg-spaceapps-deepblue/90 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-spaceapps-neonyellow shadow-md">
        {label}
      </span>
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
  lang?: Language;
}

export const SkyViewer: React.FC<SkyViewerProps> = ({
  blinkData, isLoading, onSelectCandidate, selectedCandidate, mode, onModeChange, stretch, onStretchChange,
  colormap, onColormapChange, sigmaThreshold, onSigmaChange, onRequery, lang = 'vi'
}) => {
  const t = workstationTranslations[lang].skyViewer;
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
    { id: 'blink', label: t.modes.blink, icon: <Play className="h-3.5 w-3.5" /> },
    { id: 'side_by_side', label: t.modes.side_by_side, icon: <Split className="h-3.5 w-3.5" /> },
    { id: 'difference', label: t.modes.difference, icon: <Layers className="h-3.5 w-3.5" /> }
  ];

  return (
    <section className="flex h-full min-h-0 flex-col bg-spaceapps-nearblack" aria-label="Astronomical image viewport">
      {/* Sub-toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-spaceapps-electricblue bg-spaceapps-deepblue/95 px-3.5 py-2 font-sans">
        {/* Mode selector buttons */}
        <div role="tablist" aria-label="Image view mode" className="flex items-center gap-1">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              onClick={() => onModeChange(item.id)}
              className={`focus-ring flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                mode === item.id
                  ? 'bg-spaceapps-neonblue text-white shadow-xs'
                  : 'text-slate-300 hover:bg-spaceapps-electricblue/60 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Viewport Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {mode === 'blink' && (
            <div className="flex items-center gap-1.5 bg-spaceapps-nearblack px-2 py-1 rounded-btn border border-spaceapps-electricblue">
              <button
                type="button"
                aria-label={isPlaying ? t.pauseBlink : t.playBlink}
                onClick={() => setIsPlaying(!isPlaying)}
                className="focus-ring rounded p-1 text-slate-300 hover:text-spaceapps-neonyellow hover:bg-spaceapps-electricblue/60 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                type="button"
                aria-label={t.stepForward}
                onClick={() => setActiveEpochIndex((prev) => (prev === 0 ? 1 : 0))}
                className="focus-ring rounded p-1 text-slate-300 hover:text-spaceapps-neonyellow hover:bg-spaceapps-electricblue/60 active:scale-95 transition-all"
              >
                <StepForward size={14} />
              </button>
              <label className="flex items-center gap-1.5 pl-1.5 text-[11px] font-mono text-slate-300 border-l border-spaceapps-electricblue">
                <input
                  aria-label="Tần số nhấp nháy Blink Hz"
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={blinkSpeedHz}
                  onChange={(e) => setBlinkSpeedHz(Number(e.target.value))}
                  className="accent-spaceapps-neonyellow w-16 cursor-pointer"
                />
                <span className="font-bold text-spaceapps-neonyellow w-12 text-right">{blinkSpeedHz.toFixed(1)} {t.speedHz}</span>
              </label>
            </div>
          )}

          {mode === 'difference' && (
            <div className="flex items-center gap-2 bg-spaceapps-nearblack px-2.5 py-1 rounded-btn border border-spaceapps-electricblue">
              <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                <span className="font-bold text-slate-400">{t.threshold}</span>
                <input
                  aria-label="Sigma threshold"
                  type="range"
                  min="2"
                  max="10"
                  step="0.5"
                  value={sigmaThreshold}
                  onChange={(e) => onSigmaChange(Number(e.target.value))}
                  className="accent-spaceapps-neonyellow w-16 cursor-pointer"
                />
                <strong className="font-bold text-spaceapps-neonyellow w-9 text-right font-mono">
                  {sigmaThreshold.toFixed(1)}σ
                </strong>
              </label>

              <select
                aria-label={t.colormapLabel}
                value={colormap}
                onChange={(e) => {
                  onColormapChange(e.target.value);
                  window.setTimeout(onRequery, 0);
                }}
                className="focus-ring rounded-btn border border-spaceapps-electricblue bg-spaceapps-deepblue px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-200 hover:border-spaceapps-neonblue cursor-pointer"
              >
                {['magma', 'inferno', 'viridis', 'gray', 'coolwarm'].map((map) => (
                  <option key={map} value={map}>
                    {map}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode !== 'difference' && (
            <select
              aria-label={t.stretchLabel}
              value={stretch}
              onChange={(e) => {
                onStretchChange(e.target.value);
                window.setTimeout(onRequery, 0);
              }}
              className="focus-ring rounded-btn border border-spaceapps-electricblue bg-spaceapps-nearblack px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-spaceapps-neonblue cursor-pointer"
            >
              <option value="asinh">{t.stretchOptions.asinh}</option>
              <option value="log">{t.stretchOptions.log}</option>
              <option value="linear">{t.stretchOptions.linear}</option>
              <option value="zscale">{t.stretchOptions.zscale}</option>
            </select>
          )}

          {/* Overlays toggle */}
          <button
            type="button"
            aria-label={t.overlayToggle}
            aria-pressed={showOverlays}
            onClick={() => setShowOverlays(!showOverlays)}
            className={`focus-ring rounded-btn p-1.5 transition-all ${
              showOverlays
                ? 'bg-spaceapps-neonblue text-spaceapps-neonyellow border border-spaceapps-neonyellow/40'
                : 'text-slate-400 hover:text-white hover:bg-spaceapps-electricblue/50'
            }`}
            title={t.overlayToggle}
          >
            <Crosshair size={15} />
          </button>

          {/* Reset zoom */}
          <button
            type="button"
            onClick={resetView}
            className="focus-ring flex items-center gap-1.5 rounded-btn border border-spaceapps-electricblue hover:border-spaceapps-neonblue hover:bg-spaceapps-electricblue/50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-200 transition-all active:scale-95"
          >
            <RotateCcw size={12} className="text-spaceapps-neonyellow" />
            <span>{t.resetView}</span>
          </button>

          {/* Zoom readout */}
          <span className="flex items-center gap-1 text-[11px] font-mono text-spaceapps-neonyellow font-bold bg-spaceapps-nearblack px-2 py-1 rounded-btn border border-spaceapps-electricblue">
            <ZoomIn size={13} className="text-slate-400" />
            {transform.zoom.toFixed(1)}×
          </span>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 min-h-0 bg-spaceapps-nearblack">
        {blinkData ? (
          <>
            {mode === 'side_by_side' ? (
              <div className="grid h-full min-h-0 grid-cols-1 divide-y divide-spaceapps-electricblue md:grid-cols-2 md:divide-x md:divide-y-0">
                <CanvasFrame
                  source={blinkData.epoch1.image_base64}
                  label={`${t.epoch1Label} · ${blinkData.epoch1.epoch_id}`}
                  transform={transform}
                  onTransformChange={setTransform}
                  candidates={showOverlays ? blinkData.candidates_detected : []}
                  selectedId={selectedCandidate?.candidate_id}
                  epoch={0}
                  cursor={cursor}
                  onCursor={updateCursor}
                  onSelectCandidate={onSelectCandidate}
                />
                <CanvasFrame
                  source={blinkData.epoch2.image_base64}
                  label={`${t.epoch2Label} · ${blinkData.epoch2.epoch_id}`}
                  transform={transform}
                  onTransformChange={setTransform}
                  candidates={showOverlays ? blinkData.candidates_detected : []}
                  selectedId={selectedCandidate?.candidate_id}
                  epoch={1}
                  cursor={cursor}
                  onCursor={updateCursor}
                  onSelectCandidate={onSelectCandidate}
                />
              </div>
            ) : (
              <CanvasFrame
                source={
                  mode === 'difference'
                    ? blinkData.difference.image_base64
                    : activeEpochIndex === 0
                    ? blinkData.epoch1.image_base64
                    : blinkData.epoch2.image_base64
                }
                label={
                  mode === 'difference'
                    ? t.diffLabel
                    : `${activeEpochIndex ? t.epoch2Label : t.epoch1Label} · ${blinkData.wavelength_um.toFixed(2)} μm`
                }
                transform={transform}
                onTransformChange={setTransform}
                candidates={showOverlays ? blinkData.candidates_detected : []}
                selectedId={selectedCandidate?.candidate_id}
                epoch={mode === 'difference' ? 'difference' : activeEpochIndex}
                cursor={cursor}
                onCursor={updateCursor}
                onSelectCandidate={onSelectCandidate}
              />
            )}

            {/* Scientific Refresh Loading Overlay */}
            {isLoading && (
              <div role="status" className="absolute inset-0 z-20 flex items-center justify-center bg-spaceapps-nearblack/80 backdrop-blur-xs">
                <div className="flex flex-col items-center space-y-3 rounded-card border border-spaceapps-electricblue bg-spaceapps-deepblue/95 px-6 py-5 shadow-2xl">
                  <div className="relative flex h-10 w-10 items-center justify-center">
                    <div className="absolute h-10 w-10 animate-ping rounded-full bg-spaceapps-neonblue opacity-40" />
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-spaceapps-neonyellow border-t-transparent" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-spaceapps-neonyellow font-mono">
                      {t.loadingTitle}
                    </p>
                    <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                      {t.loadingSub} {blinkData.wavelength_um.toFixed(2)} µm
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty / Initial Loading Placeholder */
          <div className="flex h-full flex-col items-center justify-center bg-spaceapps-nearblack p-6 text-center" aria-label="Astronomical loading state">
            <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-spaceapps-electricblue bg-spaceapps-deepblue/70">
              <Crosshair className="h-10 w-10 text-spaceapps-neonyellow animate-pulse" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              {t.connectingTitle}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              {t.connectingSub}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Telemetry HUD Bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-spaceapps-electricblue bg-spaceapps-deepblue px-3.5 py-2 text-[11px] font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <span className="rounded-btn bg-spaceapps-nearblack border border-spaceapps-electricblue px-2 py-0.5 font-bold uppercase text-spaceapps-neonyellow text-[10px]">
            {mode === 'blink'
              ? `SURVEY ${activeEpochIndex + 1}`
              : mode === 'side_by_side'
              ? 'SYNCHRONIZED EPOCHS'
              : 'BIPOLAR RESIDUAL'}
          </span>
          <span className="text-slate-400 hidden sm:inline">
            {t.hudGuide}
          </span>
        </div>

        {world ? (
          <div className="flex items-center gap-3 text-right">
            <span className="text-white font-medium">
              <span className="text-slate-400">RA:</span>{' '}
              <strong className="text-spaceapps-neonyellow">{world.ra.toFixed(6)}°</strong>{' '}
              <span className="text-slate-400">({raHms(world.ra)})</span>
            </span>
            <span className="text-white font-medium">
              <span className="text-slate-400">Dec:</span>{' '}
              <strong className="text-spaceapps-neonyellow">{world.dec.toFixed(6)}°</strong>{' '}
              <span className="text-slate-400">({decDms(world.dec)})</span>
            </span>
          </div>
        ) : (
          <span className="text-slate-400">
            {t.hudWaiting}
          </span>
        )}
      </div>
    </section>
  );
};
