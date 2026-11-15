import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import MapLibreMap, { useControl } from 'react-map-gl/maplibre';
import { MapLibreOverlay } from '@deck.gl/maplibre';
import { ScatterplotLayer, GeoJsonLayer, PathLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Register MapLibre GL v6 Web Worker URL for Vite bundler
if (typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl(maplibreWorkerUrl);
}
import {
  Compass,
  Crosshair,
  Flame,
  Layers,
  Plane,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Maximize2,
  Minimize2,
  Navigation,
  X,
} from 'lucide-react';
import type { Language } from '../../lib/i18n';
import { TRANSLATIONS } from '../../lib/i18n';
import { fmtNum, fmtInt } from '../../lib/format';
import type {
  GlobalCountryInfo,
  GlobalHarmonizedPoint,
  WorldCountriesCollection,
} from '../../types/harmonization';
import { cx } from '../ui';
import { Tooltip } from '../ui/Tooltip';
import { useUiStore } from '../../stores/useUiStore';
import { GlobeControls } from './GlobeControls';
import { useFlightSimulator } from '../../hooks/useFlightSimulator';
import { CockpitHUD } from './CockpitHUD';
import { buildWildfireParticleSmokeLayers } from './layers/particleSmokeLayers';

export type RiskCell = {
  latitude: number;
  longitude: number;
  lat_half_size: number;
  lon_half_size: number;
  horizon_hours: number;
  relative_risk: number;
};

export type LayerMode = 'hotspots' | 'density' | 'both';

export interface FireDeckMapProps {
  lang: Language;
  worldCountriesGeojson?: WorldCountriesCollection;
  countries: GlobalCountryInfo[];
  selectedCountryId: number | null;
  onSelectCountry: (countryId: number | null) => void;
  basemapStyle: 'dark' | 'satellite';
  onToggleBasemap?: () => void;
  globalPoints: GlobalHarmonizedPoint[];
  selectedGlobalPoint: GlobalHarmonizedPoint | null;
  onSelectGlobalPoint: (pt: GlobalHarmonizedPoint | null) => void;
  riskCells?: RiskCell[];
  riskHorizon?: number;
  multiHorizonSize?: Record<string, {
    horizon_hours: number;
    expected_area_km2: number;
    expected_area_ha: number;
    high_risk_cells: number;
    active_perimeter_cells: number;
    persistence_confidence: number;
    threat_milestone: string;
  }>;
  className?: string;
  onScrambleRef?: (scrambleFn: (point?: GlobalHarmonizedPoint | null) => void) => void;
}

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
  latitude: 20,
  longitude: 10,
  zoom: 1.8,
  pitch: 0,
  bearing: 0,
  maxZoom: 18,
  minZoom: 1,
};

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

export function FireDeckMap({
  lang,
  worldCountriesGeojson,
  countries,
  selectedCountryId,
  onSelectCountry,
  basemapStyle,
  onToggleBasemap,
  globalPoints,
  selectedGlobalPoint,
  onSelectGlobalPoint,
  riskCells = [],
  riskHorizon = 24,
  multiHorizonSize,
  className,
  onScrambleRef,
}: FireDeckMapProps) {
  const t = TRANSLATIONS[lang];
  const {
    is3DMode,
    set3DMode,
    terrainEnabled,
    terrainExaggeration,
    isMapFullscreen,
    toggleMapFullscreen,
    setMapFullscreen,
  } = useUiStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState<any>(INITIAL_VIEW_STATE);
  const [layerMode, setLayerMode] = useState<LayerMode>('both');
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    point?: GlobalHarmonizedPoint;
    country?: any;
  } | null>(null);

  // Stable elevation sampling from Terrarium DEM
  const getTerrainElevation = useCallback((lng: number, lat: number) => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (map && typeof map.queryTerrainElevation === 'function') {
      try {
        const elev = map.queryTerrainElevation([lng, lat]);
        if (typeof elev === 'number' && !isNaN(elev)) {
          return elev;
        }
      } catch {
        // Terrarium elevation tile not yet decoded for this coordinate
      }
    }
    return null;
  }, []);

  const handleViewStateChange = useCallback((newVs: {
    latitude: number;
    longitude: number;
    altitude?: number;
    pitch: number;
    bearing: number;
    zoom: number;
  }) => {
    setViewState((prev: any) => ({
      ...prev,
      latitude: newVs.latitude,
      longitude: newVs.longitude,
      pitch: newVs.pitch,
      bearing: newVs.bearing,
      zoom: newVs.zoom,
      transitionDuration: 0, // 60 FPS real-time
    }));
  }, []);

  // Initialize 3D Flight Simulation Engine
  const {
    flightState,
    cockpitInstruments,
    startMission,
    startFreeFlight,
    stopMission,
    toggleFlightMode,
    isFlying,
  } = useFlightSimulator({
    nearbyHotspots: globalPoints,
    onViewStateChange: handleViewStateChange,
    getTerrainElevation,
    onToggleFullscreen: toggleMapFullscreen,
  });

  const handleExitFlight = useCallback(() => {
    stopMission();
    setMapFullscreen(false);
    setViewState((prev: any) => ({
      ...prev,
      pitch: is3DMode ? 45 : 0,
      zoom: Math.min(prev.zoom || 14, 8),
      transitionDuration: 800,
    }));
  }, [stopMission, is3DMode, setMapFullscreen]);

  const handleScrambleMission = useCallback(
    (pointOverride?: GlobalHarmonizedPoint | null) => {
      const targetPoint =
        pointOverride ||
        selectedGlobalPoint ||
        (globalPoints.length > 0
          ? globalPoints.reduce((max, p) => (p[2] > max[2] ? p : max), globalPoints[0])
          : ([12.65, 108.15, 35.0, 0.9, 1, 3, 0] as GlobalHarmonizedPoint));
      if (!targetPoint) return;

      if (!is3DMode) {
        set3DMode(true);
      }
      setMapFullscreen(true);

      const sampledElev = getTerrainElevation(targetPoint[1], targetPoint[0]);

      startMission(
        targetPoint[0],
        targetPoint[1],
        targetPoint[2],
        `Wildfire Hotspot (FRP ${targetPoint[2].toFixed(1)} MW)`,
        sampledElev ?? undefined
      );
    },
    [selectedGlobalPoint, globalPoints, is3DMode, set3DMode, setMapFullscreen, startMission, getTerrainElevation]
  );

  const handleStartFreeFlight = useCallback(() => {
    if (!is3DMode) {
      set3DMode(true);
    }
    setMapFullscreen(true);
    const currentLat = viewState.latitude || 12.65;
    const currentLon = viewState.longitude || 108.15;
    const currentBearing = viewState.bearing || 45;
    const elev = getTerrainElevation(currentLon, currentLat);
    startFreeFlight(currentLat, currentLon, currentBearing, elev ?? undefined);
  }, [viewState, is3DMode, set3DMode, setMapFullscreen, startFreeFlight, getTerrainElevation]);

  // Resize WebGL map canvas smoothly on fullscreen toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
      if (map && typeof map.resize === 'function') {
        map.resize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isMapFullscreen]);

  // Global Fullscreen shortcut 'F' & 'Esc' when in map view
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleMapFullscreen();
      } else if (e.key === 'Escape' && isMapFullscreen && !isFlying) {
        setMapFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleMapFullscreen, setMapFullscreen, isMapFullscreen, isFlying]);

  useEffect(() => {
    if (onScrambleRef) {
      onScrambleRef(handleScrambleMission);
    }
  }, [onScrambleRef, handleScrambleMission]);

  // Sync Camera Angle when toggling 2D / 3D Globe Mode
  useEffect(() => {
    setViewState((prev: any) => ({
      ...prev,
      pitch: is3DMode ? 45 : 0,
      bearing: is3DMode ? prev.bearing : 0,
      maxPitch: is3DMode ? 85 : 60,
      transitionDuration: 1000,
    }));
  }, [is3DMode]);

  // Dynamically sync projection (Globe vs Mercator) and 3D Raster-DEM Terrain with MapLibre GL v6
  useEffect(() => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (!map) return;

    const DEM_SOURCE_ID = 'terrarium-dem';

    const syncProjectionAndTerrain = () => {
      // 1. Sync projection (Globe in 3D Mode, Mercator in 2D Mode)
      if (typeof map.setProjection === 'function') {
        try {
          map.setProjection({ type: is3DMode ? 'globe' : 'mercator' });
        } catch (err) {
          console.warn('Map projection sync notice:', err);
        }
      }

      // 2. Sync 3D Raster-DEM elevation terrain
      try {
        if (is3DMode && terrainEnabled) {
          if (!map.getSource(DEM_SOURCE_ID)) {
            map.addSource(DEM_SOURCE_ID, {
              type: 'raster-dem',
              tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
              tileSize: 512,
              encoding: 'terrarium',
              maxzoom: 14,
            });
          }
          if (typeof map.setTerrain === 'function') {
            map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: terrainExaggeration });
          }
          if (!map.getLayer('terrain-hillshade')) {
            map.addLayer({
              id: 'terrain-hillshade',
              type: 'hillshade',
              source: DEM_SOURCE_ID,
              paint: {
                'hillshade-exaggeration': 0.6,
                'hillshade-shadow-color': '#020617',
                'hillshade-highlight-color': '#ffffff',
                'hillshade-illumination-anchor': 'viewport',
              },
            });
          }
        } else {
          if (typeof map.setTerrain === 'function') {
            map.setTerrain(null);
          }
          if (map.getLayer('terrain-hillshade')) {
            map.removeLayer('terrain-hillshade');
          }
        }
      } catch (err) {
        console.warn('Terrain DEM setup notice:', err);
      }
    };

    if (map.isStyleLoaded()) {
      syncProjectionAndTerrain();
    }
    map.on('style.load', syncProjectionAndTerrain);
    return () => {
      map.off('style.load', syncProjectionAndTerrain);
    };
  }, [is3DMode, terrainEnabled, terrainExaggeration, basemapStyle]);

  // Quick country lookup using Map
  const countryMap = useMemo(() => {
    const map = new Map<number, GlobalCountryInfo>();
    for (const c of countries) {
      map.set(c.id, c);
    }
    return map;
  }, [countries]);

  // Selected country object
  const selectedCountry = useMemo(() => {
    if (selectedCountryId == null) return null;
    return countryMap.get(selectedCountryId) || null;
  }, [selectedCountryId, countryMap]);

  // Fly to country if selected with adaptive zoom based on geographic bounding box
  const handleCountryFlyTo = useCallback((c: GlobalCountryInfo) => {
    let zoom = 4.5;
    if (c.bounds && Array.isArray(c.bounds) && c.bounds.length === 2) {
      const latSpan = Math.abs(c.bounds[1][0] - c.bounds[0][0]);
      const lonSpan = Math.abs(c.bounds[1][1] - c.bounds[0][1]);
      const maxSpan = Math.max(latSpan, lonSpan, 0.8);
      // Adaptive zoom: map span to WebGL zoom level (2.2 for continental giants down to 6.8 for small territories)
      zoom = Math.min(6.8, Math.max(2.2, Math.round((Math.log2(360 / maxSpan) + 0.2) * 10) / 10));
    }
    setViewState((prev: any) => ({
      ...prev,
      latitude: c.center[0],
      longitude: c.center[1],
      zoom,
      transitionDuration: 1200,
    }));
  }, []);

  // Auto-fly camera to country whenever selectedCountryId changes from UI filter or dropdown
  useEffect(() => {
    if (selectedCountry) {
      handleCountryFlyTo(selectedCountry);
    }
  }, [selectedCountryId, handleCountryFlyTo]);

  // Reset view to global
  const handleResetView = useCallback(() => {
    onSelectCountry(null);
    onSelectGlobalPoint(null);
    setViewState((prev: any) => ({
      ...prev,
      latitude: 20,
      longitude: 10,
      zoom: 1.8,
      pitch: 0,
      bearing: 0,
      transitionDuration: 1000,
    }));
  }, [onSelectCountry, onSelectGlobalPoint]);

  // Spotlight peak fire event
  const handleSpotlight = useCallback(() => {
    if (globalPoints.length === 0) return;
    // Find dual confirmed event with maximum FRP
    let topPoint: GlobalHarmonizedPoint = globalPoints[0];
    for (const pt of globalPoints) {
      if (pt[4] === 1 && pt[2] > topPoint[2]) {
        topPoint = pt;
      }
    }
    onSelectGlobalPoint(topPoint);
    setViewState((prev: any) => ({
      ...prev,
      latitude: topPoint[0],
      longitude: topPoint[1],
      zoom: 7.5,
      pitch: 35,
      transitionDuration: 1500,
    }));
  }, [globalPoints, onSelectGlobalPoint]);

  // Deck.gl Layers
  const layers = useMemo(() => {
    const activeLayers: any[] = [];

    // 1. World Country Boundaries Polygon Layer
    if (worldCountriesGeojson) {
      activeLayers.push(
        new GeoJsonLayer({
          id: 'world-country-boundaries',
          data: worldCountriesGeojson as any,
          pickable: true,
          stroked: true,
          filled: true,
          lineWidthMinPixels: 1,
          getLineColor: (feature: any) => {
            const props = feature.properties || {};
            const name = (props.NAME || props.ADMIN || '').toLowerCase();
            const isSelected = selectedCountry && selectedCountry.name.toLowerCase() === name;
            return isSelected ? [34, 211, 238, 255] : [56, 189, 248, 70];
          },
          getLineWidth: (feature: any) => {
            const props = feature.properties || {};
            const name = (props.NAME || props.ADMIN || '').toLowerCase();
            const isSelected = selectedCountry && selectedCountry.name.toLowerCase() === name;
            return isSelected ? 3 : 1;
          },
          getFillColor: (feature: any) => {
            const props = feature.properties || {};
            const name = (props.NAME || props.ADMIN || '').toLowerCase();
            const isSelected = selectedCountry && selectedCountry.name.toLowerCase() === name;
            if (isSelected) {
              return [56, 189, 248, 65];
            }
            return [15, 23, 42, 25];
          },
          onHover: (info) => {
            if (info.object) {
              setHoverInfo({
                x: info.x,
                y: info.y,
                country: (info.object as any).properties,
              });
            } else if (!hoverInfo?.point) {
              setHoverInfo(null);
            }
          },
          onClick: (info) => {
            if (info.object) {
              const p = (info.object as any).properties || {};
              const match = countries.find(
                (c) => c.name.toLowerCase() === (p.NAME || p.ADMIN || '').toLowerCase(),
              );
              if (match) {
                onSelectCountry(match.id);
                handleCountryFlyTo(match);
              }
            }
          },
        }),
      );
    }

    // 2. Heatmap Density Aggregation Layer (WebGL2 GPU)
    if (layerMode === 'density' || layerMode === 'both') {
      activeLayers.push(
        new HeatmapLayer({
          id: 'fire-density-layer',
          data: globalPoints,
          getPosition: (d: GlobalHarmonizedPoint) => [d[1], d[0]],
          getWeight: (d: GlobalHarmonizedPoint) => Math.min(100, Math.sqrt(d[2]) * 2.5),
          radiusPixels: 35,
          intensity: 1.1,
          threshold: 0.05,
          colorRange: [
            [11, 22, 44, 25],
            [3, 105, 161, 80],
            [2, 132, 199, 150],
            [245, 158, 11, 200],
            [239, 68, 68, 230],
            [185, 28, 28, 255],
          ],
        }),
      );
    }

    // 3. Hotspots Scatterplot Layer (Individual Fused Points)
    if (layerMode === 'hotspots' || layerMode === 'both') {
      activeLayers.push(
        new ScatterplotLayer({
          id: 'fire-hotspots-layer',
          data: globalPoints,
          pickable: true,
          opacity: 0.88,
          stroked: true,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 2.5,
          radiusMaxPixels: 20,
          lineWidthMinPixels: 1,
          getPosition: (d: GlobalHarmonizedPoint) => [d[1], d[0]],
          getRadius: (d: GlobalHarmonizedPoint) =>
            Math.max(2500, Math.min(30000, Math.sqrt(d[2]) * 3200)),
          getFillColor: (d: GlobalHarmonizedPoint) => {
            if (d[4] === 1) return [52, 211, 153, 230]; // Dual confirmed (Emerald)
            if (d[2] >= 25) return [251, 113, 133, 230]; // High FRP (Rose)
            if (d[2] >= 10) return [245, 158, 11, 210]; // Medium FRP (Amber)
            return [56, 189, 248, 190]; // Standard (Cyan)
          },
          getLineColor: (d: GlobalHarmonizedPoint) => {
            if (d[4] === 1) return [16, 185, 129, 255];
            if (d[2] >= 25) return [244, 63, 94, 255];
            return [255, 255, 255, 140];
          },
          onHover: (info) => {
            if (info.object) {
              setHoverInfo({
                x: info.x,
                y: info.y,
                point: info.object as GlobalHarmonizedPoint,
              });
            } else {
              setHoverInfo(null);
            }
          },
          onClick: (info) => {
            if (info.object) {
              const pt = info.object as GlobalHarmonizedPoint;
              onSelectGlobalPoint(pt);
            }
          },
        }),
      );
    }

    // 4. Concentric 3-Layer Spread Target for Selected Global Point
    // (Đỏ trong cùng [6h] / Cam ở giữa [12h] / Xanh bao trùm [24h])
    if (selectedGlobalPoint) {
      const lat = selectedGlobalPoint[0];
      const lon = selectedGlobalPoint[1];

      // Physical spread radius estimation in meters based on cellular automaton area or calibrated defaults
      const a6 = multiHorizonSize?.['6h']?.expected_area_km2 ?? 0.35;
      const a12 = multiHorizonSize?.['12h']?.expected_area_km2 ?? 1.5;
      const a24 = multiHorizonSize?.['24h']?.expected_area_km2 ?? 4.8;

      const r6M = Math.max(500, Math.round(Math.sqrt((a6 * 1_000_000) / Math.PI)));
      const r12M = Math.max(r6M * 1.6, Math.round(Math.sqrt((a12 * 1_000_000) / Math.PI)));
      const r24M = Math.max(r12M * 1.5, Math.round(Math.sqrt((a24 * 1_000_000) / Math.PI)));

      // 4.1. Layer 3 (24h): Xanh Bao Trùm (Outermost Emerald/Cyan Ring)
      activeLayers.push(
        new ScatterplotLayer({
          id: 'concentric-ring-24h-outer',
          data: [selectedGlobalPoint],
          getPosition: () => [lon, lat],
          radiusUnits: 'meters',
          getRadius: r24M,
          radiusMinPixels: 42,
          radiusMaxPixels: 130,
          stroked: true,
          filled: true,
          lineWidthMinPixels: riskHorizon === 24 ? 3.5 : 2,
          getLineColor: [16, 185, 129, 235], // Vivid Emerald Green
          getFillColor: [16, 185, 129, 22],  // Faint Green Spread Aura
          parameters: { depthTest: false },
        }),
      );

      // 4.2. Targeting Crosshairs for 24h outer containment boundary
      const latRad = (lat * Math.PI) / 180;
      const dLatDeg = r24M / 111320;
      const dLonDeg = r24M / (111320 * Math.max(0.1, Math.cos(latRad)));
      const crosshairs = [
        [[lon, lat + dLatDeg * 0.95], [lon, lat + dLatDeg * 1.25]], // North
        [[lon, lat - dLatDeg * 0.95], [lon, lat - dLatDeg * 1.25]], // South
        [[lon + dLonDeg * 0.95, lat], [lon + dLonDeg * 1.25, lat]], // East
        [[lon - dLonDeg * 0.95, lat], [lon - dLonDeg * 1.25, lat]], // West
      ];

      activeLayers.push(
        new PathLayer({
          id: 'concentric-ring-24h-crosshairs',
          data: crosshairs,
          getPath: (d: any) => d,
          getColor: [16, 185, 129, 240],
          getWidth: 2,
          widthMinPixels: 2,
          parameters: { depthTest: false },
        }),
      );

      // 4.3. Layer 2 (12h): Cam Ở Giữa (Middle Vivid Orange/Amber Ring)
      activeLayers.push(
        new ScatterplotLayer({
          id: 'concentric-ring-12h-middle',
          data: [selectedGlobalPoint],
          getPosition: () => [lon, lat],
          radiusUnits: 'meters',
          getRadius: r12M,
          radiusMinPixels: 26,
          radiusMaxPixels: 80,
          stroked: true,
          filled: true,
          lineWidthMinPixels: riskHorizon === 12 ? 4 : 2.5,
          getLineColor: [249, 115, 22, 245], // Intense Orange/Amber
          getFillColor: [249, 115, 22, 38],  // Warm Orange Spread Aura
          parameters: { depthTest: false },
        }),
      );

      // 4.4. Layer 1 (6h): Đỏ Trong Cùng (Innermost Crimson Red Core)
      activeLayers.push(
        new ScatterplotLayer({
          id: 'concentric-ring-6h-inner',
          data: [selectedGlobalPoint],
          getPosition: () => [lon, lat],
          radiusUnits: 'meters',
          getRadius: r6M,
          radiusMinPixels: 14,
          radiusMaxPixels: 42,
          stroked: true,
          filled: true,
          lineWidthMinPixels: riskHorizon === 6 ? 4.5 : 3,
          getLineColor: [239, 68, 68, 255], // Solid High-Visibility Crimson Red
          getFillColor: [239, 68, 68, 85],  // Saturated Red Fire Core
          parameters: { depthTest: false },
        }),
      );

      // 4.5. Inner Specular White Core Dot
      activeLayers.push(
        new ScatterplotLayer({
          id: 'concentric-ring-core-dot',
          data: [selectedGlobalPoint],
          getPosition: () => [lon, lat],
          radiusMinPixels: 3.5,
          radiusMaxPixels: 6,
          stroked: true,
          filled: true,
          lineWidthMinPixels: 1.5,
          getLineColor: [239, 68, 68, 255],
          getFillColor: [255, 255, 255, 255], // Pure White Heat Hotspot
          parameters: { depthTest: false },
        }),
      );
    }

    // 5. Experimental Risk Grid Cells (if any)
    const activeRiskCells = riskCells.filter((c) => c.horizon_hours === riskHorizon);
    if (activeRiskCells.length > 0) {
      activeLayers.push(
        new ScatterplotLayer({
          id: 'experimental-risk-grid',
          data: activeRiskCells,
          getPosition: (c: RiskCell) => [c.longitude, c.latitude],
          radiusMinPixels: 4,
          radiusMaxPixels: 15,
          filled: true,
          stroked: true,
          lineWidthMinPixels: 1,
          getFillColor: (c: RiskCell) => {
            const risk = c.relative_risk;
            if (risk >= 0.7) return [239, 68, 68, 180];
            if (risk >= 0.4) return [245, 158, 11, 160];
            return [52, 211, 153, 140];
          },
          getLineColor: [255, 255, 255, 180],
        }),
      );
    }

    // 6. Volumetric 3D Particle Smoke & Flame Plumes
    const targetFireForSmoke = isFlying
      ? flightState.targetFire
        ? { lat: flightState.targetFire.lat, lon: flightState.targetFire.lon, frp: flightState.targetFire.frp || 35 }
        : null
      : is3DMode && selectedGlobalPoint
      ? { lat: selectedGlobalPoint[0], lon: selectedGlobalPoint[1], frp: selectedGlobalPoint[2] }
      : null;

    const smokeGroundElev = isFlying ? Math.round(flightState.groundElevationMeters / 15) * 15 : 300;

    if (targetFireForSmoke) {
      const smokeLayers = buildWildfireParticleSmokeLayers(
        targetFireForSmoke,
        smokeGroundElev,
        225
      );
      activeLayers.push(...smokeLayers);
    }

    // 7. 3D Aerial Flight Corridor Ribbon & Waypoints (Synthetic Vision System)
    if (
      isFlying &&
      flightState.route &&
      flightState.route.waypoints &&
      flightState.route.waypoints.length > 0
    ) {
      const waypoints = flightState.route.waypoints;
      const originElev = (flightState.route.origin.elevation_ft || 100) * 0.3048;

      const corridorPath: [number, number, number][] = [
        [flightState.route.origin.longitude, flightState.route.origin.latitude, originElev + 10],
      ];
      for (const wp of waypoints) {
        corridorPath.push([wp.lon, wp.lat, wp.alt_m]);
      }

      // Add circular 3D orbit ring around target fire if present
      if (flightState.targetFire) {
        const orbitRadiusKm = 1.8;
        const orbitRadiusDeg = orbitRadiusKm / 111.139;
        const orbitAlt = (flightState.groundElevationMeters || 300) + 450;
        const orbitRing: [number, number, number][] = [];
        for (let i = 0; i <= 36; i++) {
          const theta = (i / 36) * 2 * Math.PI;
          orbitRing.push([
            flightState.targetFire.lon +
              (orbitRadiusDeg / Math.cos((flightState.targetFire.lat * Math.PI) / 180)) *
                Math.cos(theta),
            flightState.targetFire.lat + orbitRadiusDeg * Math.sin(theta),
            orbitAlt,
          ]);
        }
        corridorPath.push(...orbitRing);
      }

      activeLayers.push(
        new PathLayer({
          id: 'flight-corridor-path-3d',
          data: [{ path: corridorPath }],
          getPath: (d: any) => d.path,
          getColor: [34, 211, 238, 220], // Glowing neon cyan
          getWidth: 12,
          widthMinPixels: 3,
          widthMaxPixels: 8,
        })
      );
    }

    return activeLayers;
  }, [
    worldCountriesGeojson,
    globalPoints,
    layerMode,
    is3DMode,
    selectedCountryId,
    selectedGlobalPoint,
    riskCells,
    riskHorizon,
    multiHorizonSize,
    countries,
    onSelectCountry,
    onSelectGlobalPoint,
    handleCountryFlyTo,
    hoverInfo?.point,
    isFlying,
    flightState.targetFire,
    flightState.route,
    isFlying ? Math.round(flightState.groundElevationMeters / 15) : 0,
  ]);

  // Tooltip position clamped within container bounds to prevent overflow clipping
  const tooltipCoords = useMemo(() => {
    if (!hoverInfo) return null;
    const containerW = containerRef.current?.clientWidth ?? 800;
    const containerH = containerRef.current?.clientHeight ?? 600;
    const isNearRight = hoverInfo.x > containerW - 270;
    const x = isNearRight ? Math.max(12, hoverInfo.x - 260) : hoverInfo.x + 14;
    const y = Math.max(14, Math.min(containerH - 180, hoverInfo.y - 12));
    return { x, y };
  }, [hoverInfo]);

  return (
    <div
      ref={containerRef}
      className={cx(
        'relative h-full w-full overflow-hidden rounded-2xl border border-line-strong bg-ink-950 shadow-2xl',
        className,
      )}
    >
      <MapLibreMap
        ref={mapRef}
        {...viewState}
        keyboard={!isFlying}
        onMove={(evt: any) => {
          if (!isFlying) setViewState(evt.viewState);
        }}
        reuseMaps
        mapLib={maplibregl as any}
        mapStyle={basemapStyle === 'satellite' ? ESRI_SATELLITE_STYLE : CARTO_DARK}
        style={{ width: '100%', height: '100%' }}
        maxPitch={is3DMode ? 85 : 60}
        dragRotate={true}
      >
        <DeckGLOverlay layers={layers} />
      </MapLibreMap>

      {/* 3D Globe & Elevation Terrain Controls (Hidden during flight) */}
      {!isFlying && (
        <GlobeControls
          pitch={viewState.pitch || 0}
          bearing={viewState.bearing || 0}
          onResetNorth={() =>
            setViewState((prev: any) => ({
              ...prev,
              bearing: 0,
              pitch: is3DMode ? 45 : 0,
              transitionDuration: 600,
            }))
          }
          onSetCameraAngle={(pitch: number, bearing?: number) =>
            setViewState((prev: any) => ({
              ...prev,
              pitch,
              bearing: bearing !== undefined ? bearing : prev.bearing,
              transitionDuration: 800,
            }))
          }
          isFlying={isFlying}
          onScramble={() => handleScrambleMission()}
          onExitFlight={handleExitFlight}
          hasSelectedFire={!!selectedGlobalPoint}
        />
      )}

      {/* Top Map HUD Overlay Header (Hidden during flight to prevent cockpit overlap) */}
      {!isFlying && (
        <div className="pointer-events-none absolute left-4 top-4 right-4 flex items-center justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-line-strong bg-ink-900/90 px-3 py-1.5 backdrop-blur-md shadow-lg">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide">
              {lang === 'vi' ? 'Deck.gl WebGL2 Engine' : 'Deck.gl WebGL2 Engine'}
            </span>
            <span className="text-[11px] text-cyan-300 font-mono">
              {fmtInt(globalPoints.length)} {lang === 'vi' ? 'điểm' : 'hotspots'}
            </span>
            {selectedCountry && (
              <div className="flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-400/30">
                <span>{selectedCountry.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetView();
                  }}
                  className="hover:text-rose-400 transition-colors ml-0.5"
                  title={lang === 'vi' ? 'Hủy lọc quốc gia, xem toàn cảnh thế giới' : 'Reset country filter'}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Layer Mode Switcher */}
            <div className="flex items-center gap-1 rounded-xl border border-line-strong bg-ink-900/90 p-1 backdrop-blur-md shadow-lg">
              <Tooltip content={lang === 'vi' ? 'Hiển thị cả mật độ nhiệt và từng điểm cháy' : 'Show both density heatmap and individual hotspots'}>
                <button
                  type="button"
                  onClick={() => setLayerMode('both')}
                  className={cx(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5',
                    layerMode === 'both'
                      ? 'bg-cyan-500 text-ink-950 font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white',
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{lang === 'vi' ? 'Toàn bộ' : 'All'}</span>
                </button>
              </Tooltip>

              <Tooltip content={lang === 'vi' ? 'Chỉ hiển thị các điểm cháy đơn lẻ' : 'Show individual hotspot scatter points only'}>
                <button
                  type="button"
                  onClick={() => setLayerMode('hotspots')}
                  className={cx(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5',
                    layerMode === 'hotspots'
                      ? 'bg-cyan-500 text-ink-950 font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white',
                  )}
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>{lang === 'vi' ? 'Điểm cháy' : 'Hotspots'}</span>
                </button>
              </Tooltip>

              <Tooltip content={lang === 'vi' ? 'Chỉ hiển thị bản đồ nhiệt mật độ gom cụm' : 'Show aggregated density heatmap only'}>
                <button
                  type="button"
                  onClick={() => setLayerMode('density')}
                  className={cx(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5',
                    layerMode === 'density'
                      ? 'bg-cyan-500 text-ink-950 font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white',
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{lang === 'vi' ? 'Mật độ' : 'Density'}</span>
                </button>
              </Tooltip>
            </div>

            {/* Fullscreen Button */}
            <Tooltip content={isMapFullscreen ? (lang === 'vi' ? 'Thu nhỏ bản đồ (F)' : 'Exit Fullscreen (F)') : (lang === 'vi' ? 'Toàn màn hình bản đồ (F)' : 'Fullscreen Map (F)')}>
              <button
                type="button"
                onClick={toggleMapFullscreen}
                className={cx(
                  'rounded-xl border border-line-strong p-2 text-xs font-semibold transition-all flex items-center justify-center backdrop-blur-md shadow-lg',
                  isMapFullscreen
                    ? 'bg-cyan-500 text-ink-950 font-bold shadow-cyan-500/20'
                    : 'bg-ink-900/90 text-slate-300 hover:text-white hover:bg-ink-800'
                )}
                aria-label="Toggle Fullscreen"
              >
                {isMapFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* 3-Horizon Concentric Tactical Ring Badge on Top-Left */}
      {!isFlying && selectedGlobalPoint && (
        <div className="pointer-events-none absolute left-4 top-16 z-20 select-none">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-line-strong bg-ink-950/95 px-3 py-1.5 text-[11px] shadow-2xl backdrop-blur-md">
            <span className="font-bold text-slate-200">
              {lang === 'vi' ? '3 Vòng Lan Truyền:' : '3-Layer Spread:'}
            </span>
            <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="font-bold text-rose-400 font-mono">
                6h: {multiHorizonSize?.['6h'] ? `${multiHorizonSize['6h'].expected_area_ha} ha` : (lang === 'vi' ? 'Đỏ trong cùng' : 'Inner Red')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="font-bold text-orange-400 font-mono">
                12h: {multiHorizonSize?.['12h'] ? `${multiHorizonSize['12h'].expected_area_ha} ha` : (lang === 'vi' ? 'Cam ở giữa' : 'Middle Orange')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-bold text-emerald-300 font-mono">
                24h: {multiHorizonSize?.['24h'] ? `${multiHorizonSize['24h'].expected_area_ha} ha` : (lang === 'vi' ? 'Xanh bao trùm' : 'Outer Green')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Tooltip Card (Disabled during flight) */}
      {!isFlying && hoverInfo && tooltipCoords && (
        <div
          className="pointer-events-none absolute z-50 rounded-xl border border-cyan-400/40 bg-ink-950/95 p-3 text-xs text-white shadow-2xl backdrop-blur-md"
          style={{
            left: tooltipCoords.x,
            top: tooltipCoords.y,
          }}
        >
          {hoverInfo.point ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 border-b border-line pb-1">
                {hoverInfo.point[4] === 1 ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t.legendDual}
                  </span>
                ) : hoverInfo.point[2] >= 25 ? (
                  <span className="flex items-center gap-1 font-bold text-rose-300">
                    <Flame className="h-3.5 w-3.5" />
                    {t.legendMulti}
                  </span>
                ) : (
                  <span className="font-bold text-cyan-300">{t.legendStandard}</span>
                )}
              </div>
              <div className="font-mono text-[11px] text-slate-300 space-y-0.5">
                <div>
                  FRP:{' '}
                  <b className="text-white font-bold">{fmtNum(hoverInfo.point[2], 1)} MW</b>
                </div>
                <div>
                  {t.tooltipConf(String(hoverInfo.point[3]))}
                </div>
                <div>
                  {t.popupCoords} [{fmtNum(hoverInfo.point[0], 3)}, {fmtNum(hoverInfo.point[1], 3)}]
                </div>
                <div>
                  {t.popupRawDetail(hoverInfo.point[5])}
                </div>
                <div className="pt-1 text-[10px] text-cyan-400 font-sans font-semibold">
                  {lang === 'vi' ? 'Nhấp để xem chi tiết viễn thám' : 'Click to inspect detailed telemetry'}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScrambleMission(hoverInfo.point);
                    setHoverInfo(null);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-md hover:from-red-500 hover:to-amber-500 pointer-events-auto transition-all"
                >
                  <Plane className="h-3.5 w-3.5" />
                  <span>{lang === 'vi' ? 'Xuất Kích Cứu Hỏa (3D Flight)' : 'Scramble 3D Flight'}</span>
                </button>
              </div>
            </div>
          ) : hoverInfo.country ? (
            <div className="space-y-1">
              <div className="font-bold text-cyan-300 text-sm">
                {hoverInfo.country.NAME || hoverInfo.country.ADMIN || 'Quốc gia'}
              </div>
              <div className="text-[11px] text-slate-300">
                {hoverInfo.country.CONTINENT && <div>Châu lục: {hoverInfo.country.CONTINENT}</div>}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Floating Control Buttons (Bottom Right - Hidden during flight) */}
      {!isFlying && (
        <div className="absolute right-4 bottom-4 flex flex-col gap-2">
          {/* Fullscreen Map Button */}
          <Tooltip content={isMapFullscreen ? (lang === 'vi' ? 'Thu nhỏ bản đồ (F)' : 'Exit Fullscreen (F)') : (lang === 'vi' ? 'Toàn màn hình bản đồ (F)' : 'Fullscreen Map (F)')} side="left">
            <button
              type="button"
              onClick={toggleMapFullscreen}
              className={cx(
                "rounded-xl border border-line-strong p-2.5 text-slate-200 shadow-xl backdrop-blur-md transition-colors",
                isMapFullscreen
                  ? "bg-cyan-500 text-ink-950 font-bold hover:bg-cyan-400"
                  : "bg-ink-900/90 hover:bg-ink-800 hover:text-white"
              )}
              aria-label="Toggle Fullscreen Map"
            >
              {isMapFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </Tooltip>

          {onToggleBasemap && (
            <Tooltip
              content={basemapStyle === 'dark' ? (lang === 'vi' ? 'Chuyển sang ảnh vệ tinh Esri' : 'Switch to Esri World Imagery') : (lang === 'vi' ? 'Chuyển sang bản đồ tối CARTO' : 'Switch to CARTO Dark Matter')}
              side="left"
            >
              <button
                type="button"
                onClick={onToggleBasemap}
                className="rounded-xl border border-line-strong bg-ink-900/90 p-2.5 text-slate-200 shadow-xl backdrop-blur-md hover:bg-ink-800 hover:text-white transition-colors"
                aria-label="Toggle Basemap"
              >
                <Compass className="h-4 w-4" />
              </button>
            </Tooltip>
          )}

          <Tooltip content={t.spotlightTooltip} side="left">
            <button
              type="button"
              onClick={handleSpotlight}
              className="rounded-xl border border-cyan-400/40 bg-ink-900/90 p-2.5 text-cyan-300 shadow-xl backdrop-blur-md hover:bg-cyan-500/20 hover:text-white transition-colors"
              aria-label="Spotlight Major Fire"
            >
              <Crosshair className="h-4 w-4" />
            </button>
          </Tooltip>

          <Tooltip content={t.resetViewTooltip} side="left">
            <button
              type="button"
              onClick={handleResetView}
              className="rounded-xl border border-line-strong bg-ink-900/90 p-2.5 text-slate-200 shadow-xl backdrop-blur-md hover:bg-ink-800 hover:text-white transition-colors"
              aria-label="Reset Global View"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </Tooltip>

          <Tooltip content={lang === 'vi' ? 'Bay Tự Do Toàn Cầu (Free Flight FPV)' : 'Free Roam Flight Simulator (FPV)'} side="left">
            <button
              type="button"
              onClick={handleStartFreeFlight}
              className="rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 p-2.5 text-white shadow-xl shadow-cyan-600/30 backdrop-blur-md hover:from-cyan-500 hover:to-blue-500 transition-all"
              aria-label="Free Roam Flight Simulator"
            >
              <Navigation className="h-4 w-4" />
            </button>
          </Tooltip>

          <Tooltip content={lang === 'vi' ? 'Xuất kích cứu hỏa 3D tới điểm cháy' : 'Scramble 3D aerial firefighting flight'} side="left">
            <button
              type="button"
              onClick={() => handleScrambleMission()}
              className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 p-2.5 text-white shadow-xl shadow-red-600/30 backdrop-blur-md hover:from-red-500 hover:to-amber-500 transition-all"
              aria-label="Scramble Firefighting Flight"
            >
              <Plane className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Bottom Left Legend (Hidden during flight to prevent radar overlap) */}
      {!isFlying && (
        <div className="pointer-events-none absolute left-4 bottom-4 flex flex-col gap-1.5 rounded-xl border border-line-strong bg-ink-950/90 p-3 text-[11px] backdrop-blur-md shadow-xl text-slate-300">
          <span className="font-bold text-white tracking-wide">{t.legendTitle}</span>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 border border-emerald-300" />
            <span>{t.legendDual}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400 border border-rose-300" />
            <span>{t.legendMulti}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 border border-amber-300" />
            <span>{t.legendHighFrp}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 border border-cyan-300" />
            <span>{t.legendStandard}</span>
          </div>

          {/* Concentric 3-Layer Spread Legend when a fire point is selected */}
          {selectedGlobalPoint && (
            <div className="pt-2 border-t border-line/60 space-y-1.5">
              <span className="font-bold text-amber-300 text-[10px] uppercase tracking-wider block">
                {lang === 'vi' ? '3 Vòng Lan Truyền Trên Map' : '3-Layer Spread Concentric Rings'}
              </span>
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 border border-rose-300 shadow-sm shadow-rose-500/50" />
                  <span className="text-rose-300 font-semibold">{lang === 'vi' ? '6h (Đỏ trong cùng)' : '6h (Inner Red)'}</span>
                </div>
                {multiHorizonSize?.['6h'] && (
                  <span className="font-mono text-slate-300">{multiHorizonSize['6h'].expected_area_ha} ha</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 border border-orange-300 shadow-sm shadow-orange-500/50" />
                  <span className="text-orange-300 font-semibold">{lang === 'vi' ? '12h (Cam ở giữa)' : '12h (Middle Orange)'}</span>
                </div>
                {multiHorizonSize?.['12h'] && (
                  <span className="font-mono text-slate-300">{multiHorizonSize['12h'].expected_area_ha} ha</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 border border-emerald-300 shadow-sm shadow-emerald-400/50" />
                  <span className="text-emerald-300 font-semibold">{lang === 'vi' ? '24h (Xanh bao trùm)' : '24h (Outer Green)'}</span>
                </div>
                {multiHorizonSize?.['24h'] && (
                  <span className="font-mono text-slate-300">{multiHorizonSize['24h'].expected_area_ha} ha</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3D Cockpit Frame & HUD Instruments Overlay */}
      {isFlying && (
        <CockpitHUD
          flightState={flightState}
          instruments={cockpitInstruments}
          onExit={handleExitFlight}
          onToggleMode={toggleFlightMode}
          lang={lang}
          isFullscreen={isMapFullscreen}
          onToggleFullscreen={toggleMapFullscreen}
        />
      )}
    </div>
  );
}
