import React, { useEffect, useState } from 'react';
import { X, Flag, CheckCircle2, AlertCircle } from 'lucide-react';
import { CandidateFlagSubmission, MovingCandidate } from '../types';
import { submitCandidateFlag } from '../services/api';

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: MovingCandidate | null;
  ra: number;
  dec: number;
  channelId: number;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({
  isOpen,
  onClose,
  candidate,
  ra,
  dec,
  channelId
}) => {
  const [observerName, setObserverName] = useState<string>('NASA Citizen Astronomer');
  const [classification, setClassification] = useState<string>('Planet X / TNO');
  const [notes, setNotes] = useState<string>(
    candidate
      ? `Detected ${candidate.type} shifting by ${candidate.angular_displacement_arcsec} arcsec over 6-month survey interval.`
      : 'Visual inspection shows distinct shifting dipole between Survey 1 and Survey 2.'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setNotes(candidate
      ? `Detected ${candidate.type} shifting by ${candidate.angular_displacement_arcsec} arcsec over the survey interval.`
      : 'Visual inspection evidence and notes.');
  }, [candidate]);

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
      setStatusMsg({ type: 'success', text: 'Candidate successfully logged into the NASA SPHEREx discovery database!' });
      setTimeout(() => {
        onClose();
        setStatusMsg(null);
      }, 1800);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-space-950/80 p-4 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="candidate-dialog-title" className="relative w-full max-w-md border border-space-700 bg-space-900 p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close candidate flag form"
          className="focus-ring absolute right-3 top-3 rounded p-1.5 text-slate-300 hover:bg-space-800 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-nasa-blue/20 border border-nasa-blue/40 flex items-center justify-center text-nasa-cyan">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 id="candidate-dialog-title" className="text-base font-bold text-white">Flag candidate</h3>
            <p className="text-xs text-slate-400">Citizen Science Reporting Registry</p>
          </div>
        </div>

        {statusMsg && (
          <div
            role="status"
            className={`mb-4 flex items-center space-x-2 p-3 text-xs ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Target Coordinates (Epoch 2 J2000):</label>
            <div className="bg-space-950 border border-space-800 px-3 py-2 rounded-xl text-xs font-mono text-slate-200">
              RA: {candidate ? candidate.epoch2.ra_deg.toFixed(4) : ra.toFixed(4)}° • Dec:{' '}
              {candidate ? candidate.epoch2.dec_deg.toFixed(4) : dec.toFixed(4)}°
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Observer / Team Name:</label>
            <input
              type="text"
              required
              value={observerName}
              onChange={(e) => setObserverName(e.target.value)}
              className="focus-ring w-full border border-space-700 bg-space-950 px-3 py-2 text-xs font-mono text-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Hypothesized Classification:</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="focus-ring w-full border border-space-700 bg-space-950 px-3 py-2 text-xs text-slate-200"
            >
              <option value="Asteroid">Asteroid</option>
              <option value="Comet">Comet</option>
              <option value="Brown Dwarf">Brown Dwarf</option>
              <option value="Planet X / TNO">Planet X / TNO</option>
              <option value="Optical Artifact">Optical Artifact</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Observation Notes & Scientific Evidence:</label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="focus-ring w-full resize-none border border-space-700 bg-space-950 px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-space-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Submit Finding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
