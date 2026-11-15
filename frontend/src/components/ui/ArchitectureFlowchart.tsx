import { useState } from 'react';
import {
  Satellite,
  Layers,
  Cpu,
  Activity,
  Database,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { Badge, cx } from '../ui';
import { MathFormula } from './MathFormula';
import { ARCHITECTURE_STAGES } from '../../data/architecture/stages';

const ICON_MAP = {
  Satellite,
  Layers,
  Cpu,
  Activity,
};

export interface ArchitectureFlowchartProps {
  isVi?: boolean;
}

export function ArchitectureFlowchart({ isVi: _isVi = false }: ArchitectureFlowchartProps) {
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const stages = ARCHITECTURE_STAGES;

  return (
    <div className="space-y-6">
      {/* Interactive Architecture SVG Canvas */}
      <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-ink-950/90 p-4 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                End-to-End SVG Pipeline Architecture
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hover or click stage to inspect details
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-cyan-300">
              Latency &lt; 95ms
            </span>
            <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-300">
              4-Stage Pipeline
            </span>
          </div>
        </div>

        {/* Scalable Vector Graphics Diagram */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 1020 220"
            className="w-full min-w-[860px] h-auto select-none font-sans"
            style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.5))' }}
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#083344" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="emerald-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#022c22" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#064e3b" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="amber-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#451a03" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#78350f" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="rose-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4c0519" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#881337" stopOpacity="0.4" />
              </linearGradient>

              {/* Arrow Markers */}
              <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#06b6d4" />
              </marker>
              <marker id="arrow-emerald" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
              </marker>
              <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#f59e0b" />
              </marker>
              <marker id="arrow-rose" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#f43f5e" />
              </marker>
            </defs>

            {/* Connecting Flow Paths with Animated Pulses */}
            <g className="flows">
              {/* Path 01 -> 02 */}
              <path d="M 190 105 L 216 105" stroke="#06b6d4" strokeWidth="2.5" fill="none" markerEnd="url(#arrow-cyan)" />
              <circle cx="203" cy="105" r="2.5" fill="#38bdf8">
                <animate attributeName="cx" values="190;216" dur="1.8s" repeatCount="indefinite" />
              </circle>

              {/* Path 02 -> 03 */}
              <path d="M 396 105 L 422 105" stroke="#10b981" strokeWidth="2.5" fill="none" markerEnd="url(#arrow-emerald)" />
              <circle cx="409" cy="105" r="2.5" fill="#34d399">
                <animate attributeName="cx" values="396;422" dur="1.8s" repeatCount="indefinite" />
              </circle>

              {/* Path 03 -> 04 */}
              <path d="M 602 105 L 628 105" stroke="#f59e0b" strokeWidth="2.5" fill="none" markerEnd="url(#arrow-amber)" />
              <circle cx="615" cy="105" r="2.5" fill="#fbbf24">
                <animate attributeName="cx" values="602;628" dur="1.8s" repeatCount="indefinite" />
              </circle>

              {/* Path 04 -> Terminal */}
              <path d="M 808 105 L 834 105" stroke="#f43f5e" strokeWidth="2.5" fill="none" markerEnd="url(#arrow-rose)" />
              <circle cx="821" cy="105" r="2.5" fill="#fb7185">
                <animate attributeName="cx" values="808;834" dur="1.8s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Ingestion Sources (Left Box) */}
            <g transform="translate(10, 25)" className="cursor-pointer">
              <rect x="0" y="0" width="180" height="160" rx="12" fill="#090d16" stroke="#1e293b" strokeWidth="1.2" />
              <rect x="0" y="0" width="180" height="28" rx="12" fill="#0f172a" />
              <circle cx="16" cy="14" r="4" fill="#38bdf8" />
              <text x="28" y="18" fill="#94a3b8" fontSize="10.5" fontWeight="700" letterSpacing="0.05em">
                SATELLITE TELEMETRY
              </text>

              {/* Sensor 1: MODIS */}
              <g transform="translate(10, 36)">
                <rect x="0" y="0" width="160" height="42" rx="6" fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.8" />
                <circle cx="12" cy="14" r="3.5" fill="#818cf8" />
                <text x="22" y="16" fill="#e0e7ff" fontSize="10" fontWeight="700">MODIS (Terra &amp; Aqua)</text>
                <text x="12" y="32" fill="#a5b4fc" fontSize="8.5" fontFamily="monospace">1km · Bowtie 4.8×2km</text>
              </g>

              {/* Sensor 2: VIIRS */}
              <g transform="translate(10, 86)">
                <rect x="0" y="0" width="160" height="42" rx="6" fill="#042f2e" stroke="#0f766e" strokeWidth="0.8" />
                <circle cx="12" cy="14" r="3.5" fill="#2dd4bf" />
                <text x="22" y="16" fill="#ccfbf1" fontSize="10" fontWeight="700">VIIRS (SNPP / NOAA 20-21)</text>
                <text x="12" y="32" fill="#5eead4" fontSize="8.5" fontFamily="monospace">375m I-band · Nadir 0.8km</text>
              </g>

              {/* Timestamp Sync Pill */}
              <rect x="10" y="134" width="160" height="18" rx="4" fill="#0b1329" stroke="#1e3a8a" strokeWidth="0.5" />
              <text x="90" y="146" textAnchor="middle" fill="#60a5fa" fontSize="8.5" fontFamily="monospace">
                UTC Epoch Synchronized
              </text>
            </g>

            {/* Stage 1 Node */}
            <g
              transform="translate(222, 25)"
              className="cursor-pointer group"
              onClick={() => setActiveStage(activeStage === 1 ? null : 1)}
            >
              <rect
                x="0"
                y="0"
                width="174" height="160"
                rx="12"
                fill="url(#cyan-glow)"
                stroke={activeStage === 1 ? '#22d3ee' : '#0e7490'}
                strokeWidth={activeStage === 1 ? 2.5 : 1.2}
              />
              <rect x="0" y="0" width="174" height="26" rx="12" fill="#082f49" />
              <text x="14" y="17" fill="#38bdf8" fontSize="10" fontWeight="800">STAGE 01</text>
              <circle cx="158" cy="13" r="3" fill="#22d3ee" className="animate-ping" />
              <circle cx="158" cy="13" r="3" fill="#22d3ee" />

              <text x="14" y="44" fill="#ffffff" fontSize="11" fontWeight="700">
                Ingestion &amp; Schema
              </text>
              <text x="14" y="58" fill="#7dd3fc" fontSize="9">
                LANCE EOSDIS Stream
              </text>

              {/* Sub bullets */}
              <circle cx="18" cy="74" r="2" fill="#38bdf8" />
              <text x="26" y="77" fill="#bae6fd" fontSize="8.5">Standardized coordinates</text>

              <circle cx="18" cy="90" r="2" fill="#38bdf8" />
              <text x="26" y="93" fill="#bae6fd" fontSize="8.5">UTC timestamp parsing</text>

              <circle cx="18" cy="106" r="2" fill="#38bdf8" />
              <text x="26" y="109" fill="#bae6fd" fontSize="8.5">Cloud mask &amp; QA filter</text>

              {/* Deliverable Pill */}
              <rect x="0" y="143" width="174" height="24" rx="6" fill="#032b3a" stroke="#0284c7" strokeWidth="0.8" />
              <text x="8" y="158" fill="#7dd3fc" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                Raw: lat, lon, frp, scan
              </text>
            </g>

            {/* Stage 2 Node */}
            <g
              transform="translate(428, 25)"
              className="cursor-pointer group"
              onClick={() => setActiveStage(activeStage === 2 ? null : 2)}
            >
              <rect
                x="0"
                y="0"
                width="174" height="160"
                rx="12"
                fill="url(#emerald-glow)"
                stroke={activeStage === 2 ? '#34d399' : '#047857'}
                strokeWidth={activeStage === 2 ? 2.5 : 1.2}
              />
              <rect x="0" y="0" width="174" height="26" rx="12" fill="#064e3b" />
              <text x="14" y="17" fill="#34d399" fontSize="10" fontWeight="800">STAGE 02</text>
              <circle cx="158" cy="13" r="3" fill="#10b981" />

              <text x="14" y="44" fill="#ffffff" fontSize="11" fontWeight="700">
                Geometry &amp; Laplace
              </text>
              <text x="14" y="58" fill="#6ee7b7" fontSize="9">
                Footprint &amp; Priors
              </text>

              {/* Sub bullets */}
              <circle cx="18" cy="74" r="2" fill="#34d399" />
              <text x="26" y="77" fill="#a7f3d0" fontSize="8.5">Laplace prior mapping</text>

              <circle cx="18" cy="90" r="2" fill="#34d399" />
              <text x="26" y="93" fill="#a7f3d0" fontSize="8.5">Anisotropic ellipse axes</text>

              <circle cx="18" cy="106" r="2" fill="#34d399" />
              <text x="26" y="109" fill="#a7f3d0" fontSize="8.5">Spatial grid O(N) indexing</text>

              {/* Deliverable Pill */}
              <rect x="0" y="143" width="174" height="24" rx="6" fill="#022c22" stroke="#059669" strokeWidth="0.8" />
              <text x="8" y="158" fill="#6ee7b7" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                Prior &amp; Bowtie Ellipse
              </text>
            </g>

            {/* Stage 3 Node */}
            <g
              transform="translate(634, 25)"
              className="cursor-pointer group"
              onClick={() => setActiveStage(activeStage === 3 ? null : 3)}
            >
              <rect
                x="0"
                y="0"
                width="174" height="160"
                rx="12"
                fill="url(#amber-glow)"
                stroke={activeStage === 3 ? '#fbbf24' : '#b45309'}
                strokeWidth={activeStage === 3 ? 2.5 : 1.2}
              />
              <rect x="0" y="0" width="174" height="26" rx="12" fill="#78350f" />
              <text x="14" y="17" fill="#fbbf24" fontSize="10" fontWeight="800">STAGE 03</text>
              <circle cx="158" cy="13" r="3" fill="#f59e0b" />

              <text x="14" y="44" fill="#ffffff" fontSize="11" fontWeight="700">
                ST-DBSCAN v2.2 Engine
              </text>
              <text x="14" y="58" fill="#fde68a" fontSize="9">
                Bayesian Fusion Core
              </text>

              {/* Sub bullets */}
              <circle cx="18" cy="74" r="2" fill="#fbbf24" />
              <text x="26" y="77" fill="#fef3c7" fontSize="8.5">Elliptical eps_dist &amp; Δt ≤ 3h</text>

              <circle cx="18" cy="90" r="2" fill="#fbbf24" />
              <text x="26" y="93" fill="#fef3c7" fontSize="8.5">Flux-weighted 375m centroid</text>

              <circle cx="18" cy="106" r="2" fill="#fbbf24" />
              <text x="26" y="109" fill="#fef3c7" fontSize="8.5">Pass-level Bayesian Noisy-OR</text>

              {/* Deliverable Pill */}
              <rect x="0" y="143" width="174" height="24" rx="6" fill="#2d1c02" stroke="#d97706" strokeWidth="0.8" />
              <text x="8" y="158" fill="#fde68a" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                -43.3% events · P ≥ 0.92
              </text>
            </g>

            {/* Stage 4 Node */}
            <g
              transform="translate(840, 25)"
              className="cursor-pointer group"
              onClick={() => setActiveStage(activeStage === 4 ? null : 4)}
            >
              <rect
                x="0"
                y="0"
                width="170" height="160"
                rx="12"
                fill="url(#rose-glow)"
                stroke={activeStage === 4 ? '#fb7185' : '#be123c'}
                strokeWidth={activeStage === 4 ? 2.5 : 1.2}
              />
              <rect x="0" y="0" width="170" height="26" rx="12" fill="#881337" />
              <text x="14" y="17" fill="#fb7185" fontSize="10" fontWeight="800">STAGE 04</text>
              <circle cx="154" cy="13" r="3" fill="#f43f5e" />

              <text x="14" y="44" fill="#ffffff" fontSize="11" fontWeight="700">
                Distribution &amp; WebGL
              </text>
              <text x="14" y="58" fill="#fecdd3" fontSize="9">
                Deck.gl 60 FPS &amp; GeoJSON
              </text>

              {/* Sub bullets */}
              <circle cx="18" cy="74" r="2" fill="#fb7185" />
              <text x="26" y="77" fill="#ffe4e6" fontSize="8.5">Jackknife climatology Z-score</text>

              <circle cx="18" cy="90" r="2" fill="#fb7185" />
              <text x="26" y="93" fill="#ffe4e6" fontSize="8.5">Deck.gl WebGL2 60 FPS</text>

              <circle cx="18" cy="106" r="2" fill="#fb7185" />
              <text x="26" y="109" fill="#ffe4e6" fontSize="8.5">Full audit trail &amp; SITREP</text>

              {/* Deliverable Pill */}
              <rect x="0" y="143" width="170" height="24" rx="6" fill="#2d050f" stroke="#e11d48" strokeWidth="0.8" />
              <text x="8" y="158" fill="#fecdd3" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                WebGL GIS &amp; Z-Score Telemetry
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Grid of 4 Detailed Stage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        {stages.map((stage) => {
          const Icon = ICON_MAP[stage.iconName];
          const isSelected = activeStage === stage.id;
          return (
            <div
              key={stage.id}
              onClick={() => setActiveStage(isSelected ? null : stage.id)}
              className={cx(
                'group relative rounded-2xl border p-5 transition-all duration-300 cursor-pointer backdrop-blur-md',
                stage.bgColor,
                isSelected ? 'ring-2 ring-cyan-400 shadow-xl' : stage.borderColor,
                'hover:shadow-lg'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={cx('rounded-xl p-2.5 text-white', stage.bgColor, 'border border-line')}>
                    <Icon className="h-5 w-5" style={{ color: stage.strokeColor }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold" style={{ color: stage.strokeColor }}>
                        {stage.badge}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">·</span>
                      <span className="text-xs text-slate-400 font-medium">{stage.subtitle}</span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">{stage.title}</h4>
                  </div>
                </div>
                <Badge tone={stage.color as any}>{`Stage ${stage.id}`}</Badge>
              </div>

              {/* Inputs & Algorithms */}
              <div className="mt-3.5 space-y-3 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1.5">
                    <Database className="h-3 w-3 text-cyan-400" />
                    <span>Input signals &amp; mechanisms:</span>
                  </div>
                  <div className="space-y-1.5">
                    {stage.inputs.map((inp, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-lg border border-line/70 bg-ink-950/60 px-3 py-1.5"
                      >
                        <div className="font-medium text-slate-200">
                          {inp.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-400">
                            {inp.specs}
                            {inp.mathTex && (
                              <span className="ml-1.5 inline-block">
                                <MathFormula tex={inp.mathTex} />
                              </span>
                            )}
                          </span>
                          <span className="rounded bg-ink-900 border border-line px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-300">
                            {inp.tag}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operations */}
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1.5">
                    <Sliders className="h-3 w-3 text-emerald-400" />
                    <span>Algorithmic transformation:</span>
                  </div>
                  <ul className="space-y-1 text-slate-300">
                    {stage.operations.map((op, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                        <span>{op}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Output Pill */}
                <div className="pt-2 border-t border-line/50 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-semibold">
                    Pipeline deliverable:
                  </span>
                  <span className="font-mono font-semibold" style={{ color: stage.strokeColor }}>
                    {stage.output}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
