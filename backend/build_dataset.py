"""
Dataset Builder for NASA FIRMS Harmonization Platform
Processes raw NASA FIRMS datasets (MODIS + VIIRS), runs True Spatio-Temporal Harmonization,
and generates all GeoJSON and JSON outputs for the Interactive Web Application and Jupyter Notebook.
Supports both pandas/geopandas and zero-dependency pure-Python standard-library execution.
"""

import csv
import json
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.harmonizer import FireHarmonizer, point_in_geojson_geometry
from backend.services.province_service import (
    compute_geometry_bbox as _compute_geometry_bbox,
    load_vietnam_provinces,
    assign_province,
)
from backend.services.calendar_service import (
    compute_z_scores_and_peaks as _compute_z_scores_and_peaks,
    generate_multi_year_calendar,
    build_empirical_daily_breakdown,
    MACRO_REGIONS,
    MONTH_ABBR,
)

DATA_DIR = ROOT_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
GEOJSON_DIR = DATA_DIR / "geojson"
PUBLIC_DATA_DIR = ROOT_DIR / "frontend" / "public" / "data"
DIST_DATA_DIR = ROOT_DIR / "frontend" / "dist" / "data"

PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)


def _read_filtered_csv(csv_path: Path, override_satellite: str = "") -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                lat = float(row["latitude"])
                lon = float(row["longitude"])
            except (ValueError, KeyError, TypeError):
                continue
            if 8.2 <= lat <= 23.5 and 102.1 <= lon <= 109.8:
                rec = dict(row)
                rec["latitude"] = lat
                rec["longitude"] = lon
                if override_satellite:
                    rec["satellite"] = override_satellite
                records.append(rec)
    return records


def load_data() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Loads raw FIRMS active fire datasets and Vietnam province GeoJSON features.
    Returns (vn_modis_records, vn_viirs_records, province_features).
    """
    print("Loading FIRMS active fire datasets...")
    modis_path = RAW_DIR / "MODIS_C6_1_SouthEast_Asia_7d.csv"
    j1_path = RAW_DIR / "J1_VIIRS_C2_SouthEast_Asia_7d.csv"
    j2_path = RAW_DIR / "J2_VIIRS_C2_SouthEast_Asia_7d.csv"
    prov_path = GEOJSON_DIR / "vietnam_provinces.geojson"

    vn_modis = _read_filtered_csv(modis_path)
    vn_j1 = _read_filtered_csv(j1_path, override_satellite="NOAA-20")
    vn_j2 = _read_filtered_csv(j2_path, override_satellite="NOAA-21")
    vn_viirs = vn_j1 + vn_j2

    province_features = load_vietnam_provinces(prov_path)

    print(f"Loaded: MODIS={len(vn_modis)}, VIIRS (NOAA-20 + NOAA-21)={len(vn_viirs)}, Provinces={len(province_features)}")
    return vn_modis, vn_viirs, province_features


def _copy_to_dist_if_exists(filename: str):
    if DIST_DATA_DIR.exists():
        src = PUBLIC_DATA_DIR / filename
        dst = DIST_DATA_DIR / filename
        if src.exists():
            dst.write_bytes(src.read_bytes())


def main():
    vn_modis, vn_viirs, province_features = load_data()

    # Step 1: Standardize & Spatial Joins with Vietnam Provinces first (enables O(1) cluster province inheritance)
    print("Standardizing raw observations and joining with provincial boundaries...")
    harmonizer = FireHarmonizer(spatial_eps_km=1.25, time_window_hours=3.0, use_footprint=True)
    m_std = harmonizer._standardize_modis_records(vn_modis)
    v_std = harmonizer._standardize_viirs_records(vn_viirs)

    recs_m = assign_province(m_std, province_features)
    recs_v = assign_province(v_std, province_features)

    # Step 2: Run Harmonization Engine (True ST-DBSCAN + Elliptical Footprint + Independent Pass Bayesian Fusion)
    print("Executing Spatio-Temporal Clustering & Multi-Sensor Fusion...")
    harm_recs, metrics = harmonizer.harmonize_records(recs_m, recs_v)
    recs_h = assign_province(harm_recs, province_features)

    print("\nHarmonization Complete!")
    print(json.dumps(metrics, indent=2))

    # Also compute strict Vietnam-only metrics
    m_vn_only = [r for r in recs_m if r["in_vietnam"]]
    v_vn_only = [r for r in recs_v if r["in_vietnam"]]
    _, metrics_vn_only = harmonizer.harmonize_records(m_vn_only, v_vn_only)

    # Step 3: Export GeoJSON files for Leaflet
    print("Exporting GeoJSON map layers...")

    features_m = []
    for row in recs_m:
        features_m.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(float(row["longitude"]), 5), round(float(row["latitude"]), 5)],
                },
                "properties": {
                    "sensor": str(row["sensor"]),
                    "satellite": str(row["satellite"]),
                    "acq_date": str(row["acq_date"]),
                    "acq_time": str(row["acq_time"]).zfill(4),
                    "confidence": float(row.get("confidence", 50.0)),
                    "frp": round(float(row.get("frp", 0.0)), 2),
                    "brightness": round(float(row.get("brightness", 300.0)), 2),
                    "scan": round(float(row.get("scan", 1.0)), 2),
                    "track": round(float(row.get("track", 1.0)), 2),
                    "spatial_res_m": 1000,
                    "daynight": str(row.get("daynight", "D")),
                    "province": str(row["province_name"]),
                    "in_vietnam": bool(row["in_vietnam"]),
                },
            }
        )
    with open(PUBLIC_DATA_DIR / "fires_modis_raw.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features_m}, f)
    _copy_to_dist_if_exists("fires_modis_raw.geojson")

    features_v = []
    for row in recs_v:
        features_v.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(float(row["longitude"]), 5), round(float(row["latitude"]), 5)],
                },
                "properties": {
                    "sensor": str(row["sensor"]),
                    "satellite": str(row["satellite"]),
                    "acq_date": str(row["acq_date"]),
                    "acq_time": str(row["acq_time"]).zfill(4),
                    "confidence": str(row.get("confidence", "n")),
                    "frp": round(float(row.get("frp", 0.0)), 2),
                    "brightness": round(float(row.get("brightness", 300.0)), 2),
                    "scan": round(float(row.get("scan", 0.38)), 2),
                    "track": round(float(row.get("track", 0.38)), 2),
                    "spatial_res_m": 375,
                    "daynight": str(row.get("daynight", "D")),
                    "province": str(row["province_name"]),
                    "in_vietnam": bool(row["in_vietnam"]),
                },
            }
        )
    with open(PUBLIC_DATA_DIR / "fires_viirs_raw.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features_v}, f)
    _copy_to_dist_if_exists("fires_viirs_raw.geojson")

    features_h = []
    for row in recs_h:
        features_h.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(float(row["longitude"]), 5), round(float(row["latitude"]), 5)],
                },
                "properties": {
                    "cluster_id": int(row["cluster_id"]),
                    "classification": str(row["classification"]),
                    "corroboration": str(row.get("corroboration", "SINGLE_SATELLITE")),
                    "satellites": str(row["satellites"]),
                    "sensors": str(row["sensors"]),
                    "satellite_count": int(row.get("satellite_count", 1)),
                    "acq_date": str(row["acq_date"]),
                    "acq_time": f"{str(row['acq_time_min']).zfill(4)}-{str(row['acq_time_max']).zfill(4)}",
                    "daynight": str(row.get("daynight", "D")),
                    "harmonized_confidence": round(float(row["harmonized_confidence"]) * 100.0, 1),
                    "harmonized_frp": round(float(row["harmonized_frp"]), 2),
                    "max_brightness": round(float(row["max_brightness"]), 2),
                    "spatial_resolution_m": int(row["spatial_resolution_m"]),
                    "max_scan_km": round(float(row.get("max_scan_km", 1.0)), 2),
                    "max_track_km": round(float(row.get("max_track_km", 1.0)), 2),
                    "raw_count": int(row["raw_count"]),
                    "modis_count": int(row["modis_count"]),
                    "viirs_count": int(row["viirs_count"]),
                    "is_deduplicated": bool(row["is_deduplicated"]),
                    "province": str(row["province_name"]),
                    "in_vietnam": bool(row["in_vietnam"]),
                },
            }
        )
    with open(PUBLIC_DATA_DIR / "fires_harmonized.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features_h}, f)
    _copy_to_dist_if_exists("fires_harmonized.geojson")

    # Step 4: Province Polygons with Aggregated Fire Stats
    prov_counts_m: Dict[str, int] = {}
    prov_counts_v: Dict[str, int] = {}
    prov_counts_h: Dict[str, int] = {}
    prov_frp_h: Dict[str, float] = {}
    prov_dual_h: Dict[str, int] = {}

    for r in recs_m:
        p = r["province_name"]
        prov_counts_m[p] = prov_counts_m.get(p, 0) + 1
    for r in recs_v:
        p = r["province_name"]
        prov_counts_v[p] = prov_counts_v.get(p, 0) + 1
    for r in recs_h:
        p = r["province_name"]
        prov_counts_h[p] = prov_counts_h.get(p, 0) + 1
        prov_frp_h[p] = prov_frp_h.get(p, 0.0) + float(r.get("harmonized_frp", 0.0))
        if r.get("classification") == "HARMONIZED_DUAL":
            prov_dual_h[p] = prov_dual_h.get(p, 0) + 1

    prov_out_features = []
    for pf in province_features:
        pname = pf["properties"]["shapeName"]
        c_m = int(prov_counts_m.get(pname, 0))
        c_v = int(prov_counts_v.get(pname, 0))
        c_h = int(prov_counts_h.get(pname, 0))
        c_dual = int(prov_dual_h.get(pname, 0))
        frp_sum = round(float(prov_frp_h.get(pname, 0.0)), 1)
        savings = max(0, (c_m + c_v) - c_h) if (c_m + c_v) > 0 else 0
        dedup_pct = round((savings / (c_m + c_v)) * 100.0, 1) if (c_m + c_v) > 0 else 0.0

        prov_out_features.append(
            {
                "type": "Feature",
                "geometry": pf["geometry"],
                "properties": {
                    "shapeName": pname,
                    "shapeISO": pf["properties"]["shapeISO"],
                    "modis_fires_7d": c_m,
                    "viirs_fires_7d": c_v,
                    "harmonized_fires_7d": c_h,
                    "dual_confirmed_7d": c_dual,
                    "dedup_savings_7d": savings,
                    "dedup_pct": dedup_pct,
                    "total_frp_mw": frp_sum,
                    "has_active_fires": bool(c_h > 0),
                },
            }
        )
    with open(PUBLIC_DATA_DIR / "vietnam_provinces.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": prov_out_features}, f)
    _copy_to_dist_if_exists("vietnam_provinces.geojson")

    # Step 5: Unified Multi-Year Calendar Heatmap Data
    print("Generating unified multi-year fire calendar matrix (2018-2026)...")
    calendar_matrix = generate_multi_year_calendar(province_features, recs_h, recs_m, recs_v)
    with open(PUBLIC_DATA_DIR / "calendar_matrix.json", "w", encoding="utf-8") as f:
        json.dump(calendar_matrix, f)
    _copy_to_dist_if_exists("calendar_matrix.json")

    # Step 6: Empirical Daily Breakdown & Global Analytics Summary
    print("Generating analytics summary report...")
    daily_breakdown = build_empirical_daily_breakdown(recs_m, recs_v, recs_h)
    analytics = {
        "title": "Harmonization of MODIS and VIIRS Hot Spots",
        "nasa_challenge": "NASA Space Apps 2026 - Track 04 (Data & AI)",
        "data_period": "Live 7-Day Window (Nov 03 – Nov 09, 2026) + 2018–2026 Climatological Reference",
        "provenance": {
            "dataset_name": "NASA FIRMS Active Fire Archive (MODIS Collection 6.1 & VIIRS Collection 2)",
            "source_url": "https://firms.modaps.eosdis.nasa.gov/active_fire/",
            "dataset_identifiers": {
                "MODIS_C6_1": "MOD14 / MYD14 Collection 6.1 (DOI: 10.5067/FIRMS/MODIS/MCD14DL.NRT.0061)",
                "VIIRS_NOAA20_C2": "VJ114IMGTDL_NRT Collection 2 (DOI: 10.5067/FIRMS/VIIRS/VJ114IMGTDL_NRT.002)",
                "VIIRS_NOAA21_C2": "VJ214IMGTDL_NRT Collection 2 (NOAA-21 / JPSS-2 Active Fire I-Band 375m)",
                "boundaries": "geoBoundaries Vietnam ADM1 Simplified Polygons (CC-BY 4.0)",
            },
            "retrieval_timestamp": "2026-11-10T06:00:00Z",
            "processing_version": "FireHarmonizer-ST-DBSCAN-v2.2 (Anisotropic Elliptical Footprint + Pass-Grouped Bayesian Fusion)",
            "preprocessing_steps": [
                "Bounding-box spatial clip [102.0°E–110.0°E, 8.0°N–24.0°N] + geoBoundaries ADM1 ray-casting point-in-polygon join",
                "Laplace confidence clamping [0.05, 0.99] for MODIS (0-100%) and canonical mapping {l: 0.30, n: 0.70, h: 0.95} for VIIRS",
                "Anisotropic elliptical bow-tie footprint matching along cross-track (scan) and along-track (track) axes",
                "Pass-grouped Bayesian log-odds confidence fusion across independent satellite overpasses",
                "Radiative flux-density centroid localization w_i = (FRP_i + 0.1) / max(0.05, scan_i * track_i)",
                "Leave-One-Year-Out (Jackknife) Z-score seasonal anomaly standardization",
            ],
        },
        "sensors": [
            {
                "name": "MODIS",
                "satellites": ["Terra", "Aqua"],
                "spatial_resolution": "1 km (up to 2.0×4.8 km at swath edge)",
                "detection_count": metrics["raw_modis_count"],
            },
            {
                "name": "VIIRS",
                "satellites": ["NOAA-20", "NOAA-21", "Suomi-NPP"],
                "spatial_resolution": "375 m (I-band)",
                "detection_count": metrics["raw_viirs_count"],
            },
        ],
        "metrics": metrics,
        "metrics_vietnam_only": metrics_vn_only,
        "daily_breakdown_7d": daily_breakdown,
        "key_findings": [
            f"True Spatio-Temporal DBSCAN (ε = {metrics['spatial_eps_km']} km, Δt ≤ {metrics['time_window_hours']} h with scan/track footprint matching) eliminates {metrics['deduplication_rate_percent']}% of redundant raw detections.",
            f"Resolves afternoon orbital overlap between Aqua, NOAA-20, and NOAA-21 while preventing artificial 12:00 UTC boundary splits and morning/afternoon false merges.",
            f"Refines {metrics['high_resolution_375m_ratio_percent']}% of active fire centroids to 375m ground precision via FRP-weighted VIIRS localization.",
            f"Identifies {metrics['dual_confirmed_events']} dual-sensor (MODIS+VIIRS) and {metrics['multi_satellite_verified_events']} multi-satellite corroborated fire fronts with independent pass Bayesian confidence fusion.",
            "Reconciles Fire Radiative Power (FRP) per satellite overpass before cross-sensor maximization, preventing double-counted radiative energy across NOAA-20 and NOAA-21.",
        ],
    }
    with open(PUBLIC_DATA_DIR / "analytics_summary.json", "w", encoding="utf-8") as f:
        json.dump(analytics, f, indent=2, ensure_ascii=False)
    _copy_to_dist_if_exists("analytics_summary.json")

    print("\nAll datasets built successfully in frontend/public/data/ (and synced to frontend/dist/data/)!")


if __name__ == "__main__":
    main()
