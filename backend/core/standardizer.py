"""
Data Cleaning, Schema Standardization & Confidence Normalization.
Converts heterogeneous MODIS and VIIRS telemetry into a canonical schema.
Supports Laplace prior clamping [0.05, 0.99] and coordinate boundary validation.
"""

import math
from datetime import datetime
from typing import Any, Tuple, Optional, List, Dict

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    pd = None
    HAS_PANDAS = False


def norm_modis_conf_scalar(val: Any) -> float:
    """Normalizes MODIS [0-100%] confidence to [0.05, 0.99] with Laplace prior floor/ceiling."""
    try:
        v = float(val)
        if math.isnan(v):
            v = 50.0
    except (ValueError, TypeError):
        v = 50.0
    return max(0.05, min(0.99, v / 100.0))


def norm_viirs_conf_scalar(val: Any) -> float:
    """Normalizes VIIRS categorical (l, n, h) or numeric confidence to [0.05, 0.99]."""
    mapping = {
        "l": 0.30,
        "low": 0.30,
        "n": 0.70,
        "nominal": 0.70,
        "h": 0.95,
        "high": 0.95,
    }
    s = str(val).strip().lower() if val is not None else ""
    if s in mapping:
        return mapping[s]
    try:
        v = float(val)
        if not math.isnan(v):
            return max(0.05, min(0.99, v / 100.0 if v > 1.0 else v))
    except (ValueError, TypeError):
        pass
    return 0.70


def norm_sat_scalar(val: Any, default_sat: str = "Unknown") -> str:
    """Standardizes satellite identifiers across Terra, Aqua, NOAA-20, NOAA-21, Suomi-NPP."""
    mapping = {
        "t": "Terra",
        "terra": "Terra",
        "a": "Aqua",
        "aqua": "Aqua",
        "n20": "NOAA-20",
        "noaa-20": "NOAA-20",
        "noaa20": "NOAA-20",
        "j1": "NOAA-20",
        "n21": "NOAA-21",
        "noaa-21": "NOAA-21",
        "noaa21": "NOAA-21",
        "j2": "NOAA-21",
        "n": "Suomi-NPP",
        "snpp": "Suomi-NPP",
        "suomi-npp": "Suomi-NPP",
    }
    if val is None or str(val).strip() == "":
        return default_sat
    s = str(val).strip()
    return mapping.get(s.lower(), s)


def parse_dt_scalar(acq_date: Any, acq_time: Any) -> Tuple[str, float]:
    """Parses date and time into UTC ISO format string and timestamp in hours."""
    d_str = str(acq_date).strip() if acq_date is not None else "2026-11-03"
    t_raw = str(acq_time).strip() if acq_time is not None else "0000"
    if "." in t_raw:
        t_raw = t_raw.split(".")[0]
    t_str = t_raw.zfill(4)
    iso_str = f"{d_str}T{t_str[:2]}:{t_str[2:4]}:00"
    try:
        yr = int(d_str[0:4])
        mo = int(d_str[5:7])
        dy = int(d_str[8:10])
        hr = int(t_str[0:2])
        mn = int(t_str[2:4])
        dt = datetime(yr, mo, dy, hr, mn)
        ts_hours = dt.timestamp() / 3600.0
    except (ValueError, IndexError):
        try:
            dt = datetime.strptime(f"{d_str} {t_str[:2]}:{t_str[2:4]}", "%Y-%m-%d %H:%M")
            ts_hours = dt.timestamp() / 3600.0
        except ValueError:
            ts_hours = 0.0
    return iso_str, ts_hours


def validate_wgs84_coord(lat_raw: Any, lon_raw: Any) -> Optional[Tuple[float, float]]:
    """Validates finite WGS84 latitude [-90, 90] and longitude [-180, 180]."""
    try:
        lat = float(lat_raw)
        lon = float(lon_raw)
    except (ValueError, TypeError):
        return None
    if not (math.isfinite(lat) and math.isfinite(lon)):
        return None
    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        return None
    return lat, lon


def safe_finite_float(val: Any, default: float, low: float, high: float) -> float:
    """Parses a numeric attribute with NaN/Inf protection and physical bounds clamping."""
    try:
        v = float(val) if val is not None and str(val).strip() != "" else default
        if not math.isfinite(v):
            v = default
    except (ValueError, TypeError):
        v = default
    return max(low, min(high, v))


def to_records(data: Any) -> List[Dict[str, Any]]:
    """Converts a pandas DataFrame or list-like into a clean list of dictionaries."""
    if data is None:
        return []
    if HAS_PANDAS and isinstance(data, pd.DataFrame):
        return data.to_dict(orient="records")
    if isinstance(data, list):
        return [dict(r) for r in data if isinstance(r, dict)]
    return []


def standardize_modis_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Standardizes raw MODIS records to unified schema."""
    out = []
    for r in records:
        coord = validate_wgs84_coord(r.get("latitude"), r.get("longitude"))
        if coord is None:
            continue
        lat, lon = coord
        sat = norm_sat_scalar(r.get("satellite"), default_sat="Terra")
        sensor = f"MODIS_{sat.replace('-', '')}"
        conf_norm = norm_modis_conf_scalar(r.get("confidence", 50.0))
        frp = safe_finite_float(r.get("frp"), default=0.0, low=0.0, high=100000.0)
        brightness = safe_finite_float(r.get("brightness"), default=300.0, low=200.0, high=1000.0)
        scan = safe_finite_float(r.get("scan"), default=1.0, low=0.5, high=5.0)
        track = safe_finite_float(r.get("track"), default=1.0, low=0.5, high=5.0)

        fp_rad = 0.5 * math.sqrt(scan * scan + track * track)
        t_str = str(r.get("acq_time", "0000")).split(".")[0].strip().zfill(4)
        d_str = str(r.get("acq_date", "2026-11-03")).strip()
        iso_dt, ts_hours = parse_dt_scalar(d_str, t_str)
        hour_utc = int(t_str[:2]) if t_str[:2].isdigit() else 12
        dn = str(r.get("daynight") or ("D" if 6 <= hour_utc <= 18 else "N")).strip()

        item = dict(r)
        item.update(
            {
                "latitude": lat,
                "longitude": lon,
                "acq_date": d_str,
                "acq_time": t_str,
                "datetime_utc": iso_dt,
                "_ts_hours": ts_hours,
                "satellite": sat,
                "sensor": sensor,
                "sensor_family": "MODIS",
                "spatial_res_m": 1000,
                "conf_norm": conf_norm,
                "frp": frp,
                "brightness": brightness,
                "scan": scan,
                "track": track,
                "footprint_radius_km": fp_rad,
                "daynight": dn,
            }
        )
        out.append(item)
    return out


def standardize_viirs_records(
    records: List[Dict[str, Any]], sensor_label: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Standardizes raw VIIRS records to unified schema."""
    sat_to_sensor = {
        "NOAA-20": "VIIRS_N20",
        "NOAA-21": "VIIRS_N21",
        "Suomi-NPP": "VIIRS_SNPP",
    }
    out = []
    for r in records:
        coord = validate_wgs84_coord(r.get("latitude"), r.get("longitude"))
        if coord is None:
            continue
        lat, lon = coord
        has_sat = "satellite" in r and r["satellite"] is not None and str(r["satellite"]).strip() != ""
        sat = norm_sat_scalar(r.get("satellite"), default_sat="NOAA-20")
        if sensor_label is not None and not has_sat:
            sensor = sensor_label
        else:
            sensor = sat_to_sensor.get(sat, "VIIRS")

        conf_norm = norm_viirs_conf_scalar(r.get("confidence", "nominal"))
        frp = safe_finite_float(r.get("frp"), default=0.0, low=0.0, high=100000.0)
        b_raw = r.get("bright_ti4", r.get("bright_t31", r.get("brightness", 300.0)))
        brightness = safe_finite_float(b_raw, default=300.0, low=200.0, high=1000.0)
        scan = safe_finite_float(r.get("scan"), default=0.375, low=0.2, high=2.0)
        track = safe_finite_float(r.get("track"), default=0.375, low=0.2, high=2.0)

        fp_rad = 0.5 * math.sqrt(scan * scan + track * track)
        t_str = str(r.get("acq_time", "0000")).split(".")[0].strip().zfill(4)
        d_str = str(r.get("acq_date", "2026-11-03")).strip()
        iso_dt, ts_hours = parse_dt_scalar(d_str, t_str)
        hour_utc = int(t_str[:2]) if t_str[:2].isdigit() else 12
        dn = str(r.get("daynight") or ("D" if 6 <= hour_utc <= 18 else "N")).strip()

        item = dict(r)
        item.update(
            {
                "latitude": lat,
                "longitude": lon,
                "acq_date": d_str,
                "acq_time": t_str,
                "datetime_utc": iso_dt,
                "_ts_hours": ts_hours,
                "satellite": sat,
                "sensor": sensor,
                "sensor_family": "VIIRS",
                "spatial_res_m": 375,
                "conf_norm": conf_norm,
                "frp": frp,
                "brightness": brightness,
                "scan": scan,
                "track": track,
                "footprint_radius_km": fp_rad,
                "daynight": dn,
            }
        )
        out.append(item)
    return out
