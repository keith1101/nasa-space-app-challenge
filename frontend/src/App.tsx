import React, { useEffect, useState } from 'react';
import { Activity, Eye, Layers, Radio, Target } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { CompactToolbar } from './components/CompactToolbar';
import { SkyViewer } from './components/SkyViewer';
import { SpectralProfile } from './components/SpectralProfile';
import { AstrometryLedger } from './components/AstrometryLedger';
import { CandidateModal } from './components/CandidateModal';
import { AuthModal, DEMO_ACCOUNTS } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { ProjectOverviewPage } from './components/ProjectOverviewPage';
import { UserGuidePage } from './components/UserGuidePage';
import { AppViewMode, BlinkResponse, Language, MovingCandidate, ObservationMode, PresetTarget, ThemeMode, UserAccount } from './types';
import { fetchBlinkComparison, fetchHealth, fetchTargets } from './services/api';
import { workstationTranslations } from './data/workstationData';

const getObservationModes = (lang: Language): { id: ObservationMode; label: string; subLabel: string; icon: React.ReactNode }[] => {
  const m = workstationTranslations[lang].modes;
  return [
    { id: 'blink', label: m.blink.label, subLabel: m.blink.subLabel, icon: <Eye size={14} /> },
    { id: 'side_by_side', label: m.side_by_side.label, subLabel: m.side_by_side.subLabel, icon: <Radio size={14} /> },
    { id: 'difference', label: m.difference.label, subLabel: m.difference.subLabel, icon: <Layers size={14} /> },
    { id: 'spectral', label: m.spectral.label, subLabel: m.spectral.subLabel, icon: <Activity size={14} /> },
    { id: 'candidates', label: m.candidates.label, subLabel: m.candidates.subLabel, icon: <Target size={14} /> }
  ];
};

export const App: React.FC = () => {
  // Navigation & View Mode: Separate full routes for Landing, Overview, Guide, and Workstation
  const [viewMode, setViewMode] = useState<AppViewMode>('landing');

  // Language & Theme State
  const [lang, setLang] = useState<Language>('vi');
  const [theme, setTheme] = useState<ThemeMode>('light');

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(DEMO_ACCOUNTS[0]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Scientific Workstation State
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

  const normalizeRa = (val: number): number => {
    if (isNaN(val)) return 0;
    const norm = ((val % 360) + 360) % 360;
    return Number(norm.toFixed(6));
  };

  const clampDec = (val: number): number => {
    if (isNaN(val)) return 0;
    return Number(Math.max(-90, Math.min(90, val)).toFixed(6));
  };

  const performQuery = async (
    targetRa = ra,
    targetDec = dec,
    targetChannel = channelId,
    targetStretch = stretch,
    targetColormap = colormap,
    targetSigma = sigmaThreshold
  ) => {
    const safeRa = normalizeRa(targetRa);
    const safeDec = clampDec(targetDec);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchBlinkComparison({
        ra: safeRa,
        dec: safeDec,
        channel_id: targetChannel,
        epoch1_id: 'survey-1',
        epoch2_id: 'survey-2',
        sigma_threshold: targetSigma,
        stretch: targetStretch,
        colormap: targetColormap
      });
      setBlinkData(data);
      setSelectedCandidate(data.candidates_detected?.[0] ?? null);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'NASA IRSA query failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        const health = await fetchHealth();
        if (mounted) {
          setBackendHealthy(true);
          setAstropyVersion(health.astropy_version);
        }
      } catch {
        if (mounted) setErrorMsg(workstationTranslations[lang].error.defaultError);
      }
      try {
        const result = await fetchTargets();
        if (mounted) setTargets(result.targets);
      } catch {
        /* API status is also shown in the header. */
      }
      if (mounted) void performQuery(305.5988, 41.1489, 60, 'asinh', 'magma', 3.5);
    };
    void initialize();
    return () => {
      mounted = false;
    };
  }, []);

  // Keyboard shortcut listener for workstation observation modes (1..5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'workstation') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if (e.key === '1') setMode('blink');
      else if (e.key === '2') setMode('side_by_side');
      else if (e.key === '3') setMode('difference');
      else if (e.key === '4') setMode('spectral');
      else if (e.key === '5') setMode('candidates');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  const handleChannelChange = (next: number) => {
    const value = Math.max(1, Math.min(102, next));
    setChannelId(value);
    void performQuery(ra, dec, value);
  };

  const handleTargetSelect = (target: PresetTarget) => {
    setSelectedTargetId(target.id);
    setRa(target.ra);
    setDec(target.dec);
    void performQuery(target.ra, target.dec);
  };

  const handlePickCoordinate = (nextRa: number, nextDec: number) => {
    const normRa = normalizeRa(nextRa);
    const clampedDec = clampDec(nextDec);
    setRa(normRa);
    setDec(clampedDec);
    setSelectedTargetId(null);
    void performQuery(normRa, clampedDec);
  };

  const observationModes = getObservationModes(lang);
  const tError = workstationTranslations[lang].error;

  return (
    <div
      className={`flex h-screen w-full flex-col overflow-hidden bg-white text-spaceapps-nearblack font-sans ${
        redMode ? 'night-vision-red' : ''
      }`}
    >
      {/* Official NASA Space Apps Navigation Bar */}
      <Navbar
        redMode={redMode}
        onToggleRedMode={() => setRedMode((value) => !value)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        lang={lang}
        onLangChange={setLang}
      />

      {/* Route Views */}
      {viewMode === 'landing' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <LandingPage
            onNavigate={setViewMode}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            lang={lang}
            onLangChange={setLang}
          />
        </div>
      )}

      {viewMode === 'overview' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ProjectOverviewPage
            onNavigate={setViewMode}
            theme={theme}
            lang={lang}
            onLangChange={setLang}
          />
        </div>
      )}

      {viewMode === 'guide' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <UserGuidePage
            onNavigate={setViewMode}
            theme={theme}
            lang={lang}
            onLangChange={setLang}
          />
        </div>
      )}

      {viewMode === 'workstation' && (
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-spaceapps-nearblack text-white font-sans">
          {/* Workstation Controls */}
          <CompactToolbar
            ra={ra}
            dec={dec}
            onRaChange={(value) => {
              setRa(value);
              setSelectedTargetId(null);
            }}
            onDecChange={(value) => {
              setDec(value);
              setSelectedTargetId(null);
            }}
            channelId={channelId}
            onChannelChange={handleChannelChange}
            targets={targets}
            selectedTargetId={selectedTargetId}
            onSelectTarget={handleTargetSelect}
            onSearch={() => void performQuery()}
            isLoading={isLoading}
            dataSource={blinkData?.data_source}
            wavelengthUm={blinkData?.wavelength_um}
            lang={lang}
          />

          {/* Mode Navigation Bar */}
          <nav
            className="flex shrink-0 items-center justify-between border-y border-spaceapps-electricblue bg-spaceapps-deepblue px-3.5 py-2 font-sans"
            role="tablist"
            aria-label="Observation modes"
          >
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {observationModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === item.id}
                  onClick={() => setMode(item.id)}
                  className={`focus-ring flex shrink-0 items-center gap-2 rounded-btn px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                    mode === item.id
                      ? 'bg-spaceapps-neonblue text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-spaceapps-electricblue/60'
                  }`}
                >
                  <span className="font-mono text-[10px] text-spaceapps-neonyellow">{item.subLabel}</span>
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Right Status / Telemetry Badges */}
            <div className="hidden lg:flex items-center space-x-3 text-xs font-mono">
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-btn bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>AstroPy {astropyVersion || '6.1'} · Caltech/IPAC</span>
              </div>
              <span className="text-slate-400 hidden xl:inline">J2000 · SPHEREx QR2</span>
            </div>
          </nav>

          {errorMsg && (
            <div
              role="alert"
              className="flex shrink-0 items-center justify-between border-b border-rose-500 bg-spaceapps-nasared px-4 py-2 text-xs font-bold text-white shadow-sm"
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => void performQuery()}
                className="focus-ring underline hover:text-spaceapps-neonyellow font-extrabold uppercase tracking-wider"
              >
                {tError.retry}
              </button>
            </div>
          )}

          {/* Workstation Main Display */}
          <main className="relative min-h-0 flex-1 bg-spaceapps-nearblack">
            {(mode === 'blink' || mode === 'side_by_side' || mode === 'difference') && (
              <SkyViewer
                blinkData={blinkData}
                isLoading={isLoading}
                onSelectCandidate={setSelectedCandidate}
                selectedCandidate={selectedCandidate}
                mode={mode}
                onModeChange={setMode}
                stretch={stretch}
                onStretchChange={(value) => setStretch(value)}
                colormap={colormap}
                onColormapChange={(value) => setColormap(value)}
                sigmaThreshold={sigmaThreshold}
                onSigmaChange={(value) => {
                  setSigmaThreshold(value);
                  void performQuery(ra, dec, channelId, stretch, colormap, value);
                }}
                onRequery={() => void performQuery()}
                lang={lang}
              />
            )}
            {mode === 'spectral' && (
              <SpectralProfile
                spectralProfile={blinkData?.spectral_profile}
                currentChannelId={channelId}
                onSelectChannel={handleChannelChange}
                imageBase64={blinkData?.epoch2.image_base64}
                wcs={blinkData?.wcs}
                onPickCoordinate={handlePickCoordinate}
                ra={ra}
                dec={dec}
                lang={lang}
              />
            )}
            {mode === 'candidates' && (
              <AstrometryLedger
                candidates={blinkData?.candidates_detected ?? []}
                selectedCandidate={selectedCandidate}
                onSelectCandidate={setSelectedCandidate}
                onOpenFlagModal={() => setIsFlagModalOpen(true)}
                lang={lang}
              />
            )}
          </main>
        </div>
      )}

      {/* Candidate Flagging Modal */}
      <CandidateModal
        isOpen={isFlagModalOpen}
        onClose={() => setIsFlagModalOpen(false)}
        candidate={selectedCandidate}
        ra={ra}
        dec={dec}
        channelId={channelId}
        lang={lang}
      />

      {/* Mock Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
};
