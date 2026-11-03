import React, { useState } from 'react';
import { Activity, Radio } from 'lucide-react';
import { SpectralPoint } from '../types';

interface SpectralProfileProps {
  spectralProfile?: SpectralPoint[];
  currentChannelId: number;
  onSelectChannel: (channelId: number) => void;
}

export const SpectralProfile: React.FC<SpectralProfileProps> = ({
  spectralProfile = [],
  currentChannelId,
  onSelectChannel
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<SpectralPoint | null>(null);

  if (!spectralProfile || spectralProfile.length === 0) return null;

  // SVG dimensions
  const svgWidth = 640;
  const svgHeight = 110;
  const padLeft = 42;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 22;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const minFlux = Math.min(...spectralProfile.map((p) => p.flux_density), 0);
  const maxFlux = Math.max(...spectralProfile.map((p) => p.flux_density), 10);
  const fluxRange = maxFlux - minFlux || 1;

  // Build SVG Path
  const points = spectralProfile.map((p, idx) => {
    const x = padLeft + (idx / (spectralProfile.length - 1)) * plotWidth;
    const y = padTop + plotHeight - ((p.flux_density - minFlux) / fluxRange) * plotHeight;
    return { x, y, point: p };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`;

  // Active channel position
  const activePt = points.find((p) => p.point.channel_id === currentChannelId) || points[50];

  return (
    <div className="bg-space-900 border border-space-800 rounded-xl p-3.5 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-nasa-cyan" />
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">
            1D Spectral Profile (SED) • 102 Channels (0.75 - 5.00 µm)
          </h3>
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-3">
          {hoveredPoint ? (
            <span className="text-nasa-cyan">
              Ch {hoveredPoint.channel_id} • {hoveredPoint.wavelength_um.toFixed(3)} µm • {hoveredPoint.flux_density.toFixed(1)} MJy/sr
            </span>
          ) : (
            <span>
              Active: <strong className="text-white">Ch {activePt.point.channel_id} ({activePt.point.wavelength_um.toFixed(2)} µm)</strong>
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-24 stroke-1 cursor-crosshair"
        >
          <defs>
            <linearGradient id="spectrumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="35%" stopColor="#00F0FF" />
              <stop offset="65%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padLeft} y1={padTop} x2={padLeft + plotWidth} y2={padTop} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={padLeft} y1={padTop + plotHeight / 2} x2={padLeft + plotWidth} y2={padTop + plotHeight / 2} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={padLeft} y1={padTop + plotHeight} x2={padLeft + plotWidth} y2={padTop + plotHeight} stroke="#334155" />

          {/* Axis Labels */}
          <text x={padLeft - 6} y={padTop + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
            {maxFlux.toFixed(0)}
          </text>
          <text x={padLeft - 6} y={padTop + plotHeight} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
            {minFlux.toFixed(0)}
          </text>

          {/* Shaded Area & Line */}
          <path d={areaD} fill="url(#areaGradient)" />
          <path d={pathD} fill="none" stroke="url(#spectrumGradient)" strokeWidth="2" strokeLinecap="round" />

          {/* Active Channel Marker */}
          {activePt && (
            <g>
              <line
                x1={activePt.x}
                y1={padTop}
                x2={activePt.x}
                y2={padTop + plotHeight}
                stroke="#00F0FF"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle cx={activePt.x} cy={activePt.y} r="3.5" fill="#00F0FF" stroke="#060913" strokeWidth="1.5" />
            </g>
          )}

          {/* Clickable Channels and Hover Targets */}
          {points.map((p) => (
            <rect
              key={p.point.channel_id}
              x={p.x - 3}
              y={padTop}
              width={6}
              height={plotHeight}
              fill="transparent"
              onClick={() => onSelectChannel(p.point.channel_id)}
              onMouseEnter={() => setHoveredPoint(p.point)}
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer hover:fill-white/10"
            />
          ))}

          {/* X Axis Wavelength Markers */}
          <text x={padLeft} y={svgHeight - 4} fill="#64748b" fontSize="9" textAnchor="start" fontFamily="monospace">
            0.75 µm (SWIR)
          </text>
          <text x={padLeft + plotWidth / 2} y={svgHeight - 4} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
            2.5 µm (MWIR)
          </text>
          <text x={padLeft + plotWidth} y={svgHeight - 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
            5.0 µm
          </text>
        </svg>
      </div>
    </div>
  );
};
