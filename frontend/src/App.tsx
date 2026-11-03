import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CompactToolbar } from './components/CompactToolbar';
import { SkyViewer } from './components/SkyViewer';
import { SpectralProfile } from './components/SpectralProfile';
import { AstrometryLedger } from './components/AstrometryLedger';
import { CandidateModal } from './components/CandidateModal';
import {
  BlinkResponse,
  ChannelInfo,
  DetectorBand,
  MovingCandidate,
  PresetTarget
} from './types';
import {
  fetchBands,
  fetchBlinkComparison,
  fetchHealth,
  fetchTargets
} from './services/api';

export const App: React.FC = () => {
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);
  const [astropyVersion, setAstropyVersion] = useState<string>('');

  // Coordinates & Query state
  const [ra, setRa] = useState<number>(305.5988);
  const [dec, setDec] = useState<number>(41.1489);
  const [channelId, setChannelId] = useState<number>(60);
  const [stretch, setStretch] = useState<string>('asinh');
  const [colormap, setColormap] = useState<string>('magma');

  // Metadata
  const [targets, setTargets] = useState<PresetTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>('cygnus-deep-field');

  // Query Results
  const [blinkData, setBlinkData] = useState<BlinkResponse | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<MovingCandidate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal
  const [isFlagModalOpen, setIsFlagModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      try {
        const health = await fetchHealth();
        setBackendHealthy(true);
        setAstropyVersion(health.astropy_version);

        const targetsData = await fetchTargets();
        setTargets(targetsData.targets);

        // Run initial sky query for Cygnus field (real SPHEREx QR2 coverage)
        performQuery(305.5988, 41.1489, 60, 'asinh', 'magma');
      } catch (err: any) {
        setErrorMsg('Connecting to local FastAPI AstroPy service...');
      }
    }
    init();
  }, []);

  const performQuery = async (
    targetRa: number = ra,
    targetDec: number = dec,
    targetCh: number = channelId,
    targetStretch: string = stretch,
    targetCmap: string = colormap
  ) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchBlinkComparison({
        ra: targetRa,
        dec: targetDec,
        channel_id: targetCh,
        epoch1_id: 'survey-1',
        epoch2_id: 'survey-2',
        sigma_threshold: 3.5,
        stretch: targetStretch,
        colormap: targetCmap
      });
      setBlinkData(data);
      if (data.candidates_detected && data.candidates_detected.length > 0) {
        setSelectedCandidate(data.candidates_detected[0]);
      } else {
        setSelectedCandidate(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to query coordinates from NASA IRSA service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTarget = (target: PresetTarget) => {
    setSelectedTargetId(target.id);
    setRa(target.ra);
    setDec(target.dec);
    performQuery(target.ra, target.dec, channelId, stretch, colormap);
  };

  const handleChannelChange = (newChId: number) => {
    setChannelId(newChId);
    performQuery(ra, dec, newChId, stretch, colormap);
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-nasa-cyan selection:text-[#060913]">
      <Navbar backendHealthy={backendHealthy} astropyVersion={astropyVersion} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-4 space-y-4">
        {errorMsg && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => performQuery()}
              className="underline hover:text-white font-bold ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Compact Exploration Toolbar */}
        <CompactToolbar
          ra={ra}
          dec={dec}
          onRaChange={(val) => {
            setRa(val);
            setSelectedTargetId(null);
          }}
          onDecChange={(val) => {
            setDec(val);
            setSelectedTargetId(null);
          }}
          channelId={channelId}
          onChannelChange={handleChannelChange}
          targets={targets}
          selectedTargetId={selectedTargetId}
          onSelectTarget={handleSelectTarget}
          onSearch={() => performQuery(ra, dec, channelId, stretch, colormap)}
          isLoading={isLoading}
          dataSource={blinkData?.data_source}
          wavelengthUm={blinkData?.wavelength_um}
        />

        {/* 2. Core Sky Viewer (Blink Comparator ⇄ DIA Difference) */}
        <SkyViewer
          blinkData={blinkData}
          isLoading={isLoading}
          onSelectCandidate={setSelectedCandidate}
          selectedCandidate={selectedCandidate}
          stretch={stretch}
          onStretchChange={setStretch}
          colormap={colormap}
          onColormapChange={setColormap}
          onRequery={() => performQuery(ra, dec, channelId, stretch, colormap)}
        />

        {/* 3. Bottom Grid: 1D Spectral Profile & Astrometry Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <SpectralProfile
              spectralProfile={blinkData?.spectral_profile}
              currentChannelId={channelId}
              onSelectChannel={handleChannelChange}
            />
          </div>

          <div className="lg:col-span-5">
            <AstrometryLedger
              candidates={blinkData?.candidates_detected || []}
              selectedCandidate={selectedCandidate}
              onSelectCandidate={setSelectedCandidate}
              onOpenFlagModal={() => setIsFlagModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Candidate Flagging Modal */}
      <CandidateModal
        isOpen={isFlagModalOpen}
        onClose={() => setIsFlagModalOpen(false)}
        candidate={selectedCandidate}
        ra={ra}
        dec={dec}
        channelId={channelId}
      />

      <footer className="border-t border-space-850 py-3 text-center text-[11px] font-mono text-slate-500">
        NASA Space Apps Challenge 2026 • SPHEREx All-Sky Time-Lapse & Planet X Explorer • MIT Open Source
      </footer>
    </div>
  );
};
