import React from 'react';
import { Layers, Activity, Info } from 'lucide-react';
import { ChannelInfo, DetectorBand } from '../types';

interface BandSelectorProps {
  detectorBands: DetectorBand[];
  channels: ChannelInfo[];
  selectedChannelId: number;
  onSelectChannel: (channelId: number) => void;
}

export const BandSelector: React.FC<BandSelectorProps> = ({
  detectorBands,
  channels,
  selectedChannelId,
  onSelectChannel
}) => {
  const currentChannel = channels.find((c) => c.channel_id === selectedChannelId) || channels[50];
  const currentBand = detectorBands.find((b) => b.band_id === currentChannel?.band_id) || detectorBands[3];

  return (
    <div className="bg-space-900 border border-space-800 rounded-2xl p-4 lg:p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            SPHEREx Spectrophotometry (102 Bands)
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">Current λ:</span>
          <span className="text-nasa-cyan font-bold bg-space-850 px-2 py-0.5 rounded border border-space-700">
            {currentChannel?.wavelength_um.toFixed(3)} µm
          </span>
          <span className="text-slate-500">R ~ {currentChannel?.resolving_power}</span>
        </div>
      </div>

      {/* 6 Detector Array Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {detectorBands.map((band) => {
          const isSelected = currentBand?.band_id === band.band_id;
          return (
            <button
              key={band.band_id}
              type="button"
              onClick={() => {
                // Select the middle channel in this band
                const bandChannels = channels.filter((c) => c.band_id === band.band_id);
                if (bandChannels.length > 0) {
                  const mid = bandChannels[Math.floor(bandChannels.length / 2)];
                  onSelectChannel(mid.channel_id);
                }
              }}
              className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10 ring-1 ring-indigo-400/50'
                  : 'bg-space-850/60 border-space-750 text-slate-300 hover:bg-space-800 hover:border-slate-600'
              }`}
            >
              <div className="font-semibold text-slate-100 flex items-center justify-between">
                <span>{band.name.split(' ')[0]} {band.name.split(' ')[1]}</span>
                <span className="text-[10px] text-slate-400 font-mono">17 ch</span>
              </div>
              <div className="text-[11px] font-mono text-indigo-300 mt-0.5">
                {band.lambda_min.toFixed(2)} - {band.lambda_max.toFixed(2)} µm
              </div>
            </button>
          );
        })}
      </div>

      {/* 102 Channel Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-nasa-cyan" />
            Channel Slider (1 to 102):
          </span>
          <span className="font-mono text-slate-300">
            Channel #{currentChannel?.channel_id} ({currentChannel?.detector_name})
          </span>
        </div>

        <input
          type="range"
          min="1"
          max="102"
          value={selectedChannelId}
          onChange={(e) => onSelectChannel(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-space-950 rounded-lg appearance-none cursor-pointer accent-nasa-cyan"
        />

        <div className="flex justify-between text-[11px] font-mono text-slate-500 px-1">
          <span>Ch 1 (0.75 µm, SWIR)</span>
          <span className="text-indigo-400">Ch 51 (2.50 µm, MWIR Boundary)</span>
          <span>Ch 102 (5.00 µm, Cold MWIR)</span>
        </div>
      </div>

      {/* Spectral Science Tip */}
      <div className="mt-3 bg-space-850/50 border border-space-800 rounded-xl p-2.5 flex items-start space-x-2 text-xs text-slate-400">
        <Info className="w-4 h-4 text-nasa-cyan shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-200">Planet X Diagnostic:</strong> Cold outer Solar System bodies (temperature ~35 - 45 K) have peak blackbody emission in <span className="text-nasa-cyan font-mono font-medium">Bands 4, 5, and 6 (2.4 - 5.0 µm)</span>, while classical stars radiate mostly in <span className="text-indigo-300 font-mono font-medium">Bands 1-2 (0.75 - 1.6 µm)</span>.
        </p>
      </div>
    </div>
  );
};
