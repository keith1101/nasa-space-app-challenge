import React, { useEffect, useState } from 'react';
import { Activity, Eye, Layers, Radio, Target } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { CompactToolbar } from './components/CompactToolbar';
import { SkyViewer } from './components/SkyViewer';
import { SpectralProfile } from './components/SpectralProfile';
import { AstrometryLedger } from './components/AstrometryLedger';
import { CandidateModal } from './components/CandidateModal';
import { BlinkResponse, MovingCandidate, ObservationMode, PresetTarget } from './types';
import { fetchBlinkComparison, fetchHealth, fetchTargets } from './services/api';

const modes: { id: ObservationMode; label: string; icon: React.ReactNode }[] = [
  { id: 'blink', label: 'Blink comparator', icon: <Eye size={14}/> },
  { id: 'side_by_side', label: 'Synchronized epochs', icon: <Radio size={14}/> },
  { id: 'difference', label: 'Difference imaging', icon: <Layers size={14}/> },
  { id: 'spectral', label: 'Spectral profile', icon: <Activity size={14}/> },
  { id: 'candidates', label: 'Candidate ledger', icon: <Target size={14}/> }
];

export const App: React.FC = () => {
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [astropyVersion, setAstropyVersion] = useState('');
  const [ra, setRa] = useState(305.5988);
  const [dec, setDec] = useState(41.1489);
  const [channelId, setChannelId] = useState(60);
  const [stretch, setStretch] = useState('asinh');
  const [colormap, setColormap] = useState('magma');
  const [sigmaThreshold, setSigmaThreshold] = useState(3.5);
  const [mode, setMode] = useState<ObservationMode>('blink');
  const [redMode, setRedMode] = useState(false);
  const [targets, setTargets] = useState<PresetTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>('cygnus-deep-field');
  const [blinkData, setBlinkData] = useState<BlinkResponse | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<MovingCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);

  const performQuery = async (targetRa = ra, targetDec = dec, targetChannel = channelId, targetStretch = stretch, targetColormap = colormap, targetSigma = sigmaThreshold) => {
    setIsLoading(true); setErrorMsg(null);
    try {
      const data = await fetchBlinkComparison({ ra: targetRa, dec: targetDec, channel_id: targetChannel, epoch1_id: 'survey-1', epoch2_id: 'survey-2', sigma_threshold: targetSigma, stretch: targetStretch, colormap: targetColormap });
      setBlinkData(data);
      setSelectedCandidate(data.candidates_detected?.[0] ?? null);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'NASA IRSA query failed.');
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        const health = await fetchHealth();
        if (mounted) { setBackendHealthy(true); setAstropyVersion(health.astropy_version); }
      } catch { if (mounted) setErrorMsg('Unable to reach the local AstroPy service. Check that the API is running.'); }
      try { const result = await fetchTargets(); if (mounted) setTargets(result.targets); } catch { /* API status is also shown in the header. */ }
      if (mounted) void performQuery(305.5988, 41.1489, 60, 'asinh', 'magma', 3.5);
    };
    void initialize();
    return () => { mounted = false; };
  }, []);

  const handleChannelChange = (next: number) => { const value = Math.max(1, Math.min(102, next)); setChannelId(value); void performQuery(ra, dec, value); };
  const handleTargetSelect = (target: PresetTarget) => { setSelectedTargetId(target.id); setRa(target.ra); setDec(target.dec); void performQuery(target.ra, target.dec); };
  const handlePickCoordinate = (nextRa: number, nextDec: number) => { setRa(nextRa); setDec(nextDec); setSelectedTargetId(null); void performQuery(nextRa, nextDec); };

  return <div className={`flex h-screen w-full flex-col overflow-hidden bg-[#060913] text-slate-100 ${redMode ? 'night-vision-red' : ''}`}>
    <Navbar backendHealthy={backendHealthy} astropyVersion={astropyVersion} redMode={redMode} onToggleRedMode={() => setRedMode((value) => !value)}/>
    <CompactToolbar ra={ra} dec={dec} onRaChange={(value) => { setRa(value); setSelectedTargetId(null); }} onDecChange={(value) => { setDec(value); setSelectedTargetId(null); }} channelId={channelId} onChannelChange={handleChannelChange} targets={targets} selectedTargetId={selectedTargetId} onSelectTarget={handleTargetSelect} onSearch={() => void performQuery()} isLoading={isLoading} dataSource={blinkData?.data_source} wavelengthUm={blinkData?.wavelength_um}/>
    <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-y border-space-800 bg-space-950 px-3 py-1.5" role="tablist" aria-label="Observation modes">
      {modes.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} onClick={() => setMode(item.id)} className={`focus-ring flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-xs transition-colors ${mode === item.id ? 'border-cyan-300 text-white' : 'border-transparent text-slate-400 hover:text-slate-100'}`}><span className="font-mono text-[10px] text-slate-500">0{index + 1}</span>{item.icon}{item.label}</button>)}
      <span className="ml-auto hidden shrink-0 font-mono text-[10px] text-slate-500 lg:block">J2000 · SPHEREx QR2</span>
    </nav>

    {errorMsg && <div role="alert" className="flex shrink-0 items-center justify-between border-b border-amber-700/50 bg-amber-950/60 px-4 py-2 text-xs text-amber-100"><span>{errorMsg}</span><button type="button" onClick={() => void performQuery()} className="focus-ring underline hover:text-white">Retry</button></div>}

    <main className="relative min-h-0 flex-1">
      {(mode === 'blink' || mode === 'side_by_side' || mode === 'difference') && <SkyViewer blinkData={blinkData} isLoading={isLoading} onSelectCandidate={setSelectedCandidate} selectedCandidate={selectedCandidate} mode={mode} onModeChange={setMode} stretch={stretch} onStretchChange={(value) => setStretch(value)} colormap={colormap} onColormapChange={(value) => setColormap(value)} sigmaThreshold={sigmaThreshold} onSigmaChange={(value) => { setSigmaThreshold(value); void performQuery(ra, dec, channelId, stretch, colormap, value); }} onRequery={() => void performQuery()}/>}
      {mode === 'spectral' && <SpectralProfile spectralProfile={blinkData?.spectral_profile} currentChannelId={channelId} onSelectChannel={handleChannelChange} imageBase64={blinkData?.epoch2.image_base64} wcs={blinkData?.wcs} onPickCoordinate={handlePickCoordinate} ra={ra} dec={dec}/>}
      {mode === 'candidates' && <AstrometryLedger candidates={blinkData?.candidates_detected ?? []} selectedCandidate={selectedCandidate} onSelectCandidate={setSelectedCandidate} onOpenFlagModal={() => setIsFlagModalOpen(true)}/>}
    </main>
    {mode === 'candidates' && <div className="hidden" aria-hidden="true"/>}
    <CandidateModal isOpen={isFlagModalOpen} onClose={() => setIsFlagModalOpen(false)} candidate={selectedCandidate} ra={ra} dec={dec} channelId={channelId}/>
  </div>;
};
