import React from 'react';
import { Target, Flag, ShieldCheck } from 'lucide-react';
import { MovingCandidate } from '../types';

interface AstrometryLedgerProps {
  candidates: MovingCandidate[];
  selectedCandidate: MovingCandidate | null;
  onSelectCandidate: (cand: MovingCandidate) => void;
  onOpenFlagModal: () => void;
}

export const AstrometryLedger: React.FC<AstrometryLedgerProps> = ({
  candidates = [],
  selectedCandidate,
  onSelectCandidate,
  onOpenFlagModal
}) => {
  return (
    <div className="bg-space-900 border border-space-800 rounded-xl p-3.5 shadow-lg flex flex-col">
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-space-800">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">
            Astrometric Detections ({candidates.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={onOpenFlagModal}
          className="flex items-center space-x-1 text-[11px] font-semibold text-nasa-cyan hover:text-white px-2 py-0.5 rounded bg-nasa-blue/20 hover:bg-nasa-blue/40 border border-nasa-blue/40 transition-colors"
        >
          <Flag className="w-3 h-3" />
          <span>Flag Finding</span>
        </button>
      </div>

      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
        {candidates.length > 0 ? (
          candidates.map((cand) => {
            const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;
            return (
              <div
                key={cand.candidate_id}
                onClick={() => onSelectCandidate(cand)}
                className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-nasa-cyan/10 border-nasa-cyan text-white shadow-md'
                    : 'bg-space-850/60 border-space-800 text-slate-300 hover:bg-space-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-white">{cand.candidate_id}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {(cand.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
                  <span>Δθ: <strong className="text-white">{cand.angular_displacement_arcsec}″</strong></span>
                  <span>μ: <strong className="text-nasa-amber">{cand.estimated_motion_arcsec_yr}″/yr</strong></span>
                  <span>SNR: <strong className="text-nasa-cyan">{cand.snr}σ</strong></span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-4 text-center text-slate-500 text-[11px] flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>No shifting dipoles detected in current field.</span>
          </div>
        )}
      </div>
    </div>
  );
};
