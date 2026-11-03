import React from 'react';
import { Compass, Search, Sparkles, Navigation } from 'lucide-react';
import { PresetTarget } from '../types';

interface CoordinateSearchProps {
  ra: number;
  dec: number;
  onRaChange: (val: number) => void;
  onDecChange: (val: number) => void;
  targets: PresetTarget[];
  onSelectTarget: (t: PresetTarget) => void;
  selectedTargetId: string | null;
  onSearch: () => void;
  isLoading: boolean;
}

export const CoordinateSearch: React.FC<CoordinateSearchProps> = ({
  ra,
  dec,
  onRaChange,
  onDecChange,
  targets,
  onSelectTarget,
  selectedTargetId,
  onSearch,
  isLoading
}) => {
  return (
    <div className="bg-space-900 border border-space-800 rounded-2xl p-4 lg:p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Compass className="w-5 h-5 text-nasa-cyan" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Celestial Coordinates (J2000)</h2>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-space-850 px-2.5 py-1 rounded-md border border-space-700">
          FOV: 13.1′ × 13.1′ (128×128 px @ 6.15″/px)
        </div>
      </div>

      {/* Preset Target Cards */}
      <div className="mb-4">
        <label className="text-xs font-medium text-slate-400 mb-2 block flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-nasa-amber" />
          <span>Curated NASA Target Fields:</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {targets.map((t) => {
            const isSelected = selectedTargetId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTarget(t)}
                className={`text-left p-2.5 rounded-xl border text-xs transition-all duration-200 ${
                  isSelected
                    ? 'bg-nasa-cyan/10 border-nasa-cyan text-white shadow-md shadow-nasa-cyan/10 ring-1 ring-nasa-cyan/40'
                    : 'bg-space-850/60 border-space-750 text-slate-300 hover:bg-space-800 hover:border-slate-600'
                }`}
              >
                <div className="font-semibold text-slate-100 flex items-center justify-between">
                  <span>{t.name}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-nasa-cyan" />}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  α: {t.ra.toFixed(2)}° • δ: {t.dec >= 0 ? `+${t.dec.toFixed(2)}` : t.dec.toFixed(2)}°
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coordinate Input Form */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-5">
          <label className="text-xs font-medium text-slate-400 mb-1 block">
            Right Ascension (RA, α in deg):
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              min="0"
              max="359.999"
              value={ra}
              onChange={(e) => onRaChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-space-950 border border-space-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-nasa-cyan transition-colors"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">deg</span>
          </div>
        </div>

        <div className="sm:col-span-4">
          <label className="text-xs font-medium text-slate-400 mb-1 block">
            Declination (Dec, δ in deg):
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              min="-90"
              max="90"
              value={dec}
              onChange={(e) => onDecChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-space-950 border border-space-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-nasa-cyan transition-colors"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">deg</span>
          </div>
        </div>

        <div className="sm:col-span-3">
          <button
            type="button"
            onClick={onSearch}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-nasa-blue via-indigo-600 to-nasa-cyan text-white font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-95 active:scale-98 transition-all shadow-lg shadow-nasa-cyan/20 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Querying...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Search className="w-4 h-4" />
                Inspect Sky
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
