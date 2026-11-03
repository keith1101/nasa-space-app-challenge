import React from 'react';
import { Search, Download, Compass, Database, CheckCircle2, ChevronDown } from 'lucide-react';
import { PresetTarget } from '../types';
import { getFitsDownloadUrl } from '../services/api';

interface CompactToolbarProps {
  ra: number;
  dec: number;
  onRaChange: (val: number) => void;
  onDecChange: (val: number) => void;
  channelId: number;
  onChannelChange: (val: number) => void;
  targets: PresetTarget[];
  selectedTargetId: string | null;
  onSelectTarget: (t: PresetTarget) => void;
  onSearch: () => void;
  isLoading: boolean;
  dataSource?: 'nasa_irsa_live' | 'local_cache' | 'offline_sample';
  wavelengthUm?: number;
}

export const CompactToolbar: React.FC<CompactToolbarProps> = ({
  ra,
  dec,
  onRaChange,
  onDecChange,
  channelId,
  onChannelChange,
  targets,
  selectedTargetId,
  onSelectTarget,
  onSearch,
  isLoading,
  dataSource = 'offline_sample',
  wavelengthUm = 2.45
}) => {
  return (
    <div className="bg-space-900 border border-space-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
      {/* Left: Preset Selector & Coordinates */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Preset Target Dropdown */}
        <div className="relative">
          <select
            value={selectedTargetId || ''}
            onChange={(e) => {
              const t = targets.find((item) => item.id === e.target.value);
              if (t) onSelectTarget(t);
            }}
            className="appearance-none bg-space-950 border border-space-700 hover:border-slate-500 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-nasa-cyan cursor-pointer transition-colors"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        {/* RA Input */}
        <div className="flex items-center space-x-1.5 bg-space-950 px-2.5 py-1 rounded-lg border border-space-750">
          <span className="text-[11px] font-mono text-slate-400">α:</span>
          <input
            type="number"
            step="0.001"
            min="0"
            max="359.999"
            value={ra}
            onChange={(e) => onRaChange(parseFloat(e.target.value) || 0)}
            className="w-20 bg-transparent text-xs font-mono text-white focus:outline-none text-right"
          />
          <span className="text-[10px] text-slate-500 font-mono">°</span>
        </div>

        {/* Dec Input */}
        <div className="flex items-center space-x-1.5 bg-space-950 px-2.5 py-1 rounded-lg border border-space-750">
          <span className="text-[11px] font-mono text-slate-400">δ:</span>
          <input
            type="number"
            step="0.001"
            min="-90"
            max="90"
            value={dec}
            onChange={(e) => onDecChange(parseFloat(e.target.value) || 0)}
            className="w-18 bg-transparent text-xs font-mono text-white focus:outline-none text-right"
          />
          <span className="text-[10px] text-slate-500 font-mono">°</span>
        </div>

        {/* Channel Stepper */}
        <div className="flex items-center space-x-1 bg-space-950 px-2 py-1 rounded-lg border border-space-750">
          <button
            type="button"
            onClick={() => onChannelChange(Math.max(1, channelId - 1))}
            className="text-slate-400 hover:text-white px-1 text-xs font-bold"
          >
            -
          </button>
          <span className="text-xs font-mono text-nasa-cyan font-semibold px-1">
            Ch {channelId} ({wavelengthUm.toFixed(2)} µm)
          </span>
          <button
            type="button"
            onClick={() => onChannelChange(Math.min(102, channelId + 1))}
            className="text-slate-400 hover:text-white px-1 text-xs font-bold"
          >
            +
          </button>
        </div>

        {/* Inspect Query Button */}
        <button
          type="button"
          onClick={onSearch}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-nasa-blue to-nasa-cyan hover:opacity-90 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>Inspect</span>
        </button>
      </div>

      {/* Right: Data Source Badge & FITS Download */}
      <div className="flex items-center space-x-2">
        {/* Data Source Badge */}
        {dataSource === 'nasa_irsa_live' && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE NASA IRSA</span>
          </div>
        )}
        {dataSource === 'local_cache' && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-nasa-cyan/10 border border-nasa-cyan/30 text-nasa-cyan font-mono text-[11px] font-semibold">
            <Database className="w-3 h-3 text-nasa-cyan" />
            <span>LOCAL CACHE</span>
          </div>
        )}
        {dataSource === 'offline_sample' && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 text-amber-400" />
            <span>OFFLINE SAMPLE</span>
          </div>
        )}

        {/* FITS Export Button */}
        <a
          href={getFitsDownloadUrl(ra, dec, channelId, 'survey-1')}
          download
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-space-850 hover:bg-space-800 text-slate-300 hover:text-white border border-space-700 text-xs font-medium transition-colors"
        >
          <Download className="w-3 h-3 text-nasa-cyan" />
          <span>FITS</span>
        </a>
      </div>
    </div>
  );
};
