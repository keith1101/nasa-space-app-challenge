import React, { useEffect, useRef, useState } from 'react';
import { Activity, Crosshair } from 'lucide-react';
import { SpectralPoint, Language } from '../types';
import { workstationTranslations } from '../data/workstationData';

interface SpectralProfileProps {
  spectralProfile?: SpectralPoint[];
  currentChannelId: number;
  onSelectChannel: (channelId: number) => void;
  imageBase64?: string;
  wcs?: { crval: [number, number]; cdelt: [number, number] };
  onPickCoordinate?: (ra: number, dec: number) => void;
  ra?: number;
  dec?: number;
  lang?: Language;
}

const Picker: React.FC<Pick<SpectralProfileProps, 'imageBase64' | 'wcs' | 'onPickCoordinate' | 'ra' | 'dec'>> = ({
  imageBase64,
  wcs,
  onPickCoordinate,
  ra,
  dec
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!imageBase64) return;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      render();
    };
    image.src = imageBase64;
    return () => {
      image.onload = null;
    };
  }, [imageBase64]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const render = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !size.width || !size.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0c0f18';
    ctx.fillRect(0, 0, size.width, size.height);
    const scale = Math.min(size.width / image.naturalWidth, size.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const left = (size.width - width) / 2;
    const top = (size.height - height) / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, left, top, width, height);

    if (wcs && typeof ra === 'number' && typeof dec === 'number') {
      const x = left + ((ra - wcs.crval[0]) / wcs.cdelt[0] + 64) * scale;
      const y = top + ((dec - wcs.crval[1]) / wcs.cdelt[1] + 64) * scale;
      ctx.strokeStyle = '#e7f434';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.lineTo(x + 12, y);
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x, y + 12);
      ctx.stroke();
    }
  };

  useEffect(() => {
    render();
  }, [size, imageBase64, wcs, ra, dec]);

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      aria-label="Clickable sky cutout for spectral coordinate selection"
      className="focus-ring h-full w-full cursor-crosshair focus:outline-hidden"
      onClick={(event) => {
        if (!wcs || !onPickCoordinate || !imageRef.current) return;
        const image = imageRef.current;
        const rect = event.currentTarget.getBoundingClientRect();
        const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
        const left = (rect.width - image.naturalWidth * scale) / 2;
        const top = (rect.height - image.naturalHeight * scale) / 2;
        const px = (event.clientX - rect.left - left) / scale;
        const py = (event.clientY - rect.top - top) / scale;
        onPickCoordinate(wcs.crval[0] + (px - 64) * wcs.cdelt[0], wcs.crval[1] + (py - 64) * wcs.cdelt[1]);
      }}
    />
  );
};

export const SpectralProfile: React.FC<SpectralProfileProps> = ({
  spectralProfile = [],
  currentChannelId,
  onSelectChannel,
  imageBase64,
  wcs,
  onPickCoordinate,
  ra,
  dec,
  lang = 'vi'
}) => {
  const t = workstationTranslations[lang].spectral;
  const [hoveredPoint, setHoveredPoint] = useState<SpectralPoint | null>(null);
  const svgWidth = 960;
  const svgHeight = 360;
  const padLeft = 56;
  const padRight = 24;
  const padTop = 26;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;
  const values = spectralProfile.map((point) => point.flux_density);
  const minFlux = Math.min(...values, 0);
  const maxFlux = Math.max(...values, 10);
  const fluxRange = maxFlux - minFlux || 1;
  const points = spectralProfile.map((point) => ({
    x: padLeft + ((point.wavelength_um - 0.75) / 4.25) * plotWidth,
    y: padTop + plotHeight - ((point.flux_density - minFlux) / fluxRange) * plotHeight,
    point
  }));
  const path = points.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const activePoint = points.find((point) => point.point.channel_id === currentChannelId) || points[0];

  const lines = [
    { label: 'H₂O ice', wavelength: 3.05, color: '#e7f434' },
    { label: 'CH₄ ice', wavelength: 3.32, color: '#2491ff' },
    { label: 'CO₂ ice', wavelength: 4.27, color: '#fafaad' }
  ];

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-auto bg-spaceapps-nearblack p-4 lg:p-6 font-sans text-white"
      aria-label="Spectral profile and coordinate picker"
    >
      {/* Header */}
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-spaceapps-electricblue pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-spaceapps-neonyellow" />
            <h2 className="text-base font-extrabold uppercase tracking-wider text-white">
              {t.title}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-300">
            {t.subtitle}
          </p>
        </div>

        <div className="rounded-btn border border-spaceapps-electricblue bg-spaceapps-deepblue px-3.5 py-1.5 font-mono text-xs font-bold text-spaceapps-neonyellow shadow-xs">
          {activePoint ? (
            <span>
              {t.activeChannel} {activePoint.point.channel_id} · {activePoint.point.wavelength_um.toFixed(3)} µm ·{' '}
              {activePoint.point.flux_density.toFixed(2)} MJy/sr
            </span>
          ) : (
            <span>{t.loadingFlux}</span>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: Interactive 102-Channel SED Plot */}
        <div className="flex min-h-[360px] flex-col rounded-card border border-spaceapps-electricblue bg-spaceapps-deepblue/90 p-4 shadow-md">
          <div className="mb-2 flex justify-between font-mono text-[11px] text-slate-300">
            <span className="font-bold text-spaceapps-blueyonder uppercase tracking-wider">
              {t.fluxDensity}
            </span>
            <span className="font-bold text-spaceapps-neonyellow">
              {hoveredPoint
                ? `${t.activeChannel} ${hoveredPoint.channel_id} · ${hoveredPoint.wavelength_um.toFixed(3)} µm · ${hoveredPoint.flux_density.toFixed(2)} MJy/sr`
                : t.hoverHint}
            </span>
          </div>

          {spectralProfile.length ? (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="min-h-0 flex-1 w-full select-none"
              role="img"
              aria-label="Interactive spectral energy distribution with water, methane, and carbon dioxide ice absorption lines"
            >
              {/* Horizontal Gridlines & Y-Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <g key={fraction}>
                  <line
                    x1={padLeft}
                    x2={padLeft + plotWidth}
                    y1={padTop + plotHeight * fraction}
                    y2={padTop + plotHeight * fraction}
                    stroke="#1e2b52"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 10}
                    y={padTop + plotHeight * fraction + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    {(maxFlux - fluxRange * fraction).toFixed(1)}
                  </text>
                </g>
              ))}

              {/* Absorption Lines for TNO Ices */}
              {lines.map((line) => {
                const x = padLeft + ((line.wavelength - 0.75) / 4.25) * plotWidth;
                return (
                  <g key={line.label}>
                    <line
                      x1={x}
                      x2={x}
                      y1={padTop}
                      y2={padTop + plotHeight}
                      stroke={line.color}
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                    />
                    <text
                      x={x}
                      y={padTop - 8}
                      textAnchor="middle"
                      fill={line.color}
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {line.label} ({line.wavelength.toFixed(2)} µm)
                    </text>
                  </g>
                );
              })}

              {/* SED Continuous Profile Line */}
              {path && (
                <path
                  d={path}
                  fill="none"
                  stroke="#00F0FF"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  className="drop-shadow-sm"
                />
              )}

              {/* Active Channel Indicator */}
              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    x2={activePoint.x}
                    y1={padTop}
                    y2={padTop + plotHeight}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="2 3"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="6"
                    fill="#e7f434"
                    stroke="#151622"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {/* Interactive Hit Areas per Channel */}
              {points.map((point) => (
                <rect
                  key={point.point.channel_id}
                  x={point.x - plotWidth / 204}
                  y={padTop}
                  width={plotWidth / 102}
                  height={plotHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`Channel ${point.point.channel_id}, ${point.point.wavelength_um.toFixed(3)} micrometers`}
                  onClick={() => onSelectChannel(point.point.channel_id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onSelectChannel(point.point.channel_id);
                  }}
                  onMouseEnter={() => setHoveredPoint(point.point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer hover:fill-spaceapps-neonyellow/20 focus:fill-spaceapps-neonyellow/30 transition-colors"
                />
              ))}

              {/* X-Axis Wavelength Ticks */}
              <text x={padLeft} y={svgHeight - 12} fill="#94a3b8" fontSize="11" fontFamily="monospace">
                0.75 µm
              </text>
              <text
                x={padLeft + plotWidth / 2}
                y={svgHeight - 12}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="11"
                fontFamily="monospace"
              >
                2.875 µm
              </text>
              <text
                x={padLeft + plotWidth}
                y={svgHeight - 12}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="11"
                fontFamily="monospace"
              >
                5.00 µm
              </text>
            </svg>
          ) : (
            <div className="flex flex-1 animate-pulse items-center justify-center text-xs text-slate-400">
              {t.calculating}
            </div>
          )}
        </div>

        {/* Right: 2D Coordinate Picker */}
        <aside className="flex min-h-[260px] flex-col rounded-card border border-spaceapps-electricblue bg-spaceapps-deepblue/90 p-4 shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-spaceapps-neonyellow" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              {t.pickerTitle}
            </h3>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-slate-300">
            {t.pickerDesc}
          </p>

          <div className="min-h-[180px] flex-1 overflow-hidden rounded-btn border-2 border-spaceapps-electricblue bg-black relative">
            <Picker
              imageBase64={imageBase64}
              wcs={wcs}
              onPickCoordinate={onPickCoordinate}
              ra={ra}
              dec={dec}
            />
          </div>

          <div className="mt-3 rounded-btn border border-spaceapps-electricblue bg-spaceapps-nearblack px-3 py-1.5 text-center font-mono text-xs font-bold text-spaceapps-neonyellow">
            RA {ra?.toFixed(5) ?? '—'}° · Dec {dec?.toFixed(5) ?? '—'}°
          </div>
        </aside>
      </div>
    </section>
  );
};
