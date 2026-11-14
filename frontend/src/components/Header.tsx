import { BookOpen, Flame, Globe2, Layers } from 'lucide-react';
import type { Language } from '../lib/i18n';
import { TRANSLATIONS } from '../lib/i18n';
import { Badge, buttonSecondary, cx } from './ui';

interface HeaderProps {
  lang: Language;
  onSelectLang: (lang: Language) => void;
  basemapStyle: 'dark' | 'satellite';
  onToggleBasemap: () => void;
  onOpenMethodology: () => void;
  totalEvents: number;
  countryName?: string;
}

export function Header({
  lang,
  onSelectLang,
  basemapStyle,
  onToggleBasemap,
  onOpenMethodology,
  totalEvents,
  countryName,
}: HeaderProps) {
  const t = TRANSLATIONS[lang];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 shadow-sm">
            <Globe2 className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold tracking-tight text-white sm:text-base">
                {t.appTitle}
              </span>
              <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                {t.fusedBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {countryName ? (
                <span>
                  {lang === 'vi' ? 'Đang xem dữ liệu quốc gia:' : 'Viewing country data:'}{' '}
                  <strong className="text-cyan-300">{countryName}</strong>
                </span>
              ) : (
                t.appSubtitle
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Count Badge */}
          <Badge tone="cyan">
            <span className="font-mono font-bold">
              {totalEvents.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}
            </span>{' '}
            {lang === 'vi' ? 'điểm sau khi gộp' : 'harmonized events'}
          </Badge>

          {/* Basemap Toggle */}
          <button
            type="button"
            onClick={onToggleBasemap}
            title={basemapStyle === 'satellite' ? 'Switch to Dark Basemap' : 'Switch to Satellite Basemap'}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
              basemapStyle === 'satellite'
                ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200'
                : 'border-line-strong bg-ink-800 text-slate-300 hover:border-slate-500 hover:text-white',
            )}
          >
            <Layers className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
            <span>{basemapStyle === 'satellite' ? t.basemapSatellite : t.basemapDark}</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center rounded-lg border border-line-strong bg-ink-800 p-0.5">
            <button
              type="button"
              onClick={() => onSelectLang('vi')}
              className={cx(
                'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                lang === 'vi'
                  ? 'bg-cyan-400 text-ink-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white',
              )}
              title="Chuyển sang giao diện Tiếng Việt"
            >
              🇻🇳 VI
            </button>
            <button
              type="button"
              onClick={() => onSelectLang('en')}
              className={cx(
                'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                lang === 'en'
                  ? 'bg-cyan-400 text-ink-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white',
              )}
              title="Switch to English Interface"
            >
              🇬🇧 EN
            </button>
          </div>

          {/* Methodology Modal Button */}
          <button
            type="button"
            onClick={onOpenMethodology}
            className={cx(buttonSecondary, '!px-2.5 !py-1.5 !text-xs')}
            title={t.methodologyTitle}
          >
            <BookOpen className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
            <span>{t.methodologyBtn}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
