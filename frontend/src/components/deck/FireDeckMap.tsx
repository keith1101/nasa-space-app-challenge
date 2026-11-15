import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import MapLibreMap from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import {
  Compass,
  Crosshair,
  Flame,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sparkles,
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
import { buildWildfire3DColumns, buildRisk3DColumns } from './layers/wildfire3dLayers';

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
  className?: string;
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
  className,
}: FireDeckMapProps) {
  const t = TRANSLATIONS[lang];
  const { is3DMode, terrainEnabled, terrainExaggeration } = useUiStore();
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

  // Dynamically sync projection (Globe vs Mercator) with MapLibre GL v6
  useEffect(() => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (map && typeof map.setProjection === 'function') {
      try {
        map.setProjection({ type: is3DMode ? 'globe' : 'mercator' });
      } catch (err) {
        console.warn('Map projection sync notice:', err);
      }
    }
  }, [is3DMode]);

  // Dynamically configure 3D Raster-DEM Terrain on the Globe
  useEffect(() => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (!map) return;
    try {
      if (is3DMode && terrainEnabled) {
        if (!map.getSource('terrarium-dem')) {
          map.addSource('terrarium-dem', {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256,
            encoding: 'terrarium',
            maxzoom: 14,
          });
        }
        if (typeof map.setTerrain === 'function') {
          map.setTerrain({ source: 'terrarium-dem', exaggeration: terrainExaggeration });
        }
      } else {
        if (typeof map.setTerrain === 'function') {
          map.setTerrain(null);
        }
      }
    } catch (err) {
      console.warn('Terrain DEM setup notice:', err);
    }
  }, [is3DMode, terrainEnabled, terrainExaggeration]);

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

  // Fly to country if selected
  const handleCountryFlyTo = useCallback((c: GlobalCountryInfo) => {
    setViewState((prev: any) => ({
      ...prev,
      latitude: c.center[0],
      longitude: c.center[1],
      zoom: 4.5,
      transitionDuration: 1200,
    }));
  }, []);

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
          getLineColor: [56, 189, 248, 70],
          getFillColor: (feature: any) => {
            const props = feature.properties || {};
            const countryId = props.id ?? props.country_id;
            if (selectedCountryId != null && countryId === selectedCountryId) {
              return [56, 189, 248, 50];
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

    // 3D Extruded Fire Columns (Only when 3D Globe Mode is enabled)
    if (is3DMode && (layerMode === 'hotspots' || layerMode === 'both')) {
      const colLayer = buildWildfire3DColumns(
        globalPoints,
        true,
        (info: any) => {
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
        (info: any) => {
          if (info.object) {
            onSelectGlobalPoint(info.object as GlobalHarmonizedPoint);
          }
        }
      );
      if (colLayer) activeLayers.push(colLayer);
    }

    // 4. Highlight Ring for Selected Global Point
    if (selectedGlobalPoint) {
      activeLayers.push(
        new ScatterplotLayer({
          id: 'selected-fire-ring',
          data: [selectedGlobalPoint],
          getPosition: (d: GlobalHarmonizedPoint) => [d[1], d[0]],
          stroked: true,
          filled: false,
          radiusMinPixels: 12,
          radiusMaxPixels: 35,
          lineWidthMinPixels: 3,
          getLineColor: [56, 189, 248, 255],
        }),
      );
    }

    // 5. Experimental Risk Grid Cells (if any)
    const activeRiskCells = riskCells.filter((c) => c.horizon_hours === riskHorizon);
    if (activeRiskCells.length > 0) {
      if (is3DMode) {
        const riskColLayer = buildRisk3DColumns(activeRiskCells, true, riskHorizon);
        if (riskColLayer) activeLayers.push(riskColLayer);
      } else {
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
    countries,
    onSelectCountry,
    onSelectGlobalPoint,
    handleCountryFlyTo,
    hoverInfo?.point,
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
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: nextState }: any) => setViewState(nextState)}
        controller={{ doubleClickZoom: false, dragRotate: true }}
        layers={layers}
        getCursor={({ isHovering }: any) => (isHovering ? 'pointer' : 'grab')}
      >
        <MapLibreMap
          ref={mapRef}
          reuseMaps
          mapLib={maplibregl as any}
          mapStyle={basemapStyle === 'satellite' ? ESRI_SATELLITE_STYLE : CARTO_DARK}
        />
      </DeckGL>

      {/* 3D Globe & Elevation Terrain Controls */}
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
      />

      {/* Top Map HUD Overlay Header */}
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
            <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-400/30">
              {selectedCountry.name}
            </span>
          )}
        </div>

        {/* Layer Mode Switcher */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-line-strong bg-ink-900/90 p-1 backdrop-blur-md shadow-lg">
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
      </div>

      {/* Interactive Tooltip Card */}
      {hoverInfo && tooltipCoords && (
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

      {/* Floating Control Buttons (Bottom Right) */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2">
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
      </div>

      {/* Bottom Left Legend */}
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
      </div>
    </div>
  );
}
