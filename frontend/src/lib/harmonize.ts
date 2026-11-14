/**
 * In-browser fallback for the live harmonization API.
 *
 * This is a strictly typed TypeScript port of backend/harmonizer.py (FireHarmonizer):
 * 1. Anisotropic elliptical bow-tie footprint ST-DBSCAN (cross-track scan & along-track semi-axes)
 * 2. Satellite-grouped Bayesian confidence fusion with Laplace prior clamping & low-confidence guard
 * 3. Radiative flux-density centroid localization: w_i = (FRP_i + 0.1) / max(0.05, scan_i * track_i)
 * 4. Pass-reconciled FRP: sum sub-kilometer pixels within each satellite pass, max across passes
 */
import type {
  ClusterClassification,
  CorroborationLevel,
  DayNightFlag,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  HarmonizationMetrics,
  HarmonizedFireProperties,
  RawFireProperties,
  SensorFamily,
} from '../types/harmonization';

export interface ClientHarmonizeOptions {
  epsKm: number;
  timeWindowHours: number;
  useFootprint: boolean;
}

export interface ClientHarmonizeResult {
  harmonizedGeojson: GeoJsonFeatureCollection<HarmonizedFireProperties>;
  metrics: HarmonizationMetrics;
}

interface FirePoint {
  lat: number;
  lon: number;
  family: SensorFamily;
  sensor: string;
  satellite: string;
  confNorm: number;
  frp: number;
  brightness: number;
  scan: number;
  track: number;
  footprintRadiusKm: number;
  acqDate: string;
  acqTime: string;
  tsHours: number;
  daynight: DayNightFlag;
  province: string;
  inVietnam: boolean;
}

type RawFeature = GeoJsonFeature<RawFireProperties>;

const EARTH_RADIUS_KM = 6371.0;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180.0;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dphi = (lat2 - lat1) * toRad;
  const dlambda = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dphi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2.0) ** 2;
  const c = 2.0 * Math.asin(Math.min(1.0, Math.sqrt(Math.max(0.0, a))));
  return EARTH_RADIUS_KM * c;
}

function ellipticalFootprintMatch(
  a: FirePoint,
  b: FirePoint,
  baseEpsKm: number,
  upperEpsKm: number,
  useFootprint: boolean,
): [boolean, number] {
  const dKm = haversineKm(a.lat, a.lon, b.lat, b.lon);
  if (dKm <= baseEpsKm) return [true, dKm];
  if (!useFootprint || dKm > upperEpsKm) return [false, dKm];

  const meanLatRad = ((a.lat + b.lat) * 0.5 * Math.PI) / 180.0;
  const dyKm = Math.abs(b.lat - a.lat) * (Math.PI / 180.0) * EARTH_RADIUS_KM;
  const dxKm =
    Math.abs(b.lon - a.lon) * (Math.PI / 180.0) * EARTH_RADIUS_KM * Math.cos(meanLatRad);

  const aScan = Math.min(upperEpsKm, Math.max(baseEpsKm, 0.5 * (a.scan + b.scan) + 0.35));
  const bTrack = Math.min(upperEpsKm, Math.max(baseEpsKm, 0.5 * (a.track + b.track) + 0.55));

  const normEllip = (dxKm / aScan) ** 2 + (dyKm / bTrack) ** 2;
  return [normEllip <= 1.0, dKm];
}

function parseTsHours(acqDate: string, acqTime: string): number {
  const date = String(acqDate || '2026-11-03').trim();
  const time = String(acqTime || '0000').split('.')[0].trim().padStart(4, '0');
  const ms = Date.parse(`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`);
  return Number.isNaN(ms) ? 0 : ms / 3_600_000;
}

function toDayNight(v: unknown): DayNightFlag {
  return v === 'N' ? 'N' : 'D';
}

function safeFloat(v: unknown, fallback: number, lo: number, hi: number): number {
  const n = Number(v);
  return Math.max(lo, Math.min(hi, Number.isFinite(n) && n > 0 ? n : fallback));
}

function modisConfidence(raw: number | string): number {
  const n = Number(raw);
  const pct = Number.isFinite(n) ? n : 50;
  return Math.min(0.99, Math.max(0.05, pct / 100));
}

function viirsConfidence(raw: number | string): number {
  const s = String(raw || 'n').trim().toLowerCase();
  if (s === 'h' || s === 'high') return 0.95;
  if (s === 'l' || s === 'low') return 0.3;
  if (s === 'n' || s === 'nominal') return 0.7;
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return Math.min(0.99, Math.max(0.05, n > 1 ? n / 100 : n));
  }
  return 0.7;
}

function toPoint(f: RawFeature, family: SensorFamily): FirePoint {
  const p = f.properties;
  const isModis = family === 'MODIS';
  const scan = isModis ? safeFloat(p.scan, 1.0, 0.5, 5.0) : safeFloat(p.scan, 0.375, 0.2, 2.0);
  const track = isModis ? safeFloat(p.track, 1.0, 0.5, 5.0) : safeFloat(p.track, 0.375, 0.2, 2.0);
  return {
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    family,
    sensor: p.sensor || family,
    satellite: p.satellite || (isModis ? 'Terra' : 'NOAA-20'),
    confNorm: isModis ? modisConfidence(p.confidence) : viirsConfidence(p.confidence),
    frp: Math.max(0, Number(p.frp) || 0),
    brightness: Number(p.brightness) || 300,
    scan,
    track,
    footprintRadiusKm: 0.5 * Math.sqrt(scan * scan + track * track),
    acqDate: p.acq_date,
    acqTime: String(p.acq_time || '0000').split('.')[0].trim().padStart(4, '0'),
    tsHours: parseTsHours(p.acq_date, p.acq_time),
    daynight: toDayNight(p.daynight),
    province: p.province || 'Border / Offshore Zone',
    inVietnam: Boolean(p.in_vietnam),
  };
}

function emptyMetrics(opts: ClientHarmonizeOptions): HarmonizationMetrics {
  return {
    total_raw_detections: 0,
    raw_modis_count: 0,
    raw_viirs_count: 0,
    harmonized_fire_events: 0,
    deduplication_rate_percent: 0,
    dual_confirmed_events: 0,
    multi_satellite_verified_events: 0,
    viirs_exclusive_events: 0,
    modis_exclusive_events: 0,
    high_resolution_375m_ratio_percent: 0,
    mean_harmonized_frp: 0,
    total_harmonized_frp: 0,
    spatial_eps_km: opts.epsKm,
    time_window_hours: opts.timeWindowHours,
  };
}

export function harmonizeClientSide(
  modisFeatures: RawFeature[],
  viirsFeatures: RawFeature[],
  opts: ClientHarmonizeOptions,
): ClientHarmonizeResult {
  const { epsKm, timeWindowHours, useFootprint } = opts;
  const combined: FirePoint[] = [
    ...modisFeatures.map((f) => toPoint(f, 'MODIS')),
    ...viirsFeatures.map((f) => toPoint(f, 'VIIRS')),
  ];

  const n = combined.length;
  if (n === 0) {
    return { harmonizedGeojson: { type: 'FeatureCollection', features: [] }, metrics: emptyMetrics(opts) };
  }

  // Canonical spatio-temporal ordering matching backend/harmonizer.py
  combined.sort((a, b) => {
    if (a.tsHours !== b.tsHours) return a.tsHours - b.tsHours;
    const latA = Number(a.lat.toFixed(5));
    const latB = Number(b.lat.toFixed(5));
    if (latA !== latB) return latA - latB;
    const lonA = Number(a.lon.toFixed(5));
    const lonB = Number(b.lon.toFixed(5));
    if (lonA !== lonB) return lonA - lonB;
    if (a.family !== b.family) return a.family.localeCompare(b.family);
    return a.satellite.localeCompare(b.satellite);
  });

  let upperEpsKm = epsKm;
  if (useFootprint) {
    let maxFp = 0.5;
    for (const r of combined) {
      if (r.footprintRadiusKm > maxFp) maxFp = r.footprintRadiusKm;
    }
    upperEpsKm = Math.min(Math.max(epsKm, maxFp + 0.4), Math.max(epsKm * 2.2, 2.75));
  }

  // Stage 1: Spatial grid hash to isolate coarse candidate components in O(N)
  const cellDeg = Math.max(0.015, upperEpsKm / 105.0);
  const grid = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const gx = Math.floor(combined[i].lon / cellDeg);
    const gy = Math.floor(combined[i].lat / cellDeg);
    const key = `${gx}:${gy}`;
    const bucket = grid.get(key);
    if (bucket) bucket.push(i);
    else grid.set(key, [i]);
  }

  const coarseVisited = new Array<boolean>(n).fill(false);
  const coarseGroups: number[][] = [];

  for (let i = 0; i < n; i++) {
    if (coarseVisited[i]) continue;
    coarseVisited[i] = true;
    const comp: number[] = [i];
    const queue: number[] = [i];
    for (let head = 0; head < queue.length; head++) {
      const curr = queue[head];
      const cLat = combined[curr].lat;
      const cLon = combined[curr].lon;
      const gx = Math.floor(cLon / cellDeg);
      const gy = Math.floor(cLat / cellDeg);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nbs = grid.get(`${gx + dx}:${gy + dy}`);
          if (!nbs) continue;
          for (const nb of nbs) {
            if (coarseVisited[nb]) continue;
            if (haversineKm(cLat, cLon, combined[nb].lat, combined[nb].lon) <= upperEpsKm) {
              coarseVisited[nb] = true;
              comp.push(nb);
              queue.push(nb);
            }
          }
        }
      }
    }
    coarseGroups.push(comp);
  }

  // Stage 2: Chronological BFS with distance-ordered neighbors
  const clusters: FirePoint[][] = [];
  for (const idxs of coarseGroups) {
    if (idxs.length === 1) {
      clusters.push([combined[idxs[0]]]);
      continue;
    }

    const idxsSorted = [...idxs].sort((ka, kb) => {
      const a = combined[ka];
      const b = combined[kb];
      if (a.tsHours !== b.tsHours) return a.tsHours - b.tsHours;
      if (a.lat !== b.lat) return a.lat - b.lat;
      return a.lon - b.lon;
    });

    const m = idxsSorted.length;
    const spatialNeighbors: Array<Array<{ dKm: number; idx: number }>> = Array.from(
      { length: m },
      () => [],
    );

    for (let a = 0; a < m; a++) {
      const ra = combined[idxsSorted[a]];
      for (let b = a + 1; b < m; b++) {
        const rb = combined[idxsSorted[b]];
        const [matched, dKm] = ellipticalFootprintMatch(ra, rb, epsKm, upperEpsKm, useFootprint);
        if (matched) {
          spatialNeighbors[a].push({ dKm, idx: b });
          spatialNeighbors[b].push({ dKm, idx: a });
        }
      }
    }

    for (let a = 0; a < m; a++) {
      spatialNeighbors[a].sort((x, y) => x.dKm - y.dKm);
    }

    const visited = new Array<boolean>(m).fill(false);
    for (let startI = 0; startI < m; startI++) {
      if (visited[startI]) continue;
      visited[startI] = true;
      const comp: number[] = [startI];
      const queue: number[] = [startI];
      let tMin = combined[idxsSorted[startI]].tsHours;
      let tMax = tMin;

      for (let head = 0; head < queue.length; head++) {
        const curr = queue[head];
        const tCurr = combined[idxsSorted[curr]].tsHours;
        for (const { idx: nb } of spatialNeighbors[curr]) {
          if (visited[nb]) continue;
          const tNb = combined[idxsSorted[nb]].tsHours;
          if (Math.abs(tNb - tCurr) <= timeWindowHours) {
            const newTMin = Math.min(tMin, tNb);
            const newTMax = Math.max(tMax, tNb);
            if (newTMax - newTMin <= timeWindowHours) {
              visited[nb] = true;
              tMin = newTMin;
              tMax = newTMax;
              comp.push(nb);
              queue.push(nb);
            }
          }
        }
      }

      clusters.push(comp.map((memberI) => combined[idxsSorted[memberI]]));
    }
  }

  let dualCount = 0;
  let multiSatCount = 0;
  let viirsExclusive = 0;
  let modisExclusive = 0;
  let totalFrp = 0;

  const fusedProb = (probs: number[]): number => 1 - probs.reduce((acc, c) => acc * (1 - c), 1);

  const features: Array<GeoJsonFeature<HarmonizedFireProperties>> = clusters.map((g, idx) => {
    const modisPts = g.filter((p) => p.family === 'MODIS');
    const viirsPts = g.filter((p) => p.family === 'VIIRS');
    const nModis = modisPts.length;
    const nViirs = viirsPts.length;

    const bySat = new Map<string, FirePoint[]>();
    g.forEach((p) => bySat.set(p.satellite, [...(bySat.get(p.satellite) ?? []), p]));
    const satKeys = [...bySat.keys()];
    const passProbs = satKeys.map((s) => {
      const sPts = bySat.get(s) ?? [];
      const maxC = Math.max(...sPts.map((x) => x.confNorm));
      return Math.min(0.98, maxC + 0.02 * Math.min(sPts.length - 1, 3));
    });

    let classification: ClusterClassification = 'VIIRS_EXCLUSIVE';
    let corroboration: CorroborationLevel = 'SINGLE_SATELLITE';
    let harmConf = passProbs[0] ?? 0.7;
    const maxRawConf = Math.max(...g.map((x) => x.confNorm));

    if (nModis > 0 && nViirs > 0) {
      classification = 'HARMONIZED_DUAL';
      corroboration = 'DUAL_SENSOR_FAMILY';
      dualCount++;
      const fused = fusedProb(passProbs);
      harmConf = Math.min(0.99, maxRawConf >= 0.5 ? Math.max(0.92, fused) : fused);
    } else if (nViirs > 0) {
      viirsExclusive++;
      if (satKeys.length >= 2) {
        corroboration = 'MULTI_SATELLITE';
        harmConf = Math.min(0.98, fusedProb(passProbs));
      }
    } else {
      classification = 'MODIS_EXCLUSIVE';
      modisExclusive++;
      if (satKeys.length >= 2) {
        corroboration = 'MULTI_SATELLITE';
        harmConf = Math.min(0.98, fusedProb(passProbs));
      }
    }
    if (satKeys.length >= 2) multiSatCount++;

    // Radiative flux-density weighted centroid: w = (FRP + 0.1) / max(0.05, scan * track)
    const locPts = nViirs > 0 ? viirsPts : modisPts;
    const weight = (p: FirePoint): number => (p.frp + 0.1) / Math.max(0.05, p.scan * p.track);
    const wSum = locPts.reduce((acc, p) => acc + weight(p), 0);
    const lat = locPts.reduce((acc, p) => acc + p.lat * weight(p), 0) / wSum;
    const lon = locPts.reduce((acc, p) => acc + p.lon * weight(p), 0) / wSum;

    // Pass-reconciled FRP: sum sub-kilometer pixels within each satellite pass, max across passes
    let viirsFrpReconciled = 0;
    if (nViirs > 0) {
      const vBySat = new Map<string, number>();
      viirsPts.forEach((p) => vBySat.set(p.satellite, (vBySat.get(p.satellite) ?? 0) + p.frp));
      viirsFrpReconciled = Math.max(0, ...vBySat.values());
    }
    let modisFrpReconciled = 0;
    if (nModis > 0) {
      const mBySat = new Map<string, number>();
      modisPts.forEach((p) => mBySat.set(p.satellite, (mBySat.get(p.satellite) ?? 0) + p.frp));
      modisFrpReconciled = Math.max(0, ...mBySat.values());
    }
    const harmFrp = Number(Math.max(modisFrpReconciled, viirsFrpReconciled).toFixed(2));
    totalFrp += harmFrp;

    const times = g.map((p) => p.acqTime).sort();
    const earliest = g.reduce((best, p) => (p.tsHours < best.tsHours ? p : best), g[0]);

    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(lon.toFixed(5)), Number(lat.toFixed(5))] },
      properties: {
        cluster_id: idx,
        classification,
        corroboration,
        satellites: [...satKeys].sort().join(', '),
        sensors: [...new Set(g.map((p) => p.sensor))].sort().join(', '),
        satellite_count: satKeys.length,
        acq_date: earliest.acqDate,
        acq_time: `${times[0]}-${times[times.length - 1]}`,
        daynight: earliest.daynight,
        harmonized_confidence: Number((harmConf * 100).toFixed(1)),
        harmonized_frp: harmFrp,
        max_brightness: Number(Math.max(...g.map((p) => p.brightness)).toFixed(2)),
        spatial_resolution_m: nViirs > 0 ? 375 : 1000,
        max_scan_km: Number(Math.max(...g.map((p) => p.scan)).toFixed(2)),
        max_track_km: Number(Math.max(...g.map((p) => p.track)).toFixed(2)),
        raw_count: g.length,
        modis_count: nModis,
        viirs_count: nViirs,
        is_deduplicated: g.length > 1,
        province: earliest.province,
        in_vietnam: earliest.inVietnam,
      },
    };
  });

  const hCount = features.length;
  const roundedTotalFrp = Number(totalFrp.toFixed(2));
  return {
    harmonizedGeojson: { type: 'FeatureCollection', features },
    metrics: {
      total_raw_detections: n,
      raw_modis_count: modisFeatures.length,
      raw_viirs_count: viirsFeatures.length,
      harmonized_fire_events: hCount,
      deduplication_rate_percent: Number(((1 - hCount / n) * 100).toFixed(2)),
      dual_confirmed_events: dualCount,
      multi_satellite_verified_events: multiSatCount,
      viirs_exclusive_events: viirsExclusive,
      modis_exclusive_events: modisExclusive,
      high_resolution_375m_ratio_percent: Number((((hCount - modisExclusive) / hCount) * 100).toFixed(1)),
      mean_harmonized_frp: Number((roundedTotalFrp / hCount).toFixed(2)),
      total_harmonized_frp: roundedTotalFrp,
      spatial_eps_km: epsKm,
      time_window_hours: timeWindowHours,
    },
  };
}
