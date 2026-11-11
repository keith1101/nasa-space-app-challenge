import React from 'react';
import { Search, Download, Database, CheckCircle2, ChevronDown, Compass } from 'lucide-react';
import { PresetTarget, Language } from '../types';
import { getFitsDownloadUrl } from '../services/api';
import { workstationTranslations } from '../data/workstationData';

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
  lang?: Language;
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
  wavelengthUm = 2.45,
  lang = 'vi'
}) => {
  const t = workstationTranslations[lang].toolbar;

  return (
    <div className="shrink-0 bg-spaceapps-deepblue border-b border-spaceapps-electricblue px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-white font-sans shadow-xs">
      {/* Left: Preset Selector & Coordinates */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Preset Target Dropdown */}
        <div className="relative">
          <label htmlFor="preset-target-select" className="sr-only">
            {t.presetLabel}
          </label>
          <select
            id="preset-target-select"
            value={selectedTargetId || ''}
            onChange={(e) => {
              const target = targets.find((item) => item.id === e.target.value);
              if (target) onSelectTarget(target);
            }}
            aria-label={t.presetLabel}
            className="focus-ring appearance-none bg-spaceapps-nearblack border border-spaceapps-electricblue hover:border-spaceapps-neonblue rounded-btn pl-3 pr-8 py-1.5 text-xs font-semibold text-white cursor-pointer transition-colors"
          >
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        {/* RA Input */}
        <div className="flex items-center space-x-1.5 bg-spaceapps-nearblack px-2.5 py-1 rounded-btn border border-spaceapps-electricblue hover:border-spaceapps-neonblue transition-colors">
          <label htmlFor="ra-input" className="text-[11px] font-mono font-bold text-spaceapps-neonyellow cursor-pointer">
            {t.raLabel}
          </label>
          <input
            id="ra-input"
            type="number"
            step="0.001"
            min="0"
            max="359.999"
            value={ra}
            onChange={(e) => onRaChange(parseFloat(e.target.value) || 0)}
            aria-label="Right ascension in degrees (J2000)"
            className="focus-ring w-20 bg-transparent text-xs font-mono text-white text-right font-medium focus:outline-hidden"
          />
          <span className="text-[10px] text-slate-400 font-mono">°</span>
        </div>

        {/* Dec Input */}
        <div className="flex items-center space-x-1.5 bg-spaceapps-nearblack px-2.5 py-1 rounded-btn border border-spaceapps-electricblue hover:border-spaceapps-neonblue transition-colors">
          <label htmlFor="dec-input" className="text-[11px] font-mono font-bold text-spaceapps-neonyellow cursor-pointer">
            {t.decLabel}
          </label>
          <input
            id="dec-input"
            type="number"
            step="0.001"
            min="-90"
            max="90"
            value={dec}
            onChange={(e) => onDecChange(parseFloat(e.target.value) || 0)}
            aria-label="Declination in degrees (J2000)"
            className="focus-ring w-18 bg-transparent text-xs font-mono text-white text-right font-medium focus:outline-hidden"
          />
          <span className="text-[10px] text-slate-400 font-mono">°</span>
        </div>

        {/* Channel Stepper */}
        <div className="flex items-center space-x-1 bg-spaceapps-nearblack px-2 py-1 rounded-btn border border-spaceapps-electricblue">
          <button
            type="button"
            onClick={() => onChannelChange(Math.max(1, channelId - 1))}
            aria-label={t.prevChannel}
            className="focus-ring rounded px-2 py-0.5 text-xs font-bold text-slate-300 hover:text-spaceapps-neonyellow hover:bg-spaceapps-electricblue/60 active:scale-95 transition-all"
          >
            −
          </button>
          <span className="text-xs font-mono text-spaceapps-neonyellow font-bold px-1.5">
            {t.channel} {channelId}{' '}
            <span className="text-slate-300 font-normal">({wavelengthUm.toFixed(2)} µm)</span>
          </span>
          <button
            type="button"
            onClick={() => onChannelChange(Math.min(102, channelId + 1))}
            aria-label={t.nextChannel}
            className="focus-ring rounded px-2 py-0.5 text-xs font-bold text-slate-300 hover:text-spaceapps-neonyellow hover:bg-spaceapps-electricblue/60 active:scale-95 transition-all"
          >
            +
          </button>
        </div>

        {/* Inspect Query Button */}
        <button
          type="button"
          onClick={onSearch}
          disabled={isLoading}
          className="focus-ring flex items-center space-x-1.5 px-3.5 py-1.5 rounded-btn bg-spaceapps-neonyellow text-spaceapps-nearblack hover:bg-white hover:text-spaceapps-neonblue active:scale-95 text-xs font-bold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-spaceapps-nearblack/30 border-t-spaceapps-nearblack rounded-full animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>{isLoading ? t.inspecting : t.inspectBtn}</span>
        </button>
      </div>

      {/* Right: Data Source Badge & FITS Download */}
      <div className="flex items-center space-x-2">
        {/* Data Source Badge */}
        {dataSource === 'nasa_irsa_live' && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-btn bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t.liveSource}</span>
          </div>
        )}
        {dataSource === 'local_cache' && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-btn bg-spaceapps-neonblue/20 border border-spaceapps-neonblue/50 text-spaceapps-blueyonder font-mono text-[11px] font-bold">
            <Database className="w-3 h-3 text-spaceapps-blueyonder" />
            <span>{t.cacheSource}</span>
          </div>
        )}
        {dataSource === 'offline_sample' && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-btn bg-amber-500/15 border border-amber-500/40 text-spaceapps-neonyellow font-mono text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-spaceapps-neonyellow" />
            <span>{t.offlineSource}</span>
          </div>
        )}

        {/* FITS Export Button */}
        <a
          href={getFitsDownloadUrl(ra, dec, channelId, 'survey-1')}
          download
          className="focus-ring flex items-center space-x-1.5 px-3 py-1 rounded-btn bg-spaceapps-electricblue/40 hover:bg-spaceapps-neonblue text-white border border-spaceapps-electricblue text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5 text-spaceapps-neonyellow" />
          <span>{t.fitsBtn}</span>
        </a>
      </div>
    </div>
  );
};
