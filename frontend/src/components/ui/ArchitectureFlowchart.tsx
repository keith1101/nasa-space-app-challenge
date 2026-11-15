import { useState } from 'react';
import {
  Satellite,
  Layers,
  Cpu,
  Activity,
  CheckCircle2,
  Workflow,
} from 'lucide-react';
import { Badge } from '../ui';
import { MathFormula } from './MathFormula';

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
      strokeColor: '#06b6d4',
      icon: Satellite,
      svgBullets: isVi
        ? ['Tiếp nhận LANCE EOSDIS', 'Lọc mây & gán UTC epoch', 'Chuẩn hóa schema đa vệ tinh']
        : ['LANCE EOSDIS ingestion', 'Cloud mask & UTC epoch', 'Unified multi-sat schema'],
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
      strokeColor: '#10b981',
      icon: Layers,
      svgBullets: isVi
        ? ['Laplace mapping [0.05, 0.99]', 'Footprint elip (a_scan, b_track)', 'Chỉ mục lưới không gian O(N)']
        : ['Laplace mapping [0.05, 0.99]', 'Bowtie ellipse (a_scan, b_track)', 'O(N) Spatial grid index'],
      inputs: [
        {
          name: isVi ? 'Hiệu chuẩn xác suất Laplace' : 'Laplace Confidence Mapping',
          specs: (
            <span>
              MODIS: <MathFormula tex="\max\left(0.05, \min\left(0.99, \frac{\text{conf}}{100}\right)\right)" /> · VIIRS: 0.30 / 0.70 / 0.95
            </span>
          ),
          tag: 'Laplace',
        },
        {
          name: isVi ? 'Mô hình Footprint Elip Dị Hướng' : 'Anisotropic Swath Footprint',
          specs: (
            <span>
              <MathFormula tex="a_{\text{scan}} = \frac{\text{scan}_i + \text{scan}_j}{2} + 0.35" /> · <MathFormula tex="b_{\text{track}} = \frac{\text{track}_i + \text{track}_j}{2} + 0.55" />
            </span>
          ),
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
      strokeColor: '#f59e0b',
      icon: Cpu,
      svgBullets: isVi
        ? ['ST-DBSCAN thích ứng vệt quét', 'Định vị trọng tâm bức xạ w_i', 'Noisy-OR gom nhóm (Sàn ≥ 0.92)']
        : ['Adaptive ST-DBSCAN clustering', 'Flux-density centroid w_i', 'Pass-grouped Noisy-OR (≥ 0.92)'],
      inputs: [
        {
          name: isVi ? 'Định vị trọng tâm mặt lửa' : 'Flux-Density Centroid',
          specs: (
            <span>
              <MathFormula tex="w_i = \frac{\text{FRP}_i + 0.1}{\max(0.05, \text{scan}_i \times \text{track}_i)}" />
            </span>
          ),
          tag: 'w_i centroid',
        },
        {
          name: isVi ? 'Hợp nhất Bayesian theo lượt quét' : 'Pass-Grouped Bayesian Noisy-OR',
          specs: (
            <span>
              <MathFormula tex="P_{\text{fused}} = 1 - \prod_{s}(1 - p_{\text{sat}, s})" /> · {isVi ? 'Sàn kép' : 'Dual-floor'} <MathFormula tex="\ge 0.92" />
            </span>
          ),
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
      output: isVi ? 'Cụm điểm cháy vật lý hợp nhất (Khử 43.29% điểm ảo)' : 'Fused physical fire events (43.29% redundancy eliminated)',
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
      strokeColor: '#f43f5e',
      icon: Activity,
      svgBullets: isVi
        ? ['Dị thường Jackknife Z-score', 'Deck.gl WebGL2 60 FPS', 'GeoJSON streaming (< 95ms)']
        : ['Jackknife Z-score anomaly', 'Deck.gl WebGL2 60 FPS', 'GeoJSON streaming (< 95ms)'],
      inputs: [
        {
          name: isVi ? 'Chỉ số dị thường khí hậu Jackknife' : 'Jackknife Climatological Z-Score',
          specs: (
            <span>
              <MathFormula tex="Z_y = \frac{x_y - \bar{x}_{(-y)}}{s_{(-y)}}" /> · {isVi ? 'Tương quan ENSO' : 'ENSO teleconnection'}
            </span>
          ),
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
      {/* Interactive Responsive SVG Pipeline Visual Architecture */}
      <div className="relative rounded-2xl border border-line-strong bg-ink-950/90 p-4 sm:p-6 shadow-inner overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-xs font-semibold tracking-wider text-slate-200 uppercase">
              {isVi ? 'Sơ Đồ Luồng Kiến Trúc Xuyên Suốt (End-to-End SVG Pipeline)' : 'End-to-End SVG Pipeline Architecture'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400 hidden sm:inline">
              {isVi ? 'Nhấp chọn hoặc di chuột để xem chi tiết từng tầng' : 'Hover or click stage to inspect details'}
            </span>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-300 font-semibold">
                {isVi ? 'Độ trễ < 95ms' : 'Latency < 95ms'}
              </span>
            </div>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="w-full overflow-x-auto pb-2">
          <svg
            viewBox="0 0 1020 230"
            className="w-full min-w-[760px] h-auto select-none"
            role="img"
            aria-label="ST-DBSCAN v2.2 4-stage dataflow pipeline"
          >
            <defs>
              <linearGradient id="flow-cyan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="flow-emerald-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="flow-amber-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
              </linearGradient>

              {/* Marker Arrows */}
              <marker id="arrow-cyan" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
              </marker>
              <marker id="arrow-emerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
              </marker>
              <marker id="arrow-amber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
              </marker>
              <marker id="arrow-rose" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
              </marker>

              {/* Glow Filter */}
              <filter id="svg-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Left Feed Block 1: MODIS */}
            <g className="transition-transform duration-200">
              <rect
                x="14"
                y="30"
                width="144"
                height="68"
                rx="10"
                fill="#0b1322"
                stroke="#06b6d4"
                strokeWidth="1.2"
                strokeOpacity="0.6"
              />
              <circle cx="36" cy="52" r="10" fill="#06b6d4" fillOpacity="0.15" />
              <path d="M 32 52 L 40 52 M 36 48 L 36 56" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
              <text x="54" y="50" fill="#f1f5f9" fontSize="10.5" fontWeight="700" fontFamily="sans-serif">MODIS Terra/Aqua</text>
              <text x="54" y="66" fill="#94a3b8" fontSize="9" fontFamily="monospace">1.000m · Bowtie 4.8km</text>
              <text x="54" y="80" fill="#38bdf8" fontSize="8.5" fontFamily="monospace">Swath: 2,330 km</text>
            </g>

            {/* Left Feed Block 2: VIIRS */}
            <g className="transition-transform duration-200">
              <rect
                x="14"
                y="132"
                width="144"
                height="68"
                rx="10"
                fill="#0b1322"
                stroke="#10b981"
                strokeWidth="1.2"
                strokeOpacity="0.6"
              />
              <circle cx="36" cy="154" r="10" fill="#10b981" fillOpacity="0.15" />
              <path d="M 32 154 L 40 154 M 36 150 L 36 158" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
              <text x="54" y="152" fill="#f1f5f9" fontSize="10.5" fontWeight="700" fontFamily="sans-serif">VIIRS SNPP/N20/21</text>
              <text x="54" y="168" fill="#94a3b8" fontSize="9" fontFamily="monospace">375m I-band · Agg 0.8km</text>
              <text x="54" y="182" fill="#34d399" fontSize="8.5" fontFamily="monospace">Swath: 3,040 km</text>
            </g>

            {/* Input Connecting Curves into Stage 1 */}
            <path
              d="M 158 64 C 185 64, 185 96, 210 96"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              markerEnd="url(#arrow-cyan)"
            />
            <path
              d="M 158 166 C 185 166, 185 134, 210 134"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              markerEnd="url(#arrow-emerald)"
            />

            {/* Pipeline Stage 1 */}
            <g
              onClick={() => setActiveStage(activeStage === 1 ? null : 1)}
              onMouseEnter={() => setActiveStage(1)}
              onMouseLeave={() => setActiveStage(null)}
              className="cursor-pointer"
            >
              <rect
                x="212"
                y="24"
                width="175"
                height="182"
                rx="12"
                fill={activeStage === 1 ? '#0e1c2e' : '#080e1a'}
                stroke="#06b6d4"
                strokeWidth={activeStage === 1 ? 2 : 1.2}
                strokeOpacity={activeStage === 1 ? 1 : 0.6}
                filter={activeStage === 1 ? 'url(#svg-glow)' : undefined}
                className="transition-all duration-200"
              />
              <rect x="222" y="34" width="62" height="18" rx="4" fill="#06b6d4" fillOpacity="0.15" />
              <text x="231" y="46" fill="#38bdf8" fontSize="9" fontWeight="700" fontFamily="monospace">STAGE 01</text>
              <circle cx="372" cy="43" r="3.5" fill="#06b6d4" />
              <text x="222" y="70" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                {isVi ? 'Tiếp Nhận & Lọc Sơ Bộ' : 'Ingestion & Schema'}
              </text>
              <text x="222" y="85" fill="#64748b" fontSize="9" fontFamily="monospace">
                {isVi ? 'LANCE EOSDIS Stream' : 'LANCE EOSDIS Stream'}
              </text>

              {/* Stage 1 Bullets */}
              <text x="222" y="112" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[0].svgBullets[0]}</text>
              <text x="222" y="128" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[0].svgBullets[1]}</text>
              <text x="222" y="144" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[0].svgBullets[2]}</text>

              {/* Deliverable Pill */}
              <rect x="222" y="168" width="155" height="24" rx="6" fill="#032b3a" stroke="#0284c7" strokeWidth="0.8" />
              <text x="228" y="184" fill="#7dd3fc" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                {isVi ? 'Vector thô: lat, lon, frp' : 'Raw: lat, lon, frp, scan'}
              </text>
            </g>

            {/* Connector 1 -> 2 */}
            <path
              d="M 387 115 L 416 115"
              fill="none"
              stroke="url(#flow-cyan-grad)"
              strokeWidth="2"
              markerEnd="url(#arrow-emerald)"
            />
            <rect x="390" y="100" width="24" height="12" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
            <text x="394" y="109" fill="#94a3b8" fontSize="7" fontFamily="monospace">NRT</text>

            {/* Pipeline Stage 2 */}
            <g
              onClick={() => setActiveStage(activeStage === 2 ? null : 2)}
              onMouseEnter={() => setActiveStage(2)}
              onMouseLeave={() => setActiveStage(null)}
              className="cursor-pointer"
            >
              <rect
                x="418"
                y="24"
                width="175"
                height="182"
                rx="12"
                fill={activeStage === 2 ? '#0b201a' : '#080e1a'}
                stroke="#10b981"
                strokeWidth={activeStage === 2 ? 2 : 1.2}
                strokeOpacity={activeStage === 2 ? 1 : 0.6}
                filter={activeStage === 2 ? 'url(#svg-glow)' : undefined}
                className="transition-all duration-200"
              />
              <rect x="428" y="34" width="62" height="18" rx="4" fill="#10b981" fillOpacity="0.15" />
              <text x="437" y="46" fill="#34d399" fontSize="9" fontWeight="700" fontFamily="monospace">STAGE 02</text>
              <circle cx="578" cy="43" r="3.5" fill="#10b981" />
              <text x="428" y="70" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                {isVi ? 'Chuẩn Hóa & Laplace' : 'Geometry & Laplace'}
              </text>
              <text x="428" y="85" fill="#64748b" fontSize="9" fontFamily="monospace">
                {isVi ? 'Footprint & Priors' : 'Footprint & Priors'}
              </text>

              {/* Stage 2 Bullets */}
              <text x="428" y="112" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[1].svgBullets[0]}</text>
              <text x="428" y="128" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[1].svgBullets[1]}</text>
              <text x="428" y="144" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[1].svgBullets[2]}</text>

              {/* Deliverable Pill */}
              <rect x="428" y="168" width="155" height="24" rx="6" fill="#022c22" stroke="#059669" strokeWidth="0.8" />
              <text x="434" y="184" fill="#6ee7b7" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                {isVi ? 'Xác suất tiên nghiệm & elip' : 'Prior & Bowtie Ellipse'}
              </text>
            </g>

            {/* Connector 2 -> 3 */}
            <path
              d="M 593 115 L 622 115"
              fill="none"
              stroke="url(#flow-emerald-grad)"
              strokeWidth="2"
              markerEnd="url(#arrow-amber)"
            />
            <rect x="596" y="100" width="24" height="12" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
            <text x="599" y="109" fill="#94a3b8" fontSize="7" fontFamily="monospace">GRID</text>

            {/* Pipeline Stage 3 */}
            <g
              onClick={() => setActiveStage(activeStage === 3 ? null : 3)}
              onMouseEnter={() => setActiveStage(3)}
              onMouseLeave={() => setActiveStage(null)}
              className="cursor-pointer"
            >
              <rect
                x="624"
                y="24"
                width="175"
                height="182"
                rx="12"
                fill={activeStage === 3 ? '#231805' : '#080e1a'}
                stroke="#f59e0b"
                strokeWidth={activeStage === 3 ? 2 : 1.2}
                strokeOpacity={activeStage === 3 ? 1 : 0.6}
                filter={activeStage === 3 ? 'url(#svg-glow)' : undefined}
                className="transition-all duration-200"
              />
              <rect x="634" y="34" width="62" height="18" rx="4" fill="#f59e0b" fillOpacity="0.15" />
              <text x="643" y="46" fill="#fbbf24" fontSize="9" fontWeight="700" fontFamily="monospace">STAGE 03</text>
              <circle cx="784" cy="43" r="3.5" fill="#f59e0b" />
              <text x="634" y="70" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                {isVi ? 'Nhân ST-DBSCAN v2.2' : 'ST-DBSCAN v2.2 Engine'}
              </text>
              <text x="634" y="85" fill="#64748b" fontSize="9" fontFamily="monospace">
                {isVi ? 'Bayesian Fusion Core' : 'Bayesian Fusion Core'}
              </text>

              {/* Stage 3 Bullets */}
              <text x="634" y="112" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[2].svgBullets[0]}</text>
              <text x="634" y="128" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[2].svgBullets[1]}</text>
              <text x="634" y="144" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[2].svgBullets[2]}</text>

              {/* Deliverable Pill */}
              <rect x="634" y="168" width="155" height="24" rx="6" fill="#2d1c02" stroke="#d97706" strokeWidth="0.8" />
              <text x="640" y="184" fill="#fde68a" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                {isVi ? '-43.3% cụm · P ≥ 0.92' : '-43.3% events · P ≥ 0.92'}
              </text>
            </g>

            {/* Connector 3 -> 4 */}
            <path
              d="M 799 115 L 828 115"
              fill="none"
              stroke="url(#flow-amber-grad)"
              strokeWidth="2"
              markerEnd="url(#arrow-rose)"
            />
            <rect x="802" y="100" width="24" height="12" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
            <text x="805" y="109" fill="#94a3b8" fontSize="7" fontFamily="monospace">FUSED</text>

            {/* Pipeline Stage 4 */}
            <g
              onClick={() => setActiveStage(activeStage === 4 ? null : 4)}
              onMouseEnter={() => setActiveStage(4)}
              onMouseLeave={() => setActiveStage(null)}
              className="cursor-pointer"
            >
              <rect
                x="830"
                y="24"
                width="176"
                height="182"
                rx="12"
                fill={activeStage === 4 ? '#22080f' : '#080e1a'}
                stroke="#f43f5e"
                strokeWidth={activeStage === 4 ? 2 : 1.2}
                strokeOpacity={activeStage === 4 ? 1 : 0.6}
                filter={activeStage === 4 ? 'url(#svg-glow)' : undefined}
                className="transition-all duration-200"
              />
              <rect x="840" y="34" width="62" height="18" rx="4" fill="#f43f5e" fillOpacity="0.15" />
              <text x="849" y="46" fill="#fb7185" fontSize="9" fontWeight="700" fontFamily="monospace">STAGE 04</text>
              <circle cx="990" cy="43" r="3.5" fill="#f43f5e" />
              <text x="840" y="70" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                {isVi ? 'Phân Phối & Giám Sát' : 'Distribution & WebGL'}
              </text>
              <text x="840" y="85" fill="#64748b" fontSize="9" fontFamily="monospace">
                {isVi ? 'Deck.gl 60 FPS & GeoJSON' : 'Deck.gl 60 FPS & GeoJSON'}
              </text>

              {/* Stage 4 Bullets */}
              <text x="840" y="112" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[3].svgBullets[0]}</text>
              <text x="840" y="128" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[3].svgBullets[1]}</text>
              <text x="840" y="144" fill="#94a3b8" fontSize="8.5" fontFamily="sans-serif">▸ {stages[3].svgBullets[2]}</text>

              {/* Deliverable Pill */}
              <rect x="840" y="168" width="156" height="24" rx="6" fill="#2d050f" stroke="#e11d48" strokeWidth="0.8" />
              <text x="846" y="184" fill="#fecdd3" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                {isVi ? 'Bản đồ WebGL & Z-Score' : 'WebGL GIS & Z-Score Telemetry'}
              </text>
            </g>
          </svg>
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
                  ? `${stage.borderColor} shadow-panel bg-ink-850 ring-1 ring-current/20`
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
                  <Badge tone={stage.color as any}>{isVi ? `Tầng ${stage.id}` : `Stage ${stage.id}`}</Badge>
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
