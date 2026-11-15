import { ColumnLayer, ArcLayer } from '@deck.gl/layers';
import type { GlobalHarmonizedPoint } from '../../../types/harmonization';
import type { RiskCell } from '../FireDeckMap';

/**
 * Builds a 3D Column Layer representing active fire hotspots extruded into the sky.
 * Elevation is proportional to Fire Radiative Power (MW).
 */
export function buildWildfire3DColumns(
  points: GlobalHarmonizedPoint[],
  is3DMode: boolean,
  onHover?: (info: any) => void,
  onClick?: (info: any) => void
) {
  if (!is3DMode || points.length === 0) return null;

  return new ColumnLayer<GlobalHarmonizedPoint>({
    id: 'wildfire-columns-3d',
    data: points,
    diskResolution: 12,
    radius: 1800, // 1.8km footprint radius
    extruded: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 150],
    elevationScale: 1.0,
    getPosition: (d: GlobalHarmonizedPoint) => [d[1], d[0]], // [lon, lat]
    getElevation: (d: GlobalHarmonizedPoint) => {
      // Scale FRP (MW) to realistic altitude (500m - 40,000m)
      const frp = Math.max(1.0, Number(d[2]) || 1.0);
      return Math.min(45000, 800 + Math.pow(frp, 1.15) * 120);
    },
    getFillColor: (d: GlobalHarmonizedPoint) => {
      const frp = Number(d[2]) || 0;
      const isDual = d[4] === 1;

      if (isDual && frp > 100) {
        return [239, 68, 68, 240]; // Ultra high intensity - Intense Crimson
      }
      if (isDual) {
        return [249, 115, 22, 230]; // Dual confirmed - Vivid Orange
      }
      if (frp > 50) {
        return [245, 158, 11, 210]; // High single sensor - Amber
      }
      return [234, 179, 8, 180]; // Moderate single sensor - Golden Yellow
    },
    material: {
      ambient: 0.65,
      diffuse: 0.85,
      shininess: 45,
      specularColor: [255, 240, 200],
    },
    onHover,
    onClick,
    updateTriggers: {
      getElevation: [points.length],
      getFillColor: [points.length],
    },
  });
}

export interface TrajectoryArcData {
  id: string;
  source: [number, number];
  target: [number, number];
  frp: number;
  durationHours: number;
}

/**
 * Builds high-altitude 3D Arcs connecting fire ignition origins to advancing fire fronts.
 */
export function buildTrajectory3DArcs(
  trajectories: TrajectoryArcData[],
  is3DMode: boolean
) {
  if (!is3DMode || trajectories.length === 0) return null;

  return new ArcLayer<TrajectoryArcData>({
    id: 'wildfire-trajectories-3d',
    data: trajectories,
    pickable: true,
    getSourcePosition: (d) => d.source,
    getTargetPosition: (d) => d.target,
    getSourceColor: [250, 204, 21, 210], // Origin: Warm Yellow
    getTargetColor: [239, 68, 68, 255],  // Active Front: Crimson Red
    getWidth: 3.5,
    getHeight: 0.45, // Arcs rise above the globe surface
    greatCircle: true,
  });
}

/**
 * Builds 3D extruded risk columns for the live 1-km experimental prediction grid.
 */
export function buildRisk3DColumns(
  riskCells: RiskCell[],
  is3DMode: boolean,
  horizonHours: number = 24
) {
  if (!is3DMode || riskCells.length === 0) return null;

  const filtered = riskCells.filter((c) => c.horizon_hours === horizonHours);
  if (filtered.length === 0) return null;

  return new ColumnLayer<RiskCell>({
    id: 'risk-grid-columns-3d',
    data: filtered,
    diskResolution: 4, // Square columns for grid cells
    radius: 700,
    extruded: true,
    pickable: true,
    getPosition: (c) => [c.longitude, c.latitude],
    getElevation: (c) => c.relative_risk * 15000,
    getFillColor: (c) => {
      const r = c.relative_risk;
      if (r > 0.7) return [220, 38, 38, 190]; // High Risk
      if (r > 0.4) return [234, 88, 12, 170]; // Moderate Risk
      return [202, 138, 4, 140];              // Low Risk
    },
    material: {
      ambient: 0.5,
      diffuse: 0.8,
      shininess: 20,
    },
  });
}
