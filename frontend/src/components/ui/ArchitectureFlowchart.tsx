import { useState } from 'react';
import {
  Satellite,
  Layers,
  Cpu,
  Activity,
  ArrowRight,
  CheckCircle2,
  Workflow,
} from 'lucide-react';
import { Badge } from '../ui';

interface ArchitectureFlowchartProps {
  isVi?: boolean;
}

export function ArchitectureFlowchart({ isVi = false }: ArchitectureFlowchartProps) {
  const [activeStage, setActiveStage] = useState<number | null>(null);

  const stages = [
    {
      id: 1,
      badge: 'STAGE 01',
      title: isVi ? 'Thu Thập & Đa Cảm Biến FIRMS' : 'Raw Multi-Sensor Ingestion',
      subtitle: isVi ? 'Dữ liệu vệ tinh quỹ đạo cực' : 'Polar-orbiting raw telemetry',
      color: 'cyan',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400',
      bgColor: 'bg-cyan-500/10',
      textColor: 'text-cyan-300',
      icon: Satellite,
      inputs: [
        {
          name: 'MODIS (Terra & Aqua)',
          specs: isVi ? '1.000m Nadir · Bowtie 4.8×2.0km · 2.330km swath' : '1,000m Nadir · Bowtie 4.8×2.0km · 2,330km swath',
          tag: '1.000m',
        },
        {
          name: 'VIIRS (Suomi-NPP, NOAA-20, NOAA-21)',
          specs: isVi ? '375m I-band · Aggregation 0.8km · 3.040km swath' : '375m I-band · Aggregation 0.8km · 3,040km swath',
          tag: '375m',
        },
      ],
      operations: isVi
        ? [
            'Tiếp nhận luồng NRT từ NASA LANCE EOSDIS FIRMS',
            'Chuẩn hóa cấu trúc tọa độ, thời gian UTC và các dải phổ nhiệt',
            'Lọc các điểm chất lượng kém hoặc bị che phủ bởi mây dày',
          ]
        : [
            'Ingest NRT streams from NASA LANCE EOSDIS FIRMS',
            'Standardize UTC epoch timestamps and thermal coordinates',
            'Screen low-quality flags and thick cloud obscurations',
          ],
      output: isVi ? 'Vector điểm thô: lat, lon, frp, scan, track, sat, time' : 'Raw telemetry vector: lat, lon, frp, scan, track, sat, time',
    },
    {
      id: 2,
      badge: 'STAGE 02',
      title: isVi ? 'Chuẩn Hóa Hình Học & Tiên Nghiệm' : 'Geometric & Prior Calibration',
      subtitle: isVi ? 'Mô hình elip & hiệu chuẩn Laplace' : 'Anisotropic ellipse & Laplace calibration',
      color: 'emerald',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-300',
      icon: Layers,
      inputs: [
        {
          name: isVi ? 'Hiệu chuẩn xác suất Laplace' : 'Laplace Confidence Mapping',
          specs: isVi ? 'MODIS: max(0.05, conf/100) · VIIRS: 0.35 / 0.70 / 0.95' : 'MODIS: max(0.05, conf/100) · VIIRS: 0.35 / 0.70 / 0.95',
          tag: 'Laplace',
        },
        {
          name: isVi ? 'Mô hình Footprint Elip Dị Hướng' : 'Anisotropic Swath Footprint',
          specs: isVi ? 'a_scan = (scan/2)×1.15 · b_track = (track/2)×1.15' : 'a_scan = (scan/2)×1.15 · b_track = (track/2)×1.15',
          tag: 'Ellipse',
        },
      ],
      operations: isVi
        ? [
            'Ánh xạ độ tin cậy danh định thành xác suất tiên nghiệm chuẩn',
            'Tính toán bán kính thích ứng theo góc quét cảm biến (Bowtie expansion)',
            'Thiết lập chỉ mục không gian ô lưới O(N) để tăng tốc độ truy vấn',
          ]
        : [
            'Transform discrete confidence ratings into rigorous prior probabilities',
            'Compute dynamic elliptical bounding radii based on scan geometry',
            'Build O(N) spatial grid index for accelerated neighbor queries',
          ],
      output: isVi ? 'Tập hợp thực thể chuẩn hóa kèm ma trận bán kính hình học' : 'Calibrated candidate set with geometric footprint bounds',
    },
    {
      id: 3,
      badge: 'STAGE 03',
      title: isVi ? 'Nhân Thuật Toán ST-DBSCAN v2.2' : 'ST-DBSCAN v2.2 Fusion Engine',
      subtitle: isVi ? 'Định vị trọng tâm & Hợp nhất Bayesian' : 'Centroid localization & Bayesian fusion',
      color: 'amber',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-300',
      icon: Cpu,
      inputs: [
        {
          name: isVi ? 'Định vị trọng tâm mặt lửa' : 'Flux-Density Centroid',
          specs: isVi ? 'w_i = (FRP_i + 0.1) / max(0.05, scan_i × track_i)' : 'w_i = (FRP_i + 0.1) / max(0.05, scan_i × track_i)',
          tag: 'w_i centroid',
        },
        {
          name: isVi ? 'Hợp nhất Bayesian theo lượt quét' : 'Pass-Grouped Bayesian Noisy-OR',
          specs: isVi ? 'P_fused = 1 - ∏(1 - p_sat,s) · Ngưỡng sàn kép ≥ 0.92' : 'P_fused = 1 - ∏(1 - p_sat,s) · Dual-confirmed ≥ 0.92',
          tag: 'Noisy-OR',
        },
      ],
      operations: isVi
        ? [
            'Gom cụm không-thời gian: Haversine ≤ 1.25km ∨ Elip dị hướng ≤ 1.0, Δt ≤ 3.0h',
            'Neo trọng tâm cụm theo mật độ bức xạ pixel VIIRS 375m sắc nét',
            'Điều hòa năng lượng bức xạ tức thời: FRP_reconciled = max_s(∑ FRP_i)',
          ]
        : [
            'Spatio-temporal clustering: Haversine ≤ 1.25km ∨ Anisotropic Ellipse, Δt ≤ 3.0h',
            'Anchor physical fire front towards fine 375m VIIRS radiative hotspots',
            'Reconcile instantaneous radiative energy: FRP_reconciled = max_s(∑ FRP_i)',
          ],
      output: isVi ? 'Cụm điểm cháy vật lý hợp nhất (Khử 38.4% điểm ảo)' : 'Fused physical fire events (38.4% redundancy eliminated)',
    },
    {
      id: 4,
      badge: 'STAGE 04',
      title: isVi ? 'Phân Phối & Giám Sát Thời Gian Thực' : 'Distribution & Real-Time Telemetry',
      subtitle: isVi ? 'Dị thường Jackknife & Deck.gl 60 FPS' : 'Jackknife Z-score & WebGL2 visualization',
      color: 'rose',
      borderColor: 'border-rose-500/40 hover:border-rose-400',
      bgColor: 'bg-rose-500/10',
      textColor: 'text-rose-300',
      icon: Activity,
      inputs: [
        {
          name: isVi ? 'Chỉ số dị thường khí hậu Jackknife' : 'Jackknife Climatological Z-Score',
          specs: isVi ? 'Z_i = (x_i - x̄_(-i)) / s_(-i) · Phân tích tương quan ENSO' : 'Z_i = (x_i - x̄_(-i)) / s_(-i) · ENSO teleconnection',
          tag: 'Z-score',
        },
        {
          name: isVi ? 'Hiển thị WebGL2 thời gian thực' : 'WebGL2 Real-Time Rendering',
          specs: isVi ? 'Deck.gl Scatterplot & Heatmap 60 FPS · GeoJSON Streaming' : 'Deck.gl Scatterplot & Heatmap 60 FPS · GeoJSON Streaming',
          tag: '60 FPS',
        },
      ],
      operations: isVi
        ? [
            'Tự động phân lớp mức độ rủi ro dựa trên Z-score lịch sử 20+ năm',
            'Truyền tải GeoJSON nén đến giao diện GIS tốc độ cao (< 95ms)',
            'Cung cấp bảng tra cứu nguồn gốc cảm biến (provenance traceability)',
          ]
        : [
            'Stratify fire severity against 20+ year baseline climatology',
            'Stream optimized GeoJSON to high-performance GIS client (< 95ms latency)',
            'Provide complete provenance audit trail for every fused cluster',
          ],
      output: isVi ? 'Bản đồ Deck.gl, báo cáo phân tích, cảnh báo nguy cơ cháy' : 'Deck.gl interactive map, analytics reports, and risk early warnings',
    },
  ];

  return (
    <div className="space-y-6">
      {/* SVG Pipeline Connection Banner for Wide Screens */}
      <div className="hidden lg:block relative rounded-2xl border border-line-strong bg-ink-950/80 p-5 shadow-inner">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-xs font-semibold tracking-wider text-slate-200 uppercase">
              {isVi ? 'Sơ Đồ Dòng Dữ Liệu Xuyên Suốt (End-to-End Data Pipeline)' : 'End-to-End Dataflow Architecture'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] text-emerald-300">
              {isVi ? 'Độ trễ xử lý < 95ms' : 'Pipeline latency < 95ms'}
            </span>
          </div>
        </div>

        {/* Visual Pipeline Bar */}
        <div className="grid grid-cols-4 gap-3">
          {stages.map((st, idx) => {
            const Icon = st.icon;
            const isSelected = activeStage === st.id;
            return (
              <div
                key={st.id}
                onMouseEnter={() => setActiveStage(st.id)}
                onMouseLeave={() => setActiveStage(null)}
                className={`relative cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${
                  isSelected
                    ? `${st.borderColor} bg-ink-850 shadow-lg scale-[1.02]`
                    : 'border-line bg-ink-900/60 hover:bg-ink-850'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-mono text-[10px] font-bold ${st.textColor}`}>
                    {st.badge}
                  </span>
                  <div className={`grid h-7 w-7 place-items-center rounded-lg ${st.bgColor} ${st.textColor}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="font-bold text-xs text-white line-clamp-1">{st.title}</div>
                <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{st.subtitle}</div>

                {/* Arrow Connector to Next Step */}
                {idx < stages.length - 1 && (
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden lg:grid h-6 w-6 place-items-center rounded-full border border-line-strong bg-ink-800 text-slate-400 shadow">
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed 4-Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isHighlighted = activeStage === stage.id;
          return (
            <div
              key={stage.id}
              onMouseEnter={() => setActiveStage(stage.id)}
              onMouseLeave={() => setActiveStage(null)}
              className={`rounded-2xl border bg-ink-900/80 p-5 transition-all duration-200 flex flex-col justify-between ${
                isHighlighted
                  ? `${stage.borderColor} shadow-panel bg-ink-850`
                  : 'border-line hover:border-line-strong'
              }`}
            >
              <div>
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div className="flex items-center gap-2.5">
                    <div className={`grid h-9 w-9 place-items-center rounded-xl ${stage.bgColor} ${stage.textColor} border border-current/20`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className={`font-mono text-[10px] font-bold tracking-wider ${stage.textColor}`}>
                        {stage.badge}
                      </span>
                      <h3 className="text-sm font-bold text-white tracking-tight">{stage.title}</h3>
                    </div>
                  </div>
                  <Badge tone={stage.color as any}>{isVi ? `Bước ${stage.id}` : `Step ${stage.id}`}</Badge>
                </div>

                {/* Key Inputs / Sub-components */}
                <div className="mt-3.5 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    {isVi ? 'Thành phần đầu vào & cơ chế:' : 'Input signals & mechanisms:'}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {stage.inputs.map((inp, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between rounded-lg border border-line bg-ink-950/60 px-3 py-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-200">{inp.name}</div>
                          <div className="font-mono text-[11px] text-slate-400">{inp.specs}</div>
                        </div>
                        <span className="shrink-0 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                          {inp.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Algorithmic Operations */}
                <div className="mt-3.5 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    {isVi ? 'Thao tác giải thuật cốt lõi:' : 'Algorithmic transformation:'}
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {stage.operations.map((op, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${stage.textColor}`} />
                        <span className="leading-snug">{op}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Stage Output Footer */}
              <div className="mt-4 pt-3 border-t border-line/80 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-slate-400">
                  {isVi ? 'Kết quả bàn giao:' : 'Pipeline deliverable:'}
                </span>
                <span className={`font-mono text-[11px] font-semibold ${stage.textColor} text-right line-clamp-1 max-w-[70%]`}>
                  {stage.output}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
