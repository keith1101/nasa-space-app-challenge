import React, { useState } from 'react';
import { 
  Telescope, Orbit, Layers, ChevronRight, Globe, ExternalLink, BookOpen, FileText, CheckCircle2, Award
} from 'lucide-react';
import { AppViewMode, ThemeMode, Language } from '../types';
import { projectOverviewData } from '../data/projectOverviewData';
import { ScientificPipelineCanvas } from './ScientificPipelineCanvas';

interface ProjectOverviewPageProps {
  onNavigate: (mode: AppViewMode) => void;
  theme?: ThemeMode;
  lang?: Language;
  onLangChange?: (lang: Language) => void;
}

export const ProjectOverviewPage: React.FC<ProjectOverviewPageProps> = ({ 
  onNavigate, 
  lang: controlledLang,
  onLangChange 
}) => {
  const [internalLang, setInternalLang] = useState<Language>('vi');
  const currentLang = controlledLang ?? internalLang;

  const handleLangChange = (nextLang: Language) => {
    if (onLangChange) {
      onLangChange(nextLang);
    } else {
      setInternalLang(nextLang);
    }
  };

  const content = projectOverviewData[currentLang];

  return (
    <div className="w-full min-h-screen overflow-y-auto font-sans bg-white text-spaceapps-nearblack selection:bg-spaceapps-neonyellow selection:text-spaceapps-nearblack">
      {/* Header Banner (Space Apps Gradient) */}
      <section className="bg-spaceapps-gradient text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-spaceapps-electricblue">
        <div className="mx-auto max-w-5xl space-y-4">
          {/* Breadcrumb & Language Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex items-center space-x-2 text-xs font-mono text-slate-200" aria-label="Breadcrumb">
              <button 
                type="button" 
                onClick={() => onNavigate('landing')} 
                className="hover:text-spaceapps-neonyellow transition-colors"
              >
                {content.breadcrumbHome}
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-spaceapps-neonyellow" />
              <span className="text-spaceapps-neonyellow font-semibold uppercase">
                {content.breadcrumbCurrent}
              </span>
            </nav>

            {/* Language Selector */}
            <div className="flex items-center space-x-1.5 rounded-btn border border-white/30 p-1 bg-spaceapps-deepblue/60 text-xs font-mono backdrop-blur-xs">
              <Globe className="h-3.5 w-3.5 text-spaceapps-neonyellow ml-1" />
              <button
                type="button"
                onClick={() => handleLangChange('vi')}
                aria-pressed={currentLang === 'vi'}
                className={`px-2 py-0.5 rounded-btn font-bold transition-all ${
                  currentLang === 'vi'
                    ? 'bg-spaceapps-neonyellow text-spaceapps-nearblack shadow-xs'
                    : 'text-white hover:text-spaceapps-neonyellow'
                }`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('en')}
                aria-pressed={currentLang === 'en'}
                className={`px-2 py-0.5 rounded-btn font-bold transition-all ${
                  currentLang === 'en'
                    ? 'bg-spaceapps-neonyellow text-spaceapps-nearblack shadow-xs'
                    : 'text-white hover:text-spaceapps-neonyellow'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-btn bg-spaceapps-neonyellow px-3 py-0.5 text-xs font-bold text-spaceapps-nearblack uppercase">
              <span>{content.badge}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white uppercase leading-tight">
              {content.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-100 max-w-3xl leading-relaxed">
              {content.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Section 1: Executive Summary */}
        <section className="rounded-card border-2 border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-spaceapps-neonblue uppercase">
            <Telescope className="h-5 w-5 text-spaceapps-neonblue" />
            <span>{content.summary.title}</span>
          </h2>
          <p className="text-sm leading-relaxed text-spaceapps-nearblack">
            {content.summary.p1}
          </p>
          <p className="text-sm leading-relaxed text-spaceapps-nearblack">
            {content.summary.p2}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
            {content.summary.stats.map((stat, idx) => (
              <div key={idx} className="p-4 rounded-btn border border-slate-200 bg-slate-50">
                <div className={`text-xs font-mono font-bold uppercase ${
                  idx === 0 ? 'text-spaceapps-neonblue' : idx === 1 ? 'text-spaceapps-nasared' : 'text-emerald-700'
                }`}>
                  {stat.label}
                </div>
                <div className="text-lg font-bold text-spaceapps-nearblack mt-1">
                  {stat.value}
                </div>
                <p className="text-xs text-spaceapps-nearblack/70 mt-1">
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Real NASA & Caltech Imagery Gallery */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-spaceapps-neonblue uppercase">
            <Orbit className="h-5 w-5 text-spaceapps-nasared" />
            <span>{content.gallery.title}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.gallery.items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-card border-2 border-slate-200 bg-white p-4 space-y-3 shadow-sm scale-on-hover">
                <div className="relative aspect-video w-full overflow-hidden rounded-btn bg-black flex items-center justify-center p-3">
                  <img
                    src={item.imageSrc}
                    alt={item.alt}
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute bottom-2 left-2 rounded-btn bg-spaceapps-nearblack/90 px-2 py-0.5 font-mono text-[10px] text-spaceapps-neonyellow font-bold uppercase">
                    {item.badge}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-spaceapps-nearblack uppercase">
                      {item.title}
                    </h3>
                    {item.citationUrl && (
                      <a 
                        href={item.citationUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-spaceapps-neonblue/10 text-spaceapps-neonblue hover:bg-spaceapps-neonblue hover:text-white transition-colors"
                        title="Xem tài liệu khoa học gốc"
                      >
                        <span>{item.citationKey}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-spaceapps-nearblack/80 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Scientific Rationale & Why SPHEREx */}
        <section className="rounded-card border-2 border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
          <h2 className="text-xl font-bold text-spaceapps-neonblue uppercase">
            {content.rationale.title}
          </h2>
          <div className="space-y-3 text-sm text-spaceapps-nearblack leading-relaxed">
            <p>{content.rationale.p1}</p>
            <p>{content.rationale.p2}</p>
          </div>
        </section>

        {/* Section: Interactive Astronomical Data Pipeline */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-spaceapps-neonblue uppercase">
            <Layers className="h-5 w-5 text-spaceapps-neonblue" aria-hidden="true" />
            <span>{currentLang === 'vi' ? 'Kiến trúc Pipeline Xử lý Dữ liệu Khoa học' : 'Scientific Data Processing Pipeline Architecture'}</span>
          </h2>
          <ScientificPipelineCanvas lang={currentLang} />
        </section>

        {/* Section 4: Breakthrough Features Comparison */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-spaceapps-neonblue uppercase">
            {content.comparison.title}
          </h2>

          <div className="overflow-x-auto rounded-card border-2 border-slate-200 shadow-sm bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-spaceapps-cloudgray text-spaceapps-nearblack">
                  <th className="p-3.5 font-bold uppercase">{content.comparison.headers[0]}</th>
                  <th className="p-3.5 font-bold uppercase">{content.comparison.headers[1]}</th>
                  <th className="p-3.5 font-bold uppercase text-spaceapps-neonblue">{content.comparison.headers[2]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {content.comparison.rows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-3.5 font-bold text-spaceapps-nearblack">{row.criteria}</td>
                    <td className="p-3.5 text-spaceapps-nearblack/70">{row.traditional}</td>
                    <td className="p-3.5 text-spaceapps-neonblue font-bold">{row.spherex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5: Scientific References & Citations */}
        <section className="rounded-card border-2 border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 rounded-btn bg-spaceapps-neonblue/10 px-2.5 py-0.5 text-xs font-bold text-spaceapps-neonblue uppercase">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{content.citationsSection.badge}</span>
            </div>
            <h2 className="text-xl font-bold text-spaceapps-nearblack uppercase">
              {content.citationsSection.title}
            </h2>
            <p className="text-xs text-spaceapps-nearblack/70 leading-relaxed">
              {content.citationsSection.subtitle}
            </p>
          </div>

          <div className="space-y-3.5 divide-y divide-slate-100">
            {content.citationsSection.items.map((cit) => (
              <div key={cit.id} className="pt-3.5 first:pt-0 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center justify-center h-6 w-8 rounded bg-spaceapps-neonblue text-white font-mono text-xs font-bold shrink-0">
                      {cit.citationKey}
                    </span>
                    <strong className="text-xs font-bold text-spaceapps-nearblack">
                      {cit.authors} ({cit.year})
                    </strong>
                  </div>

                  <a
                    href={cit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center space-x-1 rounded-btn px-2.5 py-1 text-[11px] font-bold text-spaceapps-neonblue hover:bg-spaceapps-neonblue hover:text-white border border-spaceapps-neonblue/40 transition-colors"
                  >
                    <span>{content.citationsSection.linkDirect}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="text-xs font-semibold text-spaceapps-nearblack pl-10">
                  "{cit.title}"
                </div>

                <div className="text-[11px] font-mono text-slate-500 pl-10 flex flex-wrap items-center gap-x-3">
                  <span>{cit.venue}</span>
                  {cit.doi && (
                    <span className="text-spaceapps-neonblue underline">DOI: {cit.doi}</span>
                  )}
                  {cit.arxivId && (
                    <span className="text-amber-700">arXiv: {cit.arxivId}</span>
                  )}
                </div>

                <p className="text-xs text-spaceapps-nearblack/80 pl-10 leading-relaxed italic bg-slate-50 p-2 rounded-btn border border-slate-200 mt-1">
                  {cit.relevance}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: Bottom Navigation CTAs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="text-xs font-bold text-spaceapps-nearblack hover:text-spaceapps-neonblue transition-colors uppercase"
          >
            {content.cta.backHome}
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onNavigate('guide')}
              className="focus-ring flex items-center space-x-1.5 px-4 py-2.5 rounded-btn border-2 border-slate-300 bg-white text-xs font-bold text-spaceapps-nearblack hover:border-spaceapps-neonblue uppercase"
            >
              <Layers className="h-4 w-4 text-spaceapps-nasared" />
              <span>{content.cta.guideBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('workstation')}
              className="focus-ring flex items-center space-x-2 px-5 py-2.5 rounded-btn bg-spaceapps-neonyellow text-xs font-bold text-spaceapps-nearblack shadow-md hover:bg-spaceapps-neonblue hover:text-white transition-all uppercase"
            >
              <Telescope className="h-4 w-4" />
              <span>{content.cta.workstationBtn}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
