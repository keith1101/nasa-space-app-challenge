/**
 * 3D Flight Simulator & Tactical Wildfire Mission Types.
 * Defines aircraft physics states, cockpit HUD avionics, radar contacts,
 * and mission waypoints for aerial firefighting reconnaissance.
 */

export type FlightMode = 'ground' | 'takeoff' | 'transit' | 'orbit' | 'manual';

export interface AirbaseInfo {
  id: number;
  icao: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation_ft: number;
  runway_length_m: number;
  fire_capable: boolean;
  type: string;
  distance_km?: number;
  bearing_deg?: number;
  is_fallback_fob?: boolean;
}

export interface MissionWaypoint {
  name: string;
  lat: number;
  lon: number;
  alt_m: number;
  phase: 'runway' | 'takeoff' | 'climb' | 'transit' | 'descent' | 'orbit';
  speed_knots: number;
}

export interface MissionRoute {
  origin: AirbaseInfo;
  target: { lat: number; lon: number };
  distance_km: number;
  bearing_deg: number;
  estimated_flight_time_min: number;
  waypoints: MissionWaypoint[];
}

export interface FlightTelemetry {
  speedKnots: number;
  mach: number;
  altitudeMeters: number;
  altitudeFeet: number;
  altitudeAGLMeters: number;
  verticalSpeedFpm: number;
  heading: number;
  pitch: number;
  roll: number;
  gForce: number;
  throttle: number; // 0 - 100%
}

export interface RadarContact {
  id: string;
  relativeDistanceKm: number;
  relativeBearingDeg: number; // Relative to nose heading (-180 to +180)
  frp: number;
  latitude: number;
  longitude: number;
}

export interface CockpitInstruments {
  airspeed: number;
  altimeter: number;
  altitudeAGL: number;
  heading: number;
  pitch: number;
  roll: number;
  verticalSpeed: number;
  throttle: number;
  gcasAlert: boolean;
  gcasPullUp: boolean;
  stallAlert: boolean;
  radarContacts: RadarContact[];
}

export interface FlightState {
  isActive: boolean;
  mode: FlightMode;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  groundElevationMeters: number;
  altitudeAGLMeters: number;
  speedKnots: number;
  throttle: number;
  heading: number;
  pitch: number;
  roll: number;
  verticalSpeedFpm: number;
  targetWaypointIndex: number;
  airbase?: AirbaseInfo;
  targetFire?: {
    lat: number;
    lon: number;
    frp?: number;
    name?: string;
  };
  route?: MissionRoute;
  gcasWarning: boolean;
  gcasPullUp: boolean;
  stallWarning: boolean;
}
