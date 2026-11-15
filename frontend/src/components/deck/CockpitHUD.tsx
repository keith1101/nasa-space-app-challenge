import { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  Compass,
  Gauge,
  Sliders,
  X,
  Keyboard,
  Maximize2,
  Minimize2,
  Flame,
  Map,
  Radio,
  ChevronDown,
} from 'lucide-react';
import type { FlightState, CockpitInstruments } from '../../types/flight';
import { cx } from '../ui';

function haversineDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface CockpitHUDProps {
  flightState: FlightState;
  instruments: CockpitInstruments;
  onExit: () => void;
  onToggleMode: () => void;
  lang?: 'en' | 'vi';
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function CockpitHUD({
  flightState,
  instruments,
  onExit,
  onToggleMode,
  lang = 'vi',
  isFullscreen = false,
  onToggleFullscreen,
}: CockpitHUDProps) {
  const [showHelp, setShowHelp] = useState(false);
  const isVi = lang === 'vi';

  // Toggle Controls Cheat Sheet with 'H' key or close with 'Esc'
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      } else if (e.key === 'Escape' && showHelp) {
        e.preventDefault();
        e.stopPropagation();
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showHelp]);

  // Tactical MFD display mode: 'nav' (Route Mini-Map) or 'radar' (Pulse Sweep)
  const [mfdMode, setMfdMode] = useState<'nav' | 'radar'>('nav');
  const [mfdRangeKm, setMfdRangeKm] = useState<number>(35);
  const [isMfdCollapsed, setIsMfdCollapsed] = useState<boolean>(false);

  // Tactical Navigation & Fire Target calculations
  const targetFire = flightState.targetFire;
  const navCalc = useMemo(() => {
    if (!targetFire) return null;

    const distKm = haversineDistKm(
      flightState.latitude,
      flightState.longitude,
      targetFire.lat,
      targetFire.lon
    );
    const bearingDeg = calcBearing(
      flightState.latitude,
      flightState.longitude,
      targetFire.lat,
      targetFire.lon
    );

    // Relative angle to aircraft nose heading (-180 to +180)
    const relBearing = ((bearingDeg - instruments.heading + 540) % 360) - 180;

    // Estimated time enroute (ETA)
    const groundSpeedKmH = Math.max(60, flightState.speedKnots * 1.852);
    const etaMin = (distKm / groundSpeedKmH) * 60;
    const etaMinutes = Math.floor(etaMin);
    const etaSeconds = Math.floor((etaMin - etaMinutes) * 60);
    const etaFormatted = `${etaMinutes}m ${etaSeconds.toString().padStart(2, '0')}s`;

    // 3D reticle projection angles on HUD
    const altDiff = (flightState.groundElevationMeters || 300) - flightState.altitudeMeters;
    const elevAngleDeg = Math.atan2(altDiff, distKm * 1000) * (180 / Math.PI);
    const relElevation = elevAngleDeg - instruments.pitch;

    // In FOV check (horizontal +/-35 deg, vertical +/-25 deg)
    const isInFov = Math.abs(relBearing) <= 35 && Math.abs(relElevation) <= 25;
    const screenXPercent = 50 + (relBearing / 35) * 38;
    const screenYPercent = Math.max(20, Math.min(80, 50 - (relElevation / 25) * 32));

    return {
      distKm,
      bearingDeg,
      relBearing,
      etaFormatted,
      isInFov,
      screenXPercent,
      screenYPercent,
    };
  }, [
    targetFire,
    flightState.latitude,
    flightState.longitude,
    flightState.altitudeMeters,
    flightState.groundElevationMeters,
    flightState.speedKnots,
    instruments.heading,
    instruments.pitch,
  ]);

  // Heading compass marks calculation
  const compassTicks = useMemo(() => {
    const ticks = [];
    const currentHdg = instruments.heading;
    for (let offset = -40; offset <= 40; offset += 5) {
      const hdg = (currentHdg + offset + 360) % 360;
      let label = '';
      if (hdg === 0) label = 'N';
      else if (hdg === 45) label = 'NE';
      else if (hdg === 90) label = 'E';
      else if (hdg === 135) label = 'SE';
      else if (hdg === 180) label = 'S';
      else if (hdg === 225) label = 'SW';
      else if (hdg === 270) label = 'W';
      else if (hdg === 315) label = 'NW';
      else if (hdg % 10 === 0) label = (hdg / 10).toString().padStart(2, '0');

      ticks.push({
        offset,
        hdg,
        label,
        isMajor: hdg % 10 === 0,
      });
    }
    return ticks;
  }, [instruments.heading]);

  // Pitch ladder rendering parameters
  const pitchOffsetPx = instruments.pitch * 6; // 6px per degree of pitch

  return (
    <div className="pointer-events-none absolute inset-0 z-40 select-none overflow-hidden font-mono text-cyan-400">
      {/* 1. Cockpit Canopy Frame & Vignette Overlay */}
      <div className="absolute inset-0 bg-radial from-transparent via-cyan-950/15 to-slate-950/80 pointer-events-none" />
      <div className="absolute inset-0 border-[16px] border-slate-950/90 shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] rounded-3xl pointer-events-none">
        {/* Cockpit Canopy Arcs */}
        <div className="absolute top-0 left-1/4 right-1/4 h-2.5 bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
        <div className="absolute top-0 left-6 h-32 w-1.5 bg-slate-800/80 rotate-12" />
        <div className="absolute top-0 right-6 h-32 w-1.5 bg-slate-800/80 -rotate-12" />
      </div>

      {/* 2. Top Heading Tape */}
      <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-t-md bg-slate-950/80 border-t border-x border-cyan-500/40 text-[11px] font-bold text-white shadow-lg backdrop-blur-md">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>HDG {instruments.heading.toString().padStart(3, '0')}°</span>
        </div>
        <div className="relative w-80 h-8 bg-slate-950/70 border border-cyan-500/50 rounded-b-lg backdrop-blur-md overflow-hidden flex items-center justify-center shadow-2xl">
          {/* Center lubber line marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10" />
          <div className="absolute top-0 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-amber-400 z-10" />

          {/* Sliding scale */}
          <div className="flex items-end justify-center h-full w-full relative">
            {compassTicks.map((tick, idx) => {
              const xPos = 160 + tick.offset * 4; // 4px per degree
              return (
                <div
                  key={idx}
                  className="absolute bottom-0 flex flex-col items-center -translate-x-1/2"
                  style={{ left: `${xPos}px` }}
                >
                  {tick.label && (
                    <span className="text-[10px] font-bold text-cyan-300 leading-none mb-1">
                      {tick.label}
                    </span>
                  )}
                  <div
                    className={cx(
                      'w-0.5 bg-cyan-400/80',
                      tick.isMajor ? 'h-3 bg-cyan-300' : 'h-1.5 bg-cyan-500/50'
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Tactical Course Director Ribbon */}
        {navCalc && targetFire && (
          <div className="flex items-center justify-between w-80 px-2.5 py-1 bg-slate-950/90 border-x border-b border-cyan-500/50 rounded-b-xl shadow-xl text-[10px] backdrop-blur-md">
            <div className="flex items-center gap-1 min-w-0">
              <Flame className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="font-bold text-white truncate max-w-[90px]">
                {targetFire.name?.split('(')[0].trim() || (isVi ? 'ĐÁM CHÁY' : 'FIRE')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[9px]">
              <span className="text-cyan-300 font-bold">{navCalc.distKm.toFixed(1)} KM</span>
              <span className="text-slate-400">• ETA {navCalc.etaFormatted}</span>
            </div>
            <div className="text-[10px] font-bold">
              {Math.abs(navCalc.relBearing) <= 3 ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <span>▲</span> {isVi ? 'ĐÚNG HƯỚNG' : 'ON COURSE'}
                </span>
              ) : navCalc.relBearing < 0 ? (
                <span className="text-amber-400 flex items-center gap-0.5 animate-pulse">
                  <span>◄</span> {isVi ? 'RẼ TRÁI' : 'LEFT'} {Math.abs(Math.round(navCalc.relBearing))}°
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-0.5 animate-pulse">
                  <span>►</span> {isVi ? 'RẼ PHẢI' : 'RIGHT'} {Math.round(navCalc.relBearing)}°
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2b. 3D In-Cockpit HUD Target Reticle (Direct view only, no duplicate edge arrows) */}
      {navCalc && targetFire && navCalc.isInFov && (
        <div
          className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse"
          style={{
            left: `${navCalc.screenXPercent}%`,
            top: `${navCalc.screenYPercent}%`,
          }}
        >
          <div className="w-14 h-14 border-2 border-dashed border-rose-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.8)] bg-rose-500/10">
            <Flame className="w-5 h-5 text-rose-400 animate-bounce" />
          </div>
          <div className="mt-1 px-2 py-0.5 bg-slate-950/90 border border-rose-500/60 rounded-md text-[9px] font-bold text-white shadow-xl flex items-center gap-1 whitespace-nowrap">
            <span>🔥 {navCalc.distKm.toFixed(1)} KM</span>
            <span className="text-amber-400">| {targetFire.frp?.toFixed(1) || 25} MW</span>
          </div>
        </div>
      )}

      {/* 3. Top Left: Tactical SITREP & Mission Mode (Compact Header) */}
      <div className="pointer-events-auto absolute top-4 left-4 z-20 flex flex-col gap-1.5 max-w-sm">
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-xl px-2.5 py-1.5 shadow-xl">
          <div
            className={cx(
              'w-2.5 h-2.5 rounded-full shrink-0 animate-ping',
              flightState.mode === 'manual' ? 'bg-amber-400' : 'bg-emerald-400'
            )}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                {flightState.mode === 'ground' && (isVi ? 'ĐƯỜNG BĂNG - CHUẨN BỊ' : 'RUNWAY PREP')}
                {flightState.mode === 'takeoff' && (isVi ? 'CẤT CÁNH & LẤY ĐỘ CAO' : 'LIFTOFF & CLIMB')}
                {flightState.mode === 'transit' && (isVi ? 'BAY TIẾP CẬN ĐÁM CHÁY' : 'ENROUTE TRANSIT')}
                {flightState.mode === 'orbit' && (isVi ? 'TUẦN TRA QUANH TÂM CHÁY' : 'TACTICAL FIRE ORBIT')}
                {flightState.mode === 'manual' && (isVi ? 'CHẾ ĐỘ TỰ LÁI FPV' : 'MANUAL PILOT (FPV)')}
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 border border-cyan-600/50 font-mono text-cyan-300">
                {flightState.mode === 'manual' ? 'MANUAL' : 'AUTO'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {flightState.airbase ? (
                <span>
                  {flightState.airbase.icao} ({flightState.airbase.name.split('(')[0].trim()})
                </span>
              ) : (
                <span>FOB ALPHA</span>
              )}
              {flightState.targetFire && (
                <span className="text-amber-400 ml-1 font-mono">
                  • FRP: {flightState.targetFire.frp || 25} MW
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mode Toggle & Help Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-200 hover:text-white transition-colors shadow-lg"
          >
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>
              {flightState.mode === 'manual'
                ? isVi ? 'Tự Động (Tab)' : 'Auto (Tab)'
                : isVi ? 'Tự Lái FPV (Tab)' : 'Manual (Tab)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 hover:text-white transition-colors shadow-lg"
            title={isVi ? 'Phím điều khiển' : 'Controls Cheat Sheet'}
          >
            <Keyboard className="w-3 h-3 text-cyan-400" />
            <span>{isVi ? 'Phím tắt' : 'Keys'}</span>
          </button>
        </div>
      </div>

      {/* 4. Top Right: Fullscreen & Exit Mission Buttons */}
      <div className="pointer-events-auto absolute top-4 right-4 z-20 flex items-center gap-2">
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-xs shadow-2xl transition-all duration-150 backdrop-blur-md border border-slate-700/80"
            title={isFullscreen ? (isVi ? 'Thu nhỏ bản đồ (F)' : 'Exit Fullscreen (F)') : (isVi ? 'Toàn màn hình (F)' : 'Fullscreen (F)')}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-cyan-400" />
                <span>{isVi ? 'Thu nhỏ (F)' : 'Windowed (F)'}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-cyan-400" />
                <span>{isVi ? 'Toàn màn hình (F)' : 'Fullscreen (F)'}</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs shadow-2xl transition-all duration-150 backdrop-blur-md border border-rose-400/40"
        >
          <X className="w-4 h-4" />
          <span>{isVi ? 'Thoát Buồng Lái (Esc)' : 'Exit Cockpit (Esc)'}</span>
        </button>
      </div>

      {/* 5. Center Artificial Horizon & Pitch Ladder */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Reticle: Aircraft Boresight Cross */}
        <div className="relative w-16 h-16 flex items-center justify-center z-10 opacity-80">
          <div className="w-3 h-0.5 bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full border border-amber-400 mx-1" />
          <div className="w-3 h-0.5 bg-amber-400" />
          <div className="absolute top-2 w-0.5 h-2 bg-amber-400" />
        </div>

        {/* Dynamic Rotating/Translating Pitch Ladder */}
        <div
          className="absolute w-80 h-80 flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `rotate(${-instruments.roll}deg) translateY(${pitchOffsetPx}px)`,
          }}
        >
          {/* Main Horizon Line */}
          <div className="absolute w-72 h-0.5 bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />

          {/* +10 Degree Pitch Line */}
          <div className="absolute -top-14 w-44 flex items-center justify-between">
            <div className="w-12 h-0.5 bg-cyan-400 border-l-2 border-cyan-400 h-2" />
            <span className="text-[10px] font-bold text-cyan-300">10</span>
            <div className="w-12 h-0.5 bg-cyan-400 border-r-2 border-cyan-400 h-2" />
          </div>

          {/* +20 Degree Pitch Line */}
          <div className="absolute -top-28 w-36 flex items-center justify-between">
            <div className="w-10 h-0.5 bg-cyan-400 border-l-2 border-cyan-400 h-2" />
            <span className="text-[10px] font-bold text-cyan-300">20</span>
            <div className="w-10 h-0.5 bg-cyan-400 border-r-2 border-cyan-400 h-2" />
          </div>

          {/* -10 Degree Pitch Line (Dashed) */}
          <div className="absolute top-14 w-44 flex items-center justify-between">
            <div className="w-12 h-0.5 border-t border-dashed border-cyan-400 border-l-2 border-cyan-400 h-2" />
            <span className="text-[10px] font-bold text-cyan-400/80">-10</span>
            <div className="w-12 h-0.5 border-t border-dashed border-cyan-400 border-r-2 border-cyan-400 h-2" />
          </div>

          {/* -20 Degree Pitch Line (Dashed) */}
          <div className="absolute top-28 w-36 flex items-center justify-between">
            <div className="w-10 h-0.5 border-t border-dashed border-cyan-400 border-l-2 border-cyan-400 h-2" />
            <span className="text-[10px] font-bold text-cyan-400/80">-20</span>
            <div className="w-10 h-0.5 border-t border-dashed border-cyan-400 border-r-2 border-cyan-400 h-2" />
          </div>
        </div>

        {/* Bank Roll Indicator Arc */}
        <div className="absolute top-1/2 -translate-y-48 w-48 h-24 border-t-2 border-x-2 border-cyan-500/30 rounded-t-full flex justify-center items-start pt-1 pointer-events-none">
          <div
            className="w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-amber-400 transition-transform duration-75"
            style={{
              transform: `rotate(${-instruments.roll}deg)`,
              transformOrigin: '50% 92px',
            }}
          />
        </div>
      </div>

      {/* 6. Left: Airspeed Tape (IAS in Knots - Central corridor, never collides with MFD) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center transition-all pointer-events-none"
        style={{ left: 'clamp(252px, calc(50% - 150px), calc(50% - 110px))' }}
      >
        <div className="relative w-14 h-52 bg-slate-950/85 border border-cyan-500/50 rounded-xl backdrop-blur-md flex flex-col justify-between p-1.5 shadow-2xl">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center border-b border-slate-800 pb-0.5">
            IAS KTS
          </div>

          {/* Rolling Tape display */}
          <div className="flex-1 flex flex-col justify-around text-right text-[11px] pr-1 font-mono text-cyan-300/70">
            <div>{instruments.airspeed + 40}</div>
            <div>{instruments.airspeed + 20}</div>
            <div className="text-white font-bold text-xs bg-cyan-950/90 px-1 py-0.5 rounded border border-cyan-400">
              {instruments.airspeed}
            </div>
            <div>{Math.max(0, instruments.airspeed - 20)}</div>
            <div>{Math.max(0, instruments.airspeed - 40)}</div>
          </div>

          {/* Stall tick line */}
          <div className="text-[9px] text-rose-400 border-t border-rose-500/40 pt-0.5 text-center font-bold">
            VS0: 95
          </div>
        </div>
      </div>

      {/* 7. Right: Altimeter & VSI Tape */}
      <div
        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 transition-all pointer-events-none"
        style={{ right: 'clamp(16px, calc(50% - 158px), calc(50% - 110px))' }}
      >
        {/* Altimeter Tape (ALT MSL in Feet) */}
        <div className="relative w-16 h-52 bg-slate-950/85 border border-cyan-500/50 rounded-xl backdrop-blur-md flex flex-col justify-between p-1.5 shadow-2xl">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center border-b border-slate-800 pb-0.5">
            ALT FT
          </div>

          <div className="flex-1 flex flex-col justify-around text-left text-[11px] pl-1 font-mono text-cyan-300/70">
            <div>{instruments.altimeter + 400}</div>
            <div>{instruments.altimeter + 200}</div>
            <div className="text-white font-bold text-xs bg-cyan-950/90 px-1 py-0.5 rounded border border-cyan-400">
              {instruments.altimeter}
            </div>
            <div>{Math.max(0, instruments.altimeter - 200)}</div>
            <div>{Math.max(0, instruments.altimeter - 400)}</div>
          </div>

          {/* Radio Altimeter AGL */}
          <div className="text-[9px] text-emerald-400 border-t border-emerald-500/40 pt-0.5 text-center font-bold">
            R: {instruments.altitudeAGL}
          </div>
        </div>

        {/* VSI (Vertical Speed Indicator in FPM) */}
        <div className="relative w-6 h-40 bg-slate-950/85 border border-cyan-500/40 rounded-lg flex flex-col items-center justify-between py-1.5 text-[8px] text-slate-400">
          <span>+2</span>
          <span>+1</span>
          <div className="w-full h-0.5 bg-amber-400" />
          <span>-1</span>
          <span>-2</span>
        </div>
      </div>

      {/* 8. Bottom Left: Tactical Navigation MFD (Mini-Map & Radar, Collapsible) */}
      <div className="pointer-events-auto absolute bottom-4 left-4 z-20 flex flex-col">
        {isMfdCollapsed ? (
          <button
            type="button"
            onClick={() => setIsMfdCollapsed(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 text-cyan-300 hover:text-white shadow-xl backdrop-blur-md text-[11px] font-bold transition-all hover:scale-105"
            title="Mở rộng Tactical MFD Mini-Map"
          >
            <Map className="w-3.5 h-3.5 text-cyan-400" />
            <span>MFD {mfdMode.toUpperCase()}</span>
            {navCalc && (
              <span className="font-mono text-amber-300 text-[10px]">
                {navCalc.distKm.toFixed(1)} KM • ETA {navCalc.etaFormatted}
              </span>
            )}
          </button>
        ) : (
          <div className="w-56 h-60 rounded-2xl bg-slate-950/95 border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.2)] backdrop-blur-md overflow-hidden flex flex-col p-2 select-none">
            {/* MFD Header Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1 text-[10px]">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMfdMode('nav')}
                  className={cx(
                    'px-2 py-0.5 rounded font-bold transition-all',
                    mfdMode === 'nav'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-1">
                    <Map className="w-2.5 h-2.5" />
                    <span>NAV</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMfdMode('radar')}
                  className={cx(
                    'px-2 py-0.5 rounded font-bold transition-all',
                    mfdMode === 'radar'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5" />
                    <span>RADAR</span>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-1">
                {/* Range Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setMfdRangeKm((prev) => (prev === 15 ? 35 : prev === 35 ? 70 : 15));
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] font-mono text-cyan-400 hover:text-white transition-colors"
                  title="Click to toggle range"
                >
                  {mfdRangeKm}KM
                </button>

                {/* Collapse MFD */}
                <button
                  type="button"
                  onClick={() => setIsMfdCollapsed(true)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Thu nhỏ MFD Mini-map"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

          {/* MFD Display Canvas */}
          <div className="relative flex-1 bg-slate-900/60 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center">
            {/* SVG Vector Map / Radar */}
            <svg className="w-full h-full" viewBox="0 0 200 160">
              {/* Range rings */}
              <circle cx="100" cy="80" r="24" fill="none" stroke="rgba(34, 211, 238, 0.15)" strokeWidth="1" />
              <circle cx="100" cy="80" r="48" fill="none" stroke="rgba(34, 211, 238, 0.2)" strokeWidth="1" />
              <circle cx="100" cy="80" r="72" fill="none" stroke="rgba(34, 211, 238, 0.3)" strokeWidth="1" strokeDasharray="3 3" />

              {/* Center Crosshairs */}
              <line x1="100" y1="10" x2="100" y2="150" stroke="rgba(34, 211, 238, 0.15)" strokeWidth="1" />
              <line x1="20" y1="80" x2="180" y2="80" stroke="rgba(34, 211, 238, 0.15)" strokeWidth="1" />

              {mfdMode === 'nav' && (
                <>
                  {/* Waypoints Route Line */}
                  {flightState.route?.waypoints && flightState.route.waypoints.length > 0 && (
                    <polyline
                      points={flightState.route.waypoints
                        .map((wp) => {
                          const dist = haversineDistKm(flightState.latitude, flightState.longitude, wp.lat, wp.lon);
                          const absBrg = calcBearing(flightState.latitude, flightState.longitude, wp.lat, wp.lon);
                          const relBrg = ((absBrg - instruments.heading + 540) % 360) - 180;
                          const rad = ((relBrg - 90) * Math.PI) / 180;
                          const rPx = Math.min(76, (dist / mfdRangeKm) * 72);
                          const px = 100 + Math.cos(rad) * rPx;
                          const py = 80 + Math.sin(rad) * rPx;
                          return `${px.toFixed(1)},${py.toFixed(1)}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      className="opacity-80"
                    />
                  )}

                  {/* Waypoint Nodes */}
                  {flightState.route?.waypoints?.map((wp, idx) => {
                    const dist = haversineDistKm(flightState.latitude, flightState.longitude, wp.lat, wp.lon);
                    const absBrg = calcBearing(flightState.latitude, flightState.longitude, wp.lat, wp.lon);
                    const relBrg = ((absBrg - instruments.heading + 540) % 360) - 180;
                    const rad = ((relBrg - 90) * Math.PI) / 180;
                    const rPx = Math.min(76, (dist / mfdRangeKm) * 72);
                    const px = 100 + Math.cos(rad) * rPx;
                    const py = 80 + Math.sin(rad) * rPx;
                    const isTarget = idx === flightState.targetWaypointIndex;

                    return (
                      <g key={idx}>
                        <circle
                          cx={px}
                          cy={py}
                          r={isTarget ? 3.5 : 2}
                          fill={isTarget ? '#f59e0b' : '#38bdf8'}
                        />
                        <text
                          x={px + 4}
                          y={py - 3}
                          fill={isTarget ? '#f59e0b' : '#94a3b8'}
                          fontSize="6.5"
                          fontWeight="bold"
                        >
                          {wp.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Target Fire with Orbit Circle */}
                  {targetFire && (
                    (() => {
                      const dist = haversineDistKm(flightState.latitude, flightState.longitude, targetFire.lat, targetFire.lon);
                      const absBrg = calcBearing(flightState.latitude, flightState.longitude, targetFire.lat, targetFire.lon);
                      const relBrg = ((absBrg - instruments.heading + 540) % 360) - 180;
                      const rad = ((relBrg - 90) * Math.PI) / 180;
                      const rPx = Math.min(76, (dist / mfdRangeKm) * 72);
                      const px = 100 + Math.cos(rad) * rPx;
                      const py = 80 + Math.sin(rad) * rPx;
                      const orbitRadiusPx = Math.max(6, (1.8 / mfdRangeKm) * 72);

                      return (
                        <g className="animate-pulse">
                          {/* 1.8km Orbit Ring */}
                          <circle
                            cx={px}
                            cy={py}
                            r={orbitRadiusPx}
                            fill="rgba(244, 63, 94, 0.1)"
                            stroke="#f43f5e"
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                          />
                          {/* Target Center Fire Marker */}
                          <circle cx={px} cy={py} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                          <text x={px + 5} y={py + 3} fill="#ef4444" fontSize="7.5" fontWeight="bold">
                            FIRE {targetFire.frp ? Math.round(targetFire.frp) + 'MW' : ''}
                          </text>
                        </g>
                      );
                    })()
                  )}
                </>
              )}

              {/* Hotspot Radar Blips (Rendered in both modes) */}
              {instruments.radarContacts.map((contact) => {
                const rPx = Math.min(74, (contact.relativeDistanceKm / mfdRangeKm) * 72);
                const rad = ((contact.relativeBearingDeg - 90) * Math.PI) / 180;
                const px = 100 + Math.cos(rad) * rPx;
                const py = 80 + Math.sin(rad) * rPx;
                const isHighFrp = contact.frp >= 25;

                return (
                  <circle
                    key={contact.id}
                    cx={px}
                    cy={py}
                    r={isHighFrp ? 2.5 : 1.8}
                    fill={isHighFrp ? '#ef4444' : '#f59e0b'}
                    className="animate-ping"
                  />
                );
              })}

              {/* Aircraft Center Symbol (Head-up pointing upward) */}
              <g transform="translate(100, 80)">
                <polygon points="0,-7 -5,6 0,3 5,6" fill="#22d3ee" stroke="#0891b2" strokeWidth="1" />
                <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
              </g>
            </svg>

            {/* Sweep beam animation only for Radar mode */}
            {mfdMode === 'radar' && (
              <div
                className="absolute inset-0 rounded-full animate-spin pointer-events-none"
                style={{
                  animationDuration: '4s',
                  background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0.4) 0deg, rgba(16, 185, 129, 0.0) 60deg, transparent 60deg)',
                }}
              />
            )}
          </div>

          {/* MFD Footer Nav Telemetry */}
          <div className="mt-1 flex items-center justify-between text-[9px] text-slate-300 font-mono px-1">
            <div>
              <span className="text-slate-500">BRG </span>
              <span className="text-amber-300 font-bold">
                {navCalc?.bearingDeg ? Math.round(navCalc.bearingDeg).toString().padStart(3, '0') + '°' : '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">DIST </span>
              <span className="text-cyan-300 font-bold">
                {navCalc ? navCalc.distKm.toFixed(1) + 'KM' : '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">ETA </span>
              <span className="text-emerald-400 font-bold">
                {navCalc ? navCalc.etaFormatted : '---'}
              </span>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* 9. Bottom Center: Throttle Gauge & Engine Controls */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-xl px-4 py-2 shadow-2xl">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">THR</span>
            <span className="text-xs font-mono font-bold text-cyan-300 w-10 text-right">
              {instruments.throttle}%
            </span>
          </div>

          {/* Throttle Bar */}
          <div className="w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 transition-all duration-75"
              style={{ width: `${instruments.throttle}%` }}
            />
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 pl-2 border-l border-slate-800">
            <span>PITCH:</span>
            <span className="font-mono text-white font-bold">{instruments.pitch}°</span>
            <span className="ml-1">ROLL:</span>
            <span className="font-mono text-white font-bold">{instruments.roll}°</span>
          </div>
        </div>
      </div>

      {/* 10. Warning Alert Banners */}
      {/* TERRAIN PULL UP (GCAS Fatal Collision Avoidance Warning) */}
      {instruments.gcasPullUp && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-rose-600 border-2 border-rose-300 text-white font-extrabold text-sm shadow-[0_0_50px_rgba(225,29,72,0.9)] animate-bounce tracking-widest">
          <AlertTriangle className="w-5 h-5 text-white animate-spin" />
          <span>TERRAIN PULL UP! PULL UP!</span>
        </div>
      )}

      {/* TERRAIN AHEAD (GCAS Caution Alert) */}
      {!instruments.gcasPullUp && instruments.gcasAlert && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500/90 border border-amber-300 text-slate-950 font-bold text-xs shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-pulse tracking-wide">
          <AlertTriangle className="w-4 h-4 text-slate-950" />
          <span>TERRAIN AHEAD - CLIMB (PITCH UP)</span>
        </div>
      )}

      {/* STALL WARNING */}
      {instruments.stallAlert && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-rose-700/90 border border-rose-400 text-white font-bold text-xs shadow-xl animate-pulse">
          <AlertTriangle className="w-4 h-4 text-white" />
          <span>STALL WARNING - INCREASE THROTTLE [W]</span>
        </div>
      )}

      {/* 11. Centered Modal: Controls Cheat Sheet (Never overlaps with flight instruments) */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 pointer-events-auto animate-fadeIn"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900/95 border-2 border-cyan-500/50 rounded-2xl p-4 shadow-[0_0_50px_rgba(34,211,238,0.3)] text-slate-200 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs tracking-wide">
                  {isVi ? 'Bảng Phím Điều Khiển Bay' : 'Flight Simulator Controls'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="rounded-lg bg-slate-950/60 p-2 border border-slate-800">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                  {isVi ? '🎮 Cần Lái Điều Hướng (Flight Stick)' : '🎮 Flight Control Stick'}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">↑</kbd> : {isVi ? 'Chúi mũi' : 'Pitch Down'}</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">↓</kbd> : {isVi ? 'Ngửa mũi / Kéo cao' : 'Pitch Up'}</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">←</kbd> : {isVi ? 'Đánh lái lượn trái' : 'Bank & Turn Left'}</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">→</kbd> : {isVi ? 'Đánh lái lượn phải' : 'Bank & Turn Right'}</div>
                </div>
              </div>

              <div className="rounded-lg bg-slate-950/60 p-2 border border-slate-800">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  {isVi ? '⚡ Ga & Độ Cao (Throttle & Altitude)' : '⚡ Throttle & Altitude'}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">W / S</kbd> : {isVi ? 'Tăng / Giảm Ga' : 'Throttle +/-'}</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">Space</kbd> : {isVi ? 'Lấy cao nhanh' : 'Quick Climb'}</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">Shift / C</kbd> : {isVi ? 'Hạ cao nhanh' : 'Quick Dive'}</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">Tab</kbd> : {isVi ? 'Tự lái / Tự động' : 'Manual / Auto'}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 border-t border-slate-800">
                <span><kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">F</kbd> {isVi ? 'Toàn màn hình' : 'Fullscreen'}</span>
                <span><kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">H</kbd> {isVi ? 'Ẩn/Hiện phím' : 'Hide/Show'}</span>
                <span><kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">Esc</kbd> {isVi ? 'Thoát' : 'Exit'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-amber-300/90 leading-tight">
              {isVi
                ? '💡 Mẹo: Chạm bất kỳ phím lái nào để ngắt Autopilot và tự lái FPV ngay tức thì (Auto-Takeover)!'
                : '💡 Tip: Press any flight key to instantly override Autopilot and take manual FPV control!'}
            </div>
            <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 text-center">
              {isVi ? 'Bấm bất kỳ đâu hoặc nhấn Esc để đóng' : 'Click anywhere or press Esc to close'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
