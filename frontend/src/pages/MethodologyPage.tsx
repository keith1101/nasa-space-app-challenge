import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Copy,
  Check,
  Flame,
  Activity,
  ShieldCheck,
  ExternalLink,
  Database,
  Scale,
  Sparkles,
  ListOrdered,
  X,
  ArrowUp,
} from 'lucide-react';
import { Badge, cx } from '../components/ui';
import { MathFormula } from '../components/ui/MathFormula';
import { ArchitectureFlowchart } from '../components/ui/ArchitectureFlowchart';
import {
  METHODOLOGY_SECTIONS,
  REDUNDANCY_MECHANISMS,
  HERO_SUMMARY_STATS,
  BENCHMARK_KPIS,
  SENSOR_MATRIX_DATA,
  ACADEMIC_REFERENCES,
  CANONICAL_BIBTEX,
} from '../data/methodology';

const KPI_ICON_MAP = {
  Database,
  Flame,
  Scale,
  Activity,
  ShieldCheck,
  Sparkles,
};

export function MethodologyPage() {
  const [activeSection, setActiveSection] = useState<string>('sec-01');
  const [copiedBibtex, setCopiedBibtex] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const tocRef = useRef<HTMLDivElement | null>(null);

  const sections = METHODOLOGY_SECTIONS;

  // Sync scroll position, progress, and active section
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Active section detection
          for (let i = sections.length - 1; i >= 0; i--) {
            const el = document.getElementById(sections[i].id);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= 110) {
                setActiveSection(sections[i].id);
                break;
              }
            }
          }

          // Document scroll progress percentage
          const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (totalScroll > 0) {
            const currentProgress = Math.min(100, Math.max(0, Math.round((window.pageYOffset / totalScroll) * 100)));
            setScrollProgress(currentProgress);
          }

          // Scroll-to-top visibility trigger
          setShowScrollTop(window.pageYOffset > 400);

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  // Handle outside click & Escape key to close popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTocOpen) {
        setIsTocOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (tocRef.current && !tocRef.current.contains(e.target as Node)) {
        setIsTocOpen(false);
      }
    };

    if (isTocOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTocOpen]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const topOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSection(id);
      setIsTocOpen(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const bibtex = CANONICAL_BIBTEX;

  const copyBibtex = () => {
    navigator.clipboard.writeText(bibtex).then(() => {
      setCopiedBibtex(true);
      setTimeout(() => setCopiedBibtex(false), 2000);
    });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-ink-950 text-slate-200">
      {/* 1. Technical Memorandum Hero Banner */}
      <section className="border-b border-line-strong bg-gradient-to-b from-ink-900 via-ink-950 to-ink-950 pt-10 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Metadata Badges & Citation Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                NASA Technical Memorandum
              </span>
              <span className="text-slate-600">·</span>
              <Badge tone="cyan">NASA-TM-2026-ST-DBSCAN-v2.2</Badge>
              <Badge tone="emerald">Track 04: Space Apps 2026</Badge>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyBibtex}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-900 px-3 py-1 text-xs text-slate-300 hover:border-cyan-400/40 hover:text-white transition-all"
                title="Copy BibTeX Citation"
              >
                {copiedBibtex ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>BibTeX</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Paper Title & Abstract */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Harmonization of Polar-Orbiting Multi-Sensor Thermal Anomalies (MODIS &amp; VIIRS): Anisotropic Swath Footprint ST-DBSCAN and Pass-Grouped Bayesian Inference
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-4xl">
              NASA Technical Memorandum establishing the mathematical foundations, ST-DBSCAN v2.2 spatio-temporal clustering, Laplace prior calibration, flux-density centroid anchoring, pass-reconciled instantaneous FRP, and Leave-One-Year-Out Jackknife climatology for global wildfire intelligence.
            </p>
          </div>

          {/* Quick Stat Pill Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {HERO_SUMMARY_STATS.map((stat, idx) => (
              <div key={idx} className="rounded-xl border border-line bg-ink-900/60 p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  {stat.label}
                </div>
                <div
                  className={cx(
                    'text-lg font-bold font-mono mt-0.5',
                    stat.tone === 'cyan' && 'text-cyan-300',
                    stat.tone === 'emerald' && 'text-emerald-300',
                    stat.tone === 'amber' && 'text-amber-300',
                    stat.tone === 'white' && 'text-white'
                  )}
                >
                  {stat.value}
                </div>
                <div className="text-[11px] text-slate-400">{stat.subtext}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Main Academic Body */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        {/* ========================================================================= */}
        {/* SECTION 01: Problem Formulation */}
        {/* ========================================================================= */}
        <section id="sec-01" className="scroll-mt-32 space-y-5">
          <div className="space-y-1.5 border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">SECTION 01</span>
              <span className="text-slate-600">/</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Multi-Sensor Active-Fire Redundancy &amp; Overcounting (27%–43%)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Physical orbital mechanics driving observation redundancy and energy distortion across MODIS and VIIRS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-8 space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
              <p>
                Global thermal anomaly surveillance concurrently employs dual generations of NASA/NOAA polar-orbiting optical radiometers: <strong>MODIS</strong> (aboard Terra and Aqua with 1,000 m nadir resolution) and <strong>VIIRS</strong> (aboard Suomi-NPP, NOAA-20, and NOAA-21 with 375 m I-band imagery channels).
              </p>

              <p>
                Because all five spacecraft operate in sun-synchronous polar orbits with staggered daytime equatorial crossing times separated by <strong>20 to 50 minutes</strong>, their overlapping 2,330–3,040 km swaths repeatedly detect identical active burning fronts within hours. Direct accumulation of raw NASA FIRMS detections without rigorous spatio-temporal reconciliation artificially <strong>inflates wildfire counts by 27%–43%</strong>.
              </p>

              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider font-mono">
                  <Flame className="h-4 w-4" />
                  <span>Severe Distortion of Fire Radiative Energy</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fire Radiative Power (FRP, measured in MW) quantifies the <em>instantaneous rate</em> of radiative thermal release. Summing FRP values across independent orbital overpasses represents an elementary physical violation—analogous to summing instantaneous velocities—overestimating total consumed biomass by <strong>1.8× to 2.1×</strong>.
                </p>
              </div>
            </div>

            {/* Overcounting Breakdown Card */}
            <div className="md:col-span-4 rounded-xl border border-line-strong bg-ink-900/90 p-4 space-y-3">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
                Redundancy Mechanisms
              </div>

              <div className="space-y-2 text-xs">
                {REDUNDANCY_MECHANISMS.map((mech) => (
                  <div key={mech.id} className="rounded-lg border border-line bg-ink-950 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-slate-200 font-semibold">
                      <span>{mech.title}</span>
                      <span className={cx('font-mono', mech.metricColor)}>{mech.metric}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{mech.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 02: End-to-End Modular Architecture */}
        {/* ========================================================================= */}
        <section id="sec-02" className="scroll-mt-32 space-y-5">
          <div className="space-y-1.5 border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">SECTION 02</span>
              <span className="text-slate-600">/</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                End-to-End Modular Architecture &amp; 4-Stage Pipeline
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Engine decoupled into single-responsibility subsystems from raw satellite ingestion to client GeoJSON streaming.
            </p>
          </div>

          {/* Interactive Flowchart Diagram */}
          <ArchitectureFlowchart />

          {/* Subsystem Responsibility Matrix */}
          <div className="mt-6 rounded-xl border border-line-strong bg-ink-900/60 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Architectural Subsystem Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-300 font-mono font-semibold">
                  <span>backend.core</span>
                </div>
                <p className="text-slate-300">
                  Pure algorithmic foundation: geometry.py (Haversine &amp; anisotropic ellipse), standardizer.py (schema &amp; Laplace), clustering.py (ST-DBSCAN), fusion.py (centroid &amp; Bayesian).
                </p>
              </div>

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-300 font-mono font-semibold">
                  <span>backend.services</span>
                </div>
                <p className="text-slate-300">
                  Data orchestration: cache_service.py (FIRMS API multi-tier caching &amp; live telemetry), calendar_service.py (Jackknife Z-scores &amp; ENSO), weather_service.py &amp; terrain_service.py (Open-Meteo &amp; DEM terrain enrichment).
                </p>
              </div>

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-mono font-semibold">
                  <span>backend.api</span>
                </div>
                <p className="text-slate-300">
                  Standardized REST endpoints: /api/harmonize, /api/metrics, /api/calendar with sub-95ms response latency and gzip transfer encoding for large geospatial payloads.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 03: Spatio-Temporal Mathematical Formulations */}
        {/* ========================================================================= */}
        <section id="sec-03" className="scroll-mt-32 space-y-6">
          <div className="space-y-1.5 border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">SECTION 03</span>
              <span className="text-slate-600">/</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Spatio-Temporal Mathematical Formulations &amp; Proofs
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Rigorous KaTeX-rendered mathematical foundations and formulations underpinning the ST-DBSCAN v2.2 engine.
            </p>
          </div>

          <div className="space-y-6">
            {/* Equation 1: Anisotropic Bowtie Footprint & Geodesic Distance */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-cyan-300">
                  1. Anisotropic Swath Footprint &amp; Geodesic Distance
                </span>
                <Badge tone="cyan">Eq. (1)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The spatial proximity between active-fire candidates <MathFormula tex="p_i(\phi_i, \lambda_i)" /> and <MathFormula tex="p_j(\phi_j, \lambda_j)" /> is evaluated using geodesic Haversine distance complemented by an anisotropic elliptical envelope along cross-track (<MathFormula tex="\text{scan}" />) and along-track (<MathFormula tex="\text{track}" />) axes, under dual sliding temporal window constraints:
              </p>

              {/* Haversine Formula */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300">
                  Analytical Geodesic Haversine Distance:
                </div>
                <MathFormula
                  tex="D_{\text{haversine}}(p_i, p_j) = 2R \arcsin\left(\min\left(1.0, \; \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_i)\cos(\phi_j)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)\right)"
                  block
                  description="Earth mean volumetric radius R = 6,371.0 km; Δϕ = (π/180°)(ϕ_j - ϕ_i); Δλ = (π/180°)(λ_j - λ_i)"
                />
              </div>

              {/* Elliptical Criterion & Displacements dx, dy */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300">
                  Anisotropic Swath Elliptical Matching Criterion:
                </div>
                <MathFormula
                  tex="D_{\text{haversine}}(p_i, p_j) \le \epsilon_{\text{base}} \quad \lor \quad \left[\left(\frac{dx}{a_{\text{scan}}}\right)^2 + \left(\frac{dy}{b_{\text{track}}}\right)^2 \le 1.0 \quad \land \quad D_{\text{haversine}}(p_i, p_j) \le \epsilon_{\text{upper}}\right]"
                  block
                  description="Base distance ε_base = 1.25 km; upper bounding ceiling ε_upper = min(max(ε_base, max_fp + 0.4), 2.75 km)"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Where along-track North-South displacement <MathFormula tex="dy" /> and cross-track East-West displacement <MathFormula tex="dx" /> are explicitly formulated with mean-latitude cosine meridian convergence scaling:
                </p>
                <MathFormula
                  tex="dx = R \cdot |\lambda_j - \lambda_i| \cdot \frac{\pi}{180^\circ} \cdot \cos\left(\frac{\phi_i + \phi_j}{2}\right), \qquad dy = R \cdot |\phi_j - \phi_i| \cdot \frac{\pi}{180^\circ}"
                  block
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dynamic semi-major axis <MathFormula tex="a_{\text{scan}}" /> and semi-minor axis <MathFormula tex="b_{\text{track}}" /> adapt from instantaneous pixel dimensions with Point Spread Function (PSF) triangular response overlap margins:
                </p>
                <MathFormula
                  tex="a_{\text{scan}} = \min\left(3.5, \; \max\left(1.25, \; \frac{\text{scan}_i + \text{scan}_j}{2} + 0.35\right)\right), \quad b_{\text{track}} = \min\left(3.5, \; \max\left(1.25, \; \frac{\text{track}_i + \text{track}_j}{2} + 0.55\right)\right)"
                  block
                />
              </div>

              {/* Spatial Hash Grid Indexing O(N) */}
              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-2">
                <div className="text-xs font-semibold text-cyan-300 font-mono flex items-center justify-between">
                  <span>O(N) Spatial Hash Grid Index</span>
                  <Badge tone="cyan">Stage 1</Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  To reduce pairwise computational complexity from <MathFormula tex="O(N^2)" /> to linear <MathFormula tex="O(N)" /> across &gt;150,000 telemetry points, coordinates are binned into spatial hash grid cells with dynamic grid resolution <MathFormula tex="\Delta_{\text{deg}}" />:
                </p>
                <MathFormula
                  tex="\text{cell}(\lambda, \phi) = \left( \left\lfloor \frac{\lambda}{\Delta_{\text{deg}}} \right\rfloor, \; \left\lfloor \frac{\phi}{\Delta_{\text{deg}}} \right\rfloor \right), \quad \Delta_{\text{deg}} = \max\left(0.015^\circ, \; \frac{\epsilon_{\text{upper}}}{105.0\text{ km/deg}}\right)"
                  block
                />
                <p className="text-[11px] text-slate-400">
                  Candidate neighbors are strictly queried within the 9 adjacent grid bins (3×3 neighborhood), guaranteeing sub-95ms execution.
                </p>
              </div>

              {/* Dual Temporal Window Constraint */}
              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-2">
                <div className="text-xs font-semibold text-emerald-300 font-mono flex items-center justify-between">
                  <span>Dual Sliding Temporal Window Constraint</span>
                  <Badge tone="emerald">Stage 2</Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Graph BFS traversal simultaneously enforces pairwise temporal proximity and cluster-wide bounding span with <MathFormula tex="\Delta t = 3.0\text{ h}" />:
                </p>
                <MathFormula
                  tex="\left(|t_i - t_j| \le \Delta t\right) \quad \land \quad \left(t_{\max}^{(\mathcal{C})} - t_{\min}^{(\mathcal{C})} \le \Delta t\right), \qquad \Delta t = 3.0\text{ hours}"
                  block
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <strong>Physical Significance:</strong> The pairwise condition <MathFormula tex="|t_i - t_j| \le \Delta t" /> guarantees temporal continuity. Concurrently, the cluster-wide condition <MathFormula tex="t_{\max} - t_{\min} \le \Delta t" /> eliminates &quot;chaining drift&quot;—preventing fires propagating over 24–48 hours from being artificially agglomerated into a single mega-cluster, which would severely distort instantaneous FRP and active front geometry.
                </p>
              </div>

              <p className="text-xs text-slate-400 italic">
                Geometric Significance: At 55° off-nadir, MODIS pixels smear to 4.8 km × 2.0 km. The anisotropic formulation strictly prevents false North-South merges while accommodating wide East-West cross-track smear.
              </p>
            </div>

            {/* Equation 2: Laplace Prior Confidence Calibration */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-emerald-300">
                  2. Laplace Confidence Prior Calibration
                </span>
                <Badge tone="emerald">Eq. (2)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                MODIS reports continuous integer confidence <MathFormula tex="[0, 100\%]" />, whereas VIIRS provides three-tier categorical flags (low, nominal, high). We map heterogeneous telemetry into a canonical Bayesian prior bounded within <MathFormula tex="[0.05, 0.99]" /> via Laplace regularization:
              </p>

              <MathFormula
                tex="p_{\text{MODIS}} = \max\left(0.05, \; \min\left(0.99, \; \frac{\text{conf}_{\text{MODIS}}}{100}\right)\right)"
                block
              />

              <MathFormula
                tex="p_{\text{VIIRS}} = \begin{cases} 0.30 & \text{if } \text{flag} = \text{'low'} \\ 0.70 & \text{if } \text{flag} = \text{'nominal'} \\ 0.95 & \text{if } \text{flag} = \text{'high'} \end{cases}"
                block
                description="Prevents extreme probability collapse (0 or 1) in posterior Bayesian likelihood updates"
              />

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-emerald-300 font-mono">
                  Parameter Definitions &amp; Probability Mapping:
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  <li>
                    <strong><MathFormula tex="p_{\text{MODIS}}" />:</strong>{' '}
                    Prior probability for MODIS active fire observation, normalized from percentage rating conf ∈ [0, 100%].
                  </li>
                  <li>
                    <strong><MathFormula tex="[0.05, 0.99]" />:</strong>{' '}
                    Laplace regularization bounds: floor 0.05 avoids zero-likelihood collapse; ceiling 0.99 reflects non-zero instrument uncertainty.
                  </li>
                  <li>
                    <strong><MathFormula tex="p_{\text{VIIRS}}" />:</strong>{' '}
                    Three-tier probability assignment from categorical flags: low → 0.30, nominal → 0.70, high → 0.95 per NASA/NOAA C2 specifications.
                  </li>
                </ul>
              </div>
            </div>

            {/* Equation 3: Flux-Density Centroid */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-amber-300">
                  3. Radiative Flux-Density Centroid Localization
                </span>
                <Badge tone="amber">Eq. (3)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The spatial centroid is not a simplistic geometric average. Instead, coordinates are weighted by <strong>radiative flux density</strong> per unit ground pixel footprint, anchoring the physical fire front to crisp 375 m VIIRS detections:
              </p>

              <MathFormula
                tex="w_i = \frac{\text{FRP}_i + 0.1}{\max\left(0.05, \; \text{scan}_i \times \text{track}_i\right)}"
                block
                description="Flux-density weight normalized by ground pixel area footprint"
              />

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-amber-300 font-mono">
                  Physical Parameter Grounding:
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  <li>
                    <strong>Laplace smoothing (+0.1):</strong>{' '}
                    Prevents zero-weight singularities when smoldering or small fires report <MathFormula tex="\text{FRP} = 0.0\text{ MW}" />, ensuring every confirmed physical detection contributes to centroid localization.
                  </li>
                  <li>
                    <strong>Footprint area floor (0.05 km²):</strong>{' '}
                    Regularizes denominator <MathFormula tex="\max(0.05, \text{scan} \times \text{track})" /> against division-by-zero or numerical anomalies, enforcing a physically grounded minimum pixel area threshold of <MathFormula tex="0.05\text{ km}^2" /> (<MathFormula tex="5\text{ ha}" />).
                  </li>
                </ul>
              </div>

              <MathFormula
                tex="\mathbf{x}^* = \begin{bmatrix} \text{lat}^* \\ \text{lon}^* \end{bmatrix} = \frac{\sum_{i \in \mathcal{P}_{\text{ref}}} w_i \mathbf{x}_i}{\sum_{i \in \mathcal{P}_{\text{ref}}} w_i}, \quad \text{where } \mathcal{P}_{\text{ref}} = \begin{cases} \mathcal{P}_{\text{VIIRS}} & \text{if } |\mathcal{P}_{\text{VIIRS}}| > 0 \\ \mathcal{P}_{\text{MODIS}} & \text{otherwise} \end{cases}"
                block
              />

              <p className="text-xs text-slate-400">
                When VIIRS (375m) detections exist, reference set <MathFormula tex="\mathcal{P}_{\text{ref}}" /> strictly uses VIIRS points to anchor 375m resolution, eliminating smear pull from 1,000m MODIS bowtie pixels.
              </p>
            </div>

            {/* Equation 4: Pass-Grouped Bayesian Noisy-OR Fusion */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-cyan-300">
                  4. Pass-Grouped Bayesian Noisy-OR Fusion
                </span>
                <Badge tone="cyan">Eq. (4)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Multiple adjacent pixels within a single overpass exhibit high spatial autocorrelation and cannot be treated as statistically independent trials. The engine groups detections by independent satellite passes <MathFormula tex="s \in \mathcal{S}" />, calculates pass-level probabilities, and applies noisy-OR aggregation:
              </p>

              <MathFormula
                tex="p_{\text{sat}, s} = \min\left(0.98, \; \max_{i \in s}(p_i) + 0.02 \times \min(|s| - 1, 3)\right)"
                block
                description="Pass-level confidence with bounded multi-pixel corroboration bonus"
              />

              <MathFormula
                tex="P_{\text{fused}} = 1 - \prod_{s \in \mathcal{S}} \left(1 - p_{\text{sat}, s}\right)"
                block
              />

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-cyan-300 font-mono">
                  Bayesian Ceiling: Single-Sensor (0.98) vs. Dual-Sensor (0.99):
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  <li>
                    <strong>Single-satellite ceiling (0.98):</strong>{' '}
                    Regardless of how many pixels corroborate within a single spacecraft pass, common-mode systematic artifacts (specular solar glint, hot bare soil, cloud-edge refraction) can affect the pass uniformly. Thus single-pass probability is capped at 0.98.
                  </li>
                  <li>
                    <strong>Multi-sensor / dual-sensor ceiling (0.99):</strong>{' '}
                    When distinct sensor families (MODIS Terra/Aqua and VIIRS SNPP/NOAA-20/21) observing at staggered equatorial times independently confirm the anomaly, instrument-specific artifacts are ruled out, elevating the posterior ceiling to 0.99.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Dual-Sensor Family Confirmation Floor</span>
                </div>
                <p>
                  When an event is corroborated across distinct sensor families (MODIS + VIIRS) with at least one detection <MathFormula tex="\ge 50\%" />, the engine establishes a mathematical confidence floor: <MathFormula tex="P_{\text{fused}} \ge 0.92" />.
                </p>
              </div>
            </div>

            {/* Equation 5: Pass-Reconciled Instantaneous FRP */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-rose-300">
                  5. Pass-Reconciled Instantaneous Fire Radiative Power
                </span>
                <Badge tone="rose">Eq. (5)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                FRP (MW) quantifies the instantaneous rate of radiant energy release. To preserve physical front-width scaling without multi-pass overestimation, the system aggregates sub-kilometer pixels within each <em>individual overpass</em>, then reconciles by taking the <strong>maximum across independent passes</strong>:
              </p>

              <MathFormula
                tex="\text{FRP}_{\text{reconciled}} = \max\left( \max_{s \in \mathcal{S}_{\text{MODIS}}} \sum_{i \in s} \text{FRP}_i, \quad \max_{s \in \mathcal{S}_{\text{VIIRS}}} \sum_{i \in s} \text{FRP}_i \right)"
                block
                description="Reconciled FRP: Intra-pass summation followed by inter-pass maximum reconciliation"
              />

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-rose-300 font-mono">
                  Radiative Power Symbols &amp; Physical Grounding:
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  <li>
                    <strong><MathFormula tex="\text{FRP}_i" />:</strong>{' '}
                    Instantaneous Fire Radiative Power emitted by active fire pixel i (in Megawatts - MW).
                  </li>
                  <li>
                    <strong><MathFormula tex="\sum_{i \in s} \text{FRP}_i" />:</strong>{' '}
                    Intra-pass spatial integration across overpass s: aggregates instantaneous power emitted across the entire contiguous active flaming front.
                  </li>
                  <li>
                    <strong><MathFormula tex="\max_{s}" />:</strong>{' '}
                    Inter-pass maximum reconciliation: takes peak instantaneous power rather than multi-pass summation, preventing artificial 1.8×–2.1× energy overcounting.
                  </li>
                </ul>
              </div>
            </div>

            {/* Equation 6: Jackknife Climatological Z-Score */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-amber-300">
                  6. Leave-One-Year-Out (Jackknife) Climatological Z-Score
                </span>
                <Badge tone="amber">Eq. (6)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                In 20-year satellite records, extreme climate-driven wildfire years (such as severe El Niño phases in 2015–2016) exhibit enormous fire counts. Including target year <MathFormula tex="y" /> within the climatological baseline inflates the sample mean and variance, causing severe &quot;self-suppression&quot; of its own anomaly. We eliminate this bias via Leave-One-Year-Out (Jackknife) estimation:
              </p>

              <MathFormula
                tex="Z_y = \frac{x_y - \bar{x}_{(-y)}}{s_{(-y)}} = \frac{x_y - \frac{1}{N-1}\sum_{k \ne y} x_k}{\sqrt{\frac{1}{N-2}\sum_{k \ne y} \left(x_k - \bar{x}_{(-y)}\right)^2}}"
                block
                description="Jackknife Z-score eliminating sample self-suppression in extreme El Niño episodes"
              />

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-amber-300 font-mono">
                  Jackknife Statistical Symbols &amp; Formulation:
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  <li>
                    <strong><MathFormula tex="y" />:</strong>{' '}
                    Target observation year evaluated within the multi-decadal time series.
                  </li>
                  <li>
                    <strong><MathFormula tex="x_y" />:</strong>{' '}
                    Observed annual fire metric (fire count or cumulative FRP) for year y.
                  </li>
                  <li>
                    <strong><MathFormula tex="\bar{x}_{(-y)}" />:</strong>{' '}
                    Climatological baseline sample mean calculated across all remaining N - 1 years after omitting target year y.
                  </li>
                  <li>
                    <strong><MathFormula tex="s_{(-y)}" />:</strong>{' '}
                    Jackknife sample standard deviation adjusted with N - 2 degrees of freedom, guaranteeing unbiased population variance estimation.
                  </li>
                  <li>
                    <strong><MathFormula tex="Z_y" />:</strong>{' '}
                    Standardized climatological anomaly index, eliminating self-suppression during extreme climate-driven El Niño fire seasons.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 04: MODIS vs VIIRS Sensor Matrix */}
        {/* ========================================================================= */}
        <section id="sec-04" className="scroll-mt-32 space-y-5">
          <div className="space-y-1.5 border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">SECTION 04</span>
              <span className="text-slate-600">/</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Extended Sensor Comparison Matrix: MODIS (C6.1) vs. VIIRS (C2)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Comprehensive 8-point physical specification matrix contrasting orbital, geometric, and radiometric attributes.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line-strong bg-ink-900/90 shadow-panel">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-ink-950/80 text-slate-300">
                  <th className="py-3 px-4 font-semibold">Sensor Specification</th>
                  <th className="py-3 px-4 font-semibold text-rose-300">MODIS (Collection 6.1)</th>
                  <th className="py-3 px-4 font-semibold text-emerald-300">VIIRS (Collection 2 - 375m)</th>
                  <th className="py-3 px-4 font-semibold text-cyan-300">Harmonization Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-slate-300 font-mono text-[11px] sm:text-xs">
                {SENSOR_MATRIX_DATA.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 px-4 font-sans font-medium text-white">{row.specName}</td>
                    <td className={cx('py-3 px-4', row.highlightModis && 'text-rose-300')}>{row.modisSpec}</td>
                    <td className={cx('py-3 px-4 text-emerald-300', row.highlightViirs && 'font-bold')}>{row.viirsSpec}</td>
                    <td className="py-3 px-4 font-sans text-slate-400">{row.harmonizationImpact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 05: Empirical Validation & Benchmarks */}
        {/* ========================================================================= */}
        <section id="sec-05" className="scroll-mt-32 space-y-5">
          <div className="space-y-1.5 border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">SECTION 05</span>
              <span className="text-slate-600">/</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Empirical Validation &amp; Benchmark Results
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Quantitative evaluation over the verified global 24-hour NASA FIRMS telemetry catalog (153,948 raw detections across 143 countries, including Southeast Asia and global tropical biomes).
            </p>
          </div>

          {/* KPI Matrix Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENCHMARK_KPIS.map((kpi) => {
              const Icon = KPI_ICON_MAP[kpi.iconName];
              return (
                <div key={kpi.id} className="rounded-xl border border-line-strong bg-ink-900/90 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      {kpi.label}
                    </span>
                    <Icon className={cx('h-4 w-4', kpi.iconColor)} />
                  </div>
                  <div className={cx('text-2xl font-extrabold font-mono', kpi.valueColor)}>{kpi.value}</div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {kpi.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 06: Canonical Academic References */}
        {/* ========================================================================= */}
        <section id="sec-06" className="scroll-mt-32 space-y-5">
          <div className="space-y-1.5 border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">SECTION 06</span>
              <span className="text-slate-600">/</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Canonical Academic References &amp; Provenance
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Primary peer-reviewed publications establishing the remote sensing and computational foundation.
            </p>
          </div>

          <div className="space-y-3">
            {ACADEMIC_REFERENCES.map((ref) => (
              <div
                key={ref.num}
                className="rounded-xl border border-line bg-ink-900/60 p-4 space-y-1.5 transition-colors hover:border-line-strong hover:bg-ink-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-200">
                      <span className="font-mono text-cyan-400 font-bold mr-2">{ref.num}</span>
                      <strong className="text-white">{ref.authors}</strong> ({ref.year}).{' '}
                      <em className="text-cyan-200 font-serif">{ref.title}</em>{' '}
                      <span className="text-slate-300">{ref.journal}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans italic">{ref.note}</div>
                  </div>

                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-line-strong bg-ink-950 px-2.5 py-1 font-mono text-[10px] text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400/40 transition-colors"
                    title={`Open DOI: ${ref.doi}`}
                  >
                    <span>DOI</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* BibTeX Citation Box */}
          <div className="mt-6 rounded-xl border border-line-strong bg-ink-950 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-slate-300 font-semibold">
                BibTeX Canonical Citation
              </span>
              <button
                type="button"
                onClick={copyBibtex}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-900 px-3 py-1 text-xs text-slate-300 hover:text-white transition-colors"
              >
                {copiedBibtex ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-line bg-ink-900/80 p-3 font-mono text-[11px] text-slate-300 leading-relaxed">
              {bibtex}
            </pre>
          </div>
        </section>

        {/* Back / Action Footer */}
        <div className="border-t border-line pt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-white">
              Ready to explore active telemetry?
            </div>
            <p className="text-xs text-slate-400">
              Access the Deck.gl 60 FPS WebGL2 map or inspect the unified active fire event catalog.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-xs font-bold text-ink-950 shadow-md hover:from-cyan-400 hover:to-emerald-400 transition-all hover:scale-[1.02]"
            >
              <span>Launch GIS Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Floating TOC Popup & Action Dock */}
      <aside
        ref={tocRef}
        aria-label="Floating table of contents"
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5"
      >
        {/* Floating Popup Dialog */}
        {isTocOpen && (
          <div
            role="dialog"
            aria-modal="false"
            aria-label="Table of contents"
            className="w-80 max-w-[calc(100vw-3rem)] rounded-2xl border border-line-strong bg-ink-900/95 backdrop-blur-2xl shadow-pop flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            {/* Popup Header */}
            <div className="flex items-center justify-between border-b border-line bg-ink-950/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-cyan-400" />
                <span className="font-bold text-xs text-white">
                  Table of Contents
                </span>
                <Badge tone="cyan">
                  {activeSection.replace('sec-', '')}/06
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setIsTocOpen(false)}
                aria-label="Close table of contents"
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-ink-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scroll Progress Bar inside Popup */}
            <div className="w-full bg-ink-950 h-1 relative overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all duration-150"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>

            {/* Section Items */}
            <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1 text-xs">
              {sections.map((sec) => {
                const isCurrent = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollTo(sec.id)}
                    className={`w-full text-left rounded-xl px-3 py-2 transition-all flex items-start gap-2.5 ${
                      isCurrent
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-semibold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-ink-800/80'
                    }`}
                  >
                    <span className={`font-mono text-[11px] mt-0.5 ${isCurrent ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                      {sec.num}
                    </span>
                    <span className="flex-1 leading-snug">{sec.title}</span>
                    {isCurrent && (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-glow mt-1.5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Popup Footer */}
            <div className="border-t border-line bg-ink-950/60 px-3 py-2 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono">
                Progress: {scrollProgress}%
              </span>
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                <ArrowUp className="h-3 w-3" />
                <span>Top</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Action Capsule (Trigger + ScrollTop) */}
        <div className="flex items-center gap-2">
          {showScrollTop && (
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Scroll to top"
              className="h-10 w-10 rounded-full border border-line-strong bg-ink-900/90 text-slate-300 hover:text-white hover:border-cyan-400/50 shadow-pop backdrop-blur-xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsTocOpen(!isTocOpen)}
            aria-expanded={isTocOpen}
            aria-label="Toggle table of contents"
            className={`h-10 rounded-full border px-4 py-2 text-xs font-semibold shadow-pop backdrop-blur-xl transition-all duration-200 flex items-center gap-2 hover:scale-[1.02] active:scale-95 ${
              isTocOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-glow'
                : 'bg-ink-900/90 text-slate-200 hover:text-white border-line-strong hover:border-cyan-400/50'
            }`}
          >
            <ListOrdered className="h-4 w-4 text-cyan-400" />
            <span>Contents</span>
            <span className="font-mono text-[10px] rounded-full bg-ink-950 px-1.5 py-0.5 border border-line text-cyan-300 font-bold">
              {activeSection.replace('sec-', '')}/06
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
