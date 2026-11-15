import {
  BookOpen,
  Cpu,
  Flame,
  Globe2,
  Layers,
  Satellite,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUiStore } from '../stores/useUiStore';
import { Badge } from '../components/ui';

export function MethodologyPage() {
  const { lang } = useUiStore();
  const isVi = lang === 'vi';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-ink-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Page Title & Breadcrumb Header */}
        <div className="space-y-4 border-b border-line pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/35 bg-cyan-400/10 text-cyan-300 shadow-lg">
              <BookOpen className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {isVi
                    ? 'Phương Pháp Luận Khoa Học & Mô Hình Hợp Nhất'
                    : 'Scientific Methodology & Mathematical Architecture'}
                </h1>
                <Badge tone="cyan">ST-DBSCAN v2.2</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                {isVi
                  ? 'Chuẩn hóa & hợp nhất điểm cháy nhiệt MODIS (1.000m) và VIIRS (375m) · NASA Space Apps Challenge 2026'
                  : 'Harmonization of MODIS (1,000 m) and VIIRS (375 m) Thermal Anomalies · NASA Space Apps Challenge 2026'}
              </p>
            </div>
          </div>
        </div>

        {/* 1. Problem Formulation */}
        <section className="rounded-2xl border border-line-strong bg-ink-900/80 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-base">
            <Globe2 className="h-5 w-5" />
            <h2>
              {isVi
                ? '1. Vấn Đề Trùng Lặp Điểm Cháy Giữa Các Chòm Vệ Tinh'
                : '1. Multi-Satellite Redundancy & Double-Counting Problem'}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            {isVi ? (
              <>
                Hệ thống giám sát cháy rừng toàn cầu dựa trên đồng thời <strong>MODIS</strong> (vệ tinh Terra &amp; Aqua, độ phân giải 1.000 m tại tâm nadir) và <strong>VIIRS</strong> (Suomi-NPP, NOAA-20, NOAA-21, độ phân giải cao 375 m dải I-band). Các vệ tinh bay theo quỹ đạo vùng cực lệch nhau từ 20–50 phút thường quét cùng một đám cháy nhiều lần. Hiện tượng này gây ra việc <strong>thổi phồng số lượng cháy ảo từ 27%–43%</strong> và làm sai lệch nghiêm trọng tổng năng lượng bức xạ (Fire Radiative Power - FRP), gây khó khăn cho công tác điều phối chữa cháy khẩn cấp.
              </>
            ) : (
              <>
                Global wildland fire monitoring relies concurrently on legacy <strong>MODIS</strong> (Terra &amp; Aqua, 1,000 m nadir resolution) and next-generation <strong>VIIRS</strong> (Suomi-NPP, NOAA-20, NOAA-21, 375 m I-band). Overlapping polar-orbiting swaths separated by 20–50 minutes cause <strong>artificial double-counting (27%–43%)</strong> of the same active fire front, distorting total Fire Radiative Power (FRP) and operational risk assessment.
              </>
            )}
          </p>
        </section>

        {/* 2. Four-Stage Spatio-Temporal Harmonization Pipeline */}
        <section className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-white">
              {isVi
                ? '2. Quy Trình 4 Giai Đoạn Hợp Nhất Không - Thời Gian'
                : '2. Four-Stage Spatio-Temporal Harmonization Pipeline'}
            </h2>
            <p className="text-xs text-slate-400">
              {isVi
                ? 'Mô hình ST-DBSCAN cải tiến kết hợp lọc hình học vết quét và hợp nhất xác suất Bayesian.'
                : 'Enhanced ST-DBSCAN combining anisotropic footprint geometry with Bayesian sensor fusion.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Stage 1: ST-DBSCAN */}
            <div className="rounded-2xl border border-cyan-400/30 bg-ink-900/80 p-6 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-base">
                <Layers className="h-5 w-5" />
                <h3>
                  {isVi
                    ? 'Giai Đoạn 1: Phân Cụm Không Gian - Thời Gian (ST-DBSCAN Bán Kính Footprint)'
                    : 'Stage 1: Anisotropic Elliptical Footprint ST-DBSCAN'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi
                  ? 'Thuật toán nhóm các điểm phát hiện dựa trên khoảng cách trắc địa Haversine kết hợp thích ứng hình học vết quét (scan × track) hình elip dị hướng và cửa sổ thời gian trượt liên tục ≤ 3,0 giờ:'
                  : 'Groups multi-satellite detections using geodesic Haversine distance with anisotropic cross-track (scan) and along-track (track) swath footprint adaptation and continuous temporal window ≤ 3.0 hours:'}
              </p>
              <pre className="overflow-x-auto rounded-xl border border-line bg-ink-950 p-4 font-mono text-xs text-cyan-200 leading-normal">
{`D_haversine(p_i, p_j) <= eps_dist (1.25 km)
OR ( (dx / a_EW)^2 + (dy / b_NS)^2 <= 1.0 )
AND |t_i - t_j| <= 3.0 hours`}
              </pre>
            </div>

            {/* Stage 2: Centroid */}
            <div className="rounded-2xl border border-emerald-400/30 bg-ink-900/80 p-6 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-base">
                <Cpu className="h-5 w-5" />
                <h3>
                  {isVi
                    ? 'Giai Đoạn 2: Định Vị Trọng Tâm Năng Lượng VIIRS 375m'
                    : 'Stage 2: Radiative Flux-Density Centroid Localization'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi
                  ? 'Trong mỗi cụm phát hiện, vị trí mặt trước đám cháy được neo chuẩn theo các điểm VIIRS 375m có trọng số mật độ bức xạ trên diện tích pixel:'
                  : 'Within each cluster, the physical fire front is localized using 375 m VIIRS detections, weighted by radiative flux density per unit pixel area:'}
              </p>
              <pre className="overflow-x-auto rounded-xl border border-line bg-ink-950 p-4 font-mono text-xs text-emerald-200 leading-normal">
{`w_i = (FRP_i + 0.1) / max(0.05, scan_i * track_i)
(lat*, lon*) = sum(w_i * (lat_i, lon_i)) / sum(w_i)`}
              </pre>
            </div>

            {/* Stage 3: Bayesian Confidence */}
            <div className="rounded-2xl border border-amber-400/30 bg-ink-900/80 p-6 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-base">
                <ShieldCheck className="h-5 w-5" />
                <h3>
                  {isVi
                    ? 'Giai Đoạn 3: Hợp Nhất Độ Tin Cậy Bayesian Độc Lập Theo Lượt Quét'
                    : 'Stage 3: Pass-Grouped Bayesian Confidence Fusion'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi
                  ? 'Gom nhóm các phát hiện theo từng lượt quét vệ tinh độc lập. Tránh hiện tượng tăng vọt độ tin cậy giả tạo do nhiều pixel cùng một lượt quét:'
                  : 'Detections are grouped by independent satellite passes. Pass-level probabilities are aggregated via noisy-OR logic with a 92% floor for dual-confirmed fires:'}
              </p>
              <pre className="overflow-x-auto rounded-xl border border-line bg-ink-950 p-4 font-mono text-xs text-amber-200 leading-normal">
{`p_sat,s = min(0.98, max_{i in s}(p_i) + 0.02 * min(|s| - 1, 3))
P_fused = 1 - prod_s(1 - p_sat,s)  (>= 0.92 floor if dual confirmed)`}
              </pre>
            </div>

            {/* Stage 4: FRP Reconciliation */}
            <div className="rounded-2xl border border-rose-400/30 bg-ink-900/80 p-6 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-base">
                <Flame className="h-5 w-5" />
                <h3>
                  {isVi
                    ? 'Giai Đoạn 4: Điều Hòa Năng Lượng Bức Xạ FRP (Tránh Cộng Dồn)'
                    : 'Stage 4: Pass-Reconciled Fire Radiative Power (FRP)'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isVi
                  ? 'Năng lượng bức xạ FRP đại diện cho tốc độ giải phóng năng lượng tức thời (MW). Do đó, không được cộng dồn các lượt quét khác nhau, mà chọn giá trị tổng lớn nhất giữa các lượt quét độc lập:'
                  : 'FRP represents instantaneous radiative energy release rate (MW). Summing across consecutive orbital overpasses causes massive energy inflation; the maximum instantaneous pass sum is reconciled:'}
              </p>
              <pre className="overflow-x-auto rounded-xl border border-line bg-ink-950 p-4 font-mono text-xs text-rose-200 leading-normal">
{`FRP_reconciled = max_{s in SatPasses}( sum_{i in s} FRP_i )`}
              </pre>
            </div>
          </div>
        </section>

        {/* 3. Sensor Comparison Matrix Table */}
        <section className="rounded-2xl border border-line-strong bg-ink-900/80 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-base">
            <Satellite className="h-5 w-5" />
            <h2>
              {isVi
                ? '3. Bảng Đối Chiếu Thông Số Cảm Biến MODIS vs VIIRS'
                : '3. MODIS vs. VIIRS Sensor Specifications Comparison'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-ink-950/60 text-slate-300">
                  <th className="py-3 px-4 font-bold">{isVi ? 'Thông số kỹ thuật' : 'Specification'}</th>
                  <th className="py-3 px-4 font-bold text-cyan-300">MODIS (C6.1)</th>
                  <th className="py-3 px-4 font-bold text-emerald-300">VIIRS (Collection 2)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-slate-300 font-mono">
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-white">{isVi ? 'Vệ tinh mang cảm biến' : 'Platform'}</td>
                  <td className="py-3 px-4">Terra &amp; Aqua</td>
                  <td className="py-3 px-4">Suomi-NPP, NOAA-20, NOAA-21</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-white">{isVi ? 'Độ phân giải tâm Nadir' : 'Nadir Resolution'}</td>
                  <td className="py-3 px-4">1,000 m (1.0 km)</td>
                  <td className="py-3 px-4 text-emerald-300 font-bold">375 m (I-band)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-white">{isVi ? 'Độ phân giải rìa vết quét' : 'Edge-of-scan Resolution'}</td>
                  <td className="py-3 px-4">~4.8 km &times; 2.0 km (Bowtie)</td>
                  <td className="py-3 px-4 text-emerald-300">~0.8 km (Pixel aggregation)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-white">{isVi ? 'Độ rộng vệt quét (Swath)' : 'Swath Width'}</td>
                  <td className="py-3 px-4">2,330 km</td>
                  <td className="py-3 px-4">3,040 km (Không góc chết)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-white">{isVi ? 'Kênh nhiệt hồng ngoại' : 'Thermal IR Channels'}</td>
                  <td className="py-3 px-4">Channel 21/22 (4 µm), Ch 31 (11 µm)</td>
                  <td className="py-3 px-4">I4 (3.74 µm), I5 (11.45 µm)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-white">{isVi ? 'Chu kỳ lặp quỹ đạo' : 'Revisit Frequency'}</td>
                  <td className="py-3 px-4">1–2 ngày / điểm toàn cầu</td>
                  <td className="py-3 px-4">~12 giờ khi kết hợp chòm vệ tinh</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. NASA EOSDIS Attribution & Provenance */}
        <section className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-6 space-y-4">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-base">
            <TrendingUp className="h-5 w-5" />
            <h2>
              {isVi
                ? '4. Nguồn Dữ Liệu & Danh Mục Tài Liệu Tham Khảo Chính Thống'
                : '4. Data Sources & Canonical Scientific References'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {isVi
              ? 'Dữ liệu được khai thác từ hệ thống NASA LANCE (Land, Atmosphere Near real-time Capability for EOS) và EOSDIS FIRMS. Thuật toán tuân thủ các quy chuẩn học thuật được công bố quốc tế:'
              : 'Observations are sourced directly from NASA LANCE / EOSDIS Fire Information for Resource Management System (FIRMS). Algorithms follow published peer-reviewed benchmarks:'}
          </p>
          <ul className="space-y-2 text-xs text-slate-300 font-mono">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">[1]</span>
              <span>Giglio, L., Schroeder, W., &amp; Justice, C. O. (2016). <em>The collection 6 MODIS active fire detection algorithm and fire products.</em> Remote Sensing of Environment, 178, 31–41.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">[2]</span>
              <span>Schroeder, W., Oliva, P., Giglio, L., &amp; Csiszar, I. A. (2014). <em>The New VIIRS 375m active fire detection product: Algorithm description and initial assessment.</em> Remote Sensing of Environment, 143, 85–96.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">[3]</span>
              <span>Wooster, M. J., Roberts, G., Perry, G. L., &amp; Kaufman, Y. J. (2005). <em>Retrieval of biomass combustion rates and totals from active fire smoke emissions: A review.</em> Journal of Geophysical Research.</span>
            </li>
          </ul>
        </section>

        {/* Back to Dashboard CTA */}
        <div className="flex justify-center pt-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3.5 text-sm font-bold text-ink-950 shadow-xl shadow-cyan-500/20 hover:from-cyan-400 hover:to-emerald-400 transition-all hover:scale-[1.02]"
          >
            <span>{isVi ? 'Trở Về Trạm Giám Sát Dashboard' : 'Return to GIS Dashboard'}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
