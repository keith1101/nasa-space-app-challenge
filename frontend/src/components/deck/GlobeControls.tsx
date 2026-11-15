import { Globe, Map as MapIcon, Compass, Mountain, Eye } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';
import { Tooltip } from '../ui/Tooltip';
import { cx } from '../ui';

interface GlobeControlsProps {
  pitch: number;
  bearing: number;
  onResetNorth: () => void;
  onSetCameraAngle: (pitch: number, bearing?: number) => void;
}

export function GlobeControls({
  pitch,
  bearing,
  onResetNorth,
  onSetCameraAngle,
}: GlobeControlsProps) {
  const {
    lang,
    is3DMode,
    toggle3DMode,
    terrainEnabled,
    setTerrainEnabled,
    terrainExaggeration,
    setTerrainExaggeration,
  } = useUiStore();

  const isVi = lang === 'vi';

  return (
    <div className="absolute top-16 right-4 z-20 flex flex-col gap-2 items-end">
      {/* 2D / 3D Mode Toggle Pill */}
      <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl shadow-black/50">
        <button
          type="button"
          onClick={() => {
            if (is3DMode) toggle3DMode();
          }}
          className={cx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
            !is3DMode
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>2D Map</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!is3DMode) toggle3DMode();
          }}
          className={cx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
            is3DMode
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          )}
        >
          <Globe className="w-3.5 h-3.5 animate-pulse" />
          <span>3D Globe</span>
        </button>
      </div>

      {/* 3D Special Controls (Only visible when 3D Mode is active) */}
      {is3DMode && (
        <div className="flex flex-col gap-2 p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl shadow-black/50 w-52 animate-fadeIn">
          {/* Compass & Quick Orientations */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {isVi ? 'Góc Nhìn 3D' : 'Camera 3D'}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
              <span>{Math.round(pitch)}°P</span>
              <span>•</span>
              <span>{Math.round(bearing)}°B</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <Tooltip content={isVi ? 'Quay về hướng Bắc' : 'Reset to North'}>
              <button
                type="button"
                onClick={onResetNorth}
                className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[10px]"
              >
                <Compass
                  className="w-4 h-4 mb-0.5 text-sky-400 transition-transform duration-300"
                  style={{ transform: `rotate(${-bearing}deg)` }}
                />
                <span>North</span>
              </button>
            </Tooltip>

            <Tooltip content={isVi ? 'Góc nghiêng 45°' : 'Tilt 45°'}>
              <button
                type="button"
                onClick={() => onSetCameraAngle(45)}
                className={cx(
                  'flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] transition-colors',
                  Math.abs(pitch - 45) < 5
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                )}
              >
                <Eye className="w-4 h-4 mb-0.5" />
                <span>45°</span>
              </button>
            </Tooltip>

            <Tooltip content={isVi ? 'Đường chân trời 70°' : 'Horizon 70°'}>
              <button
                type="button"
                onClick={() => onSetCameraAngle(70)}
                className={cx(
                  'flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] transition-colors',
                  Math.abs(pitch - 70) < 5
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                )}
              >
                <Mountain className="w-4 h-4 mb-0.5" />
                <span>70°</span>
              </button>
            </Tooltip>
          </div>

          {/* 3D Elevation Terrain Switcher */}
          <div className="pt-1 border-t border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="terrain-toggle"
                className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer"
              >
                <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isVi ? 'Địa hình 3D (DEM)' : '3D Terrain'}</span>
              </label>
              <input
                id="terrain-toggle"
                type="checkbox"
                checked={terrainEnabled}
                onChange={(e) => setTerrainEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
              />
            </div>

            {terrainEnabled && (
              <div className="flex flex-col gap-1 pl-5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{isVi ? 'Độ gồ ghề' : 'Exaggeration'}</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {terrainExaggeration.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                  value={terrainExaggeration}
                  onChange={(e) => setTerrainExaggeration(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
