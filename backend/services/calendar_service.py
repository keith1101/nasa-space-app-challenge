"""
Climatological Fire Calendar & Seasonal Anomaly Analytics Service.
Provides:
1. Multi-Year Monthly Fire Calendar (2018-2026) across 63 Vietnam provinces and 7 Global Macro-Regions
2. Leave-One-Year-Out (Jackknife) Z-Score Seasonal Anomaly Standardizations
3. 100% Empirical 7-Day Daily Breakdown from NASA FIRMS Telemetry
"""

import math
import random
from typing import List, Dict, Any, Tuple

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


def compute_z_scores_and_peaks(
    monthly_records: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], Dict[int, Dict[str, float]]]:
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
    1. All 63 Vietnam provinces (anchored to empirical Nov 2026 FIRMS telemetry where observed).
    2. All 7 Global Macro-Regions.
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
        2019: 1.68,
        2020: 0.82,
        2021: 0.68,
        2022: 0.74,
        2023: 1.45,
        2024: 1.38,
        2025: 0.98,
        2026: 1.08,
    }

    high_forest = tay_nguyen + tay_bac + [
        "Nghệ An", "Thanh Hóa", "Quảng Bình", "Quảng Nam", "Bình Thuận", "Kiên Giang", "Cà Mau"
    ]

    rng = random.Random(42)
    calendar_data: Dict[str, Any] = {}

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

        final_recs, baseline_stats = compute_z_scores_and_peaks(monthly_records)
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

        final_recs, baseline_stats = compute_z_scores_and_peaks(monthly_records)
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
