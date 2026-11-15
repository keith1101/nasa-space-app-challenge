import { useState, useEffect } from 'react';
import {
  Activity,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Flame,
  Globe2,
  Layers,
  Maximize2,
  Minimize2,
  Plane,
  Satellite,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Language } from '../../lib/i18n';
import { fmtNum } from '../../lib/format';
import type { GlobalHarmonizedPoint, GlobalCountryInfo } from '../../types/harmonization';
import type { FireRiskQueryResult } from '../../hooks/useQueries';
import { cx } from '../ui';

export interface FireDetailDialogProps {
  point: GlobalHarmonizedPoint | null;
  country: GlobalCountryInfo | null;
  lang: Language;
  onClose: () => void;
  riskPersistence?: number;
  onScramble?: (point: GlobalHarmonizedPoint) => void;
  onFilterCountry?: (countryId: number) => void;
  multiHorizonSize?: FireRiskQueryResult['multi_horizon_size'];
  initialHorizon?: number;
}

export function FireDetailDialog({
  point,
  country,
  lang: _lang,
  onClose,
  riskPersistence,
  onScramble,
  onFilterCountry,
  multiHorizonSize,
  initialHorizon = 6,
}: FireDetailDialogProps) {
  const [copied, setCopied] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState<number>(initialHorizon);
  const [isMinimized, setIsMinimized] = useState(false);

  // Whenever a new fire point is selected, auto-expand the details card
  useEffect(() => {
    if (point) {
      setIsMinimized(false);
    }
  }, [point?.[0], point?.[1]]);

  useEffect(() => {
    if (initialHorizon) {
      setSelectedHorizon(initialHorizon);
    }
  }, [initialHorizon]);

  if (!point) return null;

  const lat = point[0];
  const lon = point[1];
  const frp = point[2];
  const conf = point[3];
  const isDual = point[4] === 1;
  const rawScans = point[5];

  const handleCopyCoords = async () => {
    try {
      await navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard fallback
    }
  };

  // Minimized Mode: Floating bottom tactical status pill
  // Keeps the fire point and 3 concentric rings 100% visible on map without obstruction
  if (isMinimized) {
    const horizonData = multiHorizonSize?.[`${selectedHorizon}h`];
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full border border-line-strong bg-ink-950/95 px-4 py-2 text-xs shadow-2xl backdrop-blur-xl animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
        <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
        <span className="font-mono font-bold text-white">
          {fmtNum(lat, 4)}° N, {fmtNum(lon, 4)}° E
        </span>
        {country && (
          <span className="text-slate-400 font-medium hidden sm:inline">
            ({country.name})
          </span>
        )}
        <span className="text-slate-600">|</span>
        <span className="font-mono text-amber-300 font-bold">
          FRP {fmtNum(frp, 1)} MW
        </span>
        {horizonData && (
          <>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-emerald-300 font-bold">
              {selectedHorizon}h: {horizonData.expected_area_ha} ha
            </span>
          </>
        )}
        <div className="flex items-center gap-1.5 ml-1 border-l border-line/60 pl-2">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-1 rounded-lg bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/30 transition-all"
            title="Expand detail card"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Expand</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-ink-800 hover:text-rose-300 transition-colors"
            title="Deselect fire point"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Mode: Non-blocking Floating Side Card on the right of the map
  // Map remains 100% interactive and clearly visible with concentric spread rings
  return (
    <div className="fixed top-16 right-4 sm:right-6 z-40 w-full max-w-[420px] max-h-[calc(100vh-5rem)] flex flex-col rounded-2xl border border-line-strong bg-ink-950/95 shadow-2xl backdrop-blur-xl animate-in fade-in-0 slide-in-from-right-4 duration-200">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-line p-4 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={cx(
              'grid h-10 w-10 place-items-center rounded-xl border',
              isDual
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : frp >= 25
                ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
            )}
          >
            {isDual ? (
              <ShieldCheck className="h-5 w-5" />
            ) : frp >= 25 ? (
              <Flame className="h-5 w-5" />
            ) : (
              <Activity className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Harmonized Active Fire</span>
              {isDual && (
                <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300 border border-emerald-400/30">
                  DUAL
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              ST-DBSCAN v2.2 Telemetry
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Minimize / View Map button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-800 hover:text-cyan-300 transition-colors"
            title="Minimize to view map"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          {/* Close / Deselect button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-800 hover:text-rose-300 transition-colors"
            title="Deselect fire point"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-y-auto p-4 space-y-3 text-xs custom-scrollbar">
        {/* Coordinates & Copy */}
        <div className="flex items-center justify-between rounded-xl border border-line bg-ink-900/80 p-2.5">
          <div>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Geodesic Coordinates (WGS-84)
            </span>
            <span className="font-mono text-sm font-bold text-cyan-300">
              {fmtNum(lat, 5)}° N, {fmtNum(lon, 5)}° E
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyCoords}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-cyan-400 hover:text-white transition-colors"
            title="Copy coordinates"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Metrics 3-Col Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-line bg-ink-900/60 p-2.5 space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
              FRP
            </span>
            <div className="text-sm font-extrabold text-white font-mono">
              {fmtNum(frp, 1)} <span className="text-[10px] font-normal text-slate-400">MW</span>
            </div>
            <div className="text-[9px] text-amber-300">
              {frp >= 25 ? 'High energy' : 'Moderate'}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-ink-900/60 p-2.5 space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
              Confidence
            </span>
            <div className="text-sm font-extrabold text-emerald-300 font-mono">
              {conf}%
            </div>
            <div className="text-[9px] text-slate-400">
              {conf >= 80 ? 'High' : 'Standard'}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-ink-900/60 p-2.5 space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
              Raw Scans
            </span>
            <div className="text-sm font-extrabold text-cyan-300 font-mono">
              {rawScans}
            </div>
            <div className="text-[9px] text-slate-400">
              {rawScans > 1 ? 'Multi-pass' : 'Single'}
            </div>
          </div>
        </div>

        {/* Geographic & Sensor Info */}
        <div className="rounded-xl border border-line bg-ink-900/60 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
              Jurisdiction:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white">
                {country ? `${country.name} (${country.continent})` : 'Border / Offshore'}
              </span>
              {country && onFilterCountry && (
                <button
                  type="button"
                  onClick={() => onFilterCountry(country.id)}
                  className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 transition-colors"
                  title={`Filter only ${country.name}`}
                >
                  Filter
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line/60 pt-1.5 text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Satellite className="h-3.5 w-3.5 text-emerald-400" />
              Sensor Footprint:
            </span>
            <span className="font-mono text-emerald-300">
              {isDual ? 'MODIS 1000m + VIIRS 375m' : 'VIIRS 375m I-band'}
            </span>
          </div>
          {riskPersistence != null && (
            <div className="flex items-center justify-between border-t border-line/60 pt-1.5 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Persistence Index:
              </span>
              <span className="font-mono font-bold text-amber-300">
                {riskPersistence.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Multi-Horizon Spread Projections (6h / 12h / 24h) */}
        {multiHorizonSize && (
          <div className="rounded-xl border border-line bg-ink-900/80 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Multi-Horizon Spread Projections</span>
              </div>
              {/* Horizon Tabs */}
              <div className="flex items-center gap-1 bg-ink-950 p-0.5 rounded-lg border border-line">
                {([6, 12, 24] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelectedHorizon(h)}
                    className={cx(
                      'px-2 py-0.5 rounded text-[10px] font-bold transition-all',
                      selectedHorizon === h
                        ? 'bg-amber-500 text-ink-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200',
                    )}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {multiHorizonSize[`${selectedHorizon}h`] ? (
              (() => {
                const data = multiHorizonSize[`${selectedHorizon}h`];
                return (
                  <div className="space-y-2 pt-1 border-t border-line/50">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        Expected Burn Area:
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-extrabold text-amber-300 text-xs">
                          {data.expected_area_ha} ha
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({data.expected_area_km2} km²)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Threat Milestone:</span>
                      <span className="rounded bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 font-bold text-[10px] text-amber-300">
                        {data.threat_milestone}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/40 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">High Risk Cells:</span>
                        <span className="font-mono font-bold text-white">
                          {data.high_risk_cells} cells (1 km²)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Confidence:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {(data.persistence_confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-[11px] text-slate-500 italic py-1 text-center">
                Computing 11x11 cellular automaton...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-line p-3 bg-ink-950/80 rounded-b-2xl">
        <Link
          to="/methodology"
          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
        >
          <Layers className="h-3 w-3" />
          <span>Math</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Button: View on Map */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1 rounded-xl border border-line bg-ink-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-ink-800 hover:text-white transition-colors"
            title="Collapse card to view map"
          >
            <Eye className="h-3.5 w-3.5 text-cyan-400" />
            <span>View map</span>
          </button>

          {/* Scramble Flight 3D Button */}
          {onScramble && (
            <button
              type="button"
              onClick={() => {
                onScramble(point);
                setIsMinimized(true);
              }}
              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-red-600/30 transition-all"
            >
              <Plane className="h-3.5 w-3.5" />
              <span>Scramble</span>
            </button>
          )}

          {/* Deselect / Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-ink-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-colors"
            title="Deselect this fire"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
