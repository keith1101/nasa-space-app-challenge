import React from 'react';
import { Download, Flag, Target } from 'lucide-react';
import { MovingCandidate } from '../types';

interface AstrometryLedgerProps {
  candidates: MovingCandidate[];
  selectedCandidate: MovingCandidate | null;
  onSelectCandidate: (cand: MovingCandidate) => void;
  onOpenFlagModal: () => void;
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const exportData = (candidates: MovingCandidate[], format: 'csv' | 'json') => {
  const rows = candidates.map((candidate) => ({
    candidate_id: candidate.candidate_id,
    ra_deg: candidate.epoch2.ra_deg,
    dec_deg: candidate.epoch2.dec_deg,
    motion_arcsec_yr: candidate.estimated_motion_arcsec_yr,
    flux_delta: candidate.flux_delta ?? null,
    angular_displacement_arcsec: candidate.angular_displacement_arcsec,
    snr: candidate.snr,
    confidence: candidate.confidence_score
  }));
  const content = format === 'json' ? JSON.stringify(rows, null, 2) : [Object.keys(rows[0] ?? { candidate_id: '' }).join(','), ...rows.map((row) => Object.values(row).map((value) => csvCell(value ?? '')).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `spherex-candidates.${format}`; anchor.click(); URL.revokeObjectURL(url);
};

export const AstrometryLedger: React.FC<AstrometryLedgerProps> = ({ candidates = [], selectedCandidate, onSelectCandidate, onOpenFlagModal }) => (
  <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#060913] p-4 lg:p-6" aria-label="Candidate discovery ledger">
    <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-space-800 pb-3">
      <div><div className="flex items-center gap-2 text-cyan-200"><Target size={16}/><h2 className="text-sm font-semibold tracking-wide">CANDIDATE LEDGER</h2><span className="rounded bg-space-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">{candidates.length}</span></div><p className="mt-1 text-xs text-slate-400">Detected moving sources · astrometry from SPHEREx WCS</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!candidates.length} onClick={() => exportData(candidates, 'csv')} className="focus-ring flex items-center gap-1.5 rounded border border-space-700 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><Download size={13}/>Export CSV</button>
        <button type="button" disabled={!candidates.length} onClick={() => exportData(candidates, 'json')} className="focus-ring flex items-center gap-1.5 rounded border border-space-700 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><Download size={13}/>Export JSON</button>
        <button type="button" disabled={!selectedCandidate} onClick={onOpenFlagModal} className="focus-ring flex items-center gap-1.5 rounded bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"><Flag size={13}/>Flag selected</button>
      </div>
    </header>
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-[#060913] text-[10px] uppercase tracking-wider text-slate-400"><tr className="border-b border-space-700"><th className="px-3 py-2 font-medium">Candidate</th><th className="px-3 py-2 font-medium">RA (deg)</th><th className="px-3 py-2 font-medium">Dec (deg)</th><th className="px-3 py-2 font-medium">μ (arcsec/yr)</th><th className="px-3 py-2 font-medium">Δ Flux</th><th className="px-3 py-2 font-medium">S/N</th><th className="px-3 py-2 font-medium">Classification</th></tr></thead>
        <tbody>{candidates.map((candidate) => {
          const selected = selectedCandidate?.candidate_id === candidate.candidate_id;
          return <tr key={candidate.candidate_id} className={`border-b border-space-800/70 transition-colors hover:bg-space-900 ${selected ? 'bg-cyan-950/50' : ''}`}>
            <td className="px-3 py-3 font-mono font-semibold text-white"><button type="button" aria-pressed={selected} onClick={() => onSelectCandidate(candidate)} className="focus-ring text-left hover:text-cyan-100">{candidate.candidate_id}</button></td><td className="px-3 py-3 font-mono text-slate-200">{candidate.epoch2.ra_deg.toFixed(6)}</td><td className="px-3 py-3 font-mono text-slate-200">{candidate.epoch2.dec_deg.toFixed(6)}</td><td className="px-3 py-3 font-mono text-cyan-100">{candidate.estimated_motion_arcsec_yr.toFixed(2)}</td><td className="px-3 py-3 font-mono text-slate-300">{candidate.flux_delta == null ? '—' : candidate.flux_delta.toFixed(3)}</td><td className="px-3 py-3 font-mono text-amber-200">{candidate.snr.toFixed(1)}σ</td><td className="px-3 py-3 text-slate-300">{candidate.type}</td>
          </tr>;
        })}</tbody>
      </table>
      {!candidates.length && <div className="flex h-48 animate-pulse items-center justify-center text-xs text-slate-400">No detected dipoles in this field.</div>}
    </div>
    <p className="mt-2 shrink-0 text-[10px] text-slate-500">Flux delta is shown only when supplied by the detection API; no value is inferred.</p>
  </section>
);
