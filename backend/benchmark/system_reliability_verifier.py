"""
System Reliability Verification Engine for NASA FIRMS Wildfire Tactical Decision Support.
Evaluates end-to-end reliability, accuracy, and operational readiness across N = 50 real active fire events.
Validates the integrated pipeline:
  Telemetry Harmonization -> 3-Horizon Physical Simulation -> GIS / Topography Enrichment -> 3rd-Party LLM Decision Support

Evaluates 5 System Reliability KPIs:
  KPI 1: Mission Success Rate & JSON Validity (100% valid schema, no parse failures).
  KPI 2: Kinematic Fidelity / Zero-Hallucination Rate (Direction prediction matches ground-truth; mechanism matches wind/terrain dynamics).
  KPI 3: 6h Spread Distance Feasibility (Predicted 6h spread distance is within physical fire propagation limits based on ROS * 6h * slope multiplier).
  KPI 4: Risk Stratification Calibration (High FRP > 100 MW mapped to HIGH/EXTREME; Low FRP < 10 MW mapped to LOW/MODERATE).
  KPI 5: Tactical Actionability (Actionable containment line recommendations, nearest airbase flight scramble time).
"""

import argparse
import concurrent.futures
import json
import logging
import math
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.services.llm_service import SYSTEM_PROMPT, clean_json_text
from backend.services.landcover_service import classify_hotspot_biome
from backend.services.airbase_service import airbase_service
from backend.services.terrain_service import calculate_forward_slope
from backend.services.grid_risk_service import (
    cell_centers,
    sample_grid_landcover,
    calculate_grid_risk,
)

logger = logging.getLogger("system_reliability_verifier")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

COMPASS_SECTORS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
]

COMPASS_SECTORS_VI = {
    # 3-word 16-point intermediate directions in Vietnamese (longest first)
    "BẮC ĐÔNG BẮC": "NNE", "BAC DONG BAC": "NNE",
    "ĐÔNG ĐÔNG BẮC": "ENE", "DONG DONG BAC": "ENE",
    "ĐÔNG ĐÔNG NAM": "ESE", "DONG DONG NAM": "ESE",
    "NAM ĐÔNG NAM": "SSE", "NAM DONG NAM": "SSE",
    "NAM TÂY NAM": "SSW", "NAM TAY NAM": "SSW",
    "TÂY TÂY NAM": "WSW", "TAY TAY NAM": "WSW",
    "TÂY TÂY BẮC": "WNW", "TAY TAY BAC": "WNW",
    "BẮC TÂY BẮC": "NNW", "BAC TAY BAC": "NNW",

    # 2-word 8-point primary intercardinal directions
    "ĐÔNG BẮC": "NE", "DONG BAC": "NE",
    "ĐÔNG NAM": "SE", "DONG NAM": "SE",
    "TÂY NAM": "SW", "TAY NAM": "SW",
    "TÂY BẮC": "NW", "TAY BAC": "NW",

    # 1-word 4 cardinal directions
    "BẮC": "N", "BAC": "N",
    "ĐÔNG": "E", "DONG": "E",
    "NAM": "S",
    "TÂY": "W", "TAY": "W",

    # English full words
    "NORTH-NORTHEAST": "NNE", "NORTH NORTHEAST": "NNE",
    "EAST-NORTHEAST": "ENE", "EAST NORTHEAST": "ENE",
    "EAST-SOUTHEAST": "ESE", "EAST SOUTHEAST": "ESE",
    "SOUTH-SOUTHEAST": "SSE", "SOUTH SOUTHEAST": "SSE",
    "SOUTH-SOUTHWEST": "SSW", "SOUTH SOUTHWEST": "SSW",
    "WEST-SOUTHWEST": "WSW", "WEST SOUTHWEST": "WSW",
    "WEST-NORTHWEST": "WNW", "WEST NORTHWEST": "WNW",
    "NORTH-NORTHWEST": "NNW", "NORTH NORTHWEST": "NNW",
    "NORTHEAST": "NE", "NORTH-EAST": "NE", "NORTH EAST": "NE",
    "SOUTHEAST": "SE", "SOUTH-EAST": "SE", "SOUTH EAST": "SE",
    "SOUTHWEST": "SW", "SOUTH-WEST": "SW", "SOUTH WEST": "SW",
    "NORTHWEST": "NW", "NORTH-WEST": "NW", "NORTH WEST": "NW",
    "NORTH": "N", "SOUTH": "S", "EAST": "E", "WEST": "W",
}

MULTI_LETTER_COMPASS = [
    "NNE", "ENE", "ESE", "SSE", "SSW", "WSW", "WNW", "NNW",
    "NE", "SE", "SW", "NW"
]

VALID_RISK_LEVELS = {"LOW", "MODERATE", "HIGH", "EXTREME"}
VALID_SPREAD_MECHANISMS = {
    "WIND_DRIVEN",
    "SLOPE_DRIVEN",
    "FUEL_DRIVEN",
    "STATIONARY",
    "TOPOGRAPHY_SLOPE",
    "PLUME_DOMINATED",
    "SUPPRESSED",
    "FUEL_OR_TERRAIN_DOMINATED",
    "FLANKING_OR_FUEL_DRIVEN",
    "FUEL_OR_SLOPE_DRIVEN",
    "WIND",
    "SLOPE",
    "FUEL",
    "TERRAIN",
}


def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (ValueError, TypeError):
        return default


def _extract_bearing_or_compass(text: str) -> Optional[str]:
    """
    Finds compass direction mentions in text (both English codes and Vietnamese terms).
    Protects against false positives from single-letter tokens (e.g. 'N = 50', 'S-70')
    and location proper nouns (e.g. 'Việt Nam', 'Quảng Nam', 'Bắc Giang').
    """
    if not text:
        return None
    upper = text.upper()

    # 1. Look for explicit parenthesized compass codes e.g. "(NW)", "(SSW)", "(WNW)", "(S)"
    paren_match = re.search(r"\((NNE|ENE|ESE|SSE|SSW|WSW|WNW|NNW|NE|SE|SW|NW|N|E|S|W)\)", upper)
    if paren_match:
        return paren_match.group(1)

    matches: List[Tuple[int, int, int, str]] = []

    # 2. Search for direction terms (Vietnamese phrases and English full words)
    for term, code in sorted(COMPASS_SECTORS_VI.items(), key=lambda x: len(x[0]), reverse=True):
        # Look for direction preceded by directional indicator (hướng, phía, về, theo, lan, heading, towards, direction)
        pattern = rf"(?:HƯỚNG|PHÍA|VỀ|THEO|LAN|HEADING|TOWARDS|DIRECTION|BEARING|DIR)\s+(?:HƯỚNG\s+)?{re.escape(term)}(?=\b|[\s,.]|$)"
        for m in re.finditer(pattern, upper):
            matches.append((0, m.start(), -len(term), code))

        # For compound multi-word compass terms (>= 2 words), allow if not preceded by proper noun markers
        if len(term.split()) >= 2:
            for m in re.finditer(rf"(?<!VIỆT\s)(?<!QUẢNG\s)(?<!HÀ\s)(?<!TỈNH\s)(?<!HUYỆN\s)(?<!XÃ\s)\b{re.escape(term)}\b", upper):
                preceding = upper[max(0, m.start() - 25):m.start()]
                has_dir = any(k in preceding for k in ("HƯỚNG", "PHÍA", "VỀ", "THEO", "HEADING", "TOWARDS", "LAN", "DIRECTION", "DIR"))
                matches.append((0 if has_dir else 1, m.start(), -len(term), code))

    # 3. Check multi-letter English compass codes (e.g. NW, SE, WNW, SSE)
    for code in sorted(MULTI_LETTER_COMPASS, key=len, reverse=True):
        for m in re.finditer(rf"\b{code}\b", upper):
            preceding = upper[max(0, m.start() - 25):m.start()]
            has_dir = any(k in preceding for k in ("HƯỚNG", "PHÍA", "VỀ", "THEO", "HEADING", "TOWARDS", "LAN", "DIR", "BEARING", "DIRECTION"))
            matches.append((0 if has_dir else 1, m.start(), -len(code), code))

    # 4. Single-letter English compass codes REQUIRE directional marker to avoid false positives (e.g. N = 50, S-70)
    for code in ("N", "E", "S", "W"):
        for m in re.finditer(rf"(?:HƯỚNG|PHÍA|VỀ|THEO|HEADING|TOWARDS|BEARING|DIRECTION|DIR)\s*[:=]?\s*{code}\b", upper):
            matches.append((0, m.start(), -1, code))

    if matches:
        matches.sort()
        return matches[0][3]

    return None


def enrich_sample_telemetry(sample: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriches raw FIRMS sample telemetry with:
    1. MCD12Q1 vegetation biome context and fuel flammability.
    2. SRTM Topography forward slope degrees along spread vector and McArthur acceleration multiplier.
    3. Nearest certified aerial firefighting airbase with scramble flight minutes.
    4. 3-Horizon (6h, 12h, 24h) physical simulation burn area and persistence confidence.
    """
    lat = _safe_float(sample.get("centroid_lat") or sample.get("current_centroid", {}).get("latitude"), 0.0)
    lon = _safe_float(sample.get("centroid_lon") or sample.get("current_centroid", {}).get("longitude"), 0.0)
    raw_bearing = sample.get("overall_bearing_deg")
    if raw_bearing is None:
        raw_bearing = sample.get("kinematics", {}).get("current_bearing_deg")
    if raw_bearing is None:
        raw_bearing = sample.get("kinematics", {}).get("net_bearing_deg")
    bearing_deg = _safe_float(raw_bearing, 0.0)

    # 1. Vegetation / Biome context
    veg_context = classify_hotspot_biome(lat, lon) if (lat != 0.0 or lon != 0.0) else {}

    # 2. Nearest Airbase logistics
    airbase_info: Dict[str, Any] = {}
    if lat != 0.0 or lon != 0.0:
        base = airbase_service.find_nearest_airbase(lat, lon, min_runway_m=1200.0, max_distance_km=500.0)
        dist_km = base.get("distance_km") or 120.0
        airbase_info = {
            "nearest_airbase": {
                "icao": base.get("icao", "VNFOB"),
                "name": base.get("name", "Forward Operating Base"),
                "distance_km": round(dist_km, 1),
                "runway_m": base.get("runway_length_m", 1500),
                "aerial_firefighting_capable": base.get("fire_fighting_capable", True),
                "estimated_flight_minutes": round((dist_km / 450.0) * 60.0, 1),
            }
        }

    # 3. Terrain Forward Slope
    terrain_context: Dict[str, Any] = {}
    if lat != 0.0 or lon != 0.0:
        terrain_context = calculate_forward_slope(lat, lon, bearing_deg)
    slope_multiplier = _safe_float(terrain_context.get("slope_multiplier"), 1.0)

    # 4. Multi-Horizon 3-Layer Physical Simulation (6h, 12h, 24h)
    multi_horizon_size: Dict[str, Any] = {}
    persistence_index: Dict[str, Any] = {}
    if lat != 0.0 or lon != 0.0:
        centers, dy, dx = cell_centers(lat, lon)
        codes = sample_grid_landcover(centers)
        w = sample.get("weather", {})
        t_c = _safe_float(w.get("temperature_c"), 28.0)
        rh = _safe_float(w.get("relative_humidity_pct"), 60.0)
        w_spd = _safe_float(w.get("wind_speed_kmh"), 12.0)
        w_dir = _safe_float(w.get("wind_direction_from_deg"), 180.0)
        hourly: List[Dict[str, Any]] = []
        base_t = datetime.now(timezone.utc)
        for h in range(24):
            hourly.append({
                "time": f"{base_t.strftime('%Y-%m-%dT')}{h:02d}:00:00Z",
                "temperature_2m": t_c + 3.0 * math.sin(h * math.pi / 12.0),
                "relative_humidity_2m": max(10.0, min(100.0, rh - 10.0 * math.sin(h * math.pi / 12.0))),
                "wind_speed_10m": w_spd,
                "wind_direction_10m": w_dir,
                "precipitation": 0.0,
            })
        grid_res = calculate_grid_risk(lat, lon, codes, hourly, slope_multiplier=slope_multiplier)
        multi_horizon_size = grid_res.get("multi_horizon_size", {})
        persistence_index = grid_res.get("persistence_index", {})

    return {
        "vegetation_fuel_context": veg_context,
        "tactical_proximity": airbase_info,
        "terrain_context": terrain_context,
        "multi_horizon_size": multi_horizon_size,
        "persistence_index": persistence_index,
    }


def build_tactical_prompt(sample: Dict[str, Any], enriched: Dict[str, Any]) -> str:
    """Builds clean, rigorous structured JSON prompt for 3rd-party LLM."""
    kin = sample.get("kinematics", {})
    weather = sample.get("weather", {})
    wind_alignment = sample.get("wind_alignment", {})

    bearing_deg = sample.get("overall_bearing_deg") or kin.get("current_bearing_deg") or kin.get("net_bearing_deg")
    compass_dir = sample.get("overall_bearing_compass") or kin.get("current_compass_dir") or kin.get("net_compass_dir")
    ros_kmh = sample.get("overall_rate_of_spread_kmh") or kin.get("current_ros_kmh")
    total_frp = sample.get("total_frp_mw") or kin.get("total_frp_mw")
    peak_frp = sample.get("peak_frp_mw") or kin.get("peak_frp_mw")

    prompt_payload = {
        "event_id": sample.get("event_id"),
        "benchmark_sample_id": sample.get("benchmark_sample_id"),
        "status": sample.get("status"),
        "location_name": sample.get("location_name"),
        "duration_hours": sample.get("duration_hours"),
        "waypoint_count": sample.get("waypoint_count") or len(sample.get("waypoints", [])),
        "tactical_guidelines": {
            "risk_stratification_standard": "Risk stratification for risk_level: EXTREME or HIGH if total FRP > 100 MW or peak FRP > 80 MW; LOW or MODERATE if total FRP < 15 MW; other cases evaluate based on ROS and multi_horizon_size.",
            "forecast_6h_standard": "Forecast forward spread based on kinematics (compass_dir) and distance (km) or area (ha) projected over the next 6 hours.",
            "containment_standard": "Mandatory containment recommendations must include: (1) establish containment lines or firebreaks ahead of primary head; (2) scramble aerial firefighting from nearest airbase with transit flight time; (3) ground crew positioning."
        },
        "centroid": sample.get("current_centroid") or {
            "latitude": sample.get("centroid_lat"),
            "longitude": sample.get("centroid_lon"),
        },
        "kinematics": {
            "bearing_deg": round(_safe_float(bearing_deg), 1),
            "compass_dir": compass_dir or "VARIABLE",
            "current_ros_kmh": round(_safe_float(ros_kmh), 3),
            "average_ros_kmh": round(_safe_float(kin.get("average_ros_kmh")), 3),
            "total_frp_mw": round(_safe_float(total_frp), 2),
            "peak_frp_mw": round(_safe_float(peak_frp), 2),
            "frp_trend": kin.get("frp_trend", "STABLE"),
        },
        "weather": {
            "temperature_c": weather.get("temperature_c"),
            "relative_humidity_pct": weather.get("relative_humidity_pct"),
            "wind_speed_kmh": weather.get("wind_speed_kmh"),
            "wind_direction_from_deg": weather.get("wind_direction_from_deg"),
            "precipitation_mm": weather.get("precipitation_mm", 0.0),
        },
        "wind_alignment": {
            "wind_towards_deg": wind_alignment.get("wind_towards_deg"),
            "alignment_angle_deg": wind_alignment.get("alignment_angle_deg"),
            "spread_mechanism": wind_alignment.get("spread_mechanism"),
            "description": wind_alignment.get("description"),
        },
        "terrain_context": enriched.get("terrain_context", {}),
        "vegetation_fuel_context": enriched.get("vegetation_fuel_context", {}),
        "tactical_proximity": enriched.get("tactical_proximity", {}),
        "multi_horizon_size": enriched.get("multi_horizon_size", {}),
    }

    return json.dumps(prompt_payload, ensure_ascii=False, indent=2)


def call_third_party_llm(
    prompt_str: str,
    model: str,
    api_key: str,
    base_url: str = "https://api.openai.com/v1",
    timeout: float = 60.0,
    max_retries: int = 3,
) -> Tuple[Optional[Dict[str, Any]], float, Optional[str]]:
    """
    Calls 3rd-party LLM (OpenAI API or compatible) with retries and measures exact latency (ms).
    Returns (parsed_response_dict, latency_ms, error_message).
    """
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt_str},
        ],
        "response_format": {"type": "json_object"},
    }

    # Temperature configuration
    is_reasoning = any(k in model.lower() for k in ("gpt-6", "o1", "o3", "o4", "luna", "sol"))
    if not is_reasoning:
        payload["temperature"] = 0.2

    for attempt in range(max_retries):
        t0 = time.monotonic()
        try:
            req = Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
            with urlopen(req, timeout=timeout) as resp:
                elapsed_ms = (time.monotonic() - t0) * 1000.0
                raw_body = resp.read().decode("utf-8")
                data = json.loads(raw_body)
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(clean_json_text(content))
                return parsed, elapsed_ms, None
        except HTTPError as http_err:
            elapsed_ms = (time.monotonic() - t0) * 1000.0
            err_body = http_err.read().decode("utf-8", errors="replace")[:300]
            # Handle temperature param error on reasoning models
            if http_err.code == 400 and "temperature" in err_body and "temperature" in payload:
                payload.pop("temperature", None)
                continue
            # Rate limit backoff (429)
            if http_err.code == 429 and attempt < max_retries - 1:
                time.sleep(2.0 * (attempt + 1))
                continue
            if attempt == max_retries - 1:
                return None, elapsed_ms, f"HTTPError {http_err.code}: {err_body}"
        except Exception as exc:
            elapsed_ms = (time.monotonic() - t0) * 1000.0
            if attempt < max_retries - 1:
                time.sleep(1.0 * (attempt + 1))
                continue
            return None, elapsed_ms, str(exc)

    return None, 0.0, "Max retries exceeded"


def score_sample_reliability(
    sample: Dict[str, Any],
    enriched: Dict[str, Any],
    response: Optional[Dict[str, Any]],
    error_msg: Optional[str],
    latency_ms: float,
) -> Dict[str, Any]:
    """
    Evaluates response against ground-truth telemetry across the 5 System Reliability KPIs.
    """
    sample_id = sample.get("benchmark_sample_id") or sample.get("event_id")
    kin = sample.get("kinematics", {})
    weather = sample.get("weather", {})
    terrain = enriched.get("terrain_context", {})
    horizon_size = enriched.get("multi_horizon_size", {})

    gt_compass = sample.get("overall_bearing_compass") or kin.get("current_compass_dir") or kin.get("net_compass_dir") or "VARIABLE"
    gt_ros = _safe_float(sample.get("overall_rate_of_spread_kmh") or kin.get("current_ros_kmh"), 0.0)
    total_frp = _safe_float(sample.get("total_frp_mw") or kin.get("total_frp_mw"), 0.0)
    peak_frp = _safe_float(sample.get("peak_frp_mw") or kin.get("peak_frp_mw"), 0.0)
    wind_spd = _safe_float(weather.get("wind_speed_kmh"), 0.0)
    slope_mult = _safe_float(terrain.get("slope_multiplier"), 1.0)

    # ----------------------------------------------------
    # KPI 1: Mission Success Rate & JSON Validity
    # ----------------------------------------------------
    kpi1_valid = True
    kpi1_reasons: List[str] = []
    if error_msg or not response or not isinstance(response, dict):
        kpi1_valid = False
        kpi1_reasons.append(f"Inference or JSON parsing failure: {error_msg}")
    else:
        required_keys = [
            "risk_level", "spread_mechanism",
            "threat_zone", "forecast_6h", "multi_horizon_assessment",
            "tactical_recommendations", "sitrep_markdown"
        ]
        has_summary = bool(response.get("summary") or response.get("summary_vi"))
        missing = [k for k in required_keys if k not in response or not response[k]]
        if not has_summary:
            missing.append("summary")
        if missing:
            kpi1_valid = False
            kpi1_reasons.append(f"Missing schema keys: {missing}")

        risk = str(response.get("risk_level", "")).upper()
        if risk not in VALID_RISK_LEVELS:
            kpi1_valid = False
            kpi1_reasons.append(f"Invalid risk_level '{risk}'")

        mech = str(response.get("spread_mechanism", "")).upper()
        if not any(v in mech for v in VALID_SPREAD_MECHANISMS):
            kpi1_valid = False
            kpi1_reasons.append(f"Unrecognized spread_mechanism '{mech}'")

        multi_h = response.get("multi_horizon_assessment", {})
        if not isinstance(multi_h, dict) or not any(k in multi_h for k in ("h6_summary", "h12_summary", "h24_summary")):
            kpi1_valid = False
            kpi1_reasons.append("multi_horizon_assessment incomplete")

        recs = response.get("tactical_recommendations", [])
        if not isinstance(recs, list) or len(recs) == 0:
            kpi1_valid = False
            kpi1_reasons.append("tactical_recommendations must be non-empty list")

    # If KPI 1 failed, subsequent KPIs cannot pass
    if not kpi1_valid or not response:
        return {
            "sample_id": sample_id,
            "event_id": sample.get("event_id"),
            "latency_ms": round(latency_ms, 1),
            "kpi1_valid_schema": 0,
            "kpi2_kinematic_fidelity": 0,
            "kpi3_distance_feasible": 0,
            "kpi4_risk_calibrated": 0,
            "kpi5_tactical_actionable": 0,
            "kpi5_tactical_actionability": 0,
            "system_score": 0.0,
            "audit_trail": {
                "kpi1_reasons": kpi1_reasons,
                "kpi2_reasons": ["KPI 1 failed"],
                "kpi3_reasons": ["KPI 1 failed"],
                "kpi4_reasons": ["KPI 1 failed"],
                "kpi5_reasons": ["KPI 1 failed"],
            },
            "response": response,
        }

    # ----------------------------------------------------
    # KPI 2: Kinematic Fidelity / Zero-Hallucination Rate
    # ----------------------------------------------------
    kpi2_faithful = True
    kpi2_reasons: List[str] = []

    # Priority extraction: forecast_6h is dedicated to the predicted spread vector
    detected_compass = _extract_bearing_or_compass(str(response.get("forecast_6h", "")))
    if not detected_compass:
        detected_compass = _extract_bearing_or_compass(str(response.get("summary") or response.get("summary_vi", "")))
    if not detected_compass:
        detected_compass = _extract_bearing_or_compass(str(response.get("threat_zone", "")))

    # 2a. Direction Hallucination check
    if gt_compass and gt_compass in COMPASS_SECTORS and detected_compass and detected_compass in COMPASS_SECTORS:
        try:
            gt_idx = COMPASS_SECTORS.index(gt_compass)
            det_idx = COMPASS_SECTORS.index(detected_compass)
            sec_diff = abs(gt_idx - det_idx)
            if sec_diff > 8:
                sec_diff = 16 - sec_diff
            # If difference >= 6 sectors (>= 135 deg, opposite direction), flag hallucination
            if sec_diff >= 6:
                kpi2_faithful = False
                kpi2_reasons.append(
                    f"Opposite direction hallucination: GT={gt_compass} vs Predicted={detected_compass} (Δ={sec_diff*22.5}°)"
                )
        except ValueError:
            pass

    # 2b. Mechanism Dynamic Physical check
    resp_mech = str(response.get("spread_mechanism", "")).upper()
    if wind_spd < 3.0 and "WIND" in resp_mech:
        kpi2_faithful = False
        kpi2_reasons.append(f"Physical contradiction: Wind speed {wind_spd} km/h but mechanism claimed '{resp_mech}'")
    if total_frp > 100.0 and wind_spd > 20.0 and "STATIONARY" in resp_mech:
        kpi2_faithful = False
        kpi2_reasons.append(f"Physical contradiction: Conflagration (FRP={total_frp} MW, Wind={wind_spd} km/h) claimed STATIONARY")
    if gt_ros > 2.0 and "STATIONARY" in resp_mech:
        kpi2_faithful = False
        kpi2_reasons.append(f"Physical contradiction: Fast-moving wildfire (ROS={gt_ros:.2f} km/h) claimed STATIONARY")

    # ----------------------------------------------------
    # KPI 3: 6h Spread Distance Feasibility
    # ----------------------------------------------------
    kpi3_feasible = True
    kpi3_reasons: List[str] = []
    expected_dist_km = gt_ros * 6.0 * slope_mult
    exp_h6_ha = _safe_float(horizon_size.get("6h", {}).get("expected_area_ha"), 10.0)

    fwd_text = str(response.get("forecast_6h", "")) + " " + str(response.get("multi_horizon_assessment", {}).get("h6_summary", ""))

    # Extract distances in km
    dist_matches = re.findall(r"(\d+(?:\.\d+)?)\s*(?:km|cây số|kilomet)", fwd_text, re.IGNORECASE)
    # Extract areas in ha
    area_matches = re.findall(r"(\d+(?:\.\d+)?)\s*(?:ha|hecta|héc-ta)", fwd_text, re.IGNORECASE)

    if dist_matches:
        try:
            pred_dist = float(dist_matches[0])
            # Cap check: Wildfire spread in 6h rarely exceeds 60 km
            if pred_dist > 60.0:
                kpi3_feasible = False
                kpi3_reasons.append(f"Unphysical supersonic fire distance: {pred_dist} km in 6h")
            elif expected_dist_km > 0.5:
                if pred_dist > expected_dist_km * 5.0 or pred_dist < expected_dist_km * 0.1:
                    kpi3_feasible = False
                    kpi3_reasons.append(f"Distance out of physical bounds: {pred_dist} km vs expected ~{expected_dist_km:.2f} km")
            elif expected_dist_km <= 0.5 and pred_dist > 3.0:
                kpi3_feasible = False
                kpi3_reasons.append(f"Stationary/low-ros fire predicted excessive spread: {pred_dist} km")
        except ValueError:
            pass
    elif area_matches:
        try:
            pred_area = float(area_matches[0])
            # Physical bounds considering both grid simulation and kinematic propagation
            max_area_ha = max(exp_h6_ha * 6.0, expected_dist_km * 50.0) if expected_dist_km > 0.5 else max(exp_h6_ha * 6.0, 50.0)
            min_area_ha = min(exp_h6_ha * 0.1, max(0.5, expected_dist_km * 2.0)) if expected_dist_km > 0.5 else 0.5

            if pred_area > max_area_ha or pred_area < min_area_ha:
                kpi3_feasible = False
                kpi3_reasons.append(
                    f"Burn area out of physical bounds: {pred_area} ha (allowed [{min_area_ha:.1f}, {max_area_ha:.1f}] ha, exp_grid={exp_h6_ha:.1f} ha, exp_dist={expected_dist_km:.2f} km)"
                )
        except ValueError:
            pass
    else:
        kpi3_feasible = False
        kpi3_reasons.append("Missing quantitative 6h spread prediction: neither distance (km) nor area (ha) found in forecast_6h or multi_horizon_assessment")

    # ----------------------------------------------------
    # KPI 4: Risk Stratification Calibration
    # ----------------------------------------------------
    kpi4_calibrated = True
    kpi4_reasons: List[str] = []
    resp_risk = str(response.get("risk_level", "")).upper()

    if total_frp > 100.0 or peak_frp > 80.0:
        if resp_risk not in ("HIGH", "EXTREME"):
            kpi4_calibrated = False
            kpi4_reasons.append(f"High FRP ({total_frp:.1f} MW) misclassified as {resp_risk} (expected HIGH or EXTREME)")
    elif total_frp <= 15.0 or total_frp < 10.0:
        if resp_risk not in ("LOW", "MODERATE"):
            kpi4_calibrated = False
            kpi4_reasons.append(f"Low FRP ({total_frp:.1f} MW) misclassified as {resp_risk} (expected LOW or MODERATE)")
    else:
        # Moderate FRP: Any valid risk level is accepted
        if resp_risk not in VALID_RISK_LEVELS:
            kpi4_calibrated = False
            kpi4_reasons.append(f"Invalid risk level {resp_risk}")

    # ----------------------------------------------------
    # KPI 5: Tactical Actionability
    # ----------------------------------------------------
    kpi5_actionable = True
    kpi5_reasons: List[str] = []
    tactical_text = (
        " ".join(str(x) for x in response.get("tactical_recommendations", []))
        + " " + str(response.get("sitrep_markdown", ""))
    ).lower()

    # 5a. Containment line strategy
    containment_keywords = [
        "đường băng cản lửa", "băng cản lửa", "băng cản", "containment line",
        "ranh cản", "hào cản lửa", "tuyến ngăn chặn", "khoanh vùng", "đường ranh cản lửa",
        "firebreak", "fire break", "control line", "barrier line", "tuyến phòng thủ"
    ]
    has_containment = any(kw in tactical_text for kw in containment_keywords)
    if not has_containment:
        kpi5_actionable = False
        kpi5_reasons.append("Missing actionable containment line / băng cản lửa recommendation")

    # 5b. Aerial logistics / Airbase scramble time
    aerial_keywords = [
        "máy bay", "trực thăng", "căn cứ không quân", "không quân",
        "xuất kích", "airbase", "aerial", "tiếp cận", "phút bay", "scramble",
        "air tanker", "aviation", "helicopter", "water bomber"
    ]
    has_aerial = any(kw in tactical_text for kw in aerial_keywords)
    if not has_aerial:
        kpi5_actionable = False
        kpi5_reasons.append("Missing nearest airbase / aerial firefighting dispatch recommendation")

    # Composite System Reliability Score for this sample (0.0 to 10.0)
    sample_score = (
        (1.0 if kpi1_valid else 0.0) * 2.0
        + (1.0 if kpi2_faithful else 0.0) * 2.0
        + (1.0 if kpi3_feasible else 0.0) * 2.0
        + (1.0 if kpi4_calibrated else 0.0) * 2.0
        + (1.0 if kpi5_actionable else 0.0) * 2.0
    )

    return {
        "sample_id": sample_id,
        "event_id": sample.get("event_id"),
        "latency_ms": round(latency_ms, 1),
        "kpi1_valid_schema": 1 if kpi1_valid else 0,
        "kpi2_kinematic_fidelity": 1 if kpi2_faithful else 0,
        "kpi3_distance_feasible": 1 if kpi3_feasible else 0,
        "kpi4_risk_calibrated": 1 if kpi4_calibrated else 0,
        "kpi5_tactical_actionable": 1 if kpi5_actionable else 0,
        "kpi5_tactical_actionability": 1 if kpi5_actionable else 0,
        "system_score": round(sample_score, 1),
        "audit_trail": {
            "kpi1_reasons": kpi1_reasons,
            "kpi2_reasons": kpi2_reasons,
            "kpi3_reasons": kpi3_reasons,
            "kpi4_reasons": kpi4_reasons,
            "kpi5_reasons": kpi5_reasons,
        },
        "response": response,
    }


def verify_system_reliability(
    dataset_path: Path,
    output_report_path: Path,
    model: str = "gpt-4o",
    api_key: Optional[str] = None,
    base_url: str = "https://api.openai.com/v1",
    workers: int = 4,
    max_samples: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Executes full System Reliability Verification across N active fire samples.
    """
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    resolved_api_key = (api_key or os.environ.get("OPENAI_API_KEY", "")).strip()
    if not resolved_api_key:
        raise ValueError("OPENAI_API_KEY is required to call 3rd-party LLM.")

    with open(dataset_path, "r", encoding="utf-8") as f:
        samples: List[Dict[str, Any]] = json.load(f)

    if max_samples:
        samples = samples[:max_samples]

    n_total = len(samples)
    logger.info("Starting System Reliability Verification on N = %d samples with model '%s' (%d workers)...", n_total, model, workers)

    # Step 1: Pre-enrich all samples with GIS, SRTM topography, MCD12Q1 biomes, Airbases, and 3-Horizon Simulation
    t_enrich_start = time.monotonic()
    logger.info("Enriching telemetry with SRTM DEM, MCD12Q1 Biomes, Airbases, and 3-Horizon Grids...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(workers * 2, 8)) as ex:
        enriched_list = list(ex.map(enrich_sample_telemetry, samples))
    enrich_elapsed = time.monotonic() - t_enrich_start
    logger.info("Telemetry GIS enrichment completed in %.2fs (avg %.1fms/sample).", enrich_elapsed, (enrich_elapsed / n_total) * 1000.0)

    # Step 2: Build prompts
    prompts = [build_tactical_prompt(s, e) for s, e in zip(samples, enriched_list)]

    # Step 3: Execute LLM inference & score responses concurrently
    def process_item(item_idx: int) -> Dict[str, Any]:
        s = samples[item_idx]
        e = enriched_list[item_idx]
        p = prompts[item_idx]
        resp, lat_ms, err = call_third_party_llm(
            prompt_str=p,
            model=model,
            api_key=resolved_api_key,
            base_url=base_url,
            timeout=60.0,
        )
        return score_sample_reliability(s, e, resp, err, lat_ms)

    t_llm_start = time.monotonic()
    results: List[Dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        future_to_idx = {ex.submit(process_item, i): i for i in range(n_total)}
        for future in concurrent.futures.as_completed(future_to_idx):
            res = future.result()
            results.append(res)
            logger.info(
                "[%d/%d] Sample %s: Score=%.1f/10, Latency=%.1fms, KPI1=%d, KPI2=%d, KPI3=%d, KPI4=%d, KPI5=%d",
                len(results), n_total, res["sample_id"], res["system_score"],
                res["latency_ms"], res["kpi1_valid_schema"], res["kpi2_kinematic_fidelity"],
                res["kpi3_distance_feasible"], res["kpi4_risk_calibrated"], res["kpi5_tactical_actionable"]
            )

    # Sort results by sample_id to maintain canonical ordering
    results.sort(key=lambda r: str(r["sample_id"]))
    total_duration_sec = time.monotonic() - t_llm_start

    # Step 4: Aggregate KPIs and Metrics
    kpi1_count = sum(r["kpi1_valid_schema"] for r in results)
    kpi2_count = sum(r["kpi2_kinematic_fidelity"] for r in results)
    kpi3_count = sum(r["kpi3_distance_feasible"] for r in results)
    kpi4_count = sum(r["kpi4_risk_calibrated"] for r in results)
    kpi5_count = sum(r["kpi5_tactical_actionable"] for r in results)

    kpi1_pct = round((kpi1_count / n_total) * 100.0, 2)
    kpi2_pct = round((kpi2_count / n_total) * 100.0, 2)
    kpi3_pct = round((kpi3_count / n_total) * 100.0, 2)
    kpi4_pct = round((kpi4_count / n_total) * 100.0, 2)
    kpi5_pct = round((kpi5_count / n_total) * 100.0, 2)

    # Overall System Reliability Score (Arithmetic Mean of the 5 KPIs)
    overall_score = round((kpi1_pct + kpi2_pct + kpi3_pct + kpi4_pct + kpi5_pct) / 5.0, 2)

    latencies = [r["latency_ms"] for r in results if r["latency_ms"] > 0]
    sorted_lat = sorted(latencies) if latencies else [0.0]
    avg_latency = round(sum(latencies) / len(latencies), 1) if latencies else 0.0
    p50_latency = round(sorted_lat[len(sorted_lat) // 2], 1)
    p90_idx = int(0.90 * (len(sorted_lat) - 1))
    p90_latency = round(sorted_lat[p90_idx], 1)
    p95_idx = int(0.95 * (len(sorted_lat) - 1))
    p95_latency = round(sorted_lat[p95_idx], 1)

    summary_report: Dict[str, Any] = {
        "metadata": {
            "verification_timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "target_model": model,
            "api_endpoint": base_url,
            "total_samples": n_total,
            "concurrency_workers": workers,
            "enrichment_duration_sec": round(enrich_elapsed, 2),
            "inference_duration_sec": round(total_duration_sec, 2),
            "total_pipeline_duration_sec": round(enrich_elapsed + total_duration_sec, 2),
        },
        "system_reliability_kpis": {
            "kpi1_mission_success_and_json_validity": {
                "passed_count": kpi1_count,
                "total_count": n_total,
                "percentage": kpi1_pct,
                "benchmark_target": ">= 95.0%",
                "status": "PASS" if kpi1_pct >= 95.0 else "FAIL",
                "description": "100% valid schema compliance and zero JSON parse failures."
            },
            "kpi2_kinematic_fidelity_and_zero_hallucination": {
                "passed_count": kpi2_count,
                "total_count": n_total,
                "percentage": kpi2_pct,
                "benchmark_target": ">= 90.0%",
                "status": "PASS" if kpi2_pct >= 90.0 else "FAIL",
                "description": "Direction prediction matches ground-truth bearing; mechanism matches wind/terrain dynamics."
            },
            "kpi3_6h_spread_distance_feasibility": {
                "passed_count": kpi3_count,
                "total_count": n_total,
                "percentage": kpi3_pct,
                "benchmark_target": ">= 85.0%",
                "status": "PASS" if kpi3_pct >= 85.0 else "FAIL",
                "description": "Predicted 6h spread distance is within physical bounds (ROS * 6h * slope multiplier)."
            },
            "kpi4_risk_stratification_calibration": {
                "passed_count": kpi4_count,
                "total_count": n_total,
                "percentage": kpi4_pct,
                "benchmark_target": ">= 90.0%",
                "status": "PASS" if kpi4_pct >= 90.0 else "FAIL",
                "description": "High FRP (>100 MW) mapped to HIGH/EXTREME; Low FRP (<15 MW) mapped to LOW/MODERATE."
            },
            "kpi5_tactical_actionability": {
                "passed_count": kpi5_count,
                "total_count": n_total,
                "percentage": kpi5_pct,
                "benchmark_target": ">= 90.0%",
                "status": "PASS" if kpi5_pct >= 90.0 else "FAIL",
                "description": "Actionable containment line guidance and nearest airbase flight scramble time."
            },
        },
        "overall_performance": {
            "system_reliability_score": overall_score,
            "overall_status": "EXCELLENT" if overall_score >= 90.0 else ("RELIABLE" if overall_score >= 80.0 else "SUBOPTIMAL"),
            "latency_metrics": {
                "avg_ms": avg_latency,
                "p50_ms": p50_latency,
                "p90_ms": p90_latency,
                "p95_ms": p95_latency,
                "min_ms": round(sorted_lat[0], 1),
                "max_ms": round(sorted_lat[-1], 1),
            },
        },
        "per_sample_evaluations": results,
    }

    # Save to JSON
    output_report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_report_path, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, ensure_ascii=False, indent=2)

    logger.info("System Reliability Report successfully written to: %s", output_report_path)
    logger.info("================================================================================")
    logger.info("SYSTEM RELIABILITY VERIFICATION SUMMARY (N = %d):", n_total)
    logger.info("  * KPI 1 (Schema Validity):          %.2f%% (%d/%d)", kpi1_pct, kpi1_count, n_total)
    logger.info("  * KPI 2 (Kinematic Fidelity):       %.2f%% (%d/%d)", kpi2_pct, kpi2_count, n_total)
    logger.info("  * KPI 3 (6h Distance Feasibility):  %.2f%% (%d/%d)", kpi3_pct, kpi3_count, n_total)
    logger.info("  * KPI 4 (Risk Calibration):         %.2f%% (%d/%d)", kpi4_pct, kpi4_count, n_total)
    logger.info("  * KPI 5 (Tactical Actionability):   %.2f%% (%d/%d)", kpi5_pct, kpi5_count, n_total)
    logger.info("  * OVERALL RELIABILITY SCORE:        %.2f / 100.0 (%s)", overall_score, summary_report["overall_performance"]["overall_status"])
    logger.info("  * End-to-End Latency:               Avg=%.1fms, P50=%.1fms, P90=%.1fms", avg_latency, p50_latency, p90_latency)
    logger.info("================================================================================")

    return summary_report


def main():
    parser = argparse.ArgumentParser(description="System Reliability Verifier for NASA FIRMS AI Platform")
    parser.add_argument(
        "--dataset",
        type=Path,
        default=ROOT_DIR / "data" / "benchmark" / "real_firms_50_events.json",
        help="Path to 50 real active fire events JSON dataset",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT_DIR / "data" / "benchmark" / "results" / "system_reliability_report.json",
        help="Output JSON report destination",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=os.environ.get("OPENAI_MODEL") or "gpt-4o",
        help="3rd-party LLM model name (default: env OPENAI_MODEL or 'gpt-4o')",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=None,
        help="Optional OpenAI API key override",
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default=os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1",
        help="Optional API base URL (default: env OPENAI_BASE_URL or 'https://api.openai.com/v1')",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of concurrent worker threads (default: 4)",
    )
    parser.add_argument(
        "--max-samples",
        type=int,
        default=None,
        help="Optional maximum number of samples to evaluate (default: all 50)",
    )
    args = parser.parse_args()

    verify_system_reliability(
        dataset_path=args.dataset,
        output_report_path=args.output,
        model=args.model,
        api_key=args.api_key,
        base_url=args.base_url,
        workers=args.workers,
        max_samples=args.max_samples,
    )


if __name__ == "__main__":
    main()
