import React from 'react';
import { 
  Telescope, Sparkles, Orbit, Layers, Activity, Target, ShieldCheck, 
  ArrowRight, CheckCircle2, ChevronRight, Download, Radio, Eye, Database, 
  ExternalLink, Compass, Star, Award, BookOpen, Globe
} from 'lucide-react';
import { AppViewMode, ThemeMode, Language } from '../types';
import { landingPageData } from '../data/landingPageData';

interface LandingPageProps {
  onNavigate: (mode: AppViewMode) => void;
  onOpenAuth: () => void;
  theme?: ThemeMode;
  lang?: Language;
  onLangChange?: (lang: Language) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onOpenAuth,
  lang = 'vi',
  onLangChange
}) => {
  const content = landingPageData[lang];

  const renderFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'Radio': return <Radio className="h-5 w-5" />;
      case 'Layers': return <Layers className="h-5 w-5" />;
      case 'Activity': return <Activity className="h-5 w-5" />;
      case 'Target': return <Target className="h-5 w-5" />;
      case 'Eye': return <Eye className="h-5 w-5" />;
      case 'Database': return <Database className="h-5 w-5" />;
      default: return <Sparkles className="h-5 w-5" />;
    }
  };

  return (
    <div className="w-full min-h-screen overflow-y-auto font-sans bg-white text-spaceapps-nearblack selection:bg-spaceapps-neonyellow selection:text-spaceapps-nearblack">
      {/* 1. Hero Section (Official Space Apps Gradient: Neon Blue #0050d8 -> Electric Blue #1b2b85) */}
      <section className="relative overflow-hidden bg-spaceapps-gradient text-white py-16 sm:py-24 border-b border-spaceapps-electricblue">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Top Mission Tag */}
            <div className="inline-flex items-center space-x-2 rounded-btn border border-spaceapps-neonyellow/40 bg-white/10 px-3.5 py-1 text-xs font-bold tracking-wider uppercase text-spaceapps-neonyellow">
              <span className="h-2 w-2 rounded-full bg-spaceapps-neonyellow animate-pulse"></span>
              <span>{content.missionBadge}</span>
            </div>

            {/* Main Headline (Space Apps Display Font 64px bold) */}
            <h1 className="max-w-4xl text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-white uppercase leading-tight">
              {content.hero.headlinePrefix}
              <span className="text-spaceapps-neonyellow">{content.hero.headlineHighlight}</span>
              {content.hero.headlineSuffix}
            </h1>

            {/* Sub-headline */}
            <p className="max-w-3xl text-base sm:text-lg text-slate-100 font-normal leading-relaxed">
              {content.hero.description}
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {/* Primary CTA (Neon Yellow #e7f434, Near Black #1b1b1b) */}
              <button
                type="button"
                onClick={() => onNavigate('workstation')}
                className="focus-ring group flex items-center space-x-2 rounded-btn bg-spaceapps-neonyellow px-6 py-3.5 text-sm font-bold text-spaceapps-nearblack shadow-lg hover:bg-white hover:text-spaceapps-neonblue transition-all active:scale-[0.98] uppercase tracking-wider"
              >
                <Telescope className="h-4 w-4" />
                <span>{content.hero.ctaLaunch}</span>
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('overview')}
                className="focus-ring flex items-center space-x-2 rounded-btn border-2 border-white bg-transparent px-5 py-3.5 text-sm font-bold text-white hover:bg-white hover:text-spaceapps-electricblue transition-all uppercase tracking-wider"
              >
                <BookOpen className="h-4 w-4" />
                <span>{content.hero.ctaOverview}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('guide')}
                className="focus-ring flex items-center space-x-2 rounded-btn border-2 border-white/70 bg-transparent px-5 py-3.5 text-sm font-bold text-white hover:bg-spaceapps-neonyellow hover:text-spaceapps-nearblack hover:border-spaceapps-neonyellow transition-all uppercase tracking-wider"
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span>{content.hero.ctaGuide}</span>
              </button>
            </div>

            {/* Mission Illustration */}
            <div className="pt-4">
              <img
                src="/illustrations/undraw_space_stars_empty.svg"
                alt="SPHEREx Mission Observatory"
                className="max-h-56 w-auto rounded-card border border-white/20 shadow-2xl drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. By The Numbers (Official Deep Blue #151622 Section) */}
      <section className="bg-spaceapps-deepblue text-white py-12 border-b border-spaceapps-electricblue">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {content.stats.map((stat, idx) => (
              <div key={idx} className="space-y-1">
                <div className={`text-3xl sm:text-4xl font-extrabold font-sans ${idx % 2 === 0 ? 'text-spaceapps-neonyellow' : 'text-white'}`}>
                  {stat.value}
                </div>
                <div className="text-xs uppercase font-semibold text-slate-300 tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Light Mode Content Section (Clean White & High Contrast #1b1b1b Text) */}
      <section className="py-20 bg-white border-b border-spaceapps-cloudgray">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-spaceapps-nasared font-sans">
              {content.features.badge}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-spaceapps-neonblue uppercase">
              {content.features.title}
            </h2>
            <p className="max-w-2xl mx-auto text-sm text-spaceapps-nearblack leading-relaxed">
              {content.features.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.features.cards.map((card) => (
              <div key={card.id} className="rounded-card border-2 border-slate-200 bg-slate-50/60 p-6 space-y-3.5 scale-on-hover shadow-sm">
                <div className={`h-10 w-10 rounded-btn ${card.colorBg} flex items-center justify-center ${card.iconColor}`}>
                  {renderFeatureIcon(card.iconName)}
                </div>
                <h3 className="text-base font-bold text-spaceapps-nearblack uppercase">
                  {card.title}
                </h3>
                <p className="text-xs text-spaceapps-nearblack/80 leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Deep Space Showcase (Official Space Apps Deep Blue Cards & scale-on-hover) */}
      <section className="py-20 bg-spaceapps-deepblue text-white border-b border-spaceapps-electricblue">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-spaceapps-neonyellow">
              {content.showcase.badge}
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold uppercase">
              {content.showcase.title}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {content.showcase.cards.map((card, idx) => (
              <div key={card.id} className="rounded-card border border-spaceapps-neonblue bg-spaceapps-deepblue p-5 space-y-4 scale-on-hover shadow-xl">
                <div className={`aspect-video w-full overflow-hidden rounded-card bg-black ${idx === 1 ? 'flex items-center justify-center p-4' : ''}`}>
                  <img
                    src={card.imageSrc}
                    alt={card.alt}
                    className={`h-full w-full ${idx === 1 ? 'object-contain' : 'object-cover'}`}
                  />
                </div>
                <div className="space-y-1">
                  <h4 className={`text-base font-bold uppercase ${idx === 1 ? 'text-spaceapps-neonyellow' : 'text-white'}`}>
                    {card.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Space Apps Challenge Call to Action Banner */}
      <section className="py-20 bg-spaceapps-cloudgray border-b border-slate-300">
        <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
          <div className="inline-flex items-center space-x-1.5 rounded-btn bg-spaceapps-nasared px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
            <span>{content.ctaBanner.badge}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-spaceapps-nearblack uppercase tracking-tight">
            {content.ctaBanner.title}
          </h2>

          <p className="text-sm sm:text-base text-spaceapps-nearblack/80 max-w-xl mx-auto leading-relaxed">
            {content.ctaBanner.description}
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('workstation')}
              className="focus-ring inline-flex items-center space-x-2.5 rounded-btn bg-spaceapps-neonblue hover:bg-spaceapps-electricblue px-8 py-4 text-base font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-wider"
            >
              <Telescope className="h-5 w-5 text-spaceapps-neonyellow" />
              <span>{content.ctaBanner.buttonText}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6. Footer (Space Apps Near Black #1b1b1b & Slate Strip #3d4551) */}
      <footer className="bg-spaceapps-nearblack text-white text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-spaceapps-slategray">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-spaceapps-neonblue flex items-center justify-center text-spaceapps-neonyellow font-black text-xs">
              SX
            </div>
            <div>
              <span className="font-bold text-white text-sm">{content.footer.brandTitle}</span>
              <p className="text-[11px] text-slate-400">{content.footer.brandSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-slate-300">
            <button type="button" onClick={() => onNavigate('landing')} className="hover:text-spaceapps-neonyellow transition-colors">
              {content.footer.navHome}
            </button>
            <button type="button" onClick={() => onNavigate('overview')} className="hover:text-spaceapps-neonyellow transition-colors">
              {content.footer.navOverview}
            </button>
            <button type="button" onClick={() => onNavigate('guide')} className="hover:text-spaceapps-neonyellow transition-colors">
              {content.footer.navGuide}
            </button>
            <a href="https://irsa.ipac.caltech.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-spaceapps-neonyellow flex items-center gap-1">
              <span>{content.footer.linkIrsa}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://www.spaceappschallenge.org/" target="_blank" rel="noopener noreferrer" className="hover:text-spaceapps-neonyellow flex items-center gap-1">
              <span>{content.footer.linkSpaceApps}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Social / Legal Strip */}
        <div className="bg-spaceapps-slategray py-4 px-4 text-center text-[11px] text-slate-300">
          {content.footer.legalNote}
        </div>
      </footer>
    </div>
  );
};
