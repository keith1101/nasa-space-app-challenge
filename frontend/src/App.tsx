import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { DashboardPage } from './pages/DashboardPage';
import { useUiStore } from './stores/useUiStore';
import { TRANSLATIONS } from './lib/i18n';

export default function App() {
  const { lang, setLang } = useUiStore();
  const t = TRANSLATIONS[lang];

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-ink-950 text-slate-100 selection:bg-cyan-500/30 selection:text-white">
        {/* Global Navigation Header */}
        <Header
          lang={lang}
          onSelectLang={setLang}
        />

        {/* Multi-Route Body */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Global Footer */}
        <footer className="border-t border-line bg-ink-950/90 py-4 text-xs text-slate-400">
          <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-3 px-4 lg:px-6">
            <div>
              <strong className="text-slate-200">{t.footerTitle}</strong> — {t.footerSub}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {t.footerDataSource}
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
