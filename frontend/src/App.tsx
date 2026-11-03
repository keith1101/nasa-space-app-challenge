import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CoordinateSearch } from './components/CoordinateSearch';
import { BandSelector } from './components/BandSelector';
import { SkyViewer } from './components/SkyViewer';
import { AstrometryPanel } from './components/AstrometryPanel';
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
  // Backend Status
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);
  const [astropyVersion, setAstropyVersion] = useState<string>('');

  // Astronomical Query Parameters
  const [ra, setRa] = useState<number>(64.5000);
  const [dec, setDec] = useState<number>(12.8000);
  const [channelId, setChannelId] = useState<number>(60);
  const [stretch, setStretch] = useState<string>('asinh');
  const [colormap, setColormap] = useState<string>('magma');

  // Metadata catalogs
  const [detectorBands, setDetectorBands] = useState<DetectorBand[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [targets, setTargets] = useState<PresetTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>('planet-x-candidate');

  // Query Results
  const [blinkData, setBlinkData] = useState<BlinkResponse | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<MovingCandidate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal
  const [isFlagModalOpen, setIsFlagModalOpen] = useState<boolean>(false);

  // Initial Data Fetch
  useEffect(() => {
    async function initData() {
      try {
        const health = await fetchHealth();
        setBackendHealthy(true);
        setAstropyVersion(health.astropy_version);

        const bandsData = await fetchBands();
        setDetectorBands(bandsData.detector_bands);
        setChannels(bandsData.channels);

        const targetsData = await fetchTargets();
        setTargets(targetsData.targets);

        // Run initial sky query
        performQuery(64.5, 12.8, 60, 'asinh', 'magma');
      } catch (err: any) {
        console.warn('Backend not responding yet:', err);
        setErrorMsg('Connecting to local FastAPI AstroPy service...');
      }
    }
    initData();
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
      setErrorMsg(err.message || 'Failed to query celestial coordinates.');
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
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col selection:bg-nasa-cyan selection:text-space-950">
      <Navbar backendHealthy={backendHealthy} astropyVersion={astropyVersion} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {errorMsg && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2.5 rounded-xl text-xs font-mono flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => performQuery()}
              className="underline hover:text-white ml-2 font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Controls: Coordinates and Bands */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <CoordinateSearch
              ra={ra}
              dec={dec}
              onRaChange={(newRa) => {
                setRa(newRa);
                setSelectedTargetId(null);
              }}
              onDecChange={(newDec) => {
                setDec(newDec);
                setSelectedTargetId(null);
              }}
              targets={targets}
              onSelectTarget={handleSelectTarget}
              selectedTargetId={selectedTargetId}
              onSearch={() => performQuery(ra, dec, channelId, stretch, colormap)}
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-6">
            <BandSelector
              detectorBands={detectorBands}
              channels={channels}
              selectedChannelId={channelId}
              onSelectChannel={handleChannelChange}
            />
          </div>
        </div>

        {/* Core Visualization & Astrometry Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Sky Viewer (Blink / Side-by-Side / Diff) */}
          <div className="lg:col-span-8">
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
          </div>

          {/* Right: Astrometry Ledger & Candidate List */}
          <div className="lg:col-span-4">
            <AstrometryPanel
              blinkData={blinkData}
              onSelectCandidate={setSelectedCandidate}
              selectedCandidate={selectedCandidate}
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

      {/* Footer */}
      <footer className="border-t border-space-800 bg-space-900/60 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          NASA International Space Apps Challenge 2026 • Challenge: <strong>Planet X and SPHEREx</strong> • Open Source MIT License
        </p>
      </footer>
    </div>
  );
};
