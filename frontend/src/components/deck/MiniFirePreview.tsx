import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import MapLibreMap, { useControl } from 'react-map-gl/maplibre';
import { MapLibreOverlay } from '@deck.gl/maplibre';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import * as maplibregl from 'maplibre-gl';
import { Globe2, ZoomIn, ZoomOut, Play, Pause, Layers, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { GlobalHarmonizedPoint } from '../../types/harmonization';
import { useGlobalDatasetsQuery } from '../../hooks/useQueries';
import { fmtInt } from '../../lib/format';

const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const ESRI_SATELLITE_STYLE: any = {
  version: 8,
  sources: {
    'esri-world-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    {
      id: 'esri-imagery-layer',
      type: 'raster',
      source: 'esri-world-imagery',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const INITIAL_VIEW_STATE = {
  latitude: 10.0,
  longitude: 40.0,
  zoom: 1.6,
  pitch: 45,
  bearing: 0,
  maxZoom: 10,
  minZoom: 1,
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
  [-15.78, -47.92, 72.0, 97, 1, 3, 21], // Cerrado Brazil
  [0.51, 101.44, 61.0, 95, 1, 3, 70],   // Sumatra Indonesia
  [53.72, -127.64, 55.0, 94, 1, 3, 31], // British Columbia
  [-19.01, 29.15, 68.0, 96, 1, 3, 182], // Zimbabwe
];

function DeckGLOverlay({ layers }: { layers: any[] }) {
  const overlay = useControl<MapLibreOverlay>(() => new MapLibreOverlay({
    interleaved: false,
    layers,
  }));

  useEffect(() => {
    overlay.setProps({ layers });
  }, [overlay, layers]);

  return null;
}

export function MiniFirePreview({ isVi: _isVi }: { isVi?: boolean } = {}) {
  const { data } = useGlobalDatasetsQuery();
  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState<any>(INITIAL_VIEW_STATE);
  const [basemap, setBasemap] = useState<'satellite' | 'dark'>('satellite');
  const [isRotating, setIsRotating] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const points = useMemo(() => {
    if (data?.globalCatalog?.harmonized_points?.length) {
      return data.globalCatalog.harmonized_points.slice(0, 2000);
    }
    return SAMPLE_PREVIEW_POINTS;
  }, [data]);

  // Synchronize 3D Globe Projection
  const applyGlobeProjection = useCallback(() => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (map && typeof map.setProjection === 'function') {
      try {
        map.setProjection({ type: 'globe' });
      } catch (err) {
        console.warn('Mini globe projection warning:', err);
      }
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (!map) return;

    applyGlobeProjection();
    map.on('style.load', applyGlobeProjection);
    return () => {
      map.off('style.load', applyGlobeProjection);
    };
  }, [applyGlobeProjection, basemap]);

  // Auto-Orbital Rotation Animation
  useEffect(() => {
    if (!isRotating || isHovered) return;

    let frameId: number;
    let lastTime = performance.now();

    const step = (currentTime: number) => {
      const dt = currentTime - lastTime;
      if (dt >= 40) {
        setViewState((prev: any) => ({
          ...prev,
          longitude: ((prev.longitude + 0.12 + 180) % 360) - 180,
        }));
        lastTime = currentTime;
      }
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isRotating, isHovered]);

  const layers = useMemo(() => [
    // 1. Heatmap density aura
    new HeatmapLayer({
      id: 'mini-heatmap',
      data: points,
      getPosition: (d: GlobalHarmonizedPoint) => [d[1], d[0]],
      getWeight: (d: GlobalHarmonizedPoint) => Math.sqrt(d[2]) * 2,
      radiusPixels: 30,
      intensity: 1.2,
      threshold: 0.05,
    }),
    // 2. Base glowing hotspots
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
        d[4] === 1 ? [52, 211, 153, 230] : [244, 63, 94, 220],
      getLineColor: [255, 255, 255, 180],
      lineWidthMinPixels: 1,
    }),
  ], [points]);

  return (
    <div
      className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-cyan-400/40 bg-ink-950 shadow-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <MapLibreMap
        ref={mapRef}
        {...viewState}
        onMove={(evt: any) => {
          setViewState(evt.viewState);
          setIsRotating(false);
        }}
        reuseMaps
        mapLib={maplibregl as any}
        mapStyle={basemap === 'satellite' ? ESRI_SATELLITE_STYLE : CARTO_DARK}
        style={{ width: '100%', height: '100%' }}
        maxPitch={85}
        dragRotate={true}
      >
        <DeckGLOverlay layers={layers} />
      </MapLibreMap>

      {/* Top HUD Badge */}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-ink-950/90 px-2.5 py-1 text-[11px] font-mono text-cyan-300 backdrop-blur-md shadow-lg">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold">3D GLOBE ENGINE</span>
          <span className="text-slate-400">· {fmtInt(points.length)} pts</span>
        </div>
      </div>

      {/* Interactive Controls Overlay */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setViewState((v: any) => ({ ...v, zoom: Math.min(10, v.zoom + 0.8) }))}
          className="rounded-lg border border-line-strong bg-ink-900/90 p-1.5 text-slate-300 hover:text-white transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setViewState((v: any) => ({ ...v, zoom: Math.max(1, v.zoom - 0.8) }))}
          className="rounded-lg border border-line-strong bg-ink-900/90 p-1.5 text-slate-300 hover:text-white transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setIsRotating((r) => !r)}
          className={`rounded-lg border border-line-strong bg-ink-900/90 p-1.5 transition-colors ${
            isRotating ? 'text-cyan-400 border-cyan-400/40' : 'text-slate-400 hover:text-white'
          }`}
          title={isRotating ? 'Pause Orbit Rotation' : 'Start Orbit Rotation'}
          aria-label="Toggle Orbit Rotation"
        >
          {isRotating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setBasemap((b) => (b === 'satellite' ? 'dark' : 'satellite'))}
          className="rounded-lg border border-line-strong bg-ink-900/90 p-1.5 text-slate-300 hover:text-white transition-colors"
          title={basemap === 'satellite' ? 'Switch to Carto Dark' : 'Switch to Esri Satellite'}
          aria-label="Toggle Basemap"
        >
          <Layers className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setViewState(INITIAL_VIEW_STATE);
            setIsRotating(true);
          }}
          className="rounded-lg border border-line-strong bg-ink-900/90 p-1.5 text-slate-300 hover:text-white transition-colors"
          title="Reset Camera"
          aria-label="Reset Camera"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom Floating Bar */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="pointer-events-auto flex items-center gap-2 text-[10px] text-slate-300 bg-ink-950/85 px-2.5 py-1 rounded-lg border border-line backdrop-blur-md">
          <span className="flex items-center gap-1 text-emerald-300 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Dual confirmed
          </span>
          <span className="flex items-center gap-1 text-rose-300 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            3D Fire Pillar
          </span>
        </div>

        <Link
          to="/dashboard"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-3 py-1.5 text-[11px] font-bold text-ink-950 shadow-md backdrop-blur-md transition-colors"
        >
          <Globe2 className="h-3.5 w-3.5" />
          <span>Open Full GIS</span>
        </Link>
      </div>
    </div>
  );
}
