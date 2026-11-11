import React, { useState, useMemo } from 'react';
import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
  NodeProps
} from '@xyflow/react';
import {
  Database,
  Crosshair,
  Layers,
  Filter,
  Activity,
  Orbit,
  Info,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  MoveRight
} from 'lucide-react';
import { Language } from '../types';

interface PipelineNodeData extends Record<string, unknown> {
  id: string;
  step: string;
  titleVi: string;
  titleEn: string;
  techVi: string;
  techEn: string;
  iconName: string;
  status: 'calibrated' | 'processing' | 'analysis' | 'ready';
  badge: string;
  formula?: string;
  detailsVi: string;
  detailsEn: string;
  pyStack?: string;
}

type PipelineNode = Node<PipelineNodeData, 'pipelineStep'>;

// Custom Node Component with strict fixed dimensions (230px x 100px) preventing any overlap
const PipelineStepNode = ({ data, selected }: NodeProps<PipelineNode>) => {
  const getIcon = () => {
    switch (data.iconName) {
      case 'Database': return <Database className="h-4 w-4" aria-hidden="true" />;
      case 'Crosshair': return <Crosshair className="h-4 w-4" aria-hidden="true" />;
      case 'Layers': return <Layers className="h-4 w-4" aria-hidden="true" />;
      case 'Filter': return <Filter className="h-4 w-4" aria-hidden="true" />;
      case 'Activity': return <Activity className="h-4 w-4" aria-hidden="true" />;
      case 'Orbit': return <Orbit className="h-4 w-4" aria-hidden="true" />;
      default: return <Sparkles className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const getStatusBadge = () => {
    switch (data.status) {
      case 'calibrated':
        return 'bg-blue-900/60 text-blue-200 border-blue-500/50';
      case 'processing':
        return 'bg-purple-900/60 text-purple-200 border-purple-500/50';
      case 'analysis':
        return 'bg-amber-900/60 text-amber-200 border-amber-500/50';
      case 'ready':
        return 'bg-emerald-900/60 text-emerald-200 border-emerald-500/50';
    }
  };

  return (
    <div
      style={{ width: 230 }}
      className={`relative rounded-card border-2 p-3 font-sans transition-all duration-200 shadow-md ${
        selected
          ? 'border-spaceapps-neonyellow bg-spaceapps-nearblack ring-2 ring-spaceapps-neonyellow/60'
          : 'border-spaceapps-electricblue bg-spaceapps-deepblue/95 hover:border-spaceapps-neonblue'
      }`}
    >
      {/* Target Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!bg-spaceapps-neonyellow !w-2.5 !h-2.5 !border-spaceapps-nearblack"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!bg-spaceapps-neonyellow !w-2.5 !h-2.5 !border-spaceapps-nearblack"
      />
      
      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-spaceapps-electricblue/60 pb-1.5 mb-2">
        <span className="font-mono text-[10px] font-bold text-spaceapps-neonyellow tracking-wider">
          {data.step}
        </span>
        <span className={`rounded-btn border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${getStatusBadge()}`}>
          {data.badge}
        </span>
      </div>

      {/* Node Body */}
      <div className="flex items-start gap-2.5">
        <div className="rounded-btn p-1.5 bg-spaceapps-nearblack border border-spaceapps-electricblue text-spaceapps-neonyellow shrink-0">
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white uppercase leading-snug truncate" title={data.titleVi}>
            {data.titleVi}
          </h4>
          <p className="font-mono text-[10px] text-slate-300 mt-0.5 truncate" title={data.techVi}>
            {data.techVi}
          </p>
        </div>
      </div>

      {/* Source Connection Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!bg-spaceapps-neonblue !w-2.5 !h-2.5 !border-spaceapps-nearblack"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!bg-spaceapps-neonblue !w-2.5 !h-2.5 !border-spaceapps-nearblack"
      />
    </div>
  );
};

const nodeTypes = {
  pipelineStep: PipelineStepNode
};

const PIPELINE_NODES_DATA: PipelineNodeData[] = [
  {
    id: 'node-e1',
    step: 'STAGE 01.A',
    titleVi: 'FITS Thời kỳ 1 (2025-03)',
    titleEn: 'FITS Epoch 1 (2025-03)',
    techVi: 'NASA IRSA / IPAC Level 2',
    techEn: 'NASA IRSA / IPAC Level 2',
    iconName: 'Database',
    status: 'calibrated',
    badge: 'NASA FITS',
    formula: 'I_1(x, y, λ) ∈ ℝ^{N×M×102}',
    detailsVi: 'Dữ liệu quang phổ 102 kênh khảo sát bầu trời thời kỳ 1 (mùa xuân 2025) tải trực tiếp từ Trung tâm Dữ liệu SPHEREx Caltech/IPAC.',
    detailsEn: '102-channel sky survey data for Epoch 1 (Spring 2025) ingested directly from Caltech/IPAC SPHEREx Science Data Center.',
    pyStack: 'astropy.io.fits · irsa.ipac.caltech.edu'
  },
  {
    id: 'node-e2',
    step: 'STAGE 01.B',
    titleVi: 'FITS Thời kỳ 2 (2025-09)',
    titleEn: 'FITS Epoch 2 (2025-09)',
    techVi: 'Chu kỳ lặp 6 tháng (1 AU Baseline)',
    techEn: '6-Month Baseline (1 AU Baseline)',
    iconName: 'Database',
    status: 'calibrated',
    badge: 'NASA FITS',
    formula: 'I_2(x, y, λ) ∈ ℝ^{N×M×102}',
    detailsVi: 'Dữ liệu cùng thiên khu quan sát sau 6 tháng, tạo thị sai góc cần thiết để nhận diện chuyển động riêng của các thiên thể xa xôi (Planet X).',
    detailsEn: 'Same celestial pointing captured 6 months later, creating the baseline parallax required for detecting distant solar system objects.',
    pyStack: 'astropy.io.fits · astropy.time.Time'
  },
  {
    id: 'node-wcs',
    step: 'STAGE 02',
    titleVi: 'Căn chỉnh Hệ Tọa độ WCS',
    titleEn: 'WCS Astrometric Alignment',
    techVi: 'Ma trận méo ảnh Sub-pixel',
    techEn: 'Sub-pixel Distortion Mapping',
    iconName: 'Crosshair',
    status: 'processing',
    badge: 'ASTROMETRY',
    formula: '[α, δ]^T = WCS(x, y, CD_{ij})',
    detailsVi: 'Chuẩn hóa hệ tọa độ xích đạo J2000 và triệt tiêu sai số xoay/méo quang học giữa hai thời kỳ với độ lệch < 0.05 arcsec.',
    detailsEn: 'Aligns images to J2000 celestial frame and rectifies optical distortions between epochs to <0.05 arcsec accuracy.',
    pyStack: 'astropy.wcs.WCS · reproject.reproject_interp'
  },
  {
    id: 'node-diff',
    step: 'STAGE 03',
    titleVi: 'Trừ Ảnh Vi Sai (Difference)',
    titleEn: 'Image Subtraction Engine',
    techVi: 'Triệt tiêu sao tĩnh & nền thiên hà',
    techEn: 'Stationary Star Cancellation',
    iconName: 'Layers',
    status: 'processing',
    badge: 'ASTROPY DIFF',
    formula: 'ΔI = I_2 - (k ⊗ I_1) - b(x,y)',
    detailsVi: 'Khử toàn bộ 99.9% nguồn sao nền và nền bụi liên sao tĩnh, làm nổi bật lưỡng cực âm/dương (Dipole Signature) của vật thể dịch chuyển.',
    detailsEn: 'Cancels 99.9% of stationary stars and zodiacal dust, isolating characteristic positive/negative dipoles of moving bodies.',
    pyStack: 'numpy · scipy.ndimage.gaussian_filter'
  },
  {
    id: 'node-filter',
    step: 'STAGE 04',
    titleVi: 'Lọc Ngưỡng Dịch Chuyển 5σ',
    titleEn: '5σ Moving Candidate Filter',
    techVi: 'Xác suất lỗi ngẫu nhiên < 3×10⁻⁷',
    techEn: 'False Alarm Prob < 3×10⁻⁷',
    iconName: 'Filter',
    status: 'analysis',
    badge: 'DETECTION',
    formula: 'S/N = |ΔI_{peak}| / σ_{RMS} ≥ 5.0',
    detailsVi: 'Quét tự động các cụm pixel có tín hiệu vượt ngưỡng 5 lần độ lệch chuẩn nền, loại trừ cosmic rays và artifact quang học.',
    detailsEn: 'Scans for clusters with signal-to-noise ratio exceeding 5 times background RMS, discarding cosmic rays and artifacts.'
  },
  {
    id: 'node-sed',
    step: 'STAGE 05',
    titleVi: 'Trích xuất Phổ SED 102 Kênh',
    titleEn: '102-Band SED Extraction',
    techVi: 'Phân tích vạch băng H₂O, CO₂',
    techEn: 'Volatile Ice Line Analysis',
    iconName: 'Activity',
    status: 'analysis',
    badge: 'SPECTRAL LVF',
    formula: 'F_λ = ∫ I(x, y, λ) dΩ · 0.75 - 5.0 µm',
    detailsVi: 'Đo đường cong phân bố năng lượng quang phổ qua 102 kênh LVF, tìm kiếm dấu hiệu hấp thụ băng nước (3.05 µm) và CO₂ (4.27 µm).',
    detailsEn: 'Measures spectral energy distribution across 102 LVF channels, identifying diagnostic absorption of water and CO2 ice.',
    pyStack: 'photutils.aperture.CircularAperture · scipy'
  },
  {
    id: 'node-ledger',
    step: 'STAGE 06',
    titleVi: 'Sổ Cái Đo Sao & Quỹ Đạo Sơ Bộ',
    titleEn: 'Astrometry Ledger & Orbit',
    techVi: 'Xác định vận tốc góc & Parallax',
    techEn: 'Angular Velocity & Parallax Fitting',
    iconName: 'Orbit',
    status: 'ready',
    badge: 'VERIFIED',
    formula: 'μ = Δθ / Δt · a_p ≈ 400 - 800 AU',
    detailsVi: 'Tính toán vận tốc góc cung/năm, kiểm tra tương thích quỹ đạo Kepler ngoài 400 AU và ghi nhận vào sổ cái ứng viên Planet X.',
    detailsEn: 'Calculates proper motion arcsec/yr, fits trans-Neptunian orbital constraints (400-800 AU), and catalogues candidate.',
    pyStack: 'astropy.coordinates.SkyCoord · Keplerian Fit'
  }
];

interface ScientificPipelineCanvasProps {
  lang?: Language;
}

export const ScientificPipelineCanvas: React.FC<ScientificPipelineCanvasProps> = ({ lang = 'vi' }) => {
  const [selectedNode, setSelectedNode] = useState<PipelineNodeData>(PIPELINE_NODES_DATA[2]); // Default WCS node
  const [layoutMode, setLayoutMode] = useState<'grid' | 'linear'>('grid');

  // Strict non-overlapping coordinate systems
  const nodes: PipelineNode[] = useMemo(() => {
    if (layoutMode === 'grid') {
      // 2-Tier Compact Grid Layout (Width = 920px, Height = 440px): 100% visible on standard displays
      return [
        // Row 1: Image Ingestion & Subtraction
        {
          id: 'node-e1',
          type: 'pipelineStep',
          position: { x: 30, y: 30 },
          data: PIPELINE_NODES_DATA[0]
        },
        {
          id: 'node-e2',
          type: 'pipelineStep',
          position: { x: 30, y: 165 },
          data: PIPELINE_NODES_DATA[1]
        },
        {
          id: 'node-wcs',
          type: 'pipelineStep',
          position: { x: 340, y: 95 },
          data: PIPELINE_NODES_DATA[2]
        },
        {
          id: 'node-diff',
          type: 'pipelineStep',
          position: { x: 650, y: 95 },
          data: PIPELINE_NODES_DATA[3]
        },
        // Row 2: Science Extraction & Astrometry (Flows Left-to-Right)
        {
          id: 'node-filter',
          type: 'pipelineStep',
          position: { x: 30, y: 305 },
          data: PIPELINE_NODES_DATA[4]
        },
        {
          id: 'node-sed',
          type: 'pipelineStep',
          position: { x: 340, y: 305 },
          data: PIPELINE_NODES_DATA[5]
        },
        {
          id: 'node-ledger',
          type: 'pipelineStep',
          position: { x: 650, y: 305 },
          data: PIPELINE_NODES_DATA[6]
        }
      ];
    } else {
      // Linear Panoramic Layout with generous horizontal gaps (Width = 1960px)
      return [
        {
          id: 'node-e1',
          type: 'pipelineStep',
          position: { x: 30, y: 40 },
          data: PIPELINE_NODES_DATA[0]
        },
        {
          id: 'node-e2',
          type: 'pipelineStep',
          position: { x: 30, y: 200 },
          data: PIPELINE_NODES_DATA[1]
        },
        {
          id: 'node-wcs',
          type: 'pipelineStep',
          position: { x: 350, y: 120 },
          data: PIPELINE_NODES_DATA[2]
        },
        {
          id: 'node-diff',
          type: 'pipelineStep',
          position: { x: 670, y: 120 },
          data: PIPELINE_NODES_DATA[3]
        },
        {
          id: 'node-filter',
          type: 'pipelineStep',
          position: { x: 990, y: 120 },
          data: PIPELINE_NODES_DATA[4]
        },
        {
          id: 'node-sed',
          type: 'pipelineStep',
          position: { x: 1310, y: 120 },
          data: PIPELINE_NODES_DATA[5]
        },
        {
          id: 'node-ledger',
          type: 'pipelineStep',
          position: { x: 1630, y: 120 },
          data: PIPELINE_NODES_DATA[6]
        }
      ];
    }
  }, [layoutMode]);

  const edges: Edge[] = useMemo(() => {
    if (layoutMode === 'grid') {
      return [
        {
          id: 'e-e1-wcs',
          source: 'node-e1',
          sourceHandle: 'source-right',
          target: 'node-wcs',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#0050d8', strokeWidth: 2.5 }
        },
        {
          id: 'e-e2-wcs',
          source: 'node-e2',
          sourceHandle: 'source-right',
          target: 'node-wcs',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#0050d8', strokeWidth: 2.5 }
        },
        {
          id: 'e-wcs-diff',
          source: 'node-wcs',
          sourceHandle: 'source-right',
          target: 'node-diff',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#e7f434', strokeWidth: 2.5 }
        },
        // Curve from Row 1 Diff down to Row 2 Filter
        {
          id: 'e-diff-filter',
          source: 'node-diff',
          sourceHandle: 'source-bottom',
          target: 'node-filter',
          targetHandle: 'target-top',
          type: 'smoothstep',
          animated: true,
          label: 'ΔI Output',
          labelStyle: {
            fill: '#e7f434',
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 'bold'
          },
          labelBgStyle: {
            fill: '#0c0f18',
            fillOpacity: 0.95,
            stroke: '#e7f434',
            strokeWidth: 1.5,
            rx: 4
          },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 4,
          labelShowBg: true,
          style: { stroke: '#e7f434', strokeWidth: 2.5 }
        },
        {
          id: 'e-filter-sed',
          source: 'node-filter',
          sourceHandle: 'source-right',
          target: 'node-sed',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#00F0FF', strokeWidth: 2.5 }
        },
        {
          id: 'e-sed-ledger',
          source: 'node-sed',
          sourceHandle: 'source-right',
          target: 'node-ledger',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2.5 }
        }
      ];
    } else {
      return [
        {
          id: 'e-e1-wcs',
          source: 'node-e1',
          sourceHandle: 'source-right',
          target: 'node-wcs',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#0050d8', strokeWidth: 2.5 }
        },
        {
          id: 'e-e2-wcs',
          source: 'node-e2',
          sourceHandle: 'source-right',
          target: 'node-wcs',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#0050d8', strokeWidth: 2.5 }
        },
        {
          id: 'e-wcs-diff',
          source: 'node-wcs',
          sourceHandle: 'source-right',
          target: 'node-diff',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#e7f434', strokeWidth: 2.5 }
        },
        {
          id: 'e-diff-filter',
          source: 'node-diff',
          sourceHandle: 'source-right',
          target: 'node-filter',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          label: 'ΔI Output',
          labelStyle: {
            fill: '#e7f434',
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 'bold'
          },
          labelBgStyle: {
            fill: '#0c0f18',
            fillOpacity: 0.95,
            stroke: '#e7f434',
            strokeWidth: 1.5,
            rx: 4
          },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 4,
          labelShowBg: true,
          style: { stroke: '#e7f434', strokeWidth: 2.5 }
        },
        {
          id: 'e-filter-sed',
          source: 'node-filter',
          sourceHandle: 'source-right',
          target: 'node-sed',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#00F0FF', strokeWidth: 2.5 }
        },
        {
          id: 'e-sed-ledger',
          source: 'node-sed',
          sourceHandle: 'source-right',
          target: 'node-ledger',
          targetHandle: 'target-left',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2.5 }
        }
      ];
    }
  }, [layoutMode]);

  return (
    <div className="space-y-4">
      {/* Canvas Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-spaceapps-deepblue p-4 rounded-t-card border-t border-x border-spaceapps-electricblue text-white">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-spaceapps-neonyellow" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
              SƠ ĐỒ PIPELINE KHOA HỌC (REACT FLOW INTERACTIVE GRAPH)
            </h3>
            <p className="text-xs text-slate-300">
              Nhấp vào các khối xử lý để xem công thức toán học và hàm AstroPy tương ứng
            </p>
          </div>
        </div>

        {/* Layout Switcher & Status */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center rounded-btn border border-spaceapps-electricblue bg-spaceapps-nearblack p-0.5">
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                layoutMode === 'grid'
                  ? 'bg-spaceapps-neonblue text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Chế độ 2 tầng gọn gàng"
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Lưới 2 Tầng</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('linear')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-xs transition-colors ${
                layoutMode === 'linear'
                  ? 'bg-spaceapps-neonblue text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Chế độ trải dài toàn cảnh"
            >
              <MoveRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Trải Ngang</span>
            </button>
          </div>

          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-btn bg-spaceapps-nearblack border border-spaceapps-electricblue text-spaceapps-neonyellow">
            <span className="h-2 w-2 rounded-full bg-spaceapps-neonyellow animate-pulse" />
            7 Giai đoạn
          </span>
        </div>
      </div>

      {/* Main Graph Viewport */}
      <div className="relative h-[460px] w-full rounded-b-card border border-spaceapps-electricblue bg-spaceapps-nearblack overflow-hidden shadow-2xl">
        <ReactFlow
          key={layoutMode}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => {
            const data = node.data as unknown as PipelineNodeData;
            if (data) setSelectedNode(data);
          }}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={1.5}
          nodesDraggable={true}
          nodesConnectable={false}
          aria-label="Interactive scientific pipeline node diagram"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#1b2b85" />
          <Controls
            className="!bg-spaceapps-deepblue !border-spaceapps-electricblue !rounded-btn !shadow-lg [&>button]:!bg-spaceapps-deepblue [&>button]:!border-spaceapps-electricblue [&>button]:!text-white [&>button:hover]:!bg-spaceapps-electricblue"
            showInteractive={false}
          />
          <MiniMap
            nodeColor="#0050d8"
            maskColor="rgba(12, 15, 24, 0.75)"
            className="!bg-spaceapps-nearblack !border-2 !border-spaceapps-electricblue !rounded-card"
          />
        </ReactFlow>
      </div>

      {/* Interactive Inspector Panel for Clicked Node */}
      {selectedNode && (
        <div className="rounded-card border-2 border-spaceapps-electricblue bg-spaceapps-deepblue/95 p-5 text-white shadow-xl transition-all">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-spaceapps-electricblue/60 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-spaceapps-neonblue text-xs font-mono font-bold text-spaceapps-neonyellow">
                <Info className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <span className="font-mono text-[10px] font-bold text-spaceapps-neonyellow uppercase">
                  {selectedNode.step} · CHI TIẾT THUẬT TOÁN
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white uppercase">
                  {lang === 'vi' ? selectedNode.titleVi : selectedNode.titleEn}
                </h4>
              </div>
            </div>

            {selectedNode.pyStack && (
              <span className="rounded-btn border border-spaceapps-neonyellow/40 bg-spaceapps-neonyellow/10 px-3 py-1 font-mono text-xs font-bold text-spaceapps-neonyellow">
                {selectedNode.pyStack}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <p className="text-slate-200 leading-relaxed">
                {lang === 'vi' ? selectedNode.detailsVi : selectedNode.detailsEn}
              </p>
              {selectedNode.formula && (
                <div className="rounded-btn border border-spaceapps-electricblue bg-spaceapps-nearblack p-2.5 font-mono text-spaceapps-neonyellow">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Mô hình toán học:</span>
                  <span className="text-xs font-bold">{selectedNode.formula}</span>
                </div>
              )}
            </div>

            <div className="rounded-btn border border-spaceapps-electricblue/70 bg-spaceapps-nearblack/50 p-3 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                Bảo chứng Chuẩn Khoa học NASA:
              </span>
              <ul className="space-y-1 text-slate-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Dữ liệu thực nghiệm FITS không qua mô phỏng giả lập.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Tuân thủ định dạng WCS FITS Standard Version 4.0.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Hiệu năng tính toán song song AstroPy &amp; NumPy vectorization.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
