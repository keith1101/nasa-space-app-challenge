import React, { useEffect, useRef, useState } from 'react';
import { X, Flag, CheckCircle2, AlertCircle, Compass } from 'lucide-react';
import { CandidateFlagSubmission, MovingCandidate, Language } from '../types';
import { submitCandidateFlag } from '../services/api';
import { workstationTranslations } from '../data/workstationData';

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: MovingCandidate | null;
  ra: number;
  dec: number;
  channelId: number;
  lang?: Language;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  isOpen,
  onClose,
  candidate,
  ra,
  dec,
  channelId,
  lang = 'vi'
}) => {
  const t = workstationTranslations[lang].modal;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [observerName, setObserverName] = useState<string>('NASA Citizen Astronomer');
  const [classification, setClassification] = useState<string>('Planet X / TNO');
  const [notes, setNotes] = useState<string>(
    candidate
      ? t.detectedShift(candidate.type, candidate.angular_displacement_arcsec)
      : t.defaultNotes
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setNotes(
      candidate
        ? t.detectedShift(candidate.type, candidate.angular_displacement_arcsec)
        : t.defaultNotes
    );
  }, [candidate, lang]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);

    const payload: CandidateFlagSubmission = {
      candidate_id: candidate?.candidate_id,
      ra: candidate ? candidate.epoch2.ra_deg : ra,
      dec: candidate ? candidate.epoch2.dec_deg : dec,
      channel_id: channelId,
      observer_name: observerName,
      object_classification: classification,
      notes: notes
    };

    try {
      await submitCandidateFlag(payload);
      setStatusMsg({
        type: 'success',
        text: t.successMsg
      });
      setTimeout(() => {
        onClose();
        setStatusMsg(null);
      }, 1800);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || t.errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="candidate-dialog-title"
      className="fixed inset-0 z-50 m-auto w-full max-w-lg rounded-card border-2 border-spaceapps-electricblue bg-spaceapps-deepblue p-0 text-white shadow-2xl backdrop:bg-black/85 backdrop:backdrop-blur-md open:flex open:flex-col overflow-hidden font-sans"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-spaceapps-electricblue bg-spaceapps-electricblue px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-btn bg-spaceapps-neonyellow text-spaceapps-nearblack font-bold">
            <Flag className="h-5 w-5" />
          </div>
          <div>
            <h2 id="candidate-dialog-title" className="text-base font-extrabold uppercase tracking-wide text-white">
              {t.title}
            </h2>
            <p className="text-xs text-slate-200">
              {t.subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="focus-ring rounded-btn p-1.5 text-white hover:bg-spaceapps-neonblue transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Body */}
      <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
        {statusMsg && (
          <div
            role="status"
            className={`flex items-center space-x-2.5 p-3 rounded-btn text-xs font-semibold ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Coordinates readout */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-spaceapps-neonyellow block mb-1">
              {t.targetCoords}
            </label>
            <div className="bg-spaceapps-nearblack border border-spaceapps-electricblue px-3.5 py-2 rounded-btn text-xs font-mono font-bold text-white flex justify-between">
              <span>RA: {candidate ? candidate.epoch2.ra_deg.toFixed(6) : ra.toFixed(6)}°</span>
              <span>Dec: {candidate ? candidate.epoch2.dec_deg.toFixed(6) : dec.toFixed(6)}°</span>
              <span className="text-spaceapps-neonyellow">Ch: {channelId}</span>
            </div>
          </div>

          {/* Observer Name */}
          <div>
            <label htmlFor="observer-name" className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
              {t.observerLabel}
            </label>
            <input
              id="observer-name"
              type="text"
              required
              value={observerName}
              onChange={(e) => setObserverName(e.target.value)}
              className="focus-ring w-full rounded-btn border border-spaceapps-electricblue bg-spaceapps-nearblack px-3.5 py-2 text-xs font-sans text-white focus:outline-hidden"
              placeholder={t.observerPlaceholder}
            />
          </div>

          {/* Classification */}
          <div>
            <label htmlFor="classification-select" className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
              {t.classificationLabel}
            </label>
            <select
              id="classification-select"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="focus-ring w-full rounded-btn border border-spaceapps-electricblue bg-spaceapps-nearblack px-3.5 py-2 text-xs font-sans text-white cursor-pointer focus:outline-hidden"
            >
              <option value="Planet X / TNO">{t.classifications.planetX}</option>
              <option value="Brown Dwarf">{t.classifications.brownDwarf}</option>
              <option value="Asteroid">{t.classifications.asteroid}</option>
              <option value="Comet">{t.classifications.comet}</option>
              <option value="Optical Artifact">{t.classifications.artifact}</option>
            </select>
          </div>

          {/* Scientific Evidence Notes */}
          <div>
            <label htmlFor="notes-textarea" className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
              {t.notesLabel}
            </label>
            <textarea
              id="notes-textarea"
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="focus-ring w-full resize-none rounded-btn border border-spaceapps-electricblue bg-spaceapps-nearblack p-3 text-xs font-sans text-white focus:outline-hidden leading-relaxed"
              placeholder={t.notesPlaceholder}
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-spaceapps-electricblue/60">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring px-4 py-2 rounded-btn border border-spaceapps-electricblue text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-spaceapps-electricblue/50 transition-all active:scale-95"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring rounded-btn bg-spaceapps-neonyellow px-5 py-2 text-xs font-bold uppercase tracking-wider text-spaceapps-nearblack hover:bg-white hover:text-spaceapps-neonblue transition-all active:scale-95 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? t.submittingBtn : t.submitBtn}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
