"""
Global & Regional Dataset Builder for NASA FIRMS Harmonization Platform
Processes global 24h NASA FIRMS feeds (MODIS + VIIRS) across all continents,
runs Spatio-Temporal Harmonization, and generates global & regional datasets
without breaking regional dashboard compatibility.
Supports zero-dependency pure-Python standard-library execution.
"""

import csv
import json
import math
import random
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.build_dataset import load_data, assign_province, generate_multi_year_calendar
from backend.harmonizer import FireHarmonizer

DATA_DIR = ROOT_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
GEOJSON_DIR = DATA_DIR / "geojson"
PUBLIC_DATA_DIR = ROOT_DIR / "frontend" / "public" / "data"
DIST_DATA_DIR = ROOT_DIR / "frontend" / "dist" / "data"

PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)


def build_global_harmonized_catalog() -> Dict[str, Any]:
    print("Loading Global 24h NASA FIRMS feeds...")
    conf_map = {"low": 0.3, "l": 0.3, "nominal": 0.7, "n": 0.7, "high": 0.95, "h": 0.95}
    grid_scale = 0.012  # ~1.3 km spatial envelope

    # Group accumulator: key = (pass_key, gx, gy)
    groups: Dict[Tuple[str, int, int], Dict[str, Any]] = {}
    modis_raw_all: List[List[float]] = []
    viirs_raw_all: List[List[float]] = []

    modis_raw_count = 0
    viirs_raw_count = 0

    def ingest_row(
        lat: float,
        lon: float,
        family: str,
        sat: str,
        conf_norm: float,
        frp: float,
        scan: float,
        track: float,
        acq_date: str,
        acq_time: str,
    ):
        t_str = str(acq_time).strip().zfill(4)
        acq_hour = int(t_str[:2]) if t_str[:2].isdigit() else 0
        time_bin_3h = acq_hour // 3
        # Latitude-scaled longitude cell width to compensate for meridian convergence cos(phi)
        cos_lat = max(0.25, math.cos(math.radians(lat)))
        lon_scale = grid_scale / cos_lat
        gx = int(math.floor(lon / lon_scale))
        gy = int(math.floor(lat / grid_scale))
        pass_key = f"{acq_date}_T{time_bin_3h}"
        key = (pass_key, gx, gy)

        pixel_area_km2 = max(0.05, scan * track)
        coord_w = (frp + 0.1) / pixel_area_km2

        g = groups.get(key)
        if g is None:
            groups[key] = {
                "w_lat_sum": lat * coord_w,
                "w_lon_sum": lon * coord_w,
                "w_sum": coord_w,
                "frp_by_sat": {sat: frp},
                "conf_by_sat": {sat: conf_norm},
                "n_modis": 1 if family == "MODIS" else 0,
                "n_viirs": 1 if family == "VIIRS" else 0,
                "raw_count": 1,
            }
        else:
            g["w_lat_sum"] += lat * coord_w
            g["w_lon_sum"] += lon * coord_w
            g["w_sum"] += coord_w
            g["frp_by_sat"][sat] = g["frp_by_sat"].get(sat, 0.0) + frp
            g["conf_by_sat"][sat] = max(g["conf_by_sat"].get(sat, 0.0), conf_norm)
            if family == "MODIS":
                g["n_modis"] += 1
            else:
                g["n_viirs"] += 1
            g["raw_count"] += 1

    # 1. Read Global MODIS 24h
    with open(RAW_DIR / "MODIS_C6_1_Global_24h.csv", "r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            try:
                lat = float(r["latitude"])
                lon = float(r["longitude"])
                frp = max(0.1, float(r.get("frp", 1.0) or 1.0))
                conf_val = max(0.0, min(100.0, float(r.get("confidence", 50.0) or 50.0)))
                scan = max(0.5, min(5.0, float(r.get("scan", 1.0) or 1.0)))
                track = max(0.5, min(5.0, float(r.get("track", 1.0) or 1.0)))
            except (ValueError, TypeError, KeyError):
                continue
            sat_raw = str(r.get("satellite", "Terra")).strip()
            sat = {"T": "Terra", "A": "Aqua"}.get(sat_raw, sat_raw)
            conf_norm = max(0.05, min(0.99, conf_val / 100.0))
            ingest_row(lat, lon, "MODIS", sat, conf_norm, frp, scan, track, r.get("acq_date", ""), r.get("acq_time", "0000"))
            modis_raw_all.append([round(lat, 4), round(lon, 4), round(frp, 1), int(conf_val)])
            modis_raw_count += 1

    # 2. Read Global VIIRS (J1 NOAA-20 + J2 NOAA-21)
    for csv_name, sat_name in [("J1_VIIRS_C2_Global_24h.csv", "NOAA-20"), ("J2_VIIRS_C2_Global_24h.csv", "NOAA-21")]:
        with open(RAW_DIR / csv_name, "r", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                try:
                    lat = float(r["latitude"])
                    lon = float(r["longitude"])
                    frp = max(0.1, float(r.get("frp", 1.0) or 1.0))
                    scan = max(0.2, min(2.0, float(r.get("scan", 0.38) or 0.38)))
                    track = max(0.2, min(2.0, float(r.get("track", 0.38) or 0.38)))
                except (ValueError, TypeError, KeyError):
                    continue
                c_norm = conf_map.get(str(r.get("confidence", "n")).strip().lower(), 0.70)
                ingest_row(lat, lon, "VIIRS", sat_name, c_norm, frp, scan, track, r.get("acq_date", ""), r.get("acq_time", "0000"))
                viirs_raw_all.append([round(lat, 4), round(lon, 4), round(frp, 1), int(c_norm * 100)])
                viirs_raw_count += 1

    total_raw = modis_raw_count + viirs_raw_count
    total_harm = len(groups)
    dual_count = 0
    viirs_present_count = 0
    total_frp = 0.0
    points: List[List[Any]] = []

    for g in groups.values():
        lat = g["w_lat_sum"] / g["w_sum"]
        lon = g["w_lon_sum"] / g["w_sum"]
        frp_reconciled = max(g["frp_by_sat"].values()) if g["frp_by_sat"] else 1.0
        total_frp += frp_reconciled
        is_dual = 1 if (g["n_modis"] > 0 and g["n_viirs"] > 0) else 0
        if is_dual:
            dual_count += 1
        if g["n_viirs"] > 0:
            viirs_present_count += 1

        unconf = 1.0
        for c in g["conf_by_sat"].values():
            unconf *= 1.0 - c
        fused_conf = min(0.99, 1.0 - unconf)
        if is_dual and max(g["conf_by_sat"].values(), default=0.0) >= 0.50:
            fused_conf = max(fused_conf, 0.92)

        points.append(
            [
                round(lat, 4),
                round(lon, 4),
                round(frp_reconciled, 1),
                int(round(fused_conf * 100)),
                is_dual,
                int(g["raw_count"]),
            ]
        )

    dedup_rate = round((1.0 - total_harm / total_raw) * 100.0, 2) if total_raw > 0 else 0.0
    res_375m_ratio = round((viirs_present_count / total_harm) * 100.0, 1) if total_harm > 0 else 0.0
    mean_frp = round(total_frp / total_harm, 2) if total_harm > 0 else 0.0

    rng = random.Random(42)
    modis_sample = rng.sample(modis_raw_all, min(len(modis_raw_all), 15000))
    viirs_sample = rng.sample(viirs_raw_all, min(len(viirs_raw_all), 35000))

    print(f"Global Harmonization Complete: {total_raw:,} raw -> {total_harm:,} harmonized clusters (-{dedup_rate}%)")

    global_catalog = {
        "title": "Global Harmonized Active Fire Hotspots",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_raw": total_raw,
        "raw_modis_count": modis_raw_count,
        "raw_viirs_count": viirs_raw_count,
        "total_harmonized": total_harm,
        "dedup_rate_percent": dedup_rate,
        "dual_confirmed_count": dual_count,
        "high_res_375m_percent": res_375m_ratio,
        "total_frp_mw": round(total_frp, 1),
        "mean_frp_mw": mean_frp,
        "harmonized_points": points,
        "modis_raw_points": modis_sample,
        "viirs_raw_points": viirs_sample,
    }

    out_path = PUBLIC_DATA_DIR / "fires_global_harmonized.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(global_catalog, f)
    if DIST_DATA_DIR.exists():
        (DIST_DATA_DIR / "fires_global_harmonized.json").write_bytes(out_path.read_bytes())
    print(f"Exported global catalog to {out_path} ({out_path.stat().st_size / 1024 / 1024:.2f} MB)")

    return global_catalog


def main():
    vn_modis, vn_viirs, province_features = load_data()
    harmonizer = FireHarmonizer(spatial_eps_km=1.25, time_window_hours=3.0, use_footprint=True)
    recs_m = assign_province(harmonizer._standardize_modis_records(vn_modis), province_features)
    recs_v = assign_province(harmonizer._standardize_viirs_records(vn_viirs), province_features)
    harm_recs, _ = harmonizer.harmonize_records(recs_m, recs_v)
    recs_h = assign_province(harm_recs, province_features)

    build_global_harmonized_catalog()

    calendar_data = generate_multi_year_calendar(province_features, recs_h, recs_m, recs_v)
    out_cal_path = PUBLIC_DATA_DIR / "calendar_matrix.json"
    with open(out_cal_path, "w", encoding="utf-8") as f:
        json.dump(calendar_data, f)
    if DIST_DATA_DIR.exists():
        (DIST_DATA_DIR / "calendar_matrix.json").write_bytes(out_cal_path.read_bytes())
    print(f"Updated unified Multi-Year Calendar at {out_cal_path} ({len(calendar_data)} regions)")
    print("Global Data Engineering Pipeline Complete!")


if __name__ == "__main__":
    main()
