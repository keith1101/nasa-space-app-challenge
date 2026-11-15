import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Globe2, Layers, Sparkles } from 'lucide-react';
import { MiniFirePreview } from '../components/deck/MiniFirePreview';
import { CinematicEarth } from '../components/earth/CinematicEarth';
import { AnimatedCounter } from '../components/ui/AnimatedCounter';
import { CardSpotlight } from '../components/ui/CardSpotlight';
import { BorderBeam } from '../components/ui/BorderBeam';
import { SpaceStarfield } from '../components/ui/SpaceStarfield';
import { MathFormula } from '../components/ui/MathFormula';
import { cx } from '../components/ui';

export function LandingPage() {
  const [previewMode, setPreviewMode] = useState<'3d' | '2d'>('3d');

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-ink-950 text-slate-100">
      {/* 1. Canvas Starfield & Ambient Thermal Sparks */}
      <SpaceStarfield className="pointer-events-none absolute inset-0 h-full w-full opacity-65 z-0" />

      {/* Orbital Glow Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/2 -left-32 h-[400px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 space-y-16 sm:space-y-20">
        {/* 2. Hero Section with Motion Staggered Entrance */}
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/5 px-3 py-1 text-xs font-medium text-cyan-300 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>NASA Space Apps 2026 · Telemetry Harmonization</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="text-3xl font-extrabold sm:text-5xl text-white tracking-tight"
          >
            Global Multi-Sensor{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
              Active-Fire Harmonization
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="mx-auto max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed"
          >
            Eliminating 27%–43% multi-satellite redundancy between MODIS (1,000 m) and VIIRS (375 m) using spatio-temporal ST-DBSCAN and pass-grouped Bayesian sensor fusion.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-xs font-bold text-ink-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-emerald-400 transition-all hover:scale-[1.02]"
            >
              <Globe2 className="h-3.5 w-3.5" />
              <span>Launch Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              to="/methodology"
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-ink-900/80 px-5 py-2.5 text-xs font-semibold text-slate-300 backdrop-blur-sm hover:bg-ink-800 hover:text-white transition-all hover:border-cyan-400/40"
            >
              <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
              <span>Methodology</span>
            </Link>
          </motion.div>
        </div>

        {/* 3. Global Telemetry Live Counters with Animated Numbers */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0 }}
            className="rounded-xl border border-line-strong/60 bg-ink-900/60 p-4 backdrop-blur-sm text-center space-y-1 hover:border-cyan-400/40 transition-colors"
          >
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
              <AnimatedCounter to={87311} />
            </div>
            <div className="text-xs font-semibold text-cyan-300">
              Harmonized Hotspots
            </div>
            <div className="text-[11px] text-slate-400">
              From 153k raw scans
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-xl border border-line-strong/60 bg-ink-900/60 p-4 backdrop-blur-sm text-center space-y-1 hover:border-emerald-400/40 transition-colors"
          >
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
              <AnimatedCounter to={962} />
            </div>
            <div className="text-xs font-semibold text-emerald-300">
              Dual Confirmed
            </div>
            <div className="text-[11px] text-slate-400">
              Confidence ≥ 92%
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl border border-line-strong/60 bg-ink-900/60 p-4 backdrop-blur-sm text-center space-y-1 hover:border-emerald-400/40 transition-colors"
          >
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
              <AnimatedCounter to={43.3} prefix="−" suffix="%" decimals={1} />
            </div>
            <div className="text-xs font-semibold text-emerald-300">
              Deduplication Rate
            </div>
            <div className="text-[11px] text-slate-400">
              Zero inflation
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-xl border border-line-strong/60 bg-ink-900/60 p-4 backdrop-blur-sm text-center space-y-1 hover:border-sky-400/40 transition-colors"
          >
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
              <AnimatedCounter to={143} />
            </div>
            <div className="text-xs font-semibold text-sky-300">
              Countries Monitored
            </div>
            <div className="text-[11px] text-slate-400">
              7 global biomes
            </div>
          </motion.div>
        </div>

        {/* 4. 3 Core Scientific Breakthroughs with Card Spotlight & Border Beam */}
        <div className="space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <span>3 Scientific Breakthroughs</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Remote sensing pipeline combining orbital swath geometry with Bayesian probability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            {/* Pillar 1: ST-DBSCAN (Cyan Spotlight + Animated Border Beam) */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
            >
              <CardSpotlight
                spotlightColor="rgba(34, 211, 238, 0.16)"
                className="h-full space-y-3 relative group"
              >
                <BorderBeam duration={8} colorFrom="#22d3ee" colorTo="#06b6d4" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-400">01</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">ST-DBSCAN</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Spatio-Temporal Clustering
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Anisotropic elliptical swath clustering adapting cross-track distortion with continuous sliding time window ≤ 3.0 hours.
                </p>
                <div className="rounded-lg bg-ink-950/80 px-3 py-2 text-cyan-300 border border-line flex items-center justify-center">
                  <MathFormula tex="\left(\frac{dx}{a_{\text{scan}}}\right)^2 + \left(\frac{dy}{b_{\text{track}}}\right)^2 \le 1.0" />
                </div>
              </CardSpotlight>
            </motion.div>

            {/* Pillar 2: Bayesian (Emerald Spotlight) */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <CardSpotlight
                spotlightColor="rgba(16, 185, 129, 0.16)"
                className="h-full space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">02</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Bayesian</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Pass-Grouped Bayesian
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pass-grouped noisy-OR logic eliminates false alarms. Multi-sensor corroboration guarantees robust confidence calibration ≥ 92%.
                </p>
                <div className="rounded-lg bg-ink-950/80 px-3 py-2 text-emerald-300 border border-line flex items-center justify-center">
                  <MathFormula tex="P_{\text{fused}} = 1 - \prod_{s} (1 - p_s)" />
                </div>
              </CardSpotlight>
            </motion.div>

            {/* Pillar 3: Resolution (Rose Spotlight) */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <CardSpotlight
                spotlightColor="rgba(244, 63, 94, 0.16)"
                className="h-full space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-400">03</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Resolution</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  375m Centroid & Peak FRP
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Localizes physical fire front using 375m VIIRS I-band; reconciles peak pass FRP to prevent multi-orbit energy inflation.
                </p>
                <div className="rounded-lg bg-ink-950/80 px-3 py-2 text-rose-300 border border-line flex items-center justify-center">
                  <MathFormula tex="\text{FRP}_{\text{reconciled}} = \max_s \left(\sum_{i \in s} \text{FRP}_i\right)" />
                </div>
              </CardSpotlight>
            </motion.div>
          </div>
        </div>

        {/* 5. Interactive Showcase with Border Beam Effect */}
        <div className="relative rounded-2xl border border-line-strong/80 bg-ink-900/80 p-5 sm:p-7 shadow-2xl backdrop-blur-md overflow-hidden group">
          <BorderBeam duration={12} colorFrom="#22d3ee" colorTo="#10b981" />

          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 relative z-10">
            <div className="space-y-4 max-w-lg">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-400/20 font-mono">
                  Three.js WebGL · NASA Blue Marble
                </span>
                <span className="text-[10px] font-mono text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 rounded">
                  60 FPS Sci-Fi
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Cinematic Orbital Earth Simulation
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Photorealistic 3D Earth simulation featuring real-time day/night terminator transitions, Rayleigh atmospheric scattering, Low Earth Orbit (LEO) sun-synchronous satellite tracks, and pulsating active fire beacons.
              </p>

              {/* View Mode Selector Tabs */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode('3d')}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    previewMode === '3d'
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-ink-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'border border-line bg-ink-950 text-slate-400 hover:text-white',
                  )}
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  <span>3D Orbital Globe</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMode('2d')}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    previewMode === '2d'
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-ink-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'border border-line bg-ink-950 text-slate-400 hover:text-white',
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>2D Deck.gl Map</span>
                </button>

                <Link
                  to="/dashboard"
                  className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:underline"
                >
                  <span>Full GIS Station</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Interactive Preview Container */}
            <div className="w-full lg:w-[480px] shrink-0 h-[430px]">
              {previewMode === '3d' ? (
                <CinematicEarth className="h-full w-full" />
              ) : (
                <MiniFirePreview />
              )}
            </div>
          </div>
        </div>

        {/* Bottom Callout */}
        <div className="text-center space-y-3 py-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Explore Global Wildfire Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Workstation equipped with GIS layer controls, multi-sensor filtering, and regime calendars.
          </p>
          <div className="pt-1">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-bold text-ink-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-emerald-400 transition-all hover:scale-[1.02]"
            >
              <span>Launch Station</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
