/**
 * Volumetric 3D GPU Particle Smoke & Flame Plume Layers for Deck.gl.
 * Simulates active wildfire combustion core and atmospheric smoke billowing
 * drifting with meteorological wind vectors over 3D terrain.
 */

import { ScatterplotLayer } from '@deck.gl/layers';

export interface ParticlePoint {
  position: [number, number, number]; // [lon, lat, altitude_m]
  radius: number;
  color: [number, number, number, number];
  type: 'flame' | 'smoke_core' | 'smoke_plume';
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Computes offset coordinates from a base point along a given direction and distance.
 */
function offsetCoord(lat: number, lon: number, distMeters: number, bearingDeg: number): [number, number] {
  const r = 6371000;
  const bearingRad = bearingDeg * DEG_TO_RAD;
  const latRad = lat * DEG_TO_RAD;
  const lonRad = lon * DEG_TO_RAD;
  const dDivR = distMeters / r;

  const sinDestLat =
    Math.sin(latRad) * Math.cos(dDivR) +
    Math.cos(latRad) * Math.sin(dDivR) * Math.cos(bearingRad);
  const destLatRad = Math.asin(Math.max(-1, Math.min(1, sinDestLat)));
  const destLonRad = lonRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(dDivR) * Math.cos(latRad),
    Math.cos(dDivR) - Math.sin(latRad) * Math.sin(destLatRad)
  );
  return [destLonRad / DEG_TO_RAD, destLatRad / DEG_TO_RAD];
}

/**
 * Generates procedural volumetric particles for a wildfire event.
 * Total budget: ~350-500 particles to guarantee 60 FPS on all GPUs.
 */
export function generateWildfireParticles(
  targetLat: number,
  targetLon: number,
  frp: number = 30,
  windDirectionDeg: number = 230, // Direction wind is coming FROM (0=N, 90=E, 180=S, 270=W)
  baseElevationMeters: number = 300
): ParticlePoint[] {
  const particles: ParticlePoint[] = [];

  // Wind drift vector points in opposite direction (downwind)
  const downwindBearing = (windDirectionDeg + 180) % 360;
  const intensityFactor = Math.min(2.5, Math.max(0.6, Math.sqrt(frp) / 4.0));

  // 1. Glowing Flame Core Particles (High luminosity, ground level)
  const flameCount = 45;
  for (let i = 0; i < flameCount; i++) {
    const angle = (i / flameCount) * 360 + (i * 37) % 25;
    const spreadMeters = (50 + (i % 7) * 35) * intensityFactor;
    const [pLon, pLat] = offsetCoord(targetLat, targetLon, spreadMeters, angle);
    const alt = baseElevationMeters + 15 + (i % 5) * 20;

    // Glowing core gradient: white-yellow center to vivid amber-orange edge
    const isCore = i % 3 === 0;
    const color: [number, number, number, number] = isCore
      ? [255, 230, 120, 240] // Incandescent yellow-white
      : [255, 75, 20, 210];  // Fiery crimson-orange

    particles.push({
      position: [pLon, pLat, alt],
      radius: (30 + (i % 6) * 12) * intensityFactor,
      color,
      type: 'flame',
    });
  }

  // 2. Dense Smoke Column Core (Ascending & Expanding)
  const smokeCoreCount = 90;
  for (let i = 0; i < smokeCoreCount; i++) {
    const progress = i / smokeCoreCount; // 0 (ground) to 1 (top of convective column)
    const altitude = baseElevationMeters + 80 + progress * 1400 * intensityFactor;

    // Progressive downwind drift as smoke climbs
    const driftDistance = Math.pow(progress, 1.4) * 1600 * intensityFactor;
    // Slight turbulence jitter
    const turbulence = Math.sin(i * 1.7) * 120 * progress;
    const [driftLon, driftLat] = offsetCoord(
      targetLat,
      targetLon,
      driftDistance,
      (downwindBearing + turbulence) % 360
    );

    // Expansion: radius expands from 40m to 350m
    const radius = (45 + Math.pow(progress, 0.8) * 300) * intensityFactor;
    // Optical density fades with atmospheric dispersion
    const alpha = Math.max(30, Math.round(180 * (1 - progress * 0.75)));
    // Color transitions from dark charcoal soot to hazy brownish ash
    const gray = Math.round(35 + progress * 50);

    particles.push({
      position: [driftLon, driftLat, altitude],
      radius,
      color: [gray + 10, gray, gray - 5, alpha],
      type: 'smoke_core',
    });
  }

  // 3. Ambient Billowing Smoke Canopy (High altitude atmospheric dispersion)
  const canopyCount = 120;
  for (let i = 0; i < canopyCount; i++) {
    const progress = 0.4 + (i / canopyCount) * 0.6; // 0.4 to 1.0
    const altitude = baseElevationMeters + 700 + progress * 1800 * intensityFactor;

    // Downwind spread with wider fan angle
    const driftDistance = (800 + progress * 3200) * intensityFactor;
    const fanAngle = (Math.sin(i * 2.3) * 32); // Lateral plume dispersion
    const [pLon, pLat] = offsetCoord(
      targetLat,
      targetLon,
      driftDistance,
      (downwindBearing + fanAngle) % 360
    );

    const radius = (180 + Math.pow(progress, 0.9) * 450) * intensityFactor;
    const alpha = Math.max(15, Math.round(95 * (1 - progress * 0.7)));

    particles.push({
      position: [pLon, pLat, altitude],
      radius,
      color: [85, 80, 75, alpha],
      type: 'smoke_plume',
    });
  }

  return particles;
}

/**
 * Constructs Deck.gl ScatterplotLayer instances for 3D smoke and flame simulation.
 */
export function buildWildfireParticleSmokeLayers(
  targetFire: { lat: number; lon: number; frp?: number } | null,
  groundElevationMeters: number = 300,
  windDirectionDeg: number = 225
) {
  if (!targetFire) return [];

  const particles = generateWildfireParticles(
    targetFire.lat,
    targetFire.lon,
    targetFire.frp || 35,
    windDirectionDeg,
    groundElevationMeters
  );

  const flameParticles = particles.filter((p) => p.type === 'flame');
  const smokeParticles = particles.filter((p) => p.type !== 'flame');

  return [
    // 1. Flame Glow Layer (Additive blending feel)
    new ScatterplotLayer({
      id: 'wildfire-flame-particles',
      data: flameParticles,
      pickable: false,
      opacity: 0.95,
      stroked: false,
      filled: true,
      radiusScale: 1,
      radiusUnits: 'meters',
      radiusMinPixels: 4,
      getPosition: (d: ParticlePoint) => d.position,
      getRadius: (d: ParticlePoint) => d.radius,
      getFillColor: (d: ParticlePoint) => d.color,
      updateTriggers: {
        getPosition: [targetFire.lat, targetFire.lon],
      },
    }),

    // 2. Billowing Volumetric Smoke Plume Layer
    new ScatterplotLayer({
      id: 'wildfire-smoke-particles',
      data: smokeParticles,
      pickable: false,
      opacity: 0.82,
      stroked: false,
      filled: true,
      radiusScale: 1,
      radiusUnits: 'meters',
      radiusMinPixels: 6,
      getPosition: (d: ParticlePoint) => d.position,
      getRadius: (d: ParticlePoint) => d.radius,
      getFillColor: (d: ParticlePoint) => d.color,
      updateTriggers: {
        getPosition: [targetFire.lat, targetFire.lon, windDirectionDeg],
      },
    }),
  ];
}
