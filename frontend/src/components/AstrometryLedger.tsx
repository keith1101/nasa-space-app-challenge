import React from 'react';
import { Download, Flag, Target, Compass, Sparkles } from 'lucide-react';
import { MovingCandidate, Language } from '../types';
import { workstationTranslations } from '../data/workstationData';

interface AstrometryLedgerProps {
  candidates: MovingCandidate[];
  selectedCandidate: MovingCandidate | null;
  onSelectCandidate: (cand: MovingCandidate) => void;
  onOpenFlagModal: () => void;
  lang?: Language;
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

  const content =
    format === 'json'
      ? JSON.stringify(rows, null, 2)
      : [
          Object.keys(rows[0] ?? { candidate_id: '' }).join(','),
          ...rows.map((row) => Object.values(row).map((value) => csvCell(value ?? '')).join(','))
        ].join('\n');

  const url = URL.createObjectURL(
    new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' })
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `spherex-candidates.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const AstrometryLedger: React.FC<AstrometryLedgerProps> = ({
  candidates = [],
  selectedCandidate,
  onSelectCandidate,
  onOpenFlagModal,
  lang = 'vi'
}) => {
  const t = workstationTranslations[lang].ledger;

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden bg-spaceapps-nearblack p-4 lg:p-6 font-sans text-white"
      aria-label="Candidate discovery ledger"
    >
      {/* Header */}
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-spaceapps-electricblue pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-spaceapps-neonyellow" />
            <h2 className="text-base font-extrabold uppercase tracking-wider text-white">
              {t.title}
            </h2>
            <span className="rounded-btn bg-spaceapps-neonyellow px-2 py-0.5 font-mono text-xs font-bold text-spaceapps-nearblack">
              {candidates.length} {t.targetsCount}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-300">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!candidates.length}
            onClick={() => exportData(candidates, 'csv')}
            className="focus-ring flex items-center gap-1.5 rounded-btn border border-spaceapps-electricblue bg-spaceapps-deepblue px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:border-spaceapps-neonblue hover:bg-spaceapps-electricblue/60 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5 text-spaceapps-neonyellow" />
            <span>{t.exportCsv}</span>
          </button>

          <button
            type="button"
            disabled={!candidates.length}
            onClick={() => exportData(candidates, 'json')}
            className="focus-ring flex items-center gap-1.5 rounded-btn border border-spaceapps-electricblue bg-spaceapps-deepblue px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:border-spaceapps-neonblue hover:bg-spaceapps-electricblue/60 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5 text-spaceapps-neonyellow" />
            <span>{t.exportJson}</span>
          </button>

          <button
            type="button"
            disabled={!selectedCandidate}
            onClick={onOpenFlagModal}
            className="focus-ring flex items-center gap-1.5 rounded-btn bg-spaceapps-neonyellow px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-spaceapps-nearblack hover:bg-white hover:text-spaceapps-neonblue active:scale-95 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Flag className="h-3.5 w-3.5" />
            <span>{t.flagSelected}</span>
          </button>
        </div>
      </header>

      {/* Table Container */}
      <div className="min-h-0 flex-1 overflow-auto rounded-card border border-spaceapps-electricblue bg-spaceapps-deepblue/90 shadow-md">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-spaceapps-electricblue text-[11px] uppercase tracking-wider text-white font-mono font-bold shadow-xs">
            <tr className="border-b border-spaceapps-electricblue">
              <th className="px-4 py-3">{t.colCandidate}</th>
              <th className="px-4 py-3">{t.colRa}</th>
              <th className="px-4 py-3">{t.colDec}</th>
              <th className="px-4 py-3">{t.colMotion}</th>
              <th className="px-4 py-3">{t.colDeltaFlux}</th>
              <th className="px-4 py-3">{t.colSnr}</th>
              <th className="px-4 py-3">{t.colClassification}</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => {
              const selected = selectedCandidate?.candidate_id === candidate.candidate_id;
              return (
                <tr
                  key={candidate.candidate_id}
                  onClick={() => onSelectCandidate(candidate)}
                  className={`cursor-pointer border-b border-spaceapps-electricblue/40 transition-colors ${
                    selected
                      ? 'bg-spaceapps-neonblue/25 border-l-4 border-l-spaceapps-neonyellow'
                      : 'hover:bg-spaceapps-electricblue/30'
                  }`}
                >
                  <td className="px-4 py-3 font-mono font-bold text-white">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelectCandidate(candidate)}
                      className="focus-ring text-left text-spaceapps-neonyellow hover:underline font-bold"
                    >
                      {candidate.candidate_id}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-200">{candidate.epoch2.ra_deg.toFixed(6)}°</td>
                  <td className="px-4 py-3 font-mono text-slate-200">{candidate.epoch2.dec_deg.toFixed(6)}°</td>
                  <td className="px-4 py-3 font-mono font-semibold text-spaceapps-blueyonder">
                    {candidate.estimated_motion_arcsec_yr.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {candidate.flux_delta == null ? '—' : candidate.flux_delta.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    {candidate.snr.toFixed(1)}σ
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-200 font-medium">
                    <span className="rounded-btn bg-spaceapps-nearblack px-2 py-0.5 border border-spaceapps-electricblue text-xs">
                      {candidate.type}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Enhanced Empty State for DesignOS Compliance */}
        {!candidates.length && (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-spaceapps-electricblue bg-spaceapps-deepblue">
              <Target className="h-8 w-8 text-spaceapps-neonyellow" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              {t.emptyTitle}
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-300">
              {t.emptyDesc}
            </p>
          </div>
        )}
      </div>

      {/* Footnote */}
      <p className="mt-3 shrink-0 text-[11px] text-slate-400 font-sans">
        {t.footnote}
      </p>
    </section>
  );
};
