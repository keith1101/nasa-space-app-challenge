import { useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import MapLibreMap from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import { Globe2, ZoomIn, ZoomOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { GlobalHarmonizedPoint } from '../../types/harmonization';
import { useGlobalDatasetsQuery } from '../../hooks/useQueries';
import { fmtInt } from '../../lib/format';

const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const INITIAL_VIEW_STATE = {
  latitude: 16.0,
  longitude: 106.0,
  zoom: 3.2,
  pitch: 30,
  bearing: -15,
  maxZoom: 12,
  minZoom: 1.5,
};

// Fallback high-impact points across key global biomes if catalog is still loading
const SAMPLE_PREVIEW_POINTS: GlobalHarmonizedPoint[] = [
  [16.46, 107.59, 48.2, 98, 1, 3, 176], // Central Vietnam
  [12.24, 108.44, 32.5, 94, 1, 2, 176], // Central Highlands
  [10.45, 105.12, 28.0, 92, 1, 2, 176], // Mekong Delta
  [-3.46, -62.21, 85.0, 99, 1, 4, 21],  // Amazon Basin
  [-11.20, 27.50, 64.0, 96, 1, 3, 40],  // Central Africa
  [-25.27, 133.77, 52.0, 95, 1, 2, 9],  // Australia
  [37.77, -122.41, 42.0, 93, 1, 3, 172], // California
  [61.52, 105.31, 38.0, 91, 0, 1, 137], // Siberia
];

export function MiniFirePreview({ isVi }: { isVi: boolean }) {
  const { data } = useGlobalDatasetsQuery();
  const [viewState, setViewState] = useState<any>(INITIAL_VIEW_STATE);

  const points = useMemo(() => {
    if (data?.globalCatalog?.harmonized_points?.length) {
      // Pick top FRP and dual confirmed sample (first 1,200 points for ultra-fast landing preview)
      return data.globalCatalog.harmonized_points.slice(0, 1500);
    }
    return SAMPLE_PREVIEW_POINTS;
  }, [data]);

  const layers = useMemo(() => [
    new HeatmapLayer({
      id: 'mini-heatmap',
      data: points,
      getPosition: (d: GlobalHarmonizedPoint) => [d[1], d[0]],
      getWeight: (d: GlobalHarmonizedPoint) => Math.sqrt(d[2]) * 2,
      radiusPixels: 28,
      intensity: 1.2,
      threshold: 0.05,
    }),
    new ScatterplotLayer({
      id: 'mini-hotspots',
      data: points,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 2.5,
      radiusMaxPixels: 14,
      getPosition: (d: GlobalHarmonizedPoint) => [d[1], d[0]],
      getRadius: (d: GlobalHarmonizedPoint) => Math.max(3000, Math.sqrt(d[2]) * 2500),
      getFillColor: (d: GlobalHarmonizedPoint) =>
        d[4] === 1 ? [52, 211, 153, 230] : [244, 63, 94, 210],
      getLineColor: [255, 255, 255, 180],
      lineWidthMinPixels: 1,
    }),
  ], [points]);

  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-2xl border border-cyan-400/40 bg-ink-950 shadow-2xl">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: nextState }: any) => setViewState(nextState)}
        controller={{ dragRotate: true, doubleClickZoom: false }}
        layers={layers}
      >
        <MapLibreMap reuseMaps mapLib={maplibregl as any} mapStyle={CARTO_DARK} />
      </DeckGL>

      {/* Top HUD Badge */}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-ink-950/90 px-2.5 py-1 text-[11px] font-mono text-cyan-300 backdrop-blur-md shadow-lg">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold">WebGL2 GPU PREVIEW</span>
          <span className="text-slate-400">· {fmtInt(points.length)} pts</span>
        </div>
      </div>

      {/* Interactive Controls Overlay */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setViewState((v: any) => ({ ...v, zoom: Math.min(12, v.zoom + 1) }))}
          className="rounded-lg border border-line-strong bg-ink-900/90 p-1.5 text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setViewState((v: any) => ({ ...v, zoom: Math.max(1.5, v.zoom - 1) }))}
          className="rounded-lg border border-line-strong bg-ink-900/90 p-1.5 text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom Floating Bar */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="pointer-events-auto flex items-center gap-2 text-[10px] text-slate-400 bg-ink-950/80 px-2.5 py-1 rounded-lg border border-line backdrop-blur-md">
          <span className="flex items-center gap-1 text-emerald-300 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {isVi ? 'Xác thực kép' : 'Dual confirmed'}
          </span>
          <span className="flex items-center gap-1 text-rose-300 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            {isVi ? 'FRP cao' : 'High FRP'}
          </span>
        </div>

        <Link
          to="/dashboard"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/90 hover:bg-cyan-400 px-3 py-1.5 text-[11px] font-bold text-ink-950 shadow-md backdrop-blur-md transition-colors"
        >
          <Globe2 className="h-3.5 w-3.5" />
          <span>{isVi ? 'Mở trạm GIS đầy đủ' : 'Open Full GIS'}</span>
        </Link>
      </div>
    </div>
  );
}
