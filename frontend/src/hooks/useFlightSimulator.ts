import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  FlightState,
  FlightMode,
  CockpitInstruments,
  RadarContact,
  MissionRoute,
} from '../types/flight';
import type { GlobalHarmonizedPoint } from '../types/harmonization';

// Physical conversion constants
const KNOTS_TO_MS = 0.514444;
const METERS_TO_FEET = 3.28084;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

interface UseFlightSimulatorOptions {
  onViewStateChange?: (viewState: {
    latitude: number;
    longitude: number;
    altitude?: number;
    pitch: number;
    bearing: number;
    zoom: number;
  }) => void;
  nearbyHotspots?: GlobalHarmonizedPoint[];
  getTerrainElevation?: (lng: number, lat: number) => number | null;
  onToggleFullscreen?: () => void;
}

const INITIAL_FLIGHT_STATE: FlightState = {
  isActive: false,
  mode: 'ground',
  latitude: 12.668,
  longitude: 108.120,
  altitudeMeters: 540,
  groundElevationMeters: 530,
  altitudeAGLMeters: 10,
  speedKnots: 0,
  throttle: 0,
  heading: 45,
  pitch: 0,
  roll: 0,
  verticalSpeedFpm: 0,
  targetWaypointIndex: 0,
  gcasWarning: false,
  gcasPullUp: false,
  stallWarning: false,
};

function haversineDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const deltaLambda = (lon2 - lon1) * DEG_TO_RAD;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (theta * RAD_TO_DEG + 360) % 360;
}

export function useFlightSimulator({
  onViewStateChange,
  nearbyHotspots = [],
  getTerrainElevation,
  onToggleFullscreen,
}: UseFlightSimulatorOptions = {}) {
  const [flightState, setFlightState] = useState<FlightState>(INITIAL_FLIGHT_STATE);
  const stateRef = useRef<FlightState>(INITIAL_FLIGHT_STATE);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Stable callbacks ref to prevent tearing down 60 FPS physics loop on re-renders
  const onViewStateChangeRef = useRef(onViewStateChange);
  const getTerrainElevationRef = useRef(getTerrainElevation);
  const onToggleFullscreenRef = useRef(onToggleFullscreen);

  useEffect(() => {
    onViewStateChangeRef.current = onViewStateChange;
  }, [onViewStateChange]);

  useEffect(() => {
    getTerrainElevationRef.current = getTerrainElevation;
  }, [getTerrainElevation]);

  useEffect(() => {
    onToggleFullscreenRef.current = onToggleFullscreen;
  }, [onToggleFullscreen]);

  // Active keyboard inputs buffer
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Sync ref with state
  useEffect(() => {
    stateRef.current = flightState;
  }, [flightState]);

  // Fetch nearest airbase and mission route from backend
  const startMission = useCallback(
    async (
      targetLat: number,
      targetLon: number,
      frp: number = 20,
      name: string = 'Wildfire Hotspot',
      targetElevationMeters?: number
    ) => {
      try {
        // Query backend for nearest airbase
        let airbaseData: any = null;
        try {
          const abRes = await fetch(
            `/api/flight/airbases/nearest?latitude=${targetLat}&longitude=${targetLon}&min_runway=1200`
          );
          if (abRes.ok && abRes.headers.get('content-type')?.includes('application/json')) {
            const json = await abRes.json();
            if (json && json.airbase) {
              airbaseData = json.airbase;
            }
          }
        } catch {
          // Ignore network or non-JSON responses
        }

        if (!airbaseData) {
          // Procedural Tactical Forward Operating Base (FOB) located ~20km from target fire
          const offsetLat = 0.14; // ~15.5km south-west
          const offsetLon = 0.14;
          const targetElev = targetElevationMeters ?? 150;
          airbaseData = {
            id: 99999,
            icao: 'VFOB',
            name: 'Forward Operating Base (FOB Tactical Fire Hub)',
            latitude: targetLat - offsetLat,
            longitude: targetLon - offsetLon,
            elevation_ft: Math.round(targetElev * 3.28),
            runway_length_m: 2200,
            fire_capable: true,
            type: 'procedural_fob',
          };
        }

        const groundElevation = (airbaseData.elevation_ft || 100) * 0.3048;
        const targetElev = targetElevationMeters ?? groundElevation;

        // Query backend for 3D mission route with terrain elevations
        let routeData: MissionRoute | null = null;
        try {
          const routeRes = await fetch(
            `/api/flight/mission-route?origin_lat=${airbaseData.latitude}&origin_lon=${airbaseData.longitude}&target_lat=${targetLat}&target_lon=${targetLon}&origin_icao=${airbaseData.icao}&origin_elev_m=${groundElevation.toFixed(1)}&target_elev_m=${targetElev.toFixed(1)}`
          );
          if (routeRes.ok && routeRes.headers.get('content-type')?.includes('application/json')) {
            const json = await routeRes.json();
            if (json && json.waypoints && json.waypoints.length > 0) {
              routeData = json;
            }
          }
        } catch {
          // Ignore network or non-JSON responses
        }

        if (!routeData) {
          routeData = {
            origin: airbaseData,
            target: { lat: targetLat, lon: targetLon },
            distance_km: haversineDistKm(airbaseData.latitude, airbaseData.longitude, targetLat, targetLon),
            bearing_deg: calcBearing(airbaseData.latitude, airbaseData.longitude, targetLat, targetLon),
            estimated_flight_time_min: 5.0,
            waypoints: [
              {
                name: 'RWY-DEP',
                lat: airbaseData.latitude,
                lon: airbaseData.longitude,
                alt_m: groundElevation + 10,
                phase: 'runway',
                speed_knots: 0,
              },
              {
                name: 'LIFTOFF',
                lat: airbaseData.latitude + 0.02,
                lon: airbaseData.longitude + 0.02,
                alt_m: groundElevation + 180,
                phase: 'takeoff',
                speed_knots: 140,
              },
              {
                name: 'FIRE-TARGET',
                lat: targetLat,
                lon: targetLon,
                alt_m: targetElev + 400,
                phase: 'orbit',
                speed_knots: 160,
              },
            ],
          };
        }

        const initialHeading = routeData.bearing_deg || 45;

        const newState: FlightState = {
          isActive: true,
          mode: 'ground',
          latitude: airbaseData.latitude,
          longitude: airbaseData.longitude,
          altitudeMeters: groundElevation + 10,
          groundElevationMeters: groundElevation,
          altitudeAGLMeters: 10,
          speedKnots: 0,
          throttle: 10,
          heading: initialHeading,
          pitch: 0,
          roll: 0,
          verticalSpeedFpm: 0,
          targetWaypointIndex: 0,
          airbase: airbaseData,
          targetFire: { lat: targetLat, lon: targetLon, frp, name },
          route: routeData,
          gcasWarning: false,
          gcasPullUp: false,
          stallWarning: false,
        };

        stateRef.current = newState;
        setFlightState(newState);
        lastTimeRef.current = performance.now();
      } catch (err) {
        console.error('Failed to scramble flight mission:', err);
      }
    },
    []
  );

  // Instant Free Flight from arbitrary global coordinates (Camera current position)
  const startFreeFlight = useCallback(
    (lat: number, lon: number, initialHeading: number = 45, currentElevationMeters?: number) => {
      const groundElev =
        currentElevationMeters ?? (getTerrainElevationRef.current?.(lon, lat) || 120);
      const safeAlt = groundElev + 350; // Initial safe cruise altitude: 350m AGL

      const newState: FlightState = {
        isActive: true,
        mode: 'manual', // Start immediately in free manual FPV flight
        latitude: lat,
        longitude: lon,
        altitudeMeters: safeAlt,
        groundElevationMeters: groundElev,
        altitudeAGLMeters: 350,
        speedKnots: 170,
        throttle: 75,
        heading: initialHeading,
        pitch: 0,
        roll: 0,
        verticalSpeedFpm: 0,
        targetWaypointIndex: 0,
        airbase: {
          id: 0,
          icao: 'FREE-PATROL',
          name: 'Global Free Flight Patrol',
          latitude: lat,
          longitude: lon,
          elevation_ft: Math.round(groundElev * 3.28084),
          runway_length_m: 0,
          fire_capable: true,
          type: 'regional_hub',
        },
        gcasWarning: false,
        gcasPullUp: false,
        stallWarning: false,
      };

      stateRef.current = newState;
      setFlightState(newState);
      lastTimeRef.current = performance.now();
    },
    []
  );

  const stopMission = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const reset = { ...INITIAL_FLIGHT_STATE, isActive: false };
    stateRef.current = reset;
    setFlightState(reset);
  }, []);

  const toggleFlightMode = useCallback(() => {
    setFlightState((prev) => {
      const newMode: FlightMode = prev.mode === 'manual' ? 'orbit' : 'manual';
      const updated = { ...prev, mode: newMode };
      stateRef.current = updated;
      return updated;
    });
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stateRef.current.isActive) return;

      // Prevent default browser scroll & conflict for flight control keys
      const flightKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        ' ',
        'w',
        'W',
        's',
        'S',
        'a',
        'A',
        'd',
        'D',
        'Tab',
        'Escape',
      ];
      if (flightKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'Tab') {
        toggleFlightMode();
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        onToggleFullscreenRef.current?.();
        return;
      }
      if (e.key === 'Escape') {
        stopMission();
        return;
      }

      keysPressedRef.current[e.key.toLowerCase()] = true;
      keysPressedRef.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
      keysPressedRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toggleFlightMode, stopMission]);

  // Main 60 FPS Physics Simulation Loop
  useEffect(() => {
    if (!flightState.isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let isRunning = true;

    const physicsLoop = (timestamp: number) => {
      if (!isRunning) return;

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      const state = { ...stateRef.current };
      const keys = keysPressedRef.current;

      // 0. Auto-Takeover: Pilot control keypress instantly overrides Autopilot
      const isManualControlActive =
        keys['w'] ||
        keys['s'] ||
        keys['a'] ||
        keys['d'] ||
        keys['arrowup'] ||
        keys['arrowdown'] ||
        keys['arrowleft'] ||
        keys['arrowright'] ||
        keys['i'] ||
        keys['k'] ||
        keys['j'] ||
        keys['l'] ||
        keys[' '] ||
        keys['shift'] ||
        keys['c'];

      if (isManualControlActive && state.mode !== 'manual') {
        state.mode = 'manual';
        // Ensure adequate speed and power when taking over in mid-air or runway
        if (state.speedKnots < 130) state.speedKnots = 135;
        if (state.throttle < 65) state.throttle = 75;
      }

      // 1. Flight Dynamics based on Mode
      if (state.mode === 'ground') {
        // Automatic Takeoff Roll
        state.throttle = Math.min(100, state.throttle + 25 * dt);
        state.speedKnots = Math.min(150, state.speedKnots + 30 * dt);
        if (state.speedKnots >= 135) {
          state.mode = 'takeoff';
        }
      } else if (state.mode === 'takeoff') {
        // Liftoff & Climb
        state.throttle = 95;
        state.speedKnots = Math.min(190, state.speedKnots + 15 * dt);
        state.pitch = Math.min(12, state.pitch + 8 * dt);
        if (state.altitudeAGLMeters >= 250) {
          state.mode = 'transit';
          state.targetWaypointIndex = 1;
        }
      } else if (state.mode === 'transit') {
        // Waypoint Navigation towards target
        const route = state.route;
        if (route && route.waypoints && route.waypoints.length > 0) {
          const wpIdx = Math.min(state.targetWaypointIndex, route.waypoints.length - 1);
          const currentWp = route.waypoints[wpIdx];
          const distToWp = haversineDistKm(state.latitude, state.longitude, currentWp.lat, currentWp.lon);
          const desiredHeading = calcBearing(state.latitude, state.longitude, currentWp.lat, currentWp.lon);

          // Smooth heading turn towards waypoint
          let diffHeading = ((desiredHeading - state.heading + 540) % 360) - 180;
          const turnRate = 22 * dt;
          if (Math.abs(diffHeading) < turnRate) {
            state.heading = desiredHeading;
          } else {
            state.heading = (state.heading + Math.sign(diffHeading) * turnRate + 360) % 360;
          }

          // Dynamic bank roll based on turn rate (coordinated turn)
          state.roll = Math.max(-25, Math.min(25, diffHeading * 0.8));

          // Desired altitude climb/descent
          const targetAlt = currentWp.alt_m || 2200;
          const altDiff = targetAlt - state.altitudeMeters;
          state.pitch = Math.max(-10, Math.min(12, altDiff * 0.02));

          // Speed control
          const targetSpeed = currentWp.speed_knots || 240;
          state.speedKnots += (targetSpeed - state.speedKnots) * 0.5 * dt;
          state.throttle = 80;

          // Next waypoint trigger
          if (distToWp < 1.8) {
            if (wpIdx < route.waypoints.length - 1) {
              state.targetWaypointIndex = wpIdx + 1;
            } else {
              // Reached target -> switch to tactical orbit
              state.mode = 'orbit';
            }
          }
        } else {
          state.mode = 'orbit';
        }
      } else if (state.mode === 'orbit') {
        // Orbit around fire location (Standard counter-clockwise orbit, ~1.8km radius, ~160 knots)
        const fire = state.targetFire;
        if (fire) {
          const fireBearing = calcBearing(state.latitude, state.longitude, fire.lat, fire.lon);
          // Target circular tangent heading (90 deg perpendicular + inward correction)
          const distToFire = haversineDistKm(state.latitude, state.longitude, fire.lat, fire.lon);
          const offsetAngle = distToFire > 2.0 ? 65 : distToFire < 1.2 ? 115 : 90;
          const desiredHeading = (fireBearing + offsetAngle) % 360;

          let diffHeading = ((desiredHeading - state.heading + 540) % 360) - 180;
          const turnRate = 18 * dt;
          state.heading = (state.heading + Math.sign(diffHeading) * Math.min(Math.abs(diffHeading), turnRate) + 360) % 360;

          // Bank left into the counter-clockwise orbit
          state.roll = -18;
          state.throttle = 60;
          state.speedKnots += (165 - state.speedKnots) * 0.8 * dt;

          // Maintain ~450m AGL inspection altitude
          const targetAlt = state.groundElevationMeters + 450;
          state.pitch = Math.max(-5, Math.min(5, (targetAlt - state.altitudeMeters) * 0.03));
        }
      } else if (state.mode === 'manual') {
        // Manual Flight Controls (Hybrid Aviation & Responsive Arcade)
        // Throttle (W / S)
        if (keys['w']) state.throttle = Math.min(100, state.throttle + 30 * dt);
        if (keys['s']) state.throttle = Math.max(15, state.throttle - 30 * dt);

        // Climb / Dive shortcuts (Space = Climb, Shift/C = Dive)
        if (keys[' ']) {
          state.pitch = Math.min(35, state.pitch + 35 * dt);
          state.throttle = Math.min(100, state.throttle + 20 * dt);
        }
        if (keys['shift'] || keys['c']) {
          state.pitch = Math.max(-30, state.pitch - 30 * dt);
        }

        // Pitch (Up / Down or I / K)
        if (keys['arrowdown'] || keys['k']) {
          state.pitch = Math.min(45, state.pitch + 30 * dt);
        } else if (keys['arrowup'] || keys['i']) {
          state.pitch = Math.max(-45, state.pitch - 30 * dt);
        } else if (!keys[' ']) {
          // Slow self-leveling pitch
          state.pitch *= 1 - 0.5 * dt;
        }

        // Roll & Bank Turning (ArrowLeft / ArrowRight or J / L)
        let rollInput = 0;
        let yawRate = 0;

        if (keys['arrowleft'] || keys['j']) {
          rollInput -= 1;
          yawRate -= 22;
        }
        if (keys['arrowright'] || keys['l']) {
          rollInput += 1;
          yawRate += 22;
        }

        // Rudder & Coordinated Bank (A / D)
        if (keys['a']) {
          yawRate -= 22;
          rollInput -= 0.6;
        }
        if (keys['d']) {
          yawRate += 22;
          rollInput += 0.6;
        }

        if (rollInput !== 0) {
          state.roll = Math.max(-65, Math.min(65, state.roll + rollInput * 55 * dt));
        } else {
          // Natural auto-centering roll
          state.roll *= 1 - 1.2 * dt;
        }

        // Coordinated turn from bank angle + yaw
        const bankTurnRate = (state.roll / 45) * 22;
        state.heading = (state.heading + (yawRate + bankTurnRate) * dt + 360) % 360;

        // Dynamic Speed
        const targetSpeed = 80 + state.throttle * 2.2;
        state.speedKnots += (targetSpeed - state.speedKnots) * 0.4 * dt;
      }

      // 2. Translational Position Integration
      const speedMs = state.speedKnots * KNOTS_TO_MS;
      const forwardDistM = speedMs * dt;
      const headingRad = state.heading * DEG_TO_RAD;

      // Coordinate shift
      const deltaLat = (forwardDistM * Math.cos(headingRad)) / 111139;
      const deltaLon = (forwardDistM * Math.sin(headingRad)) / (111139 * Math.cos(state.latitude * DEG_TO_RAD));

      state.latitude += deltaLat;
      state.longitude += deltaLon;

      // Vertical speed and altitude
      const pitchRad = state.pitch * DEG_TO_RAD;
      const vSpeedMs = speedMs * Math.sin(pitchRad);
      state.verticalSpeedFpm = vSpeedMs * METERS_TO_FEET * 60;
      state.altitudeMeters += vSpeedMs * dt;

      // 3. Ground Collision Avoidance System (GCAS)
      // Actively sample ground elevation from Terrarium DEM raster if available
      const sampledElev = getTerrainElevationRef.current?.(state.longitude, state.latitude);
      if (typeof sampledElev === 'number' && !isNaN(sampledElev)) {
        state.groundElevationMeters = Math.max(0, sampledElev);
      }
      const baseGroundElev = state.groundElevationMeters || 300;
      state.altitudeAGLMeters = Math.max(0, state.altitudeMeters - baseGroundElev);

      // Warning thresholds (Suppressed during runway roll)
      state.gcasWarning = state.altitudeAGLMeters < 150 && state.pitch < -2 && state.mode !== 'ground';
      state.gcasPullUp = state.altitudeAGLMeters < 60 && state.mode !== 'ground';
      state.stallWarning = state.speedKnots < 95 && state.mode !== 'ground';

      // Ground safety floor clamp (prevents clipping inside DEM)
      const minSafeFloorMeters = baseGroundElev + 15;
      if (state.altitudeMeters < minSafeFloorMeters) {
        state.altitudeMeters = minSafeFloorMeters;
        state.altitudeAGLMeters = 15;
        state.pitch = Math.max(0, state.pitch);
      }

      // 4. Update Camera View State
      if (onViewStateChangeRef.current) {
        // Cockpit camera positioned directly on aircraft with proper nose-attitude pitch tilt
        const camPitch = Math.min(85, Math.max(20, 62 + state.pitch * 0.7));
        // Altitude-scaled zoom level
        const zoomLevel = Math.max(11.5, Math.min(16.5, 15.2 - Math.log10(Math.max(10, state.altitudeAGLMeters)) * 0.9));

        onViewStateChangeRef.current({
          latitude: state.latitude,
          longitude: state.longitude,
          altitude: state.altitudeMeters,
          pitch: camPitch,
          bearing: state.heading,
          zoom: zoomLevel,
        });
      }

      stateRef.current = state;
      setFlightState(state);

      animationFrameRef.current = requestAnimationFrame(physicsLoop);
    };

    animationFrameRef.current = requestAnimationFrame(physicsLoop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [flightState.isActive]);

  // Compute Tactical Mini Radar Contacts
  const radarContacts: RadarContact[] = useMemo(() => {
    if (!flightState.isActive || nearbyHotspots.length === 0) return [];

    const contacts: RadarContact[] = [];
    const maxRangeKm = 35;

    for (let i = 0; i < nearbyHotspots.length; i++) {
      const pt = nearbyHotspots[i];
      const ptLat = pt[0];
      const ptLon = pt[1];

      // Fast bounding box rejection (~35km ≈ 0.35° lat, 0.5° lon)
      if (Math.abs(ptLat - flightState.latitude) > 0.35 || Math.abs(ptLon - flightState.longitude) > 0.5) {
        continue;
      }

      const frp = pt[2];
      const dist = haversineDistKm(flightState.latitude, flightState.longitude, ptLat, ptLon);

      if (dist <= maxRangeKm) {
        const absBearing = calcBearing(flightState.latitude, flightState.longitude, ptLat, ptLon);
        const relBearing = ((absBearing - flightState.heading + 540) % 360) - 180;
        contacts.push({
          id: `rc-${i}`,
          relativeDistanceKm: dist,
          relativeBearingDeg: relBearing,
          frp,
          latitude: ptLat,
          longitude: ptLon,
        });
      }
    }
    return contacts;
  }, [flightState.isActive, flightState.latitude, flightState.longitude, flightState.heading, nearbyHotspots]);

  // Consolidated Cockpit Instruments
  const cockpitInstruments: CockpitInstruments = useMemo(
    () => ({
      airspeed: Math.round(flightState.speedKnots),
      altimeter: Math.round(flightState.altitudeMeters * METERS_TO_FEET),
      altitudeAGL: Math.round(flightState.altitudeAGLMeters * METERS_TO_FEET),
      heading: Math.round(flightState.heading),
      pitch: Math.round(flightState.pitch),
      roll: Math.round(flightState.roll),
      verticalSpeed: Math.round(flightState.verticalSpeedFpm),
      throttle: Math.round(flightState.throttle),
      gcasAlert: flightState.gcasWarning,
      gcasPullUp: flightState.gcasPullUp,
      stallAlert: flightState.stallWarning,
      radarContacts,
    }),
    [flightState, radarContacts]
  );

  return {
    flightState,
    cockpitInstruments,
    startMission,
    startFreeFlight,
    stopMission,
    toggleFlightMode,
    isFlying: flightState.isActive,
  };
}
