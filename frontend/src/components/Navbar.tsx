import React, { useState, useRef, useEffect } from 'react';
import { 
  Telescope, ExternalLink, Eye, BookOpen, Layers, User, LogIn, LogOut, 
  Sparkles, CheckCircle2, ChevronDown, ShieldCheck, LayoutDashboard, Globe,
  Sun, Moon
} from 'lucide-react';
import { AppViewMode, ThemeMode, UserAccount, Language } from '../types';

interface NavbarProps {
  redMode: boolean;
  onToggleRedMode: () => void;
  onOpenAuth: () => void;
  currentUser: UserAccount | null;
  onLogout: () => void;
  viewMode: AppViewMode;
  onViewModeChange: (mode: AppViewMode) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  lang?: Language;
  onLangChange?: (lang: Language) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  redMode,
  onToggleRedMode,
  onOpenAuth,
  currentUser,
  onLogout,
  viewMode,
  onViewModeChange,
  theme,
  onToggleTheme,
  lang = 'vi',
  onLangChange
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const t = {
    vi: {
      officialBadge: 'OFFICIAL CHALLENGE',
      alertText: 'NASA International Space Apps Challenge 2026 — Sứ Mệnh Tìm Kiếm Planet Nine & TNOs',
      alertTextMobile: 'NASA Space Apps 2026 · Planet Nine',
      officialSite: 'Trang Chủ Cuộc Thi',
      navHome: 'Trang Chủ',
      navOverview: 'Giới Thiệu Dự Án',
      navGuide: 'Hướng Dẫn Sử Dụng',
      navWorkstation: 'Trạm Làm Việc (App)',
      openAppShort: 'Mở App',
      homeShort: 'Trang Chủ',
      nightVision: 'Night Vision',
      redMode: 'Red Mode',
      login: 'Đăng Nhập',
      getStarted: 'Bắt Đầu',
      flaggedLabel: 'Ứng viên đã gắn cờ:',
      candidatesUnit: 'vật thể',
      citizenVerified: 'Xác thực NASA Citizen Science',
      menuWorkstation: 'Mở Trạm Phân Tích (App)',
      menuOverview: 'Giới Thiệu Dự Án',
      menuLogout: 'Đăng Xuất'
    },
    en: {
      officialBadge: 'OFFICIAL CHALLENGE',
      alertText: 'NASA International Space Apps Challenge 2026 — Hunting Planet Nine & TNOs',
      alertTextMobile: 'NASA Space Apps 2026 · Planet Nine',
      officialSite: 'Challenge Homepage',
      navHome: 'Home',
      navOverview: 'Project Overview',
      navGuide: 'User Guide',
      navWorkstation: 'Workstation (App)',
      openAppShort: 'Open App',
      homeShort: 'Home',
      nightVision: 'Night Vision',
      redMode: 'Red Mode',
      login: 'Sign In',
      getStarted: 'Get Started',
      flaggedLabel: 'Flagged Candidates:',
      candidatesUnit: 'objects',
      citizenVerified: 'NASA Citizen Science Verified',
      menuWorkstation: 'Open Analysis Workstation (App)',
      menuOverview: 'Project Overview',
      menuLogout: 'Sign Out'
    }
  }[lang];

  return (
    <header className="shrink-0 z-40 w-full font-sans">
      {/* Official Space Apps Top Alert Banner (Yellow #e7f434 & Near Black #1b1b1b) */}
      <div className="bg-spaceapps-neonyellow text-spaceapps-nearblack px-4 py-1.5 text-xs font-semibold flex items-center justify-between border-b border-spaceapps-nearblack/10">
        <div className="mx-auto max-w-7xl w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-block px-1.5 py-0.2 bg-spaceapps-nearblack text-spaceapps-neonyellow text-[10px] font-bold rounded uppercase tracking-wider">
              {t.officialBadge}
            </span>
            <span className="hidden sm:inline">
              {t.alertText}
            </span>
            <span className="sm:hidden">
              {t.alertTextMobile}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <a 
              href="https://www.spaceappschallenge.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-bold hover:opacity-80 flex items-center gap-1"
            >
              <span>{t.officialSite}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar (Space Apps Electric Blue #1b2b85 & White #ffffff) */}
      <div className="bg-spaceapps-electricblue text-white px-4 sm:px-6 py-2.5 shadow-md">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          {/* Brand Identity */}
          <button
            type="button"
            onClick={() => onViewModeChange('landing')}
            className="flex items-center space-x-2.5 text-left focus-ring rounded p-1 transition-opacity hover:opacity-90"
            aria-label="NASA Space Apps SPHEREx Explorer"
          >
            <div className="w-8 h-8 rounded bg-spaceapps-neonblue flex items-center justify-center text-spaceapps-neonyellow font-black text-sm border border-spaceapps-neonyellow/40 shrink-0">
              <Telescope className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-white text-base tracking-tight uppercase">
                  SPHEREx
                </span>
                <span className="text-[10px] font-bold text-spaceapps-nearblack px-1.5 py-0.2 rounded bg-spaceapps-neonyellow uppercase">
                  EXPLORER
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-light hidden sm:block">
                NASA Space Apps Challenge 2026
              </p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Space Apps Navigation">
            <button
              type="button"
              onClick={() => onViewModeChange('landing')}
              className={`focus-ring px-3.5 py-1.5 rounded-btn text-xs font-semibold tracking-wide transition-colors ${
                viewMode === 'landing' 
                  ? 'bg-spaceapps-neonblue text-white underline underline-offset-4 decoration-spaceapps-neonyellow decoration-2' 
                  : 'text-white hover:text-spaceapps-paleyellow'
              }`}
            >
              {t.navHome}
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('overview')}
              className={`focus-ring flex items-center gap-1.5 px-3.5 py-1.5 rounded-btn text-xs font-semibold tracking-wide transition-colors ${
                viewMode === 'overview' 
                  ? 'bg-spaceapps-neonblue text-white underline underline-offset-4 decoration-spaceapps-neonyellow decoration-2' 
                  : 'text-white hover:text-spaceapps-paleyellow'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-spaceapps-neonyellow" />
              <span>{t.navOverview}</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('guide')}
              className={`focus-ring flex items-center gap-1.5 px-3.5 py-1.5 rounded-btn text-xs font-semibold tracking-wide transition-colors ${
                viewMode === 'guide' 
                  ? 'bg-spaceapps-neonblue text-white underline underline-offset-4 decoration-spaceapps-neonyellow decoration-2' 
                  : 'text-white hover:text-spaceapps-paleyellow'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-spaceapps-neonyellow" />
              <span>{t.navGuide}</span>
            </button>

            {/* Launch App Primary Button (Space Apps Neon Yellow CTA) */}
            <button
              type="button"
              onClick={() => onViewModeChange('workstation')}
              className={`focus-ring flex items-center gap-1.5 px-4 py-1.5 rounded-btn text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                viewMode === 'workstation'
                  ? 'bg-spaceapps-nasared text-white'
                  : 'bg-spaceapps-neonyellow text-spaceapps-nearblack hover:bg-spaceapps-neonblue hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t.navWorkstation}</span>
            </button>
          </nav>

          {/* Right Actions: Language Switcher, Night Vision & Mock Account */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            {/* Mobile Workstation Switch */}
            <button
              type="button"
              onClick={() => onViewModeChange(viewMode === 'workstation' ? 'landing' : 'workstation')}
              className="lg:hidden focus-ring flex items-center gap-1 px-2.5 py-1.5 rounded-btn bg-spaceapps-neonyellow text-spaceapps-nearblack text-xs font-bold uppercase"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{viewMode === 'workstation' ? t.homeShort : t.openAppShort}</span>
            </button>

            {/* Language Switcher Pill */}
            {onLangChange && (
              <div className="flex items-center space-x-1 rounded-btn border border-white/30 bg-spaceapps-deepblue/50 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => onLangChange('vi')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    lang === 'vi' 
                      ? 'bg-spaceapps-neonyellow text-spaceapps-nearblack shadow-xs' 
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  VI
                </button>
                <button
                  type="button"
                  onClick={() => onLangChange('en')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    lang === 'en' 
                      ? 'bg-spaceapps-neonyellow text-spaceapps-nearblack shadow-xs' 
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            )}

            {/* Night Vision Toggle */}
            <button
              type="button"
              aria-pressed={redMode}
              onClick={onToggleRedMode}
              title="Bật/Tắt chế độ quan sát đêm quang học"
              className={`focus-ring flex items-center gap-1.5 rounded-btn border px-2.5 py-1.5 font-medium transition-colors ${
                redMode
                  ? 'border-rose-500 bg-rose-950 text-rose-100'
                  : 'border-white/30 text-white hover:border-spaceapps-neonyellow hover:text-spaceapps-neonyellow'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{redMode ? t.redMode : t.nightVision}</span>
            </button>

            {/* Theme Toggle (Light / Dark) */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                title={theme === 'dark' ? "Chuyển sang giao diện Sáng (Light Mode)" : "Chuyển sang giao diện Tối (Dark Mode)"}
                className="focus-ring flex items-center justify-center p-1.5 rounded-btn border border-white/30 text-white hover:border-spaceapps-neonyellow hover:text-spaceapps-neonyellow transition-colors"
                aria-label="Toggle light/dark theme"
              >
                {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Mock Account Section */}
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  className="focus-ring flex items-center space-x-2 rounded-btn border border-white/30 bg-spaceapps-neonblue/60 pl-1.5 pr-2 py-1 hover:border-spaceapps-neonyellow transition-colors text-white"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-spaceapps-neonyellow text-spaceapps-nearblack text-[11px] font-bold">
                    {currentUser.name[0]}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold leading-tight flex items-center gap-1">
                      <span>{currentUser.name.split(' ')[0]}</span>
                      {currentUser.role === 'PRO_RESEARCHER' && (
                        <span className="rounded bg-spaceapps-neonyellow px-1 py-0.2 text-[9px] font-mono text-spaceapps-nearblack font-bold">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="h-3 w-3 text-white/70" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-64 rounded-card border border-spaceapps-electricblue bg-white p-3 shadow-2xl z-50 text-spaceapps-nearblack space-y-3 font-sans"
                    role="menu"
                  >
                    <div className="border-b border-slate-200 pb-2.5">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span className="text-spaceapps-nearblack">{currentUser.name}</span>
                        <span className="text-[10px] font-bold text-spaceapps-nearblack bg-spaceapps-neonyellow px-1.5 py-0.5 rounded">
                          {currentUser.role === 'PRO_RESEARCHER' ? 'PRO RESEARCHER' : 'CITIZEN ASTRONOMER'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">{currentUser.organization}</div>
                    </div>

                    <div className="rounded bg-slate-50 p-2.5 border border-slate-200 space-y-1">
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>{t.flaggedLabel}</span>
                        <strong className="font-mono text-spaceapps-neonblue font-bold">{currentUser.flaggedCandidatesCount} {t.candidatesUnit}</strong>
                      </div>
                      <div className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                        <ShieldCheck className="h-3 w-3" />
                        <span>{t.citizenVerified}</span>
                      </div>
                    </div>

                    <div className="pt-1 space-y-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => { onViewModeChange('workstation'); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center space-x-2 rounded px-2 py-1.5 text-xs text-left text-slate-700 hover:bg-spaceapps-neonblue hover:text-white transition-colors"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-spaceapps-neonblue" />
                        <span>{t.menuWorkstation}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { onViewModeChange('overview'); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center space-x-2 rounded px-2 py-1.5 text-xs text-left text-slate-700 hover:bg-spaceapps-neonblue hover:text-white transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                        <span>{t.menuOverview}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { onLogout(); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center space-x-2 rounded px-2 py-1.5 text-xs text-left text-spaceapps-nasared hover:bg-red-50 transition-colors font-semibold"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>{t.menuLogout}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="focus-ring flex items-center space-x-1 rounded-btn px-3 py-1.5 text-xs font-semibold text-white hover:text-spaceapps-paleyellow transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>{t.login}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="focus-ring flex items-center space-x-1 rounded-btn bg-spaceapps-neonyellow text-spaceapps-nearblack px-3 py-1.5 text-xs font-bold hover:bg-white hover:text-spaceapps-neonblue transition-all shadow-sm"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{t.getStarted}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
