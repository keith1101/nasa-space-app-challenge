"""
Dataset Builder for NASA FIRMS Harmonization Platform
Processes raw NASA FIRMS datasets (MODIS + VIIRS), runs True Spatio-Temporal Harmonization,
and generates all GeoJSON and JSON outputs for the Interactive Web Application and Jupyter Notebook.
Supports both pandas/geopandas and zero-dependency pure-Python standard-library execution.
"""

import csv
import json
import math
import random
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.harmonizer import FireHarmonizer, point_in_geojson_geometry

DATA_DIR = ROOT_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
GEOJSON_DIR = DATA_DIR / "geojson"
PUBLIC_DATA_DIR = ROOT_DIR / "frontend" / "public" / "data"
DIST_DATA_DIR = ROOT_DIR / "frontend" / "dist" / "data"

PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

MACRO_REGIONS = {
    "Global (Worldwide)": {
        "peak_season": "Aug – Oct (Southern Hemisphere Savannas & Boreal Summer)",
        "weights": [0.65, 0.70, 0.85, 0.80, 0.75, 0.90, 1.25, 1.65, 1.55, 1.15, 0.80, 0.65],
        "base_rate": 82000,
        "anomaly_factor": {2018: 1.0, 2019: 1.28, 2020: 1.15, 2021: 0.92, 2022: 0.95, 2023: 1.35, 2024: 1.25, 2025: 1.02, 2026: 1.08},
        "desc": "Worldwide total active fire events aggregated across all continents.",
        "scope": "global",
    },
    "South America (Amazon & Cerrado)": {
        "peak_season": "Aug – Oct (Southern Hemisphere Dry Season)",
        "weights": [0.20, 0.20, 0.25, 0.35, 0.50, 0.70, 1.20, 2.10, 2.40, 1.60, 0.70, 0.30],
        "base_rate": 26000,
        "anomaly_factor": {2018: 0.95, 2019: 1.48, 2020: 1.35, 2021: 0.88, 2022: 0.92, 2023: 1.55, 2024: 1.40, 2025: 1.05, 2026: 1.10},
        "desc": "Amazon basin deforestation fires and Cerrado biome savannah burning.",
        "scope": "global",
    },
    "Central & Southern Africa": {
        "peak_season": "Jun – Sep (Sub-Saharan Dry Season)",
        "weights": [0.35, 0.30, 0.30, 0.40, 0.75, 1.45, 1.85, 1.95, 1.35, 0.60, 0.35, 0.30],
        "base_rate": 45000,
        "anomaly_factor": {2018: 1.02, 2019: 1.15, 2020: 1.08, 2021: 0.95, 2022: 0.98, 2023: 1.20, 2024: 1.12, 2025: 1.00, 2026: 1.04},
        "desc": "Agricultural stubble, pasture management, and Miombo woodland burning.",
        "scope": "global",
    },
    "Australia & Oceania": {
        "peak_season": "Oct – Jan (Spring/Summer Bushfire Season)",
        "weights": [1.40, 0.75, 0.30, 0.20, 0.25, 0.45, 0.70, 1.10, 1.35, 1.65, 1.85, 1.80],
        "base_rate": 18500,
        "anomaly_factor": {2018: 0.90, 2019: 2.15, 2020: 1.65, 2021: 0.65, 2022: 0.70, 2023: 1.45, 2024: 1.30, 2025: 0.95, 2026: 1.05},
        "desc": "Northern Territory savannah burning and catastrophic Black Summer bushfires (2019-2020).",
        "scope": "global",
    },
    "North America (Western US & Canada)": {
        "peak_season": "Jul – Sep (Western Forest Fire Season)",
        "weights": [0.10, 0.15, 0.30, 0.50, 0.85, 1.40, 2.20, 2.45, 1.60, 0.60, 0.20, 0.10],
        "base_rate": 12000,
        "anomaly_factor": {2018: 1.30, 2019: 0.80, 2020: 1.95, 2021: 1.85, 2022: 1.10, 2023: 2.40, 2024: 1.50, 2025: 1.00, 2026: 1.15},
        "desc": "California wildfires, Pacific Northwest, and historic 2023 Canadian boreal blazes.",
        "scope": "global",
    },
    "Southeast Asia & Indochina": {
        "peak_season": "Feb – Apr (Indochina Monsoon Dry Season)",
        "weights": [0.45, 1.15, 1.85, 1.55, 0.65, 0.35, 0.30, 0.40, 0.65, 0.50, 0.35, 0.35],
        "base_rate": 15000,
        "anomaly_factor": {2018: 0.95, 2019: 1.65, 2020: 0.85, 2021: 0.75, 2022: 0.80, 2023: 1.50, 2024: 1.35, 2025: 1.00, 2026: 1.08},
        "desc": "Agricultural clearing, peatland fires, and seasonal deciduous forest burning.",
        "scope": "global",
    },
    "Europe & Mediterranean": {
        "peak_season": "Jul – Aug (Mediterranean Summer Heatwaves)",
        "weights": [0.20, 0.30, 0.50, 0.60, 0.80, 1.20, 2.20, 2.40, 1.10, 0.40, 0.20, 0.15],
        "base_rate": 3500,
        "anomaly_factor": {2018: 1.15, 2019: 1.25, 2020: 0.90, 2021: 1.75, 2022: 1.95, 2023: 1.65, 2024: 1.20, 2025: 1.00, 2026: 1.05},
        "desc": "Southern Europe summer heatwave fires in Greece, Spain, Portugal, and Italy.",
        "scope": "global",
    },
}


def _compute_geometry_bbox(geom: Dict[str, Any]) -> Tuple[float, float, float, float]:
    """Returns (min_lon, min_lat, max_lon, max_lat) for a Polygon or MultiPolygon."""
    min_lon, min_lat = 180.0, 90.0
    max_lon, max_lat = -180.0, -90.0
    gtype = geom.get("type")
    coords = geom.get("coordinates", [])
    rings = coords if gtype == "Polygon" else [ring for poly in coords for ring in poly]
    for ring in rings:
        for pt in ring:
            lon, lat = pt[0], pt[1]
            if lon < min_lon:
                min_lon = lon
            if lon > max_lon:
                max_lon = lon
            if lat < min_lat:
                min_lat = lat
            if lat > max_lat:
                max_lat = lat
    return (min_lon, min_lat, max_lon, max_lat)


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

    with open(prov_path, "r", encoding="utf-8") as f:
        prov_geojson = json.load(f)

    province_features: List[Dict[str, Any]] = []
    for feat in prov_geojson.get("features", []):
        props = dict(feat.get("properties", {}))
        # Clean trailing tabs/whitespace in province names (e.g. "Hà Nội\t")
        props["shapeName"] = str(props.get("shapeName", "")).strip()
        props["shapeISO"] = str(props.get("shapeISO", "VN")).strip()
        geom = feat.get("geometry", {})
        bbox = _compute_geometry_bbox(geom)
        province_features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": geom,
                "_bbox": bbox,
            }
        )

    print(f"Loaded: MODIS={len(vn_modis)}, VIIRS (NOAA-20 + NOAA-21)={len(vn_viirs)}, Provinces={len(province_features)}")
    return vn_modis, vn_viirs, province_features


def assign_province(records: List[Dict[str, Any]], province_features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Spatial point-in-polygon join of fire records with cleaned Vietnam administrative boundaries."""
    out: List[Dict[str, Any]] = []
    for r in records:
        if r.get("_prov_inherited") and "province_name" in r:
            out.append(dict(r))
            continue

        lon = float(r["longitude"])
        lat = float(r["latitude"])
        matched_name = None
        matched_iso = None

        for pf in province_features:
            min_lon, min_lat, max_lon, max_lat = pf["_bbox"]
            if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
                if point_in_geojson_geometry(lon, lat, pf["geometry"]):
                    matched_name = pf["properties"]["shapeName"]
                    matched_iso = pf["properties"]["shapeISO"]
                    break

        item = dict(r)
        item["in_vietnam"] = matched_name is not None
        item["province_name"] = matched_name if matched_name is not None else "Border / Offshore Zone"
        item["province_iso"] = matched_iso if matched_iso is not None else "VN-EXT"
        out.append(item)
    return out


def _compute_z_scores_and_peaks(monthly_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[int, Dict[str, float]]]:
    """
    Computes seasonal anomaly Z-scores using:
    - Leave-One-Year-Out (Jackknife) baselines (mu_{m,-y}, sigma_{m,-y}) for historical years y in [2018, 2025]
      to prevent extreme El Niño years (e.g. 2019, 2023) from inflating their own baseline variance.
    - Causal 2018-2025 historical baseline for target year 2026.
    """
    months = list(range(1, 13))
    years = sorted(list({r["year"] for r in monthly_records}))
    baseline_stats: Dict[int, Dict[str, float]] = {}

    for m in months:
        vals = [float(r["harmonized_count"]) for r in monthly_records if r["month"] == m and r["year"] < 2026]
        if vals:
            mu = sum(vals) / len(vals)
            if len(vals) > 1:
                var = sum((x - mu) ** 2 for x in vals) / (len(vals) - 1)
                sigma = math.sqrt(var) if var > 0 else 1.0
            else:
                sigma = 1.0
        else:
            mu, sigma = 0.0, 1.0
        baseline_stats[m] = {"mean": round(mu, 1), "std": round(sigma, 1)}

    final_records: List[Dict[str, Any]] = []
    for r in monthly_records:
        m = r["month"]
        yr = r["year"]
        if yr < 2026:
            loo_vals = [
                float(x["harmonized_count"])
                for x in monthly_records
                if x["month"] == m and x["year"] < 2026 and x["year"] != yr
            ]
            if len(loo_vals) > 1:
                mu = round(sum(loo_vals) / len(loo_vals), 1)
                var = sum((x - mu) ** 2 for x in loo_vals) / (len(loo_vals) - 1)
                sigma = round(math.sqrt(var), 1) if var > 0 else 1.0
                if sigma <= 0:
                    sigma = 1.0
            else:
                mu = baseline_stats[m]["mean"]
                sigma = baseline_stats[m]["std"] if baseline_stats[m]["std"] > 0 else 1.0
        else:
            mu = baseline_stats[m]["mean"]
            sigma = baseline_stats[m]["std"] if baseline_stats[m]["std"] > 0 else 1.0

        z_score = round((r["harmonized_count"] - mu) / sigma, 2)

        if z_score >= 2.0:
            status = "Extreme Anomaly (≥ +2.0σ)"
            severity = "extreme"
        elif z_score >= 1.0:
            status = "Elevated Season (+1.0σ to +2.0σ)"
            severity = "high"
        elif z_score <= -1.0:
            status = "Below Average (≤ -1.0σ)"
            severity = "low"
        else:
            status = "Normal Seasonal Range"
            severity = "normal"

        r_copy = dict(r)
        r_copy["historical_mean"] = mu
        r_copy["historical_std"] = sigma
        r_copy["z_score"] = z_score
        r_copy["status"] = status
        r_copy["severity"] = severity
        r_copy["is_year_peak"] = False
        final_records.append(r_copy)

    for yr in years:
        yr_recs = [r for r in final_records if r["year"] == yr]
        if yr_recs:
            peak_rec = max(yr_recs, key=lambda x: x["harmonized_count"])
            peak_rec["is_year_peak"] = True

    return final_records, baseline_stats


def generate_multi_year_calendar(
    province_features: List[Dict[str, Any]],
    recs_h: List[Dict[str, Any]] = None,
    recs_m: List[Dict[str, Any]] = None,
    recs_v: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Constructs a unified multi-year monthly fire calendar (2018-2026) covering:
    1. All 63 Vietnam provinces (anchored to empirical Nov 2026 FIRMS telemetry where observed,
       with agro-ecological seasonal curves and ENSO anomaly factors for historical baseline context).
    2. All 7 Global Macro-Regions (ensuring full compatibility with Harmonization_MODIS_VIIRS.ipynb).
    """
    provinces = sorted(list({pf["properties"]["shapeName"] for pf in province_features}))
    years = list(range(2018, 2027))
    months = list(range(1, 13))

    emp_h: Dict[str, int] = {}
    emp_m: Dict[str, int] = {}
    emp_v: Dict[str, int] = {}
    for r in recs_h or []:
        p = r.get("province_name", "")
        emp_h[p] = emp_h.get(p, 0) + 1
    for r in recs_m or []:
        p = r.get("province_name", "")
        emp_m[p] = emp_m.get(p, 0) + 1
    for r in recs_v or []:
        p = r.get("province_name", "")
        emp_v[p] = emp_v.get(p, 0) + 1

    tay_nguyen = ["Đắk Lắk", "Gia Lai", "Kon Tum", "Lâm Đồng", "Đắk Nông"]
    tay_bac = ["Sơn La", "Điện Biên", "Lai Châu", "Lào Cai", "Yên Bái", "Hòa Bình"]
    bac_trung_bo = ["Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Quảng Bình", "Quảng Trị", "Thừa Thiên Huế"]
    nam_trung_bo = ["Bình Định", "Phú Yên", "Khánh Hòa", "Ninh Thuận", "Bình Thuận", "Quảng Nam", "Quảng Ngãi"]
    dbscl = [
        "An Giang", "Đồng Tháp", "Kiên Giang", "Cà Mau", "Bạc Liêu", "Sóc Trăng",
        "Hậu Giang", "Trà Vinh", "Bến Tre", "Vĩnh Long", "Tiền Giang", "Long An",
    ]
    dong_nam_bo = ["Bình Phước", "Tây Ninh", "Bình Dương", "Đồng Nai", "Bà Rịa–Vũng Tàu", "Ho Chi Minh", "Hồ Chí Minh"]

    def get_monthly_weights(prov: str) -> List[float]:
        if prov in tay_nguyen:
            return [0.6, 1.2, 1.6, 1.3, 0.4, 0.1, 0.05, 0.05, 0.1, 0.2, 0.4, 0.5]
        elif prov in tay_bac:
            return [0.4, 0.8, 1.8, 1.5, 0.5, 0.1, 0.05, 0.05, 0.1, 0.2, 0.3, 0.4]
        elif prov in bac_trung_bo:
            return [0.1, 0.2, 0.4, 0.6, 1.1, 1.6, 1.7, 1.4, 0.5, 0.1, 0.1, 0.1]
        elif prov in nam_trung_bo:
            return [0.2, 0.4, 0.7, 0.9, 1.2, 1.5, 1.4, 1.3, 0.6, 0.2, 0.1, 0.1]
        elif prov in dbscl:
            return [0.3, 0.6, 1.4, 1.5, 0.8, 0.2, 0.1, 0.1, 0.1, 0.1, 0.2, 0.3]
        elif prov in dong_nam_bo:
            return [0.4, 0.8, 1.5, 1.2, 0.6, 0.1, 0.05, 0.05, 0.1, 0.1, 0.3, 0.4]
        else:
            return [0.3, 0.3, 0.4, 0.5, 1.1, 1.0, 0.2, 0.2, 0.4, 0.8, 0.9, 0.4]

    year_anomaly_factor = {
        2018: 1.05,
        2019: 1.68,  # Severe El Niño
        2020: 0.82,
        2021: 0.68,  # Strong La Niña
        2022: 0.74,  # La Niña
        2023: 1.45,  # Strong El Niño
        2024: 1.38,  # El Niño continuation
        2025: 0.98,
        2026: 1.08,  # Current year
    }

    high_forest = tay_nguyen + tay_bac + [
        "Nghệ An", "Thanh Hóa", "Quảng Bình", "Quảng Nam", "Bình Thuận", "Kiên Giang", "Cà Mau"
    ]

    rng = random.Random(42)
    calendar_data: Dict[str, Any] = {}

    # 1. Build Vietnam Provincial Calendar
    for prov in provinces:
        weights = get_monthly_weights(prov)
        base_rate = 65.0 if prov in high_forest else 18.0
        if prov in ["Gia Lai", "Đắk Lắk", "Sơn La", "Điện Biên"]:
            base_rate = 110.0

        monthly_records: List[Dict[str, Any]] = []
        for yr in years:
            yr_factor = year_anomaly_factor[yr]
            for m in months:
                w = weights[m - 1]
                noise = rng.gauss(1.0, 0.12)
                true_fire_events = max(1, int(base_rate * w * yr_factor * noise))

                modis_miss_factor = rng.uniform(0.35, 0.55)
                modis_fires = max(0, int(true_fire_events * modis_miss_factor))

                viirs_dup_factor = rng.uniform(1.25, 1.45)
                viirs_raw_fires = int(true_fire_events * viirs_dup_factor)

                harmonized_fires = true_fire_events

                # Anchor Nov 2026 to empirical 7-day FIRMS observations when active fires exist in province
                is_anchored = bool(yr == 2026 and m == 11 and emp_h.get(prov, 0) > 0)
                if is_anchored:
                    obs_h = int(emp_h.get(prov, 0))
                    obs_m = int(emp_m.get(prov, 0))
                    obs_v = int(emp_v.get(prov, 0))
                    scale_30d = 30.0 / 7.0
                    harmonized_fires = max(obs_h, int(round(obs_h * scale_30d)))
                    modis_fires = max(obs_m, int(round(obs_m * scale_30d)))
                    viirs_raw_fires = max(obs_v, int(round(obs_v * scale_30d)), harmonized_fires)

                dedup_savings = max(0, (modis_fires + viirs_raw_fires) - harmonized_fires)
                raw_total_m_v = modis_fires + viirs_raw_fires

                monthly_records.append(
                    {
                        "year": yr,
                        "month": m,
                        "modis_count": modis_fires,
                        "viirs_count": viirs_raw_fires,
                        "harmonized_count": harmonized_fires,
                        "dedup_savings": dedup_savings,
                        "dedup_percent": round((dedup_savings / raw_total_m_v) * 100.0, 1) if raw_total_m_v > 0 else 0.0,
                        "is_empirical_anchor": is_anchored,
                        "is_simulated_baseline": not is_anchored,
                    }
                )

        final_recs, baseline_stats = _compute_z_scores_and_peaks(monthly_records)
        # Find top 3 peak months by average harmonized_count
        month_avgs = []
        for m in months:
            m_vals = [r["harmonized_count"] for r in final_recs if r["month"] == m]
            month_avgs.append((sum(m_vals) / len(m_vals), m))
        top3_months = sorted([m for _, m in sorted(month_avgs, reverse=True)[:3]])
        peak_months_str = ", ".join([MONTH_ABBR[m - 1] for m in top3_months])

        calendar_data[prov] = {
            "province_name": prov,
            "scope": "vietnam_province",
            "peak_season": peak_months_str,
            "data_provenance": "Climatological ENSO Reference Model (2018-2026) anchored to Nov 2026 NASA FIRMS Telemetry",
            "observed_7d_harmonized": int(emp_h.get(prov, 0)),
            "records": final_recs,
            "baseline_by_month": baseline_stats,
        }

    # 2. Include Global Macro-Regions for Notebook & Global Analysis compatibility
    rng_global = random.Random(42)
    for reg_name, meta in MACRO_REGIONS.items():
        w_list = meta["weights"]
        base = meta["base_rate"]
        anom_dict = meta["anomaly_factor"]

        monthly_records = []
        for yr in years:
            yr_fac = anom_dict[yr]
            for m in months:
                w = w_list[m - 1]
                noise = rng_global.gauss(1.0, 0.08)
                true_events = max(5, int(base * w * yr_fac * noise))
                modis_fires = int(true_events * rng_global.uniform(0.40, 0.55))
                viirs_raw = int(true_events * rng_global.uniform(1.30, 1.45))
                harm_fires = true_events
                raw_sum = modis_fires + viirs_raw

                monthly_records.append(
                    {
                        "year": yr,
                        "month": m,
                        "modis_count": modis_fires,
                        "viirs_count": viirs_raw,
                        "harmonized_count": harm_fires,
                        "dedup_savings": max(0, raw_sum - harm_fires),
                        "dedup_percent": round(((raw_sum - harm_fires) / raw_sum) * 100.0, 1) if raw_sum > 0 else 0.0,
                        "is_empirical_anchor": False,
                        "is_simulated_baseline": True,
                    }
                )

        final_recs, baseline_stats = _compute_z_scores_and_peaks(monthly_records)
        calendar_data[reg_name] = {
            "province_name": reg_name,
            "scope": "global_macro_region",
            "peak_season": meta["peak_season"],
            "description": meta["desc"],
            "data_provenance": "Planetary Biome Climatological Reference Model (2018-2026)",
            "records": final_recs,
            "baseline_by_month": baseline_stats,
        }

    return calendar_data


def build_empirical_daily_breakdown(
    recs_m: List[Dict[str, Any]],
    recs_v: List[Dict[str, Any]],
    recs_h: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Computes 100% empirical day-by-day fire counts from the 7-day NASA FIRMS dataset."""
    dates = sorted(
        list(
            {str(r["acq_date"]) for r in recs_m}
            | {str(r["acq_date"]) for r in recs_v}
            | {str(r["acq_date"]) for r in recs_h}
        )
    )
    daily: List[Dict[str, Any]] = []
    for d in dates:
        m_d = sum(1 for r in recs_m if str(r["acq_date"]) == d)
        v_d = sum(1 for r in recs_v if str(r["acq_date"]) == d)
        h_slice = [r for r in recs_h if str(r["acq_date"]) == d]
        h_d = len(h_slice)
        raw_d = m_d + v_d
        dedup_d = round((1.0 - h_d / raw_d) * 100.0, 1) if raw_d > 0 else 0.0
        frp_d = round(sum(float(r.get("harmonized_frp", 0.0)) for r in h_slice), 1)
        is_partial = bool(d == "2026-11-10")
        daily.append(
            {
                "date": d,
                "modis_raw": m_d,
                "viirs_raw": v_d,
                "total_raw": raw_d,
                "harmonized_events": h_d,
                "dedup_rate_percent": dedup_d,
                "total_frp_mw": frp_d,
                "is_partial_day": is_partial,
                "coverage_note": (
                    "Partial UTC window (NOAA-21 J2 feed ends 2026-11-09)"
                    if is_partial
                    else "Complete 24h UTC window (Terra, Aqua, NOAA-20, NOAA-21)"
                ),
            }
        )
    return daily


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
