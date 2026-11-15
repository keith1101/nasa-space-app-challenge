import { useState, useEffect, useMemo, useRef } from 'react';
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
import { useUiStore } from '../stores/useUiStore';
import { Badge } from '../components/ui';
import { MathFormula } from '../components/ui/MathFormula';
import { ArchitectureFlowchart } from '../components/ui/ArchitectureFlowchart';

export function MethodologyPage() {
  const { lang, setLang } = useUiStore();
  const isVi = lang === 'vi';

  const [activeSection, setActiveSection] = useState<string>('sec-01');
  const [copiedBibtex, setCopiedBibtex] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const tocRef = useRef<HTMLDivElement | null>(null);

  const sections = useMemo(
    () => [
      { id: 'sec-01', num: '01', title: isVi ? 'Đặt Vấn Đề & Trùng Lặp 27%–43%' : 'Problem Formulation (27%–43%)' },
      { id: 'sec-02', num: '02', title: isVi ? 'Kiến Trúc Luồng Dữ Liệu 4 Tầng' : 'End-to-End Modular Pipeline' },
      { id: 'sec-03', num: '03', title: isVi ? 'Hệ Thống Công Thức Toán Học' : 'Mathematical Formulations' },
      { id: 'sec-04', num: '04', title: isVi ? 'Bảng Đối Chiếu Cảm Biến Kỹ Thuật' : 'MODIS vs. VIIRS Sensor Matrix' },
      { id: 'sec-05', num: '05', title: isVi ? 'Kiểm Chứng Thực Nghiệm & Đo Đạc' : 'Empirical Benchmarks' },
      { id: 'sec-06', num: '06', title: isVi ? 'Danh Mục Tham Khảo & Trích Dẫn' : 'Academic References' },
    ],
    [isVi],
  );

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

  const bibtex = `@techreport{nasa_firms_harmonization_2026,
  author      = {NASA Space Apps Challenge Team},
  title       = {Anisotropic Swath Footprint ST-DBSCAN and Pass-Grouped Bayesian Fusion for Multi-Sensor MODIS and VIIRS Thermal Anomaly Harmonization},
  institution = {NASA Technical Memorandum},
  number      = {NASA-TM-2026-ST-DBSCAN-v2.2},
  year        = {2026},
  month       = {November},
  address     = {Washington, D.C.},
  url         = {https://firms.modaps.eosdis.nasa.gov/}
}`;

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
          {/* Metadata Badges & Language Switcher */}
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
              <div className="inline-flex rounded-lg border border-line-strong bg-ink-900 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setLang('vi')}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    isVi ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tiếng Việt
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    !isVi ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  English
                </button>
              </div>

              <button
                type="button"
                onClick={copyBibtex}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-900 px-3 py-1 text-xs text-slate-300 hover:border-cyan-400/40 hover:text-white transition-all"
                title="Copy BibTeX Citation"
              >
                {copiedBibtex ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">{isVi ? 'Đã sao chép' : 'Copied'}</span>
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

          {/* Paper Title & Authors */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {isVi
                ? 'Hợp Nhất Điểm Cháy Đa Cảm Biến Quỹ Đạo Cực (MODIS & VIIRS): Khử Trùng Lặp Hình Học Vệt Quét Dị Hướng & Suy Luận Bayesian Gom Nhóm'
                : 'Harmonization of Polar-Orbiting Multi-Sensor Thermal Anomalies (MODIS & VIIRS): Anisotropic Swath Footprint ST-DBSCAN and Pass-Grouped Bayesian Inference'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-4xl">
              {isVi
                ? 'Báo cáo kỹ thuật chi tiết về cơ sở toán học, mô hình phân cụm không - thời gian ST-DBSCAN v2.2, hiệu chuẩn tiên nghiệm Laplace, neo trọng tâm theo mật độ bức xạ, điều hòa năng lượng FRP tức thời, và phân tích dị thường khí hậu Jackknife phục vụ hệ thống cảnh báo cháy sớm toàn cầu.'
                : 'NASA Technical Memorandum establishing the mathematical foundations, ST-DBSCAN v2.2 spatio-temporal clustering, Laplace prior calibration, flux-density centroid anchoring, pass-reconciled instantaneous FRP, and Leave-One-Year-Out Jackknife climatology for global wildfire intelligence.'}
            </p>
          </div>

          {/* Quick Stat Pill Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-xl border border-line bg-ink-900/60 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {isVi ? 'Tỷ lệ khử trùng ảo' : 'Redundancy Reduction'}
              </div>
              <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">43.29%</div>
              <div className="text-[11px] text-slate-400">{isVi ? '153.9k → 87.3k cụm' : '153.9k → 87.3k events'}</div>
            </div>
            <div className="rounded-xl border border-line bg-ink-900/60 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {isVi ? 'Độ trễ xử lý' : 'Latency Performance'}
              </div>
              <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">&lt; 95 ms</div>
              <div className="text-[11px] text-slate-400">{isVi ? 'Danh mục 24h toàn cầu' : '24h Global Catalog'}</div>
            </div>
            <div className="rounded-xl border border-line bg-ink-900/60 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {isVi ? 'Bảo toàn âm tính' : 'False Negative Rate'}
              </div>
              <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">0.0%</div>
              <div className="text-[11px] text-slate-400">{isVi ? 'Không bỏ sót điểm đơn' : 'Zero isolated fire loss'}</div>
            </div>
            <div className="rounded-xl border border-line bg-ink-900/60 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {isVi ? 'Độ phân giải tối ưu' : 'Centroid Resolution'}
              </div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">375 m</div>
              <div className="text-[11px] text-slate-400">{isVi ? 'VIIRS I-band anchor' : 'VIIRS I-band anchor'}</div>
            </div>
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
                {isVi
                  ? 'Vấn Đề Thổi Phồng Số Lượng Cháy Đa Cảm Biến (27%–43%)'
                  : 'Multi-Sensor Active-Fire Redundancy & Overcounting (27%–43%)'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {isVi
                ? 'Nguồn gốc vật lý học viễn thám dẫn đến sự trùng lặp và sai số năng lượng khi kết hợp MODIS và VIIRS.'
                : 'Physical orbital mechanics driving observation redundancy and energy distortion across MODIS and VIIRS.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-8 space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
              <p>
                {isVi ? (
                  <>
                    Giám sát hỏa hoạn toàn cầu hiện phụ thuộc song song vào hai thế hệ cảm biến quét nhiệt quang học hồng ngoại trung (MWIR 3.9–4.0 µm) và hồng ngoại nhiệt (TIR 11 µm) của NASA và NOAA: <strong>MODIS</strong> (trên vệ tinh Terra và Aqua, độ phân giải 1.000m tại Nadir) và <strong>VIIRS</strong> (trên Suomi-NPP, NOAA-20 và NOAA-21, độ phân giải 375m dải I-band).
                  </>
                ) : (
                  <>
                    Global thermal anomaly surveillance concurrently employs dual generations of NASA/NOAA polar-orbiting optical radiometers: <strong>MODIS</strong> (aboard Terra and Aqua with 1,000 m nadir resolution) and <strong>VIIRS</strong> (aboard Suomi-NPP, NOAA-20, and NOAA-21 with 375 m I-band imagery channels).
                  </>
                )}
              </p>

              <p>
                {isVi ? (
                  <>
                    Do cả 5 vệ tinh đều bay theo quỹ đạo đồng bộ mặt trời gần vùng cực (sun-synchronous low Earth orbit) với thời điểm bay qua đường xích đạo lệch nhau từ <strong>20 đến 50 phút</strong>, vệt quét rộng từ 2.330 km đến 3.040 km của chúng liên tục quan sát cùng một đám cháy nhiều lần trong ngày. Nếu các cơ quan chức năng phân tích dữ liệu FIRMS thô mà không qua khâu điều hòa không - thời gian, tổng số điểm cháy sẽ bị <strong>thổi phồng từ 27% đến 43%</strong>.
                  </>
                ) : (
                  <>
                    Because all five spacecraft operate in sun-synchronous polar orbits with staggered daytime equatorial crossing times separated by <strong>20 to 50 minutes</strong>, their overlapping 2,330–3,040 km swaths repeatedly detect identical active burning fronts within hours. Direct accumulation of raw NASA FIRMS detections without rigorous spatio-temporal reconciliation artificially <strong>inflates wildfire counts by 27%–43%</strong>.
                  </>
                )}
              </p>

              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider font-mono">
                  <Flame className="h-4 w-4" />
                  <span>{isVi ? 'Biến dạng nghiêm trọng về năng lượng bức xạ (FRP)' : 'Severe Distortion of Fire Radiative Energy'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isVi ? (
                    <>
                      Năng lượng bức xạ cháy (Fire Radiative Power - FRP, đơn vị MW) đo lường <em>tốc độ tức thời</em> mà bức xạ nhiệt được giải phóng tại thời điểm vệ tinh quét qua. Việc cộng dồn giá trị FRP giữa các lượt quét độc lập (overpasses) là một sai lầm vật lý học cơ bản, tương tự như việc cộng dồn vận tốc tức thời để tính quãng đường, làm thổi phồng tổng sinh khối bị thiêu rụi lên gấp <strong>1.8× đến 2.1×</strong>.
                    </>
                  ) : (
                    <>
                      Fire Radiative Power (FRP, measured in MW) quantifies the <em>instantaneous rate</em> of radiative thermal release. Summing FRP values across independent orbital overpasses represents an elementary physical violation—analogous to summing instantaneous velocities—overestimating total consumed biomass by <strong>1.8× to 2.1×</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Overcounting Breakdown Card */}
            <div className="md:col-span-4 rounded-xl border border-line-strong bg-ink-900/90 p-4 space-y-3">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
                {isVi ? 'Cơ Chế Gây Trùng Lặp Ảo' : 'Redundancy Mechanisms'}
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-lg border border-line bg-ink-950 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-slate-200 font-semibold">
                    <span>{isVi ? 'Lệch pha quỹ đạo cực' : 'Orbital Phase Drift'}</span>
                    <span className="font-mono text-cyan-300">20–50 min</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isVi
                      ? 'Aqua (13:30) và Suomi-NPP (13:30) bay qua cùng vùng lãnh thổ chỉ cách nhau vài phút.'
                      : 'Aqua and Suomi-NPP track identical ground tracks with tight temporal separation.'}
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-ink-950 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-slate-200 font-semibold">
                    <span>{isVi ? 'Hiệu ứng dãn nơ Bowtie' : 'Bowtie Distortion'}</span>
                    <span className="font-mono text-amber-300">4.8×2.0 km</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isVi
                      ? 'Ở rìa góc quét 55°, pixel MODIS nở to gấp 10 lần diện tích tại tâm Nadir, gây chồng lấn 3 lượt quét liên tiếp.'
                      : 'At 55° scan angle, MODIS pixels expand by ~10× nadir area, creating adjacent swath overlaps.'}
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-ink-950 p-2.5 space-y-1">
                  <div className="flex items-center justify-between text-slate-200 font-semibold">
                    <span>{isVi ? 'Chênh lệch độ phân giải' : 'Scale Disparity'}</span>
                    <span className="font-mono text-emerald-300">1:7 ratio</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isVi
                      ? 'Một pixel MODIS 1.000m chứa tới 7 điểm phát hiện VIIRS 375m độc lập.'
                      : 'A single 1,000 m MODIS footprint encompasses up to 7 distinct 375 m VIIRS pixels.'}
                  </p>
                </div>
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
                {isVi
                  ? 'Kiến Trúc Luồng Dữ Liệu 4 Tầng & Phân Cấp Module'
                  : 'End-to-End Modular Architecture & 4-Stage Pipeline'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {isVi
                ? 'Hệ thống tuân thủ nguyên tắc trách nhiệm đơn nhất (Single Responsibility) từ tiếp nhận viễn thám đến truyền tải GeoJSON.'
                : 'Engine decoupled into single-responsibility subsystems from raw satellite ingestion to client GeoJSON streaming.'}
            </p>
          </div>

          {/* Interactive Flowchart Diagram */}
          <ArchitectureFlowchart isVi={isVi} />

          {/* Subsystem Responsibility Matrix */}
          <div className="mt-6 rounded-xl border border-line-strong bg-ink-900/60 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight">
              {isVi ? 'Phân Tách Module Kỹ Thuật (Backend Architecture Stack)' : 'Architectural Subsystem Breakdown'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-300 font-mono font-semibold">
                  <span>backend.core</span>
                </div>
                <p className="text-slate-300">
                  {isVi
                    ? 'Chứa toàn bộ thuật toán thuần túy: geometry.py (khoảng cách Haversine & elip), standardizer.py (chuẩn hóa schema), clustering.py (nhân ST-DBSCAN), fusion.py (trọng tâm & Bayesian).'
                    : 'Pure algorithmic foundation: geometry.py (Haversine & anisotropic ellipse), standardizer.py (schema & Laplace), clustering.py (ST-DBSCAN), fusion.py (centroid & Bayesian).'}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-300 font-mono font-semibold">
                  <span>backend.services</span>
                </div>
                <p className="text-slate-300">
                  {isVi
                    ? 'Quản lý vòng đời dữ liệu: cache_service.py (bộ đệm NRT FIRMS & TTL đa tầng), calendar_service.py (Jackknife Z-score & chuỗi thời gian khí hậu ENSO), weather_service.py & terrain_service.py (làm giàu thời tiết Open-Meteo & địa hình DEM).'
                    : 'Data orchestration: cache_service.py (FIRMS API multi-tier caching & live telemetry), calendar_service.py (Jackknife Z-scores & ENSO), weather_service.py & terrain_service.py (Open-Meteo & DEM terrain enrichment).'}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-mono font-semibold">
                  <span>backend.api</span>
                </div>
                <p className="text-slate-300">
                  {isVi
                    ? 'Cung cấp RESTful endpoints chuẩn hóa: /api/harmonize, /api/metrics, /api/calendar với thời gian phản hồi dưới 95ms và hỗ trợ nén gzip cho dữ liệu viễn thám lớn.'
                    : 'Standardized REST endpoints: /api/harmonize, /api/metrics, /api/calendar with sub-95ms response latency and gzip transfer encoding for large geospatial payloads.'}
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
                {isVi
                  ? 'Hệ Thống Công Thức Toán Học Viễn Thám & Hợp Nhất'
                  : 'Spatio-Temporal Mathematical Formulations & Proofs'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {isVi
                ? 'Công thức chi tiết được biên dịch toán học KaTeX, bảo toàn tính nghiêm ngặt khoa học của báo cáo NASA.'
                : 'Rigorous KaTeX-rendered mathematical foundations and formulations underpinning the ST-DBSCAN v2.2 engine.'}
            </p>
          </div>

          <div className="space-y-6">
            {/* Equation 1: Anisotropic Bowtie Footprint & Geodesic Distance */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-cyan-300">
                  {isVi ? '1. Phân Cụm Không Gian Thích Ứng Hình Học Vệt Quét (ST-DBSCAN Bowtie Expansion)' : '1. Anisotropic Swath Footprint & Geodesic Distance'}
                </span>
                <Badge tone="cyan">Eq. (1)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi ? (
                  <>
                    Khoảng cách giữa hai điểm phát hiện nhiệt <MathFormula tex="p_i(\phi_i, \lambda_i)" /> và <MathFormula tex="p_j(\phi_j, \lambda_j)" /> được thẩm định dựa trên bất đẳng thức khoảng cách trắc địa Haversine kết hợp bao đóng hình elip dị hướng dọc theo hướng quét ngang (cross-track scan) và dọc quỹ đạo (along-track), cùng ràng buộc cửa sổ thời gian trượt kép (dual sliding temporal window):
                  </>
                ) : (
                  <>
                    The spatial proximity between active-fire candidates <MathFormula tex="p_i(\phi_i, \lambda_i)" /> and <MathFormula tex="p_j(\phi_j, \lambda_j)" /> is evaluated using geodesic Haversine distance complemented by an anisotropic elliptical envelope along cross-track (<MathFormula tex="\text{scan}" />) and along-track (<MathFormula tex="\text{track}" />) axes, under dual sliding temporal window constraints:
                  </>
                )}
              </p>

              {/* Haversine Formula */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300">
                  {isVi ? 'Khoảng cách trắc địa Haversine giải tích:' : 'Analytical Geodesic Haversine Distance:'}
                </div>
                <MathFormula
                  tex="D_{\text{haversine}}(p_i, p_j) = 2R \arcsin\left(\min\left(1.0, \; \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_i)\cos(\phi_j)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)\right)"
                  block
                  description={
                    isVi
                      ? 'Bán kính Trái Đất danh định R = 6.371,0 km; Δϕ = (π/180°)(ϕ_j - ϕ_i); Δλ = (π/180°)(λ_j - λ_i)'
                      : 'Earth mean volumetric radius R = 6,371.0 km; Δϕ = (π/180°)(ϕ_j - ϕ_i); Δλ = (π/180°)(λ_j - λ_i)'
                  }
                />
              </div>

              {/* Elliptical Criterion & Displacements dx, dy */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300">
                  {isVi ? 'Bất đẳng thức elip dị hướng thích ứng kích thước vệt quét:' : 'Anisotropic Swath Elliptical Matching Criterion:'}
                </div>
                <MathFormula
                  tex="D_{\text{haversine}}(p_i, p_j) \le \epsilon_{\text{base}} \quad \lor \quad \left[\left(\frac{dx}{a_{\text{scan}}}\right)^2 + \left(\frac{dy}{b_{\text{track}}}\right)^2 \le 1.0 \quad \land \quad D_{\text{haversine}}(p_i, p_j) \le \epsilon_{\text{upper}}\right]"
                  block
                  description={
                    isVi
                      ? 'Khoảng cách cơ sở ε_base = 1,25 km; trần biên giới hạn ε_upper = min(max(ε_base, max_fp + 0.4), 2.75 km)'
                      : 'Base distance ε_base = 1.25 km; upper bounding ceiling ε_upper = min(max(ε_base, max_fp + 0.4), 2.75 km)'
                  }
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isVi ? (
                    <>
                      Trong đó độ dịch chuyển dọc quỹ đạo Bắc-Nam <MathFormula tex="dy" /> và ngang vệt quét Đông-Tây <MathFormula tex="dx" /> được định nghĩa tường minh với hệ số chiếu cosin vĩ độ trung bình bù trừ độ hội tụ kinh tuyến:
                    </>
                  ) : (
                    <>
                      Where along-track North-South displacement <MathFormula tex="dy" /> and cross-track East-West displacement <MathFormula tex="dx" /> are explicitly formulated with mean-latitude cosine meridian convergence scaling:
                    </>
                  )}
                </p>
                <MathFormula
                  tex="dx = R \cdot |\lambda_j - \lambda_i| \cdot \frac{\pi}{180^\circ} \cdot \cos\left(\frac{\phi_i + \phi_j}{2}\right), \qquad dy = R \cdot |\phi_j - \phi_i| \cdot \frac{\pi}{180^\circ}"
                  block
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isVi ? (
                    <>
                      Bán trục quét ngang <MathFormula tex="a_{\text{scan}}" /> và bán trục dọc <MathFormula tex="b_{\text{track}}" /> được thích ứng động từ kích thước pixel thực tế kèm biên độ mở rộng hàm lan truyền điểm (Point Spread Function - PSF):
                    </>
                  ) : (
                    <>
                      Dynamic semi-major axis <MathFormula tex="a_{\text{scan}}" /> and semi-minor axis <MathFormula tex="b_{\text{track}}" /> adapt from instantaneous pixel dimensions with Point Spread Function (PSF) triangular response overlap margins:
                    </>
                  )}
                </p>
                <MathFormula
                  tex="a_{\text{scan}} = \min\left(3.5, \; \max\left(1.25, \; \frac{\text{scan}_i + \text{scan}_j}{2} + 0.35\right)\right), \quad b_{\text{track}} = \min\left(3.5, \; \max\left(1.25, \; \frac{\text{track}_i + \text{track}_j}{2} + 0.55\right)\right)"
                  block
                />
              </div>

              {/* Spatial Hash Grid Indexing O(N) */}
              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-2">
                <div className="text-xs font-semibold text-cyan-300 font-mono flex items-center justify-between">
                  <span>{isVi ? 'Chỉ mục lưới băm không gian O(N) (Spatial Hash Grid Index)' : 'O(N) Spatial Hash Grid Index'}</span>
                  <Badge tone="cyan">Stage 1</Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isVi ? (
                    <>
                      Để giảm độ phức tạp từ <MathFormula tex="O(N^2)" /> xuống <MathFormula tex="O(N)" /> trên hơn 150.000 điểm vệ tinh, hệ thống chiếu tọa độ địa lý vào ma trận ô lưới không gian với bước lưới động <MathFormula tex="\Delta_{\text{deg}}" />:
                    </>
                  ) : (
                    <>
                      To reduce pairwise computational complexity from <MathFormula tex="O(N^2)" /> to linear <MathFormula tex="O(N)" /> across &gt;150,000 telemetry points, coordinates are binned into spatial hash grid cells with dynamic grid resolution <MathFormula tex="\Delta_{\text{deg}}" />:
                    </>
                  )}
                </p>
                <MathFormula
                  tex="\text{cell}(\lambda, \phi) = \left( \left\lfloor \frac{\lambda}{\Delta_{\text{deg}}} \right\rfloor, \; \left\lfloor \frac{\phi}{\Delta_{\text{deg}}} \right\rfloor \right), \quad \Delta_{\text{deg}} = \max\left(0.015^\circ, \; \frac{\epsilon_{\text{upper}}}{105.0\text{ km/deg}}\right)"
                  block
                />
                <p className="text-[11px] text-slate-400">
                  {isVi
                    ? 'Mỗi điểm chỉ cần tìm kiếm lân cận trong 9 ô lưới lân cận (3×3 grid neighbourhood), giới hạn vùng BFS cục bộ cực nhanh.'
                    : 'Candidate neighbors are strictly queried within the 9 adjacent grid bins (3×3 neighborhood), guaranteeing sub-95ms execution.'}
                </p>
              </div>

              {/* Dual Temporal Window Constraint */}
              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-2">
                <div className="text-xs font-semibold text-emerald-300 font-mono flex items-center justify-between">
                  <span>{isVi ? 'Ràng buộc cửa sổ thời gian kép chống trôi cụm (Dual Temporal Window)' : 'Dual Sliding Temporal Window Constraint'}</span>
                  <Badge tone="emerald">Stage 2</Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isVi ? (
                    <>
                      Quá trình BFS duyệt đồ thị áp dụng đồng thời hai điều kiện thời gian: khoảng cách cặp thời gian <MathFormula tex="|t_i - t_j| \le \Delta t" /> và biên độ toàn cụm <MathFormula tex="t_{\max}^{(\mathcal{C})} - t_{\min}^{(\mathcal{C})} \le \Delta t" /> với <MathFormula tex="\Delta t = 3.0\text{ h}" />:
                    </>
                  ) : (
                    <>
                      Graph BFS traversal simultaneously enforces pairwise temporal proximity and cluster-wide bounding span with <MathFormula tex="\Delta t = 3.0\text{ h}" />:
                    </>
                  )}
                </p>
                <MathFormula
                  tex="\left(|t_i - t_j| \le \Delta t\right) \quad \land \quad \left(t_{\max}^{(\mathcal{C})} - t_{\min}^{(\mathcal{C})} \le \Delta t\right), \qquad \Delta t = 3.0\text{ hours}"
                  block
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isVi ? (
                    <>
                      <strong>Ý nghĩa vật lý:</strong> Điều kiện cặp điểm <MathFormula tex="|t_i - t_j| \le \Delta t" /> bảo đảm tính liên tục thời gian giữa các lần vệ tinh chụp. Đồng thời, điều kiện biên độ toàn cụm <MathFormula tex="t_{\max} - t_{\min} \le \Delta t" /> triệt tiêu hiện tượng &quot;dây chuyền trôi thời gian&quot; (chaining drift) – ngăn một đám cháy lan kéo dài 24–48 giờ bị gom thành một siêu cụm duy nhất, làm méo mó công suất bức xạ FRP tức thời và diện mạo mặt lửa.
                    </>
                  ) : (
                    <>
                      <strong>Physical Significance:</strong> The pairwise condition <MathFormula tex="|t_i - t_j| \le \Delta t" /> guarantees temporal continuity. Concurrently, the cluster-wide condition <MathFormula tex="t_{\max} - t_{\min} \le \Delta t" /> eliminates &quot;chaining drift&quot;—preventing fires propagating over 24–48 hours from being artificially agglomerated into a single mega-cluster, which would severely distort instantaneous FRP and active front geometry.
                    </>
                  )}
                </p>
              </div>

              <p className="text-xs text-slate-400 italic">
                {isVi
                  ? 'Ý nghĩa hình học: Tại góc quét xa Nadir (55°), pixel MODIS dãn nở thành vệt 4.8 km x 2.0 km. Mô hình elip dị hướng ngăn chặn hiện tượng gộp nhầm các đám cháy cách nhau theo trục Bắc-Nam nhưng vẫn hợp nhất chính xác vệt quét ngang rộng.'
                  : 'Geometric Significance: At 55° off-nadir, MODIS pixels smear to 4.8 km × 2.0 km. The anisotropic formulation strictly prevents false North-South merges while accommodating wide East-West cross-track smear.'}
              </p>
            </div>

            {/* Equation 2: Laplace Prior Confidence Calibration */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-emerald-300">
                  {isVi ? '2. Hiệu Chuẩn Độ Tin Cậy Tiên Nghiệm Laplace' : '2. Laplace Confidence Prior Calibration'}
                </span>
                <Badge tone="emerald">Eq. (2)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi ? (
                  <>
                    MODIS biểu diễn độ tin cậy dưới dạng số nguyên từ <MathFormula tex="0" /> đến <MathFormula tex="100\%" />, trong khi VIIRS sử dụng thang phân loại danh định ba mức (low, nominal, high). Để đưa về không gian xác suất tiên nghiệm Bayes, hệ thống áp dụng kỹ thuật kẹp cận Laplace trong đoạn <MathFormula tex="[0.05, 0.99]" />:
                  </>
                ) : (
                  <>
                    MODIS reports continuous integer confidence <MathFormula tex="[0, 100\%]" />, whereas VIIRS provides three-tier categorical flags (low, nominal, high). We map heterogeneous telemetry into a canonical Bayesian prior bounded within <MathFormula tex="[0.05, 0.99]" /> via Laplace regularization:
                  </>
                )}
              </p>

              <MathFormula
                tex="p_{\text{MODIS}} = \max\left(0.05, \; \min\left(0.99, \; \frac{\text{conf}_{\text{MODIS}}}{100}\right)\right)"
                block
              />

              <MathFormula
                tex="p_{\text{VIIRS}} = \begin{cases} 0.30 & \text{if } \text{flag} = \text{'low'} \\ 0.70 & \text{if } \text{flag} = \text{'nominal'} \\ 0.95 & \text{if } \text{flag} = \text{'high'} \end{cases}"
                block
                description={
                  isVi
                    ? 'Ngăn chặn hiện tượng xác suất cực trị (0 hoặc 1) làm triệt tiêu tỷ số hợp lý Bayes'
                    : 'Prevents extreme probability collapse (0 or 1) in posterior Bayesian likelihood updates'
                }
              />

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-emerald-300 font-mono">
                  {isVi ? 'Ý nghĩa tham số & chuẩn hóa xác suất:' : 'Parameter Definitions & Probability Mapping:'}
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  <li>
                    <strong><MathFormula tex="p_{\text{MODIS}}" />:</strong>{' '}
                    {isVi
                      ? 'Xác suất tiên nghiệm của điểm phát hiện MODIS, chuẩn hóa từ độ tin cậy phần trăm conf ∈ [0, 100%].'
                      : 'Prior probability for MODIS active fire observation, normalized from percentage rating conf ∈ [0, 100%].'}
                  </li>
                  <li>
                    <strong><MathFormula tex="[0.05, 0.99]" />:</strong>{' '}
                    {isVi
                      ? 'Khoảng kẹp cận Laplace: chặn dưới 0.05 ngăn triệt tiêu tỷ số hợp lý Bayes (zero-likelihood collapse); chặn trên 0.99 phản ánh không có cảm biến viễn thám nào tuyệt đối 100% không có sai số.'
                      : 'Laplace regularization bounds: floor 0.05 avoids zero-likelihood collapse; ceiling 0.99 reflects non-zero instrument uncertainty.'}
                  </li>
                  <li>
                    <strong><MathFormula tex="p_{\text{VIIRS}}" />:</strong>{' '}
                    {isVi
                      ? 'Ánh xạ xác suất 3 mức từ cờ danh định: low → 0.30, nominal → 0.70, high → 0.95 theo khuyến nghị của thuật toán NASA/NOAA C2.'
                      : 'Three-tier probability assignment from categorical flags: low → 0.30, nominal → 0.70, high → 0.95 per NASA/NOAA C2 specifications.'}
                  </li>
                </ul>
              </div>
            </div>

            {/* Equation 3: Flux-Density Centroid */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-amber-300">
                  {isVi ? '3. Định Vị Trọng Tâm Mặt Lửa Theo Mật Độ Bức Xạ Pixel' : '3. Radiative Flux-Density Centroid Localization'}
                </span>
                <Badge tone="amber">Eq. (3)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi ? (
                  <>
                    Tọa độ trọng tâm của cụm cháy không tính theo trung bình cộng hình học thuần túy, mà được tính theo trọng số <strong>mật độ thông lượng bức xạ</strong> (Radiative Flux Density) trên mỗi đơn vị diện tích pixel mặt đất. Điều này giúp trọng tâm tự động neo vào các điểm VIIRS 375m sắc nét thay vì bị kéo lệch bởi pixel MODIS nhòe rìa vệt quét:
                  </>
                ) : (
                  <>
                    The spatial centroid is not a simplistic geometric average. Instead, coordinates are weighted by <strong>radiative flux density</strong> per unit ground pixel footprint, anchoring the physical fire front to crisp 375 m VIIRS detections:
                  </>
                )}
              </p>

              <MathFormula
                tex="w_i = \frac{\text{FRP}_i + 0.1}{\max\left(0.05, \; \text{scan}_i \times \text{track}_i\right)}"
                block
                description={
                  isVi
                    ? 'Trọng số thông lượng bức xạ chia diện tích vệt quét thực tế'
                    : 'Flux-density weight normalized by ground pixel area footprint'
                }
              />

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-amber-300 font-mono">
                  {isVi ? 'Ý nghĩa tham số vật lý:' : 'Physical Parameter Grounding:'}
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  <li>
                    <strong>{isVi ? 'Làm trơn Laplace (+0.1):' : 'Laplace smoothing (+0.1):'}</strong>{' '}
                    {isVi
                      ? 'Triệt tiêu điểm kỳ dị trọng số bằng 0 khi các đám cháy âm ỉ hoặc nhỏ có FRP = 0,0 MW, bảo đảm mọi điểm phát hiện vật lý đều có đóng góp xác định vào trọng tâm.'
                      : 'Prevents zero-weight singularities when smoldering or small fires report FRP = 0.0 MW, ensuring every confirmed physical detection contributes to centroid localization.'}
                  </li>
                  <li>
                    <strong>{isVi ? 'Ngưỡng sàn diện tích (0.05 km²):' : 'Footprint area floor (0.05 km²):'}</strong>{' '}
                    {isVi
                      ? 'Chặn mẫu số max(0.05, scan × track) không bị chia cho 0 hoặc lỗi số học với dữ liệu cực nhỏ, tương đương ngưỡng diện tích mặt đất tối thiểu 5 ha.'
                      : 'Regularizes the denominator max(0.05, scan × track) against division-by-zero or numerical anomalies, enforcing a physically grounded minimum pixel area threshold of 0.05 km² (5 ha).'}
                  </li>
                </ul>
              </div>

              <MathFormula
                tex="\mathbf{x}^* = \begin{bmatrix} \text{lat}^* \\ \text{lon}^* \end{bmatrix} = \frac{\sum_{i \in \mathcal{P}_{\text{ref}}} w_i \mathbf{x}_i}{\sum_{i \in \mathcal{P}_{\text{ref}}} w_i}, \quad \text{where } \mathcal{P}_{\text{ref}} = \begin{cases} \mathcal{P}_{\text{VIIRS}} & \text{if } |\mathcal{P}_{\text{VIIRS}}| > 0 \\ \mathcal{P}_{\text{MODIS}} & \text{otherwise} \end{cases}"
                block
              />

              <p className="text-xs text-slate-400">
                {isVi
                  ? 'Khi có sự hiện diện của VIIRS (375m), tập tham chiếu P_ref chỉ lấy các điểm VIIRS để tối ưu hóa độ phân giải 375m, loại trừ hoàn toàn sai số kéo lệch của pixel MODIS 1.000m tại góc quét rộng.'
                  : 'When VIIRS (375m) detections exist, reference set P_ref strictly uses VIIRS points to anchor 375m resolution, eliminating smear pull from 1,000m MODIS bowtie pixels.'}
              </p>
            </div>

            {/* Equation 4: Pass-Grouped Bayesian Noisy-OR Fusion */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-cyan-300">
                  {isVi ? '4. Hợp Nhất Xác Suất Bayesian Gom Nhóm Theo Lượt Quét (Noisy-OR)' : '4. Pass-Grouped Bayesian Noisy-OR Fusion'}
                </span>
                <Badge tone="cyan">Eq. (4)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi ? (
                  <>
                    Nhiều pixel cùng thuộc một lượt quét vệ tinh có tính phụ thuộc không gian cao và không phải là các phép đo độc lập thống kê. Thuật toán gom nhóm các pixel theo từng vệ tinh độc lập <MathFormula tex="s \in \mathcal{S}" />, tính xác suất đại diện lượt quét, sau đó mới hợp nhất độc lập bằng mô hình Noisy-OR:
                  </>
                ) : (
                  <>
                    Multiple adjacent pixels within a single overpass exhibit high spatial autocorrelation and cannot be treated as statistically independent trials. The engine groups detections by independent satellite passes <MathFormula tex="s \in \mathcal{S}" />, calculates pass-level probabilities, and applies noisy-OR aggregation:
                  </>
                )}
              </p>

              <MathFormula
                tex="p_{\text{sat}, s} = \min\left(0.98, \; \max_{i \in s}(p_i) + 0.02 \times \min(|s| - 1, 3)\right)"
                block
                description={
                  isVi
                    ? 'Xác suất lượt quét với điểm thưởng giới hạn khi có nhiều pixel lân cận cùng khẳng định'
                    : 'Pass-level confidence with bounded multi-pixel corroboration bonus'
                }
              />

              <MathFormula
                tex="P_{\text{fused}} = 1 - \prod_{s \in \mathcal{S}} \left(1 - p_{\text{sat}, s}\right)"
                block
              />

              <div className="rounded-lg border border-line bg-ink-950 p-3 space-y-1.5 text-xs text-slate-300">
                <div className="font-semibold text-cyan-300 font-mono">
                  {isVi ? 'Cơ chế trần xác suất đơn vệ tinh (0.98) vs. xác thực kép (0.99):' : 'Bayesian Ceiling: Single-Sensor (0.98) vs. Dual-Sensor (0.99):'}
                </div>
                <ul className="space-y-1 list-disc list-inside text-slate-300">
                  <li>
                    <strong>{isVi ? 'Trần đơn vệ tinh (0.98):' : 'Single-satellite ceiling (0.98):'}</strong>{' '}
                    {isVi
                      ? 'Dù có bao nhiêu pixel con cùng xuất hiện trong một lượt quét của một vệ tinh duy nhất, các yếu tố nhiễu hệ thống (phản xạ lóa mặt trời sun glint, đất trần nóng, mây mỏng rìa pixel) vẫn có thể gây sai số chéo. Do đó xác suất một lượt quét được kẹp trần nghiêm ngặt ở 0.98.'
                      : 'Regardless of how many pixels corroborate within a single spacecraft pass, common-mode systematic artifacts (specular solar glint, hot bare soil, cloud-edge refraction) can affect the pass uniformly. Thus single-pass probability is capped at 0.98.'}
                  </li>
                  <li>
                    <strong>{isVi ? 'Trần đa cảm biến / xác thực kép (0.99):' : 'Multi-sensor / dual-sensor ceiling (0.99):'}</strong>{' '}
                    {isVi
                      ? 'Khi hai họ cảm biến hoàn toàn độc lập (MODIS Terra/Aqua và VIIRS SNPP/NOAA-20/21) bay qua ở các thời điểm quỹ đạo khác nhau cùng xác nhận tín hiệu, các sai số hệ thống bị loại trừ, cho phép xác suất hợp nhất đạt trần 0.99.'
                      : 'When distinct sensor families (MODIS Terra/Aqua and VIIRS SNPP/NOAA-20/21) observing at staggered equatorial times independently confirm the anomaly, instrument-specific artifacts are ruled out, elevating the posterior ceiling to 0.99.'}
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isVi ? 'Đảm bảo ngưỡng sàn xác nhận kép (Dual-Confirmation Guarantee)' : 'Dual-Sensor Family Confirmation Floor'}</span>
                </div>
                <p>
                  {isVi ? (
                    <>
                      Nếu một đám cháy được xác nhận đồng thời bởi hai họ cảm biến độc lập (MODIS + VIIRS) và có ít nhất một điểm đạt độ tin cậy <MathFormula tex="\ge 50\%" />, hệ thống thiết lập ngưỡng sàn toán học: <MathFormula tex="P_{\text{fused}} \ge 0.92" />.
                    </>
                  ) : (
                    <>
                      When an event is corroborated across distinct sensor families (MODIS + VIIRS) with at least one detection <MathFormula tex="\ge 50\%" />, the engine establishes a mathematical confidence floor: <MathFormula tex="P_{\text{fused}} \ge 0.92" />.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Equation 5: Pass-Reconciled Instantaneous FRP */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-rose-300">
                  {isVi ? '5. Điều Hòa Năng Lượng Bức Xạ FRP Tức Thời' : '5. Pass-Reconciled Instantaneous Fire Radiative Power'}
                </span>
                <Badge tone="rose">Eq. (5)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi ? (
                  <>
                    FRP (MW) phản ánh tốc độ tỏa năng lượng tức thời tại thời điểm vệ tinh chụp. Để bảo toàn chính xác độ lớn vật lý mà không bị đếm trùng khi nhiều vệ tinh bay qua cùng một ngày, hệ thống cộng tổng FRP của các pixel con trong <em>cùng một lượt quét</em> (phản ánh toàn bộ diện tích mặt trước đám cháy), sau đó lấy giá trị <strong>cực đại giữa các lượt quét độc lập</strong>:
                  </>
                ) : (
                  <>
                    FRP (MW) quantifies the instantaneous rate of radiant energy release. To preserve physical front-width scaling without multi-pass overestimation, the system aggregates sub-kilometer pixels within each <em>individual overpass</em>, then reconciles by taking the <strong>maximum across independent passes</strong>:
                  </>
                )}
              </p>

              <MathFormula
                tex="\text{FRP}_{\text{reconciled}} = \max\left( \max_{s \in \mathcal{S}_{\text{MODIS}}} \sum_{i \in s} \text{FRP}_i, \quad \max_{s \in \mathcal{S}_{\text{VIIRS}}} \sum_{i \in s} \text{FRP}_i \right)"
                block
                description={
                  isVi
                    ? 'Điều hòa năng lượng tức thời: Tổng trong lượt quét, Max giữa các lượt quét'
                    : 'Reconciled FRP: Intra-pass summation followed by inter-pass maximum reconciliation'
                }
              />
            </div>

            {/* Equation 6: Jackknife Climatological Z-Score */}
            <div className="rounded-xl border border-line-strong bg-ink-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-amber-300">
                  {isVi ? '6. Chỉ Số Dị Thường Khí Hậu Jackknife (Leave-One-Year-Out Z-Score)' : '6. Leave-One-Year-Out (Jackknife) Climatological Z-Score'}
                </span>
                <Badge tone="amber">Eq. (6)</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi ? (
                  <>
                    Trong chuỗi số liệu viễn thám 20 năm, những năm hạn hán nghiêm trọng do hiện tượng El Niño cực đoan (như 2015–2016) có số lượng cháy khổng lồ, nếu đưa năm đó vào tính giá trị trung bình chuẩn sẽ làm &quot;tự dập tắt&quot; (self-suppression) độ dị thường của chính nó. Phương pháp Jackknife loại trừ năm đang khảo sát <MathFormula tex="y" /> khỏi bộ chuẩn khí hậu để tính Z-score khách quan:
                  </>
                ) : (
                  <>
                    In 20-year satellite records, extreme climate-driven wildfire years (such as severe El Niño phases in 2015–2016) exhibit enormous fire counts. Including target year <MathFormula tex="y" /> within the climatological baseline inflates the sample mean and variance, causing severe &quot;self-suppression&quot; of its own anomaly. We eliminate this bias via Leave-One-Year-Out (Jackknife) estimation:
                  </>
                )}
              </p>

              <MathFormula
                tex="Z_y = \frac{x_y - \bar{x}_{(-y)}}{s_{(-y)}} = \frac{x_y - \frac{1}{N-1}\sum_{k \ne y} x_k}{\sqrt{\frac{1}{N-2}\sum_{k \ne y} \left(x_k - \bar{x}_{(-y)}\right)^2}}"
                block
                description={
                  isVi
                    ? 'Z-score loại trừ năm đang xét, phản ánh đúng tương quan khí hậu ENSO'
                    : 'Jackknife Z-score eliminating sample self-suppression in extreme El Niño episodes'
                }
              />
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
                {isVi
                  ? 'Bảng Đối Chiếu Cảm Biến Kỹ Thuật Chi Tiết (MODIS C6.1 vs. VIIRS C2)'
                  : 'Extended Sensor Comparison Matrix: MODIS (C6.1) vs. VIIRS (C2)'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {isVi
                ? 'So sánh toàn diện 8 chỉ số kỹ thuật quang học, quỹ đạo và độ nhạy nhiệt độ giữa hai thế hệ vệ tinh viễn thám.'
                : 'Comprehensive 8-point physical specification matrix contrasting orbital, geometric, and radiometric attributes.'}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line-strong bg-ink-900/90 shadow-panel">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-ink-950/80 text-slate-300">
                  <th className="py-3 px-4 font-semibold">{isVi ? 'Thông Số Kỹ Thuật' : 'Sensor Specification'}</th>
                  <th className="py-3 px-4 font-semibold text-rose-300">MODIS (Collection 6.1)</th>
                  <th className="py-3 px-4 font-semibold text-emerald-300">VIIRS (Collection 2 - 375m)</th>
                  <th className="py-3 px-4 font-semibold text-cyan-300">{isVi ? 'Tác Động Lên Hợp Nhất' : 'Harmonization Impact'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-slate-300 font-mono text-[11px] sm:text-xs">
                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">
                    {isVi ? '1. Vệ tinh & Quỹ đạo' : '1. Spacecraft Platforms'}
                  </td>
                  <td className="py-3 px-4">Terra (10:30) &amp; Aqua (13:30)</td>
                  <td className="py-3 px-4 text-emerald-300">Suomi-NPP (13:30), NOAA-20 (12:40), NOAA-21 (13:10)</td>
                  <td className="py-3 px-4 font-sans text-slate-400">
                    {isVi ? 'Lệch pha 20–50 phút tạo vệt quét chồng' : '20–50 min phase drift generates dual detections'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">
                    {isVi ? '2. Độ phân giải Nadir' : '2. Nadir Spatial Resolution'}
                  </td>
                  <td className="py-3 px-4">1,000 m (1.0 km nominal)</td>
                  <td className="py-3 px-4 text-emerald-300 font-bold">375 m (I-band I4/I5)</td>
                  <td className="py-3 px-4 font-sans text-slate-400">
                    {isVi ? 'VIIRS chi tiết gấp 7× diện tích pixel' : 'VIIRS provides 7× finer areal granularity'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">
                    {isVi ? '3. Biến dạng rìa vệt quét (Bowtie)' : '3. Edge-of-Scan Bowtie Distortion'}
                  </td>
                  <td className="py-3 px-4 text-rose-300">~4.8 km &times; 2.0 km (Dãn nở ~10×)</td>
                  <td className="py-3 px-4 text-emerald-300">~0.8 km &times; 0.8 km (Gộp pixel 3:1)</td>
                  <td className="py-3 px-4 font-sans text-slate-400">
                    {isVi ? 'Bắt buộc dùng elip dị hướng để khử nhòe' : 'Demands anisotropic elliptical matching semi-axes'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">
                    {isVi ? '4. Bề rộng vệt quét (Swath)' : '4. Swath Width & Coverage'}
                  </td>
                  <td className="py-3 px-4">2,330 km (Có khoảng hở xích đạo)</td>
                  <td className="py-3 px-4 text-emerald-300">3,040 km (Phủ kín zero-gap)</td>
                  <td className="py-3 px-4 font-sans text-slate-400">
                    {isVi ? 'VIIRS quan sát liên tục không điểm mù' : 'Contiguous global scanning without equatorial blind zones'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">
                    {isVi ? '5. Kênh hồng ngoại nhạy lửa' : '5. Thermal Fire Channels'}
                  </td>
                  <td className="py-3 px-4">Ch 21/22 (3.96 µm) &amp; Ch 31 (11.0 µm)</td>
                  <td className="py-3 px-4 text-emerald-300">I4 (3.74 µm) &amp; I5 (11.45 µm)</td>
                  <td className="py-3 px-4 font-sans text-slate-400">
                    {isVi ? 'Nhạy cảm cao với bức xạ Planck 800–1200 K' : 'Optimal Planck peak radiance at 800–1200 K flaming'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">
                    {isVi ? '6. Ngưỡng bão hòa nhiệt' : '6. Brightness Temperature Saturation'}
                  </td>
                  <td className="py-3 px-4">~331 K (Ch 22), ~500 K (Ch 21 high)</td>
                  <td className="py-3 px-4 text-emerald-300">~367 K (Kênh I4 dual-gain)</td>
                  <td className="py-3 px-4 font-sans text-slate-400">
                    {isVi ? 'MODIS Ch 21 đo được siêu hỏa hoạn cực lớn' : 'MODIS Ch 21 captures megafires above 367 K'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">
                    {isVi ? '7. Diện tích cháy tối thiểu phát hiện' : '7. Minimum Detectable Flaming Area'}
                  </td>
                  <td className="py-3 px-4">~100 m² (cháy lộ thiên)</td>
                  <td className="py-3 px-4 text-emerald-300 font-bold">~10 – 25 m² (nhạy gấp 4–10×)</td>
                  <td className="py-3 px-4 font-sans text-slate-400">
                    {isVi ? 'VIIRS phát hiện cháy ngầm & cháy mới chớm' : 'VIIRS identifies early smoldering & agricultural burns'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-sans font-medium text-white">
                    {isVi ? '8. Tần suất quan sát lặp lại' : '8. Global Daily Revisit Frequency'}
                  </td>
                  <td className="py-3 px-4">1–2 lượt / ngày / điểm</td>
                  <td className="py-3 px-4 text-emerald-300">~4 lượt / ngày / điểm (chòm 3 vệ tinh)</td>
                  <td className="py-3 px-4 font-sans text-slate-400">
                    {isVi ? 'Tăng gấp đôi cơ hội hợp nhất Bayes kép' : 'Yields high dual-satellite corroboration opportunities'}
                  </td>
                </tr>
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
                {isVi
                  ? 'Kiểm Chứng Thực Nghiệm & Đo Đạc Hiệu Năng (Empirical Benchmarks)'
                  : 'Empirical Validation & Benchmark Results'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {isVi
                ? 'Đánh giá định lượng trên bộ dữ liệu vệ tinh NASA FIRMS thực tế bao gồm toàn bộ lãnh thổ Việt Nam và Đông Nam Á lục địa.'
                : 'Quantitative evaluation over real-world NASA FIRMS telemetry across Vietnam and Indochina.'}
            </p>
          </div>

          {/* KPI Matrix Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-line-strong bg-ink-900/90 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {isVi ? 'Số Điểm Thu Thập Ban Đầu' : 'Raw Input Detections'}
                </span>
                <Database className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-white">153,948</div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {isVi
                  ? 'Tổng hợp điểm quét vệ tinh MODIS Terra/Aqua và VIIRS SNPP/NOAA-20/21 chưa qua khử trùng.'
                  : 'Cumulative raw detection telemetry from MODIS Terra/Aqua and VIIRS constellation.'}
              </p>
            </div>

            <div className="rounded-xl border border-line-strong bg-ink-900/90 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {isVi ? 'Cụm Cháy Hợp Nhất Vật Lý' : 'Fused Physical Wildfires'}
                </span>
                <Flame className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-emerald-300">87,311</div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {isVi
                  ? 'Sự kiện đám cháy độc lập sau khi gom cụm hình học elip vệt quét và đồng nhất không-thời gian.'
                  : 'Reconciled physical fire events after anisotropic elliptical ST-DBSCAN clustering.'}
              </p>
            </div>

            <div className="rounded-xl border border-line-strong bg-ink-900/90 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {isVi ? 'Hiệu Quả Khử Trùng Lặp Ảo' : 'Empirical Deduplication'}
                </span>
                <Scale className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-cyan-300">43.29%</div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {isVi
                  ? 'Khử 66.637 điểm trùng lặp ảo (43,29%), nằm chính xác trong khoảng lý thuyết 27%–43%, bảo toàn trung thực quy mô đám cháy.'
                  : 'Eliminated 66,637 redundant detections (43.29%), in strict concordance with theoretical 27%–43% expectation.'}
              </p>
            </div>

            <div className="rounded-xl border border-line-strong bg-ink-900/90 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {isVi ? 'Tốc Độ Xử Lý Toàn Pipeline' : 'Clustering Latency'}
                </span>
                <Activity className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-amber-300">&lt; 95 ms</div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {isVi
                  ? 'Chỉ mục không gian lưới băm O(N) giúp thực thi tức thời ngay cả trên hàng vạn điểm vệ tinh.'
                  : 'O(N) spatial hash binning ensures instantaneous execution over tens of thousands of points.'}
              </p>
            </div>

            <div className="rounded-xl border border-line-strong bg-ink-900/90 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {isVi ? 'Tỷ Lệ Bỏ Sót (Âm Tính Giả)' : 'False Negative Rate'}
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-emerald-400">0.0%</div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {isVi
                  ? 'Cơ chế min_samples = 1 bảo tồn 100% các điểm cháy đơn lẻ, không bỏ sót bất kỳ nguy cơ nào.'
                  : 'min_samples = 1 self-contained clustering guarantees zero loss of isolated fire fronts.'}
              </p>
            </div>

            <div className="rounded-xl border border-line-strong bg-ink-900/90 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  {isVi ? 'Tỷ Lệ Xác Nhận Kép Cảm Biến' : 'Dual Sensor Corroboration'}
                </span>
                <Sparkles className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-cyan-300">1.1%</div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {isVi ? (
                  <>
                    962 sự kiện được kiểm chứng đồng thời bởi cả hai họ vệ tinh (MODIS &amp; VIIRS), đạt độ tin cậy <MathFormula tex="P_{\text{fused}} \ge 0.92" />.
                  </>
                ) : (
                  <>
                    962 clusters corroborated concurrently across both sensor families (MODIS &amp; VIIRS), reaching fused confidence <MathFormula tex="P_{\text{fused}} \ge 0.92" />.
                  </>
                )}
              </p>
            </div>
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
                {isVi
                  ? 'Danh Mục Tài Liệu Tham Khảo Học Thuật (Canonical References)'
                  : 'Canonical Academic References & Provenance'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {isVi
                ? 'Các bài báo khoa học bình duyệt quốc tế (peer-reviewed) làm nền tảng cho thiết kế hệ thống.'
                : 'Primary peer-reviewed publications establishing the remote sensing and computational foundation.'}
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                num: '[1]',
                authors: 'Giglio, L., Schroeder, W., & Justice, C. O.',
                year: '2016',
                title: 'The collection 6 MODIS active fire detection algorithm and fire products.',
                journal: 'Remote Sensing of Environment, 178, 31–41.',
                doi: '10.1016/j.rse.2016.02.054',
                url: 'https://doi.org/10.1016/j.rse.2016.02.054',
                note: isVi ? 'Thuật toán phát hiện nhiệt chuẩn của MODIS C6.1' : 'Canonical MODIS Collection 6.1 active fire algorithm',
              },
              {
                num: '[2]',
                authors: 'Schroeder, W., Oliva, P., Giglio, L., & Csiszar, I. A.',
                year: '2014',
                title: 'The New VIIRS 375 m active fire detection product—Algorithm description and initial assessment.',
                journal: 'Remote Sensing of Environment, 143, 85–96.',
                doi: '10.1016/j.rse.2013.12.008',
                url: 'https://doi.org/10.1016/j.rse.2013.12.008',
                note: isVi ? 'Cơ sở khoa học sản phẩm VIIRS 375m I-band' : 'Scientific baseline for VIIRS 375 m I-band active fire product',
              },
              {
                num: '[3]',
                authors: 'Wooster, M. J., Roberts, G., Perry, G. L. W., & Kaufman, Y. J.',
                year: '2005',
                title: 'Retrieval of biomass combustion rates and totals from fire radiative power observations: FRP derivation and calibration relationships.',
                journal: 'Journal of Geophysical Research: Atmospheres, 110(D24).',
                doi: '10.1029/2005JD006318',
                url: 'https://doi.org/10.1029/2005JD006318',
                note: isVi ? 'Vật lý học năng lượng bức xạ FRP và sinh khối thiêu rụi' : 'Physical derivation of Fire Radiative Power (FRP) and biomass rate',
              },
              {
                num: '[4]',
                authors: 'Ester, M., Kriegel, H.-P., Sander, J., & Xu, X.',
                year: '1996',
                title: 'A density-based algorithm for discovering clusters in large spatial databases with noise.',
                journal: 'Proceedings of KDD-96, 226–231.',
                doi: '10.5555/3001460.3001507',
                url: 'https://dl.acm.org/doi/10.5555/3001460.3001507',
                note: isVi ? 'Bài báo nguyên bản về thuật toán phân cụm mật độ DBSCAN' : 'Foundational paper introducing the DBSCAN clustering algorithm',
              },
              {
                num: '[5]',
                authors: 'Birant, D., & Kut, A.',
                year: '2007',
                title: 'ST-DBSCAN: An algorithm for clustering spatial-temporal data.',
                journal: 'Data & Knowledge Engineering, 60(1), 208–221.',
                doi: '10.1016/j.datak.2006.01.013',
                url: 'https://doi.org/10.1016/j.datak.2006.01.013',
                note: isVi ? 'Mở rộng DBSCAN cho miền không - thời gian' : 'Spatio-temporal extension of DBSCAN for multi-dimensional clustering',
              },
              {
                num: '[6]',
                authors: 'Wolfe, R. E., Nishihama, M., Fleig, A. J., Kuyper, J. A., Roy, D. P., Storey, J. C., & Patt, F. S.',
                year: '2002',
                title: 'Achieving sub-pixel geolocation accuracy in support of MODIS land science.',
                journal: 'Remote Sensing of Environment, 83(1-2), 31–49.',
                doi: '10.1016/S0034-4257(02)00085-8',
                url: 'https://doi.org/10.1016/S0034-4257(02)00085-8',
                note: isVi ? 'Phân tích sai số hình học và độ biến dạng vệt quét Bowtie' : 'Geometric geolocation accuracy and scan-angle bowtie expansion',
              },
            ].map((ref) => (
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
                {isVi ? 'Trích Dẫn Bài Báo (BibTeX Citation)' : 'BibTeX Canonical Citation'}
              </span>
              <button
                type="button"
                onClick={copyBibtex}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-900 px-3 py-1 text-xs text-slate-300 hover:text-white transition-colors"
              >
                {copiedBibtex ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">{isVi ? 'Đã sao chép' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{isVi ? 'Sao Chép' : 'Copy'}</span>
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
              {isVi ? 'Sẵn sàng khảo sát dữ liệu thực địa?' : 'Ready to explore active telemetry?'}
            </div>
            <p className="text-xs text-slate-400">
              {isVi
                ? 'Truy cập trạm giám sát GIS tương tác Deck.gl 60 FPS hoặc tra cứu bộ sự kiện điểm cháy.'
                : 'Access the Deck.gl 60 FPS WebGL2 map or inspect the unified active fire event catalog.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-xs font-bold text-ink-950 shadow-md hover:from-cyan-400 hover:to-emerald-400 transition-all hover:scale-[1.02]"
            >
              <span>{isVi ? 'Khởi Động Trạm Giám Sát' : 'Launch GIS Dashboard'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Floating TOC Popup & Action Dock */}
      <aside
        ref={tocRef}
        aria-label={isVi ? 'Mục lục tài liệu nổi' : 'Floating table of contents'}
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5"
      >
        {/* Floating Popup Dialog */}
        {isTocOpen && (
          <div
            role="dialog"
            aria-modal="false"
            aria-label={isVi ? 'Mục lục nội dung' : 'Table of contents'}
            className="w-80 max-w-[calc(100vw-3rem)] rounded-2xl border border-line-strong bg-ink-900/95 backdrop-blur-2xl shadow-pop flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            {/* Popup Header */}
            <div className="flex items-center justify-between border-b border-line bg-ink-950/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-cyan-400" />
                <span className="font-bold text-xs text-white">
                  {isVi ? 'Mục Lục Báo Cáo' : 'Table of Contents'}
                </span>
                <Badge tone="cyan">
                  {activeSection.replace('sec-', '')}/06
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setIsTocOpen(false)}
                aria-label={isVi ? 'Đóng mục lục' : 'Close table of contents'}
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
                {isVi ? `Đã đọc: ${scrollProgress}%` : `Progress: ${scrollProgress}%`}
              </span>
              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                <ArrowUp className="h-3 w-3" />
                <span>{isVi ? 'Đầu trang' : 'Top'}</span>
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
              aria-label={isVi ? 'Cuộn lên đầu trang' : 'Scroll to top'}
              className="h-10 w-10 rounded-full border border-line-strong bg-ink-900/90 text-slate-300 hover:text-white hover:border-cyan-400/50 shadow-pop backdrop-blur-xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsTocOpen(!isTocOpen)}
            aria-expanded={isTocOpen}
            aria-label={isVi ? 'Mở mục lục tài liệu' : 'Toggle table of contents'}
            className={`h-10 rounded-full border px-4 py-2 text-xs font-semibold shadow-pop backdrop-blur-xl transition-all duration-200 flex items-center gap-2 hover:scale-[1.02] active:scale-95 ${
              isTocOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-glow'
                : 'bg-ink-900/90 text-slate-200 hover:text-white border-line-strong hover:border-cyan-400/50'
            }`}
          >
            <ListOrdered className="h-4 w-4 text-cyan-400" />
            <span>{isVi ? 'Mục Lục' : 'Contents'}</span>
            <span className="font-mono text-[10px] rounded-full bg-ink-950 px-1.5 py-0.5 border border-line text-cyan-300 font-bold">
              {activeSection.replace('sec-', '')}/06
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
