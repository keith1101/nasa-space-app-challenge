import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Flame,
  Globe2,
  Layers,
  Satellite,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { useUiStore } from '../stores/useUiStore';
import { MiniFirePreview } from '../components/deck/MiniFirePreview';

export function LandingPage() {
  const { lang } = useUiStore();
  const isVi = lang === 'vi';

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-ink-950 text-slate-100">
      {/* Background Orbital Glow Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute top-1/3 -left-32 h-[500px] w-[600px] rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute bottom-10 right-0 h-[600px] w-[700px] rounded-full bg-rose-500/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 space-y-24">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 shadow-lg backdrop-blur-md">
            <Satellite className="h-4 w-4 animate-pulse text-cyan-400" />
            <span>NASA Space Apps 2026 · Satellite Telemetry Harmonization</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
            {isVi ? (
              <>
                Hợp Nhất Điểm Cháy <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
                  Đa Vệ Tinh Toàn Cầu
                </span>
              </>
            ) : (
              <>
                Global Multi-Sensor <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
                  Active-Fire Harmonization
                </span>
              </>
            )}
          </h1>

          <p className="mx-auto max-w-3xl text-base sm:text-lg text-slate-300 leading-relaxed">
            {isVi
              ? 'Giải pháp khử trùng lặp từ 27%–43% giữa hệ thống MODIS (Terra & Aqua 1.000m) và VIIRS (Suomi-NPP, NOAA-20, NOAA-21 375m). Ứng dụng ST-DBSCAN không-thời gian và Bayesian Sensor Fusion để xây dựng danh mục điểm cháy chuẩn xác nhất.'
              : 'Eliminating 27%–43% multi-satellite redundancy across MODIS (Terra & Aqua 1,000 m) and VIIRS (Suomi-NPP, NOAA-20, NOAA-21 375 m) using anisotropic spatio-temporal ST-DBSCAN and pass-grouped Bayesian sensor fusion.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3.5 text-sm font-bold text-ink-950 shadow-xl shadow-cyan-500/20 hover:from-cyan-400 hover:to-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Globe2 className="h-4 w-4" />
              <span>{isVi ? 'Khởi Động Trạm Giám Sát GIS' : 'Launch GIS Dashboard'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/methodology"
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-ink-900/80 px-6 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-md hover:bg-ink-800 hover:text-white transition-all hover:border-cyan-400/40"
            >
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <span>{isVi ? 'Phương Pháp Luận Khoa Học' : 'Scientific Methodology'}</span>
            </Link>
          </div>
        </div>

        {/* Global Telemetry Live Counters */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          <div className="rounded-2xl border border-cyan-400/30 bg-ink-900/80 p-5 backdrop-blur-md shadow-xl text-center space-y-1 hover:border-cyan-400 transition-colors">
            <div className="flex justify-center mb-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Flame className="h-5 w-5" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">87,311</div>
            <div className="text-xs font-semibold text-cyan-300">
              {isVi ? 'Điểm cháy hợp nhất' : 'Harmonized Hotspots'}
            </div>
            <div className="text-[11px] text-slate-400">
              {isVi ? 'Từ 153.948 lượt quét thô' : 'From 153,948 raw scans'}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/30 bg-ink-900/80 p-5 backdrop-blur-md shadow-xl text-center space-y-1 hover:border-emerald-400 transition-colors">
            <div className="flex justify-center mb-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">953</div>
            <div className="text-xs font-semibold text-emerald-300">
              {isVi ? 'Xác thực kép MODIS+VIIRS' : 'Dual Confirmed Events'}
            </div>
            <div className="text-[11px] text-slate-400">
              {isVi ? 'Độ tin cậy tuyệt đối ≥ 92%' : 'Highest confidence (≥92%)'}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/30 bg-ink-900/80 p-5 backdrop-blur-md shadow-xl text-center space-y-1 hover:border-emerald-400 transition-colors">
            <div className="flex justify-center mb-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <TrendingDown className="h-5 w-5" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">−43.3%</div>
            <div className="text-xs font-semibold text-emerald-300">
              {isVi ? 'Tỷ lệ khử trùng lặp' : 'Deduplication Rate'}
            </div>
            <div className="text-[11px] text-slate-400">
              {isVi ? 'Loại bỏ sai số cộng dồn' : 'Removes artificial inflation'}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-400/30 bg-ink-900/80 p-5 backdrop-blur-md shadow-xl text-center space-y-1 hover:border-blue-400 transition-colors">
            <div className="flex justify-center mb-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-400/10 text-blue-300">
                <Globe2 className="h-5 w-5" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">143</div>
            <div className="text-xs font-semibold text-blue-300">
              {isVi ? 'Quốc gia giám sát' : 'Countries Monitored'}
            </div>
            <div className="text-[11px] text-slate-400">
              {isVi ? 'Bao phủ 7 đại vùng sinh thái' : 'Covering 7 global biomes'}
            </div>
          </div>
        </div>

        {/* 3 Core Scientific Pillars */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {isVi ? '3 Trụ Cột Khoa Học Đột Phá' : '3 Core Scientific Breakthroughs'}
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              {isVi
                ? 'Kiến trúc xử lý dữ liệu viễn thám kết hợp hình học quỹ đạo vệ tinh và xác suất thống kê nâng cao.'
                : 'Advanced remote sensing architecture combining orbital geometry and probabilistic fusion.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="rounded-2xl border border-line-strong bg-ink-900/70 p-6 backdrop-blur-md space-y-4 hover:border-cyan-400/50 transition-all hover:-translate-y-1">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {isVi ? '1. ST-DBSCAN Không - Thời Gian' : '1. Spatio-Temporal ST-DBSCAN'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isVi
                  ? 'Phân cụm thích ứng hình học vết quét (scan × track) hình elip dị hướng kết hợp khoảng cách trắc địa Haversine và cửa sổ thời gian trượt ≤ 3,0 giờ.'
                  : 'Anisotropic elliptical swath footprint clustering adapting cross-track and along-track distortion with continuous sliding time window ≤ 3.0 hours.'}
              </p>
              <div className="rounded-lg bg-ink-950 p-2.5 font-mono text-[11px] text-cyan-300 border border-line">
                (dx/a_EW)² + (dy/b_NS)² ≤ 1.0
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-2xl border border-line-strong bg-ink-900/70 p-6 backdrop-blur-md space-y-4 hover:border-emerald-400/50 transition-all hover:-translate-y-1">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {isVi ? '2. Hợp Nhất Bayesian Độc Lập' : '2. Pass-Grouped Bayesian Fusion'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isVi
                  ? 'Gom nhóm theo lượt quét vệ tinh độc lập, hợp nhất độ tin cậy P_fused = 1 - Π(1 - p_s). Loại trừ báo động giả và tăng độ tin cậy ≥ 92% cho xác thực kép.'
                  : 'Independent pass-grouping eliminates false alarms. Multi-sensor corroboration guarantees robust confidence calibration ≥ 92% floor.'}
              </p>
              <div className="rounded-lg bg-ink-950 p-2.5 font-mono text-[11px] text-emerald-300 border border-line">
                P_fused = 1 - ∏_s (1 - p_sat,s)
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-2xl border border-line-strong bg-ink-900/70 p-6 backdrop-blur-md space-y-4 hover:border-rose-400/50 transition-all hover:-translate-y-1">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-400/10 text-rose-300 border border-rose-400/30">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {isVi ? '3. Định Vị VIIRS 375m & Điều Hòa FRP' : '3. VIIRS 375m & Reconciled FRP'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isVi
                  ? 'Định vị trọng tâm mặt trước đám cháy theo kênh VIIRS I-band độ phân giải cao 375m; điều hòa FRP theo lượt quét cực đại tránh thổi phồng năng lượng.'
                  : 'Localizes physical fire front using 375 m VIIRS I-band weighted by radiative flux density; reconciles peak pass FRP to prevent double-counting.'}
              </p>
              <div className="rounded-lg bg-ink-950 p-2.5 font-mono text-[11px] text-rose-300 border border-line">
                FRP_rec = max_s(∑_(i∈s) FRP_i)
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Teaser Showcase */}
        <div className="relative rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-ink-900 to-ink-950 p-8 shadow-2xl backdrop-blur-md overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-400/20 px-2.5 py-1 text-xs font-bold text-cyan-300 border border-cyan-400/30">
                <Sparkles className="h-3.5 w-3.5" />
                WebGL2 GPU Map Engine Powered by Deck.gl
              </span>
              <h3 className="text-2xl font-bold text-white">
                {isVi
                  ? 'Khả Năng Xử Lý 100.000+ Điểm Cháy Ở 60 FPS'
                  : 'Render 100,000+ Hotspots at Smooth 60 FPS'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi
                  ? 'Hệ thống kết hợp Deck.gl v9 và MapLibre GL JS giúp hiển thị toàn bộ 87.311 điểm cháy trên quả địa cầu với độ trễ 0ms. Bộ lọc tức thời theo độ tin cậy (≥80%), năng lượng bức xạ FRP, và quốc gia.'
                  : 'Combining Deck.gl v9 and MapLibre GL JS allows rendering 87,311 global hotspots with zero latency. Instantaneous filtering by confidence (≥80%), FRP, and countries.'}
              </p>
              <div className="pt-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-ink-950 shadow-md hover:bg-cyan-400 transition-colors"
                >
                  <span>{isVi ? 'Trải Nghiệm Bản Đồ Ngay' : 'Explore Map Now'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Interactive Deck.gl Mini Preview Widget */}
            <div className="w-full lg:w-[480px] shrink-0">
              <MiniFirePreview isVi={isVi} />
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isVi
              ? 'Sẵn Sàng Khám Phá Bản Đồ Cháy Toàn Cầu?'
              : 'Ready to Explore the Global Wildfire Station?'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            {isVi
              ? 'Truy cập trạm giám sát với đầy đủ công cụ lọc chuyên sâu, ma trận nhiệt Apache ECharts và biểu đồ thời gian thực.'
              : 'Access the full monitoring workstation with advanced filtering, Apache ECharts regime matrix, and real-time telemetry.'}
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-8 py-4 text-base font-bold text-ink-950 shadow-xl shadow-cyan-500/25 hover:from-cyan-400 hover:to-emerald-400 transition-all hover:scale-105"
            >
              <Flame className="h-5 w-5" />
              <span>{isVi ? 'Bắt Đầu Giám Sát Ngay' : 'Launch Monitoring Station'}</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
