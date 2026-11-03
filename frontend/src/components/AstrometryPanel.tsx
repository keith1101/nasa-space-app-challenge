import React from 'react';
import { Target, Flag, Download, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { BlinkResponse, MovingCandidate } from '../types';
import { getFitsDownloadUrl } from '../services/api';

interface AstrometryPanelProps {
  blinkData: BlinkResponse | null;
  onSelectCandidate: (cand: MovingCandidate) => void;
  selectedCandidate: MovingCandidate | null;
  onOpenFlagModal: () => void;
}

export const AstrometryPanel: React.FC<AstrometryPanelProps> = ({
  blinkData,
  onSelectCandidate,
  selectedCandidate,
  onOpenFlagModal
}) => {
  const candidates = blinkData?.candidates_detected || [];

  return (
    <div className="bg-space-900 border border-space-800 rounded-2xl p-4 lg:p-5 shadow-xl flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Target className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            Astrometry Ledger & Candidates ({candidates.length})
          </h2>
        </div>

        {blinkData && (
          <a
            href={getFitsDownloadUrl(blinkData.ra, blinkData.dec, blinkData.channel_id, 'survey-1')}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-space-850 hover:bg-space-800 text-slate-200 border border-space-700 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-nasa-cyan" />
            <span>Export Raw FITS</span>
          </a>
        )}
      </div>

      {/* Candidate List / Cards */}
      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {candidates.length > 0 ? (
          candidates.map((cand) => {
            const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;
            return (
              <div
                key={cand.candidate_id}
                onClick={() => onSelectCandidate(cand)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-nasa-cyan/10 border-nasa-cyan shadow-lg shadow-nasa-cyan/10 ring-1 ring-nasa-cyan/40'
                    : 'bg-space-850/70 border-space-800 hover:bg-space-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-white text-sm">{cand.candidate_id}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-semibold">
                      {(cand.confidence_score * 100).toFixed(0)}% MATCH
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-nasa-cyan font-bold">
                    SNR: {cand.snr}σ
                  </span>
                </div>

                <p className="text-slate-300 font-medium mb-2">{cand.type}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-space-950/60 p-2 rounded-lg border border-space-800 mb-2">
                  <div>
                    <span className="text-slate-400 block">Angular Shift:</span>
                    <span className="text-white font-bold">{cand.angular_displacement_arcsec}″</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Apparent Motion:</span>
                    <span className="text-nasa-amber font-bold">{cand.estimated_motion_arcsec_yr}″/yr</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Epoch 1 Coord:</span>
                    <span className="text-slate-300">
                      {cand.epoch1 ? `${cand.epoch1.ra_deg.toFixed(3)}°, ${cand.epoch1.dec_deg.toFixed(3)}°` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Epoch 2 Coord:</span>
                    <span className="text-slate-300">
                      {cand.epoch2.ra_deg.toFixed(3)}°, {cand.epoch2.dec_deg.toFixed(3)}°
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Sexagesimal: {cand.epoch2.hms} {cand.epoch2.dms}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCandidate(cand);
                      onOpenFlagModal();
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-nasa-blue/20 hover:bg-nasa-blue/40 border border-nasa-blue/40 text-nasa-cyan text-xs font-semibold transition-colors"
                  >
                    <Flag className="w-3 h-3" />
                    <span>Report Finding</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-500 border border-dashed border-space-800 rounded-xl space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No significant shifting dipoles detected in this patch.</p>
            <p className="text-[11px] text-slate-600">Try inspecting the "Planet X Search Field" preset target.</p>
          </div>
        )}
      </div>

      {/* Citizen Science CTA Box */}
      <div className="mt-auto bg-gradient-to-br from-indigo-950/40 via-space-850 to-space-950 border border-indigo-900/40 rounded-xl p-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-nasa-amber" />
            <span>Citizen Science Flagging</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Discovered a new shifting celestial object? Submit your coordinates to the team catalog.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenFlagModal}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-nasa-blue to-indigo-600 hover:opacity-90 text-white font-semibold text-xs whitespace-nowrap shadow-md transition-all"
        >
          Flag Object
        </button>
      </div>
    </div>
  );
};
