"""
Multi-Sensor Fusion Engine for Active Fire Harmonization.
Provides:
1. Radiative Flux-Density Weighted Centroid Localization (375m refinement)
2. Pass-Reconciled Fire Radiative Power (FRP) Integration
3. Satellite-Independent Bayesian Confidence Fusion with Laplace Clamping
"""

from typing import List, Dict, Any, Tuple


def compute_flux_density_centroid(
    viirs_pts: List[Dict[str, Any]], modis_pts: List[Dict[str, Any]]
) -> Tuple[float, float, int]:
    """
    Computes radiative flux-density weighted spatial centroid:
    w_i = (FRP_i + 0.1) / max(0.05, scan_i * track_i)
    Favors 375m VIIRS when present, and weights sharp nadir pixels over smeared swath-edge pixels.
    Returns (cent_lat, cent_lon, resolved_resolution_m).
    """
    ref_pts = viirs_pts if len(viirs_pts) > 0 else modis_pts
    w_list = [
        (p["frp"] + 0.1) / max(0.05, float(p.get("scan", 1.0)) * float(p.get("track", 1.0)))
        for p in ref_pts
    ]
    w_sum = sum(w_list) if w_list else 1.0
    cent_lat = sum(p["latitude"] * w for p, w in zip(ref_pts, w_list)) / w_sum
    cent_lon = sum(p["longitude"] * w for p, w in zip(ref_pts, w_list)) / w_sum
    resolved_res = 375 if len(viirs_pts) > 0 else 1000
    return cent_lat, cent_lon, resolved_res


def reconcile_pass_frp(
    viirs_pts: List[Dict[str, Any]], modis_pts: List[Dict[str, Any]]
) -> float:
    """
    Pass-reconciled FRP: sum sub-kilometer pixels within each satellite pass first,
    then take the maximum across independent passes.
    """
    if len(viirs_pts) > 0:
        v_by_sat: Dict[str, float] = {}
        for p in viirs_pts:
            v_by_sat[p["satellite"]] = v_by_sat.get(p["satellite"], 0.0) + p["frp"]
        viirs_frp_reconciled = max(v_by_sat.values())
    else:
        viirs_frp_reconciled = 0.0

    if len(modis_pts) > 0:
        m_by_sat: Dict[str, float] = {}
        for p in modis_pts:
            m_by_sat[p["satellite"]] = m_by_sat.get(p["satellite"], 0.0) + p["frp"]
        modis_frp_reconciled = max(m_by_sat.values())
    else:
        modis_frp_reconciled = 0.0

    return max(modis_frp_reconciled, viirs_frp_reconciled)


def fuse_bayesian_confidence(
    group: List[Dict[str, Any]], n_modis: int, n_viirs: int
) -> Tuple[str, str, float, int]:
    """
    Computes satellite-independent Bayesian confidence fusion and classification.
    Returns (classification, corroboration, harmonized_confidence, n_distinct_sats).
    """
    by_sat: Dict[str, List[Dict[str, Any]]] = {}
    for p in group:
        by_sat.setdefault(p["satellite"], []).append(p)

    sat_conf_list: List[float] = []
    for sat_name, s_pts in by_sat.items():
        base_c = max(p["conf_norm"] for p in s_pts)
        pixel_bonus = 0.02 * min(len(s_pts) - 1, 3)
        sat_conf_list.append(min(0.98, base_c + pixel_bonus))

    n_distinct_sats = len(sat_conf_list)

    if n_modis > 0 and n_viirs > 0:
        classification = "HARMONIZED_DUAL"
        corroboration = "DUAL_SENSOR_FAMILY"
        unconf = 1.0
        for c in sat_conf_list:
            unconf *= 1.0 - c
        harm_conf = min(0.99, 1.0 - unconf)
        if max(p["conf_norm"] for p in group) >= 0.50:
            harm_conf = max(harm_conf, 0.92)
    elif n_viirs > 0:
        classification = "VIIRS_EXCLUSIVE"
        if n_distinct_sats >= 2:
            corroboration = "MULTI_SATELLITE"
            unconf = 1.0
            for c in sat_conf_list:
                unconf *= 1.0 - c
            harm_conf = min(0.98, 1.0 - unconf)
        else:
            corroboration = "SINGLE_SATELLITE"
            harm_conf = sat_conf_list[0]
    else:
        classification = "MODIS_EXCLUSIVE"
        if n_distinct_sats >= 2:
            corroboration = "MULTI_SATELLITE"
            unconf = 1.0
            for c in sat_conf_list:
                unconf *= 1.0 - c
            harm_conf = min(0.98, 1.0 - unconf)
        else:
            corroboration = "SINGLE_SATELLITE"
            harm_conf = sat_conf_list[0]

    return classification, corroboration, harm_conf, n_distinct_sats
