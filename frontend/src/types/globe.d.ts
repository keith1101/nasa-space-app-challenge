export interface GlobeViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  maxPitch?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface TerrainConfig {
  enabled: boolean;
  sourceUrl: string;
  exaggeration: number;
}

export interface Fire3DColumn {
  id: string;
  position: [number, number]; // [lon, lat]
  elevation: number;          // Column height based on FRP (meters)
  frp: number;
  satellite: string;
  isDual: boolean;
  color: [number, number, number, number];
}

export interface Fire3DArc {
  id: string;
  source: [number, number];   // [lon, lat]
  target: [number, number];   // [lon, lat]
  durationHours: number;
  frp: number;
  sourceColor: [number, number, number, number];
  targetColor: [number, number, number, number];
}
