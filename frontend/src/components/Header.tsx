import { Link, NavLink } from 'react-router-dom';
import { Globe2, Layers } from 'lucide-react';
import type { Language } from '../lib/i18n';
import { TRANSLATIONS } from '../lib/i18n';
import { cx } from './ui';
import { Tooltip } from './ui/Tooltip';
import { useFilterStore } from '../stores/useFilterStore';

interface HeaderProps {
  lang: Language;
  onSelectLang: (lang: Language) => void;
  basemapStyle?: 'dark' | 'satellite';
  onToggleBasemap?: () => void;
  totalEvents?: number;
  countryName?: string;
}

export function Header({
  lang,
  onSelectLang,
  basemapStyle,
  onToggleBasemap,
  totalEvents,
  countryName,
}: HeaderProps) {
  const t = TRANSLATIONS[lang];
  const isVi = lang === 'vi';
  const { basemapStyle: storeBasemap, toggleBasemapStyle } = useFilterStore();
  const currentBasemap = basemapStyle ?? storeBasemap;
  const handleToggleBasemap = onToggleBasemap ?? toggleBasemapStyle;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 shadow-sm transition-transform group-hover:scale-105">
            <Globe2 className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold tracking-tight text-white sm:text-base group-hover:text-cyan-300 transition-colors">
                {t.appTitle}
              </span>
              <span className="hidden sm:inline-flex rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                {t.fusedBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {countryName ? (
                <span>
                  {isVi ? 'Quốc gia:' : 'Country:'} <strong className="text-cyan-300">{countryName}</strong>
                </span>
              ) : (
                t.appSubtitle
              )}
            </p>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-ink-900',
              )
            }
          >
            <span>{isVi ? 'Trang Chủ' : 'Home'}</span>
          </NavLink>

          <NavLink
            to="/methodology"
            className={({ isActive }) =>
              cx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-ink-900',
              )
            }
          >
            <span>{isVi ? 'Phương Pháp Luận' : 'Methodology'}</span>
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-ink-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20',
              )
            }
          >
            <span>{isVi ? 'Trạm Giám Sát' : 'GIS Dashboard'}</span>
          </NavLink>
        </nav>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Count Badge (only if totalEvents exists) */}
          {totalEvents != null && totalEvents > 0 && (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-300 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{totalEvents.toLocaleString(isVi ? 'vi-VN' : 'en-US')}</span>
              <span className="text-[10px] text-slate-400">{isVi ? 'điểm' : 'pts'}</span>
            </div>
          )}

          {/* Basemap Toggle */}
          <Tooltip content={currentBasemap === 'satellite' ? (isVi ? 'Chuyển sang bản đồ tối CARTO' : 'Switch to CARTO Dark Matter') : (isVi ? 'Chuyển sang ảnh vệ tinh Esri' : 'Switch to Esri World Imagery')}>
            <button
              type="button"
              onClick={handleToggleBasemap}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                currentBasemap === 'satellite'
                  ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200'
                  : 'border-line-strong bg-ink-900 text-slate-300 hover:border-slate-500 hover:text-white',
              )}
            >
              <Layers className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
              <span className="hidden sm:inline">{currentBasemap === 'satellite' ? t.basemapSatellite : t.basemapDark}</span>
            </button>
          </Tooltip>

          {/* Language Switcher */}
          <div className="flex items-center rounded-lg border border-line-strong bg-ink-900 p-0.5">
            <Tooltip content={isVi ? 'Giao diện Tiếng Việt' : 'Switch to Vietnamese'}>
              <button
                type="button"
                onClick={() => onSelectLang('vi')}
                className={cx(
                  'rounded-md px-2 py-0.5 text-xs font-semibold transition-colors',
                  lang === 'vi'
                    ? 'bg-cyan-400 text-ink-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white',
                )}
              >
                VI
              </button>
            </Tooltip>
            <Tooltip content={isVi ? 'Chuyển sang Tiếng Anh' : 'English Interface'}>
              <button
                type="button"
                onClick={() => onSelectLang('en')}
                className={cx(
                  'rounded-md px-2 py-0.5 text-xs font-semibold transition-colors',
                  lang === 'en'
                    ? 'bg-cyan-400 text-ink-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white',
                )}
              >
                EN
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
}
