import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Split, Layers, Crosshair, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { BlinkResponse, MovingCandidate } from '../types';

interface SkyViewerProps {
  blinkData: BlinkResponse | null;
  isLoading: boolean;
  onSelectCandidate: (cand: MovingCandidate) => void;
  selectedCandidate: MovingCandidate | null;
  stretch: string;
  onStretchChange: (s: string) => void;
  colormap: string;
  onColormapChange: (c: string) => void;
  onRequery: () => void;
}

export const SkyViewer: React.FC<SkyViewerProps> = ({
  blinkData,
  isLoading,
  onSelectCandidate,
  selectedCandidate,
  stretch,
  onStretchChange,
  colormap,
  onColormapChange,
  onRequery
}) => {
  type ViewMode = 'blink' | 'side_by_side' | 'difference';
  const [viewMode, setViewMode] = useState<ViewMode>('blink');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [blinkSpeedHz, setBlinkSpeedHz] = useState<number>(2.0); // 2 Hz = 500ms
  const [activeEpochIndex, setActiveEpochIndex] = useState<0 | 1>(0);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [mouseCoord, setMouseCoord] = useState<{ x: number; y: number; ra: number; dec: number } | null>(null);

  // Blinking Timer
  useEffect(() => {
    if (viewMode !== 'blink' || !isPlaying) return;
    const intervalMs = Math.max(100, Math.floor(1000 / blinkSpeedHz));
    const timer = setInterval(() => {
      setActiveEpochIndex((prev) => (prev === 0 ? 1 : 0));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [viewMode, isPlaying, blinkSpeedHz]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!blinkData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.min(127, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * 128)));
    const py = Math.min(127, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * 128)));

    // Astrometric conversion from WCS
    const crval = blinkData.wcs.crval;
    const cdelt = blinkData.wcs.cdelt;
    const ra = crval[0] + (px - 64.0) * cdelt[0];
    const dec = crval[1] + (py - 64.0) * cdelt[1];

    setMouseCoord({ x: px, y: py, ra, dec });
  };

  const handleMouseLeave = () => {
    setMouseCoord(null);
  };

  return (
    <div className="bg-space-900 border border-space-800 rounded-2xl p-4 lg:p-5 shadow-2xl flex flex-col">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-space-800">
        {/* Mode Selector */}
        <div className="flex items-center space-x-1 bg-space-950 p-1 rounded-xl border border-space-800">
          <button
            type="button"
            onClick={() => setViewMode('blink')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'blink'
                ? 'bg-gradient-to-r from-nasa-blue to-nasa-cyan text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Blink Comparator</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('side_by_side')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'side_by_side'
                ? 'bg-gradient-to-r from-nasa-blue to-nasa-cyan text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('difference')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'difference'
                ? 'bg-gradient-to-r from-nasa-blue to-nasa-cyan text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Diff Frame (ΔI)</span>
          </button>
        </div>

        {/* Stretch & Colormap Controls */}
        <div className="flex items-center space-x-2">
          <select
            value={stretch}
            onChange={(e) => {
              onStretchChange(e.target.value);
              setTimeout(onRequery, 50);
            }}
            className="bg-space-950 border border-space-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-nasa-cyan"
          >
            <option value="asinh">Stretch: Asinh (Astro)</option>
            <option value="log">Stretch: Logarithmic</option>
            <option value="linear">Stretch: Linear</option>
          </select>

          <select
            value={colormap}
            onChange={(e) => {
              onColormapChange(e.target.value);
              setTimeout(onRequery, 50);
            }}
            className="bg-space-950 border border-space-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-nasa-cyan"
          >
            <option value="magma">Colormap: Magma</option>
            <option value="inferno">Colormap: Inferno</option>
            <option value="viridis">Colormap: Viridis</option>
            <option value="gray">Colormap: Grayscale</option>
          </select>

          <button
            type="button"
            onClick={() => setShowOverlays(!showOverlays)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showOverlays
                ? 'bg-nasa-cyan/20 border-nasa-cyan text-nasa-cyan'
                : 'bg-space-950 border-space-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Astrometry Candidate Overlays"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Sky Display Area */}
      <div className="flex-1 min-h-[380px] flex items-center justify-center relative rounded-xl bg-space-950 overflow-hidden border border-space-850">
        {isLoading && (
          <div className="absolute inset-0 bg-space-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-3 border-nasa-cyan/20 border-t-nasa-cyan rounded-full animate-spin" />
            <p className="text-xs font-mono text-nasa-cyan animate-pulse">Extracting SPHEREx Multi-Band FITS Cutout...</p>
          </div>
        )}

        {blinkData ? (
          <>
            {/* 1. Blink Mode */}
            {viewMode === 'blink' && (
              <div
                className="relative w-full max-w-[440px] aspect-square select-none cursor-crosshair group"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  src={activeEpochIndex === 0 ? blinkData.epoch1.image_base64 : blinkData.epoch2.image_base64}
                  alt="SPHEREx Sky Cutout"
                  className="w-full h-full object-contain pixelated rounded-lg shadow-2xl"
                  style={{ imageRendering: 'pixelated' }}
                />

                {/* Candidate Highlight Overlays */}
                {showOverlays &&
                  blinkData.candidates_detected.map((cand) => {
                    const activePixel = activeEpochIndex === 0 ? cand.epoch1?.pixel : cand.epoch2?.pixel;
                    if (!activePixel) return null;
                    const leftPct = (activePixel[0] / 128) * 100;
                    const topPct = (activePixel[1] / 128) * 100;
                    const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;

                    return (
                      <div
                        key={cand.candidate_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCandidate(cand);
                        }}
                        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                          isSelected ? 'scale-125 z-20' : 'hover:scale-110'
                        }`}
                      >
                        <div className="relative">
                          <div className="w-6 h-6 rounded-full border-2 border-nasa-cyan/80 animate-ping absolute -inset-0" />
                          <div className="w-6 h-6 rounded-full border-2 border-nasa-cyan flex items-center justify-center bg-nasa-cyan/20 backdrop-blur-xs shadow-lg shadow-nasa-cyan/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-nasa-cyan" />
                          </div>
                          <span className="absolute left-7 top-0 text-[10px] font-mono font-bold bg-space-950/90 text-nasa-cyan px-1.5 py-0.5 rounded border border-nasa-cyan/40 whitespace-nowrap shadow-md">
                            {cand.candidate_id}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {/* Top Epoch Watermark */}
                <div className="absolute top-3 left-3 bg-space-950/80 backdrop-blur-md px-3 py-1 rounded-md border border-space-700 font-mono text-xs shadow-md">
                  <span className="text-slate-400">Viewing: </span>
                  <span className="font-bold text-nasa-cyan">
                    {activeEpochIndex === 0 ? 'Survey 1 (2025-04-15)' : 'Survey 2 (2025-10-15)'}
                  </span>
                  <span className="text-slate-500 ml-2">({blinkData.wavelength_um} µm)</span>
                </div>
              </div>
            )}

            {/* 2. Side by Side Mode */}
            {viewMode === 'side_by_side' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 w-full max-w-4xl">
                <div className="relative rounded-xl border border-space-800 overflow-hidden bg-black">
                  <img
                    src={blinkData.epoch1.image_base64}
                    alt="Epoch 1"
                    className="w-full aspect-square object-contain pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="absolute top-2 left-2 bg-space-950/80 backdrop-blur-sm px-2.5 py-1 rounded text-xs font-mono text-slate-300 border border-space-700">
                    Epoch 1 (Survey 1 • 2025-04)
                  </div>
                </div>

                <div className="relative rounded-xl border border-space-800 overflow-hidden bg-black">
                  <img
                    src={blinkData.epoch2.image_base64}
                    alt="Epoch 2"
                    className="w-full aspect-square object-contain pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="absolute top-2 left-2 bg-space-950/80 backdrop-blur-sm px-2.5 py-1 rounded text-xs font-mono text-nasa-cyan border border-space-700 font-medium">
                    Epoch 2 (Survey 2 • 2025-10)
                  </div>
                </div>
              </div>
            )}

            {/* 3. Difference Frame Mode */}
            {viewMode === 'difference' && (
              <div className="relative w-full max-w-[440px] aspect-square select-none cursor-crosshair">
                <img
                  src={blinkData.difference.image_base64}
                  alt="Difference Frame"
                  className="w-full h-full object-contain pixelated rounded-lg shadow-2xl"
                  style={{ imageRendering: 'pixelated' }}
                />

                {/* Dipole Candidate Overlays */}
                {showOverlays &&
                  blinkData.candidates_detected.map((cand) => {
                    const p1 = cand.epoch1?.pixel;
                    const p2 = cand.epoch2?.pixel;
                    return (
                      <React.Fragment key={cand.candidate_id}>
                        {p1 && (
                          <div
                            style={{ left: `${(p1[0] / 128) * 100}%`, top: `${(p1[1] / 128) * 100}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-rose-500 bg-rose-500/20" />
                            <span className="text-[9px] font-mono text-rose-300 bg-space-950/80 px-1 rounded absolute -top-4 -left-2 whitespace-nowrap">
                              E1 Deficit
                            </span>
                          </div>
                        )}
                        {p2 && (
                          <div
                            style={{ left: `${(p2[0] / 128) * 100}%`, top: `${(p2[1] / 128) * 100}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-nasa-cyan bg-nasa-cyan/20" />
                            <span className="text-[9px] font-mono text-nasa-cyan bg-space-950/80 px-1 rounded absolute -top-4 -left-2 whitespace-nowrap">
                              E2 Excess
                            </span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                <div className="absolute top-3 left-3 bg-space-950/80 backdrop-blur-md px-3 py-1 rounded-md border border-space-700 font-mono text-xs">
                  <span className="text-slate-400">Difference Frame: </span>
                  <span className="text-emerald-400 font-bold">ΔI = E2 - E1</span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 bg-space-950/90 backdrop-blur-md p-2 rounded-lg border border-space-800 text-[11px] font-mono flex items-center justify-around">
                  <span className="text-rose-400">● Red: Epoch 1 (Where it was)</span>
                  <span className="text-nasa-cyan">● Cyan: Epoch 2 (Where it moved)</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-slate-500 space-y-2 p-6">
            <Eye className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
            <p className="text-xs">No active cutout loaded. Select coordinates and click Inspect Sky.</p>
          </div>
        )}
      </div>

      {/* Bottom Viewer Controls (For Blink Mode) */}
      {viewMode === 'blink' && (
        <div className="mt-4 pt-3 border-t border-space-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-xl bg-space-850 hover:bg-space-800 text-white border border-space-700 transition-colors"
              title={isPlaying ? 'Pause Blinking' : 'Start Blinking'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-nasa-cyan" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveEpochIndex((prev) => (prev === 0 ? 1 : 0))}
              className="p-2 rounded-xl bg-space-850 hover:bg-space-800 text-slate-300 border border-space-700 transition-colors"
              title="Step Single Epoch"
            >
              <FastForward className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <span>Blink Speed:</span>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={blinkSpeedHz}
                onChange={(e) => setBlinkSpeedHz(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-space-950 rounded appearance-none accent-nasa-cyan cursor-pointer"
              />
              <span className="text-slate-200 font-bold w-12">{blinkSpeedHz.toFixed(1)} Hz</span>
            </div>
          </div>

          {/* Mouse Coordinate Readout */}
          <div className="text-xs font-mono bg-space-950 px-3 py-1.5 rounded-lg border border-space-800 text-slate-400">
            {mouseCoord ? (
              <span>
                Pixel: [{mouseCoord.x}, {mouseCoord.y}] • RA: {mouseCoord.ra.toFixed(4)}° • Dec:{' '}
                {mouseCoord.dec >= 0 ? `+${mouseCoord.dec.toFixed(4)}` : mouseCoord.dec.toFixed(4)}°
              </span>
            ) : (
              <span>Hover canvas for subpixel astrometry readout</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
