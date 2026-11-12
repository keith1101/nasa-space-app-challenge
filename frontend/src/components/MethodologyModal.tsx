import { useEffect } from 'react';
import { BookOpen, Cpu, Flame, Layers, ShieldCheck, TrendingUp, X } from 'lucide-react';
import type { Language } from '../lib/i18n';
import { Badge, buttonPrimary } from './ui';

export interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export function MethodologyModal({ isOpen, onClose, lang }: MethodologyModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isVi = lang === 'vi';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="methodology-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line-strong bg-ink-900 shadow-pop">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-ink-850 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/35 bg-cyan-400/10 text-cyan-300">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="methodology-modal-title" className="text-base font-bold text-white">
                  {isVi ? 'Phương Pháp Luận Khoa Học & Mô Hình Hợp Nhất' : 'Scientific Methodology & Mathematical Architecture'}
                </h2>
                <Badge tone="cyan">ST-DBSCAN v2.2</Badge>
              </div>
              <p className="text-xs text-slate-400">
                {isVi
                  ? 'Chuẩn hóa & hợp nhất điểm cháy nhiệt MODIS (1.000m) và VIIRS (375m) · NASA Space Apps 2026'
                  : 'Harmonization of MODIS (1,000 m) and VIIRS (375 m) Thermal Anomalies · NASA Space Apps 2026'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close methodology dialog"
            className="rounded-lg border border-line-strong bg-ink-800 p-2 text-slate-300 transition-colors hover:bg-ink-700 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 overflow-y-auto p-6 text-xs leading-relaxed text-slate-300">
          {/* Problem Formulation */}
          <section className="rounded-xl border border-line bg-ink-800/70 p-4">
            <h3 className="mb-1.5 text-sm font-bold text-white">
              {isVi ? '1. Vấn Đề Trùng Lặp Điểm Cháy Giữa Các Vệ Tinh' : '1. The Multi-Sensor Active-Fire Redundancy Problem'}
            </h3>
            <p>
              {isVi ? (
                <>
                  Giám sát cháy rừng toàn cầu dựa trên đồng thời <strong>MODIS</strong> (Terra &amp; Aqua, độ phân giải 1.000 m)
                  và <strong>VIIRS</strong> (Suomi-NPP, NOAA-20, NOAA-21, độ phân giải cao 375 m). Các vệ tinh bay theo quỹ đạo cực
                  lệch nhau 20–50 phút thường quét cùng một đám cháy nhiều lần, gây ra hiện tượng <strong>thổi phồng số lượng cháy ảo từ 27%–43%</strong>{' '}
                  và làm sai lệch nghiêm trọng tổng năng lượng bức xạ (FRP).
                </>
              ) : (
                <>
                  Global wildland fire monitoring relies concurrently on legacy <strong>MODIS</strong> (Terra &amp; Aqua,
                  1,000 m nadir resolution) and next-generation <strong>VIIRS</strong> (Suomi-NPP, NOAA-20, NOAA-21,
                  375 m I-band). Overlapping orbital swaths separated by 20–50 minutes cause <strong>artificial double-counting (27%–43%)</strong>{' '}
                  of the same active fire front, inflating energy budgets.
                </>
              )}
            </p>
          </section>

          {/* 4-Stage Architecture Pipeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">
              {isVi ? '2. Quy Trình 4 Bước Chuẩn Hóa Không Gian - Thời Gian' : '2. Four-Stage Spatio-Temporal Harmonization Pipeline'}
            </h3>

            {/* Stage 1: ST-DBSCAN */}
            <section className="rounded-xl border border-line bg-ink-800/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span>{isVi ? 'Bước 1: Phân Cụm Không Gian - Thời Gian (ST-DBSCAN Bán Kính Footprint)' : 'Stage 1: Anisotropic Elliptical Footprint ST-DBSCAN'}</span>
              </div>
              <p>
                {isVi ? (
                  <>
                    Thuật toán ST-DBSCAN nhóm các điểm phát hiện dựa trên khoảng cách trắc địa Haversine kết hợp thích ứng hình học
                    vết quét (scan &times; track) và cửa sổ thời gian trượt &le; 3,0 giờ:
                  </>
                ) : (
                  <>
                    Groups multi-satellite detections using geodesic Haversine distance with anisotropic cross-track
                    (<span className="font-mono text-cyan-200">scan</span>) and along-track (<span className="font-mono text-cyan-200">track</span>)
                    swath footprint adaptation and continuous temporal window:
                  </>
                )}
              </p>
              <pre className="overflow-x-auto rounded-lg border border-line bg-ink-950 p-2.5 font-mono text-[11px] text-cyan-200">
{`D_haversine(p_i, p_j) <= eps_dist (1.25 km)
OR (dx / a_EW)^2 + (dy / b_NS)^2 <= 1.0
AND |t_i - t_j| <= 3.0 hours`}
              </pre>
            </section>

            {/* Stage 2: Centroid */}
            <section className="rounded-xl border border-line bg-ink-800/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <Cpu className="h-4 w-4" aria-hidden="true" />
                <span>{isVi ? 'Bước 2: Định Vị Trọng Tâm Năng Lượng 375m VIIRS' : 'Stage 2: Radiative Flux-Density Centroid Localization'}</span>
              </div>
              <p>
                {isVi ? (
                  <>
                    Xác định tọa độ trung tâm đám cháy dựa trên các điểm VIIRS 375m có trọng số mật độ bức xạ:
                  </>
                ) : (
                  <>
                    Within each cluster, the physical fire front is localized using 375 m VIIRS detections,
                    weighted by radiative flux density per unit pixel area:
                  </>
                )}
              </p>
              <pre className="overflow-x-auto rounded-lg border border-line bg-ink-950 p-2.5 font-mono text-[11px] text-emerald-200">
{`w_i = (FRP_i + 0.1) / max(0.05, scan_i * track_i)
(lat*, lon*) = sum(w_i * (lat_i, lon_i)) / sum(w_i)`}
              </pre>
            </section>

            {/* Stage 3: Bayesian Confidence */}
            <section className="rounded-xl border border-line bg-ink-800/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>{isVi ? 'Bước 3: Hợp Nhất Độ Tin Cậy Bayesian Độc Lập Theo Vệ Tinh' : 'Stage 3: Pass-Grouped Bayesian Confidence Fusion'}</span>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-line bg-ink-950 p-2.5 font-mono text-[11px] text-amber-200">
{`p_sat,s = min(0.98, max_{i in s}(p_i) + 0.02 * min(|s| - 1, 3))
P_fused = 1 - prod_s(1 - p_sat,s)  (>=0.92 floor if dual confirmed)`}
              </pre>
            </section>

            {/* Stage 4: FRP Reconciliation */}
            <section className="rounded-xl border border-line bg-ink-800/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <Flame className="h-4 w-4" aria-hidden="true" />
                <span>{isVi ? 'Bước 4: Điều Hòa Năng Lượng Bức Xạ FRP (Tránh Cộng Dồn)' : 'Stage 4: Pass-Reconciled Fire Radiative Power (FRP)'}</span>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-line bg-ink-950 p-2.5 font-mono text-[11px] text-rose-200">
{`FRP_reconciled = max_{s in SatPasses}( sum_{i in s} FRP_i )`}
              </pre>
            </section>
          </div>

          {/* NASA EOSDIS Attribution */}
          <section className="flex items-start gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4">
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
            <div className="space-y-1">
              <div className="font-bold text-white">
                {isVi ? 'Nguồn Dữ Liệu NASA EOSDIS FIRMS' : 'NASA EOSDIS Attribution & Provenance Integrity'}
              </div>
              <p className="text-slate-300">
                {isVi
                  ? 'Dữ liệu quan trắc thực nghiệm được tải từ NASA LANCE / EOSDIS Fire Information for Resource Management System (FIRMS): MODIS Collection 6.1 (MCD14DL), VIIRS NOAA-20 (VJ114IMGTDL_NRT) và VIIRS NOAA-21 (VJ214IMGTDL_NRT).'
                  : 'Empirical observations are sourced from NASA LANCE / EOSDIS Fire Information for Resource Management System (FIRMS): MODIS Collection 6.1 (MCD14DL), VIIRS NOAA-20 (VJ114IMGTDL_NRT), and VIIRS NOAA-21 (VJ214IMGTDL_NRT).'}
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line bg-ink-850 px-6 py-3">
          <span className="font-mono text-[11px] text-slate-400">
            ST-DBSCAN v2.2 · Space Apps 2026
          </span>
          <button type="button" onClick={onClose} className={buttonPrimary}>
            {isVi ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
