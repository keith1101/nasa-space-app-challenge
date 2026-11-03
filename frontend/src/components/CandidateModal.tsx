import React, { useState } from 'react';
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
  const [classification, setClassification] = useState<string>('Planet X / Distant Trans-Neptunian');
  const [notes, setNotes] = useState<string>(
    candidate
      ? `Detected ${candidate.type} shifting by ${candidate.angular_displacement_arcsec} arcsec over 6-month survey interval.`
      : 'Visual inspection shows distinct shifting dipole between Survey 1 and Survey 2.'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md">
      <div className="bg-space-900 border border-space-750 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-space-850 hover:bg-space-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-nasa-blue/20 border border-nasa-blue/40 flex items-center justify-center text-nasa-cyan">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Flag Moving Object Candidate</h3>
            <p className="text-xs text-slate-400">Citizen Science Reporting Registry</p>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs flex items-center space-x-2 ${
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
              className="w-full bg-space-950 border border-space-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-nasa-cyan"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Hypothesized Classification:</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full bg-space-950 border border-space-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-nasa-cyan"
            >
              <option value="Planet X / Distant Trans-Neptunian">Planet X / Distant Trans-Neptunian</option>
              <option value="Kuiper Belt Object (KBO)">Kuiper Belt Object (KBO)</option>
              <option value="Near-Earth Asteroid (NEA)">Near-Earth Asteroid (NEA)</option>
              <option value="High Proper Motion Brown Dwarf (Y/T Dwarf)">High Proper Motion Brown Dwarf (Y/T Dwarf)</option>
              <option value="Variable Star / Transient Exoplanet Transit">Variable Star / Transient Exoplanet Transit</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Observation Notes & Scientific Evidence:</label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-space-950 border border-space-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nasa-cyan resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-space-850 hover:bg-space-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-nasa-blue via-indigo-600 to-nasa-cyan text-white text-xs font-semibold shadow-lg shadow-nasa-cyan/20 hover:opacity-95 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Registering...' : 'Submit Finding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
