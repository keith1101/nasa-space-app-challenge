import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, RotateCcw } from 'lucide-react';
import { escapeHtml, fmtNum } from '../lib/format';
import type { Language } from '../lib/i18n';
import { TRANSLATIONS } from '../lib/i18n';
import type {
  GlobalCountryInfo,
  GlobalHarmonizedPoint,
} from '../types/harmonization';

const BASEMAPS: Record<'dark' | 'satellite', { url: string; attribution: string; maxZoom: number }> = {
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin &middot; NASA FIRMS EOSDIS',
    maxZoom: 16,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar &middot; NASA FIRMS EOSDIS',
    maxZoom: 18,
  },
};

export interface MapViewerProps {
  lang: Language;
  worldCountriesGeojson?: any;
  countries: GlobalCountryInfo[];
  selectedCountryId: number | null;
  onSelectCountry: (countryId: number | null) => void;
  basemapStyle: 'dark' | 'satellite';
  globalPoints: GlobalHarmonizedPoint[];
  selectedGlobalPoint: GlobalHarmonizedPoint | null;
  onSelectGlobalPoint: (pt: GlobalHarmonizedPoint | null) => void;
}

export function MapViewer({
  lang,
  worldCountriesGeojson,
  countries,
  selectedCountryId,
  onSelectCountry,
  basemapStyle,
  globalPoints,
  selectedGlobalPoint,
  onSelectGlobalPoint,
}: MapViewerProps) {
  const t = TRANSLATIONS[lang];
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const prevCountryRef = useRef<number | null>(selectedCountryId);
  const [spotlightIdx, setSpotlightIdx] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const hoverTooltipRef = useRef<L.Tooltip | null>(null);
  const countryLayerRef = useRef<L.GeoJSON | null>(null);
  const hoveredPointRef = useRef<GlobalHarmonizedPoint | null>(null);

  // Country lookup map by id
  const countryMap = useRef<Map<number, GlobalCountryInfo>>(new Map());
  useEffect(() => {
    countryMap.current.clear();
    for (const c of countries) {
      countryMap.current.set(c.id, c);
    }
  }, [countries]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [15.0, 10.0],
      zoom: 2,
      zoomControl: false,
      preferCanvas: true,
      minZoom: 2,
      maxZoom: 16,
    });

    const tileLayer = L.tileLayer(BASEMAPS[basemapStyle].url, {
      attribution: BASEMAPS[basemapStyle].attribution,
      maxZoom: BASEMAPS[basemapStyle].maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = BASEMAPS[basemapStyle];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    tileLayerRef.current.bringToBack();
  }, [basemapStyle]);

  // Update World Countries Boundary Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !worldCountriesGeojson) return;

    if (countryLayerRef.current) {
      map.removeLayer(countryLayerRef.current);
      countryLayerRef.current = null;
    }

    const selectedCountry = selectedCountryId != null ? countryMap.current.get(selectedCountryId) : null;
    const selectedName = selectedCountry ? selectedCountry.name : null;

    const layer = L.geoJSON(worldCountriesGeojson, {
      style: (feature) => {
        const props = feature?.properties || {};
        const name = (props.NAME || '').trim();
        const isSelected = selectedName === name;
        const fires = props.harmonized_fires || 0;

        return {
          fillColor: isSelected ? '#38bdf8' : fires > 3000 ? '#e11d48' : fires > 500 ? '#f59e0b' : '#0f172a',
          fillOpacity: isSelected ? 0.35 : fires > 0 ? 0.12 : 0.02,
          color: isSelected ? '#38bdf8' : '#334155',
          weight: isSelected ? 2.5 : 0.7,
          dashArray: isSelected ? '' : '3',
        };
      },
      onEachFeature: (feature, layerItem) => {
        const p = feature.properties || {};
        const name = escapeHtml(p.NAME || 'Unknown');
        const fires = p.harmonized_fires || 0;
        const frp = p.total_frp_mw || 0;

        layerItem.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const target = e.target as L.Path;
            target.setStyle({
              weight: 2,
              color: '#7dd3fc',
              fillOpacity: 0.25,
            });
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            layer.resetStyle(e.target as L.Path);
          },
          click: () => {
            const match = countries.find((c) => c.name === p.NAME);
            if (match) {
              onSelectCountry(match.id);
            }
          },
        });

        layerItem.bindTooltip(
          `<div class="text-xs font-sans">
            <div class="font-bold text-white">${name}</div>
            <div class="text-cyan-300 font-semibold">${t.countryTooltipFires(fires)}</div>
            <div class="text-amber-300 text-[11px]">${t.countryTooltipFRP(fmtNum(frp, 1))}</div>
          </div>`,
          { sticky: true, className: 'fm-tooltip' },
        );
      },
    }).addTo(map);

    countryLayerRef.current = layer;

    // Fly to country bounds if selected
    if (prevCountryRef.current !== selectedCountryId) {
      prevCountryRef.current = selectedCountryId;
      if (selectedCountry) {
        const bounds = L.latLngBounds(selectedCountry.bounds[0], selectedCountry.bounds[1]);
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 6, duration: 0.85 });
        } else {
          map.flyTo(selectedCountry.center, 5, { duration: 0.85 });
        }
      } else {
        map.flyTo([15.0, 10.0], 2, { duration: 0.8 });
      }
    }
  }, [worldCountriesGeojson, selectedCountryId, countries, onSelectCountry, t]);

  // =========================================================================
  // ENHANCED MULTI-SCALE ADAPTIVE CANVAS RENDERING (Seamless Zoom In/Out)
  // =========================================================================
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = L.DomUtil.create('canvas', 'leaflet-global-canvas');
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.pointerEvents = 'auto';
      canvas.style.zIndex = '400';
      map.getPanes().overlayPane.appendChild(canvas);
      canvasRef.current = canvas;
    }

    let animFrameId: number | null = null;

    const renderCanvas = () => {
      if (!canvas || !map) return;
      const size = map.getSize();
      const bounds = map.getBounds();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(size.x * dpr);
      canvas.height = Math.round(size.y * dpr);
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;

      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);

      const zoom = map.getZoom();

      // Smooth continuous scaling exponential function:
      // Zoom 2: ~1.2px | Zoom 4: ~2.0px | Zoom 6: ~3.3px | Zoom 8: ~5.3px | Zoom 10: ~8.6px | Zoom 12+: 12-16px
      const baseRadius = Math.max(1.15, 0.72 * Math.pow(1.275, zoom));

      // Sensor footprint ground calculation at high zoom (zoom >= 8)
      // Nadir VIIRS I-band is 375m ground resolution
      const metersPerPixel =
        zoom >= 8 ? (156543.03392 * Math.cos((bounds.getCenter().lat * Math.PI) / 180)) / Math.pow(2, zoom) : 1000;

      // Pass 1: Render Outer Glow Bloom (zoom >= 4)
      if (zoom >= 4) {
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < globalPoints.length; i++) {
          const pt = globalPoints[i];
          const lat = pt[0];
          const lon = pt[1];
          if (!bounds.contains([lat, lon])) continue;

          const containerPt = map.latLngToContainerPoint([lat, lon]);
          const frp = pt[2];
          const isDual = pt[4] === 1;

          const frpScale = Math.min(2.1, 0.95 + Math.log10(Math.max(1, frp)) * 0.28);
          const r = Math.min(24, baseRadius * frpScale);

          // Bloom halo radius
          const haloRadius = r * (zoom >= 8 ? 1.7 : 1.45);
          ctx.beginPath();
          ctx.arc(containerPt.x, containerPt.y, haloRadius, 0, Math.PI * 2);

          if (isDual) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
          } else if (frp >= 25) {
            ctx.fillStyle = 'rgba(244, 63, 94, 0.24)';
          } else if (frp >= 10) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.20)';
          } else {
            ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
          }
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      // Pass 2: Ground-Scale Footprint Rings at high zoom (zoom >= 9)
      if (zoom >= 9 && metersPerPixel > 0) {
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (let i = 0; i < globalPoints.length; i++) {
          const pt = globalPoints[i];
          const lat = pt[0];
          const lon = pt[1];
          if (!bounds.contains([lat, lon])) continue;

          const containerPt = map.latLngToContainerPoint([lat, lon]);
          const isDual = pt[4] === 1;

          // 375m ground radius in screen pixels
          const footprintPx = Math.max(baseRadius * 1.8, (375.0 / metersPerPixel) * 0.5);

          ctx.beginPath();
          ctx.arc(containerPt.x, containerPt.y, footprintPx, 0, Math.PI * 2);
          ctx.strokeStyle = isDual ? 'rgba(52, 211, 153, 0.5)' : 'rgba(251, 191, 36, 0.35)';
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Pass 3: Solid Sharp Core Hotspots with Contrast Outlines
      for (let i = 0; i < globalPoints.length; i++) {
        const pt = globalPoints[i];
        const lat = pt[0];
        const lon = pt[1];
        if (!bounds.contains([lat, lon])) continue;

        const containerPt = map.latLngToContainerPoint([lat, lon]);
        const frp = pt[2];
        const isDual = pt[4] === 1;

        const frpScale = Math.min(2.1, 0.95 + Math.log10(Math.max(1, frp)) * 0.28);
        const r = Math.min(24, baseRadius * frpScale);

        ctx.beginPath();
        ctx.arc(containerPt.x, containerPt.y, r, 0, Math.PI * 2);

        // Core fill colors
        if (isDual) {
          ctx.fillStyle = '#10b981'; // Glowing Emerald
        } else if (frp >= 25) {
          ctx.fillStyle = '#f43f5e'; // High FRP Rose
        } else if (frp >= 10) {
          ctx.fillStyle = '#f59e0b'; // Amber
        } else {
          ctx.fillStyle = '#fbbf24'; // Warm Gold
        }
        ctx.fill();

        // Sharp contrast stroke
        if (zoom >= 5) {
          ctx.lineWidth = zoom >= 9 ? 1.8 : 1.0;
          ctx.strokeStyle = isDual ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
          ctx.stroke();
        }

        // Inner specular white heat core for high FRP or dual verified
        if (zoom >= 7 && (isDual || frp >= 25)) {
          ctx.beginPath();
          ctx.arc(containerPt.x, containerPt.y, Math.max(1.5, r * 0.42), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }

      // Pass 4: Active Highlight Ring on Selected Global Point
      if (selectedGlobalPoint && bounds.contains([selectedGlobalPoint[0], selectedGlobalPoint[1]])) {
        const selPt = map.latLngToContainerPoint([selectedGlobalPoint[0], selectedGlobalPoint[1]]);
        const selRadius = Math.max(12, baseRadius * 2.2);

        // Pulsing selection ring
        ctx.beginPath();
        ctx.arc(selPt.x, selPt.y, selRadius, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#22d3ee'; // Bright Cyan
        ctx.stroke();

        // Crosshair marks
        ctx.beginPath();
        ctx.moveTo(selPt.x - selRadius - 5, selPt.y);
        ctx.lineTo(selPt.x - selRadius + 2, selPt.y);
        ctx.moveTo(selPt.x + selRadius - 2, selPt.y);
        ctx.lineTo(selPt.x + selRadius + 5, selPt.y);
        ctx.moveTo(selPt.x, selPt.y - selRadius - 5);
        ctx.lineTo(selPt.x, selPt.y - selRadius + 2);
        ctx.moveTo(selPt.x, selPt.y + selRadius - 2);
        ctx.lineTo(selPt.x, selPt.y + selRadius + 5);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
      }
    };

    const scheduleRender = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(renderCanvas);
    };

    // Helper: Find closest hotspot near (clickX, clickY)
    const findClosestPoint = (clickX: number, clickY: number, maxDistPx = 16): GlobalHarmonizedPoint | null => {
      let nearest: GlobalHarmonizedPoint | null = null;
      let minDistSq = maxDistPx * maxDistPx;

      for (let i = 0; i < globalPoints.length; i++) {
        const pt = globalPoints[i];
        const cPt = map.latLngToContainerPoint([pt[0], pt[1]]);
        const dx = cPt.x - clickX;
        const dy = cPt.y - clickY;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          nearest = pt;
        }
      }
      return nearest;
    };

    // Click handler: Open detailed popup
    const handleCanvasClick = (e: MouseEvent) => {
      if (!map || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const nearestPt = findClosestPoint(clickX, clickY, 18);

      if (nearestPt) {
        onSelectGlobalPoint(nearestPt);

        const lat = nearestPt[0];
        const lon = nearestPt[1];
        const frp = nearestPt[2];
        const conf = nearestPt[3];
        const isDual = nearestPt[4] === 1;
        const rawCount = nearestPt[5];
        const countryId = nearestPt[6];
        const country = countryId >= 0 ? countryMap.current.get(countryId) : null;
        const countryName = country ? country.name : t.borderZone;
        const continent = country ? country.continent : '';

        const popupContent = `
          <div class="text-xs space-y-2 font-sans min-w-[245px]">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <span class="inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${
                isDual
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
              }">
                ${isDual ? t.popupClassDual : t.popupClassSingle}
              </span>
              <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                375m VIIRS / 1km MODIS
              </span>
            </div>

            <div class="text-sm font-bold text-white">${escapeHtml(countryName)} ${continent ? `<span class="text-xs text-slate-400 font-normal">(${continent})</span>` : ''}</div>

            <dl class="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
              <dt class="text-slate-400">${t.popupFRP}</dt>
              <dd class="font-mono text-amber-300 font-bold text-right">${fmtNum(frp, 1)} MW</dd>

              <dt class="text-slate-400">${t.popupConfidence}</dt>
              <dd class="font-mono font-bold text-right ${conf >= 85 ? 'text-emerald-300' : 'text-cyan-300'}">
                ${conf}%
              </dd>

              <dt class="text-slate-400">${t.popupRawFused}</dt>
              <dd class="font-mono text-cyan-200 font-bold text-right">
                ${t.popupRawDetail(rawCount)}
              </dd>

              <dt class="text-slate-400">${t.popupCoords}</dt>
              <dd class="font-mono text-slate-300 text-right">
                ${lat.toFixed(4)}°, ${lon.toFixed(4)}°
              </dd>
            </dl>
          </div>
        `;

        if (popupRef.current) {
          map.closePopup(popupRef.current);
        }

        popupRef.current = L.popup({ className: 'fm-pop' })
          .setLatLng([lat, lon])
          .setContent(popupContent)
          .openOn(map);
      }
    };

    // Mousemove handler: Interactive hover cursor and tooltip
    const handleCanvasMouseMove = (e: MouseEvent) => {
      if (!map || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const nearest = findClosestPoint(clickX, clickY, 14);

      if (nearest) {
        canvas.style.cursor = 'pointer';
        hoveredPointRef.current = nearest;

        const countryId = nearest[6];
        const country = countryId >= 0 ? countryMap.current.get(countryId) : null;
        const countryName = country ? country.name : t.borderZone;

        if (!hoverTooltipRef.current) {
          hoverTooltipRef.current = L.tooltip({
            className: 'fm-tooltip',
            sticky: true,
            direction: 'top',
            offset: [0, -8],
          });
        }

        hoverTooltipRef.current
          .setLatLng([nearest[0], nearest[1]])
          .setContent(
            `<div class="text-xs font-sans">
              <div class="font-bold text-white">${escapeHtml(countryName)}</div>
              <div class="text-amber-300 font-mono">${t.tooltipFRP(fmtNum(nearest[2], 1))}</div>
              <div class="text-cyan-300 text-[11px]">${t.tooltipConf(String(nearest[3]))}</div>
            </div>`,
          )
          .openOn(map);
      } else {
        canvas.style.cursor = 'default';
        if (hoveredPointRef.current && hoverTooltipRef.current) {
          hoveredPointRef.current = null;
          map.closeTooltip(hoverTooltipRef.current);
        }
      }
    };

    renderCanvas();

    // Listen to zoom, move, and animation events for butter-smooth 60fps rendering
    map.on('move viewreset zoom moveend zoomend resize', scheduleRender);
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      map.off('move viewreset zoom moveend zoomend resize', scheduleRender);
      if (canvas) {
        canvas.removeEventListener('click', handleCanvasClick);
        canvas.removeEventListener('mousemove', handleCanvasMouseMove);
      }
      if (hoverTooltipRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.closeTooltip(hoverTooltipRef.current);
      }
    };
  }, [globalPoints, t, onSelectGlobalPoint, selectedGlobalPoint]);

  // Handle selected global point from external sidebar click (flyTo & openPopup)
  useEffect(() => {
    if (!selectedGlobalPoint) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = selectedGlobalPoint[0];
    const lon = selectedGlobalPoint[1];
    map.flyTo([lat, lon], 9, { duration: 0.85 });

    const frp = selectedGlobalPoint[2];
    const conf = selectedGlobalPoint[3];
    const isDual = selectedGlobalPoint[4] === 1;
    const rawCount = selectedGlobalPoint[5];
    const countryId = selectedGlobalPoint[6];
    const country = countryId >= 0 ? countryMap.current.get(countryId) : null;
    const countryName = country ? country.name : t.borderZone;
    const continent = country ? country.continent : '';

    const popupContent = `
      <div class="text-xs space-y-2 font-sans min-w-[245px]">
        <div class="flex items-center justify-between border-b border-slate-700/80 pb-2">
          <span class="inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${
            isDual
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
              : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
          }">
            ${isDual ? t.popupClassDual : t.popupClassSingle}
          </span>
          <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
            375m VIIRS / 1km MODIS
          </span>
        </div>

        <div class="text-sm font-bold text-white">${escapeHtml(countryName)} ${continent ? `<span class="text-xs text-slate-400 font-normal">(${continent})</span>` : ''}</div>

        <dl class="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
          <dt class="text-slate-400">${t.popupFRP}</dt>
          <dd class="font-mono text-amber-300 font-bold text-right">${fmtNum(frp, 1)} MW</dd>

          <dt class="text-slate-400">${t.popupConfidence}</dt>
          <dd class="font-mono font-bold text-right ${conf >= 85 ? 'text-emerald-300' : 'text-cyan-300'}">
            ${conf}%
          </dd>

          <dt class="text-slate-400">${t.popupRawFused}</dt>
          <dd class="font-mono text-cyan-200 font-bold text-right">
            ${t.popupRawDetail(rawCount)}
          </dd>

          <dt class="text-slate-400">${t.popupCoords}</dt>
          <dd class="font-mono text-slate-300 text-right">
            ${lat.toFixed(4)}°, ${lon.toFixed(4)}°
          </dd>
        </dl>
      </div>
    `;

    window.setTimeout(() => {
      if (popupRef.current) {
        map.closePopup(popupRef.current);
      }
      popupRef.current = L.popup({ className: 'fm-pop' })
        .setLatLng([lat, lon])
        .setContent(popupContent)
        .openOn(map);
    }, 900);
  }, [selectedGlobalPoint, t]);

  // Reset to Global Worldwide View
  const handleResetView = () => {
    mapInstanceRef.current?.flyTo([15.0, 10.0], 2, { duration: 0.75 });
    onSelectCountry(null);
  };

  // Spotlight Next Top Global Dual-Confirmed Fire Event
  const handleSpotlightCluster = () => {
    const map = mapInstanceRef.current;
    if (!map || globalPoints.length === 0) return;

    const duals = globalPoints.filter((pt) => pt[4] === 1).sort((a, b) => b[2] - a[2]);
    const list = duals.length > 0 ? duals : globalPoints;
    const target = list[spotlightIdx % list.length];
    setSpotlightIdx((prev) => prev + 1);

    onSelectGlobalPoint(target);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-line bg-ink-950 shadow-panel">
      <div
        ref={mapContainerRef}
        className="h-full w-full z-10"
        role="region"
        aria-label="Interactive world map of fire hotspots"
      />

      {/* Top-Left: Spotlight Action Button */}
      <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSpotlightCluster}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-ink-900/95 px-3 py-1.5 text-xs font-semibold text-emerald-200 shadow-pop backdrop-blur transition-all hover:bg-emerald-500/20 hover:scale-[1.02]"
          title={t.spotlightTooltip}
        >
          <Crosshair className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
          <span>{t.spotlightBtn}</span>
        </button>
      </div>

      {/* Top-Right: Reset View Button */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handleResetView}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-ink-900/95 px-2.5 py-1.5 text-xs font-semibold text-slate-200 shadow-pop backdrop-blur transition-colors hover:bg-ink-800"
          title={t.resetViewTooltip}
        >
          <RotateCcw className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
          <span>{t.resetViewBtn}</span>
        </button>
      </div>

      {/* Bottom-Left: Map Legend */}
      <div className="absolute bottom-4 left-3 z-20 rounded-lg border border-line-strong bg-ink-900/90 p-2.5 text-[11px] shadow-pop backdrop-blur">
        <div className="mb-1.5 font-bold text-white">{t.legendTitle}</div>
        <div className="flex flex-col gap-1 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 border border-white" />
            <span>{t.legendDual}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 border border-white" />
            <span>{t.legendMulti}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>{t.legendHighFrp}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            <span>{t.legendStandard}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
