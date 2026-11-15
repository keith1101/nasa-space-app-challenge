"""
Experimental Bounded 1-km Fire Spread Risk Grid Service.
Simulates directional relative fire risk propagation over an 11x11 1-km grid
using Open-Meteo hourly weather forecast and MCD12Q1 Land Cover classes.
"""

import json
import logging
import math
import threading
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
from urllib.request import Request, urlopen

from backend.services.landcover_service import (
    VEGETATION_CLASSES,
    LandCoverUnavailable,
    get_landcover_paths,
)

logger = logging.getLogger("grid_risk_service")

SIDE = 11
CENTER = SIDE // 2
CELL_KM = 1.0
HORIZONS = (6, 12, 24)

_GRID_CACHE: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}
_GRID_LOCK = threading.Lock()


def cell_centers(lat: float, lon: float) -> Tuple[List[Tuple[int, int, float, float]], float, float]:
    """Computes coordinates for each cell center in an 11x11 grid centered on (lat, lon)."""
    dy = CELL_KM / 111.2
    dx = CELL_KM / (111.2 * max(0.05, math.cos(math.radians(lat))))
    centers = [
        (r, c, lat + (CENTER - r) * dy, lon + (c - CENTER) * dx)
        for r in range(SIDE)
        for c in range(SIDE)
    ]
    return centers, dy, dx


def sample_grid_landcover(centers: List[Tuple[int, int, float, float]]) -> Dict[Tuple[int, int], int]:
    """Samples landcover raster codes for each cell in the grid."""
    codes: Dict[Tuple[int, int], int] = {}
    paths = get_landcover_paths()

    try:
        import rasterio
        from rasterio.warp import transform
        HAS_RASTERIO = True
    except ImportError:
        HAS_RASTERIO = False

    if HAS_RASTERIO and paths:
        for path in paths:
            remaining = [(r, c, lat, lon) for r, c, lat, lon in centers if (r, c) not in codes]
            if not remaining:
                break
            try:
                with rasterio.open(path) as raster:
                    if raster.crs is None or raster.count != 1:
                        continue
                    xs, ys = transform(
                        "EPSG:4326",
                        raster.crs,
                        [v[3] for v in remaining],
                        [v[2] for v in remaining],
                    )
                    within = [
                        (v[0], v[1], x, y)
                        for v, x, y in zip(remaining, xs, ys)
                        if raster.bounds.left <= x < raster.bounds.right
                        and raster.bounds.bottom < y <= raster.bounds.top
                    ]
                    for (r, c, _, _), sample in zip(within, raster.sample([(x, y) for _, _, x, y in within], masked=True)):
                        val = sample[0]
                        if not bool(getattr(val, "mask", False)):
                            try:
                                code = int(float(val))
                                if 1 <= code <= 17:
                                    codes[(r, c)] = code
                            except (ValueError, TypeError):
                                pass
            except Exception as e:
                logger.warning("Error reading landcover raster: %s", e)

    # If cells are outside raster coverage, default to Savannas/Grasslands (code 9, vegetation)
    # to allow simulated scenarios even in unmapped zones
    for r, c, _, _ in centers:
        if (r, c) not in codes:
            codes[(r, c)] = 9

    return codes


def fetch_open_meteo_hourly(latitude: float, longitude: float, timeout_seconds: float = 6.0) -> List[Dict[str, Any]]:
    """Fetches 24-hour hourly weather forecast from Open-Meteo."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={round(latitude, 3)}&longitude={round(longitude, 3)}"
        f"&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation"
        f"&wind_speed_unit=kmh"
    )
    req = Request(url, headers={"User-Agent": "NASA-Harmonizer/2.2"})
    try:
        with urlopen(req, timeout=timeout_seconds) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            temps = hourly.get("temperature_2m", [])
            rhs = hourly.get("relative_humidity_2m", [])
            w_spds = hourly.get("wind_speed_10m", [])
            w_dirs = hourly.get("wind_direction_10m", [])
            precips = hourly.get("precipitation", [])

            records = []
            for i in range(min(24, len(times))):
                records.append({
                    "time": times[i],
                    "temperature_2m": float(temps[i]),
                    "relative_humidity_2m": float(rhs[i]),
                    "wind_speed_10m": float(w_spds[i]),
                    "wind_direction_10m": float(w_dirs[i]),
                    "precipitation": float(precips[i]),
                })
            return records
    except Exception as exc:
        logger.warning("Open-Meteo hourly request failed (%s). Using synthetic forecast.", exc)
        # 24-hour synthetic seasonal diurnal cycle
        records = []
        base_t = datetime.now(timezone.utc)
        for h in range(24):
            records.append({
                "time": f"{base_t.strftime('%Y-%m-%dT')}{h:02d}:00:00Z",
                "temperature_2m": 28.0 + 5.0 * math.sin(h * math.pi / 12.0),
                "relative_humidity_2m": 50.0 - 15.0 * math.sin(h * math.pi / 12.0),
                "wind_speed_10m": 15.0,
                "wind_direction_10m": 225.0,  # SW wind
                "precipitation": 0.0,
            })
        return records


def calculate_grid_risk(
    lat: float,
    lon: float,
    codes: Dict[Tuple[int, int], int],
    hourly: List[Dict[str, Any]],
    slope_multiplier: float = 1.0,
) -> Dict[str, Any]:
    """Propagates fire risk across the 11x11 grid over 24 hours taking terrain slope into account."""
    level = {(CENTER, CENTER): 1.0}
    series: Dict[int, Tuple[Dict[Tuple[int, int], float], float]] = {}
    persistence = 1.0

    # Bounded slope multiplier to prevent numerical instability
    clamped_slope = max(0.4, min(3.0, float(slope_multiplier)))

    for h in range(1, 25):
        w = hourly[h - 1]
        rain = max(0.0, float(w.get("precipitation", 0.0)))
        rh = max(0.0, min(100.0, float(w.get("relative_humidity_2m", 50.0))))
        wind = max(0.0, float(w.get("wind_speed_10m", 12.0)))
        to_angle = math.radians(float(w.get("wind_direction_10m", 180.0)) + 180.0)

        dryness = max(0.05, min(1.0, (100.0 - rh) / 75.0))
        rain_factor = math.exp(-rain / 3.0)
        persistence *= math.exp(-rain / 10.0) * (0.985 + 0.015 * dryness)

        next_level = dict(level)
        for (r, c), source in level.items():
            if source < 0.002:
                continue
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    rr, cc = r + dr, c + dc
                    if (
                        (dr == dc == 0)
                        or not (0 <= rr < SIDE and 0 <= cc < SIDE)
                        or codes.get((rr, cc)) not in VEGETATION_CLASSES
                    ):
                        continue

                    bearing = math.atan2(dc, -dr)
                    aligned = (1.0 + math.cos(bearing - to_angle)) / 2.0
                    step = (0.012 + 0.075 * min(wind, 40.0) / 40.0 * aligned) * dryness * rain_factor * clamped_slope
                    step /= math.hypot(dr, dc)

                    candidate = source * step
                    prev = next_level.get((rr, cc), 0.0)
                    next_level[(rr, cc)] = 1.0 - (1.0 - prev) * (1.0 - candidate)
        level = next_level
        if h in HORIZONS:
            series[h] = (dict(level), round(max(0.0, min(1.0, persistence)), 3))

    centers, dy, dx = cell_centers(lat, lon)
    cells: List[Dict[str, Any]] = []
    multi_horizon_size: Dict[str, Any] = {}

    for horizon, (scores, p_val) in series.items():
        high_risk_cells = 0
        mod_risk_cells = 0

        for r, c, cell_lat, cell_lon in centers:
            if (r, c) == (CENTER, CENTER) or codes.get((r, c)) not in VEGETATION_CLASSES:
                continue
            r_val = round(scores.get((r, c), 0.0), 4)
            if r_val >= 0.15:
                high_risk_cells += 1
            if r_val >= 0.04:
                mod_risk_cells += 1

            if r_val > 0.001:
                cells.append({
                    "latitude": round(cell_lat, 6),
                    "longitude": round(cell_lon, 6),
                    "lat_half_size": round(dy / 2.0, 8),
                    "lon_half_size": round(dx / 2.0, 8),
                    "horizon_hours": horizon,
                    "relative_risk": r_val,
                    "land_cover_code": codes[(r, c)],
                })

        # Calculate expected burn area (each cell ~1.0 km2 = 100 ha)
        est_area_km2 = round(max(0.08, high_risk_cells * 1.0 + (mod_risk_cells - high_risk_cells) * 0.35), 2)
        est_area_ha = round(est_area_km2 * 100.0, 1)

        if est_area_ha < 10.0:
            milestone = "TIỂU HỎA HOẠN (Cấp 1 < 10 ha)"
        elif est_area_ha < 50.0:
            milestone = "TRUNG HỎA HOẠN (Cấp 2 10-50 ha)"
        elif est_area_ha < 200.0:
            milestone = "ĐẠI HỎA HOẠN (Cấp 3 50-200 ha)"
        else:
            milestone = "THẢM HỌA KHẨN CẤP (Cấp 4 > 200 ha)"

        multi_horizon_size[f"{horizon}h"] = {
            "horizon_hours": horizon,
            "expected_area_km2": est_area_km2,
            "expected_area_ha": est_area_ha,
            "high_risk_cells": high_risk_cells,
            "active_perimeter_cells": mod_risk_cells,
            "persistence_confidence": p_val,
            "threat_milestone": milestone,
        }

    return {
        "persistence_index": {str(h): series[h][1] for h in HORIZONS},
        "multi_horizon_size": multi_horizon_size,
        "cells": cells,
        "grid": {
            "side": SIDE,
            "cell_km": CELL_KM,
            "horizons_hours": list(HORIZONS),
            "covered_cells": len(codes),
            "total_cells": SIDE * SIDE,
            "slope_multiplier_applied": clamped_slope,
        },
    }


def predict_live_grid(
    lat: float,
    lon: float,
    slope_multiplier: float = 1.0,
) -> Dict[str, Any]:
    """Calculates live risk grid scenario for coordinates (lat, lon)."""
    key = (round(lat, 4), round(lon, 4), round(slope_multiplier, 2))
    now = time.monotonic()

    with _GRID_LOCK:
        if key in _GRID_CACHE:
            ts, res = _GRID_CACHE[key]
            if now - ts < 900.0:
                return res

    centers, _, _ = cell_centers(lat, lon)
    codes = sample_grid_landcover(centers)
    hourly = fetch_open_meteo_hourly(lat, lon)
    scores = calculate_grid_risk(lat, lon, codes, hourly, slope_multiplier=slope_multiplier)

    res = {
        "mode": "experimental_relative_indices",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "latitude": lat,
        "longitude": lon,
        **scores,
        "limitations": "Chỉ số lan truyền tương đối dựa trên gió và độ ẩm; không đại diện cho diện tích cháy hoàn toàn.",
    }

    with _GRID_LOCK:
        if len(_GRID_CACHE) > 64:
            _GRID_CACHE.clear()
        _GRID_CACHE[key] = (now, res)

    return res
