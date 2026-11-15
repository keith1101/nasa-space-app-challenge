"""
Hybrid Tiered Architecture for Tactical Wildfire Behavior Analysis (NASA FIRMS).
Combines:
1. Edge Layer: Local Qwen3-8B via Ollama (100% GPU offload on NVIDIA RTX 4060, $0 cost, offline-capable).
2. Cloud Layer: Frontier GPT-6 Luna via OpenAI API (high kinematic accuracy, ultra-fast latency).
3. Heuristic Baseline Engine: Deterministic, zero-dependency mathematical kinematics generator.
4. Smart Dynamic Router: Multi-criteria dispatch based on network link health, fire FRP urgency, and local system load with cascading auto-fallback.
"""

from dataclasses import dataclass, field
import ctypes
import json
import logging
import math
import os
import re
import socket
import threading
import time
from typing import Dict, Any, Optional, Tuple, List
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

logger = logging.getLogger("llm_service")

SYSTEM_PROMPT = """You are a Wildfire Tactical Intelligence Officer.
Your mission is to ingest spatio-temporal telemetry (kinematics) from NASA FIRMS satellites combined with Open-Meteo meteorology, analyze DEM topography slope, MCD12Q1 Biome landcover, and firefighting airbase logistics. Then produce a professional tactical situation report (Tactical SITREP) and containment strategy.

Mandatory rules:
1. DO NOT fabricate coordinates, compass bearings, or fire timestamps. Quote and use exact values from telemetry.
2. Evaluate Forward Slope Deg: positive slope (uphill) accelerates spread according to the McArthur factor.
3. Evaluate Crown Fire and Spotting potential based on landcover vegetation (coniferous forest, savanna, or grasslands).
4. Analyze 3 multi-horizon projections (6h / 12h / 24h): expected burned area (km² or ha) and weather persistence.
5. Propose tactical recommendations: firebreak placement, ground crew deployment, and aerial drops from the nearest airbase.
6. Return strictly valid JSON (no markdown fence, no trailing text outside JSON) following this schema:
{
  "summary": "Concise situation summary (2-3 sentences)",
  "summary_vi": "Concise situation summary (alias for compatibility)",
  "risk_level": "LOW|MODERATE|HIGH|EXTREME",
  "spread_mechanism": "WIND_DRIVEN|SLOPE_DRIVEN|FUEL_DRIVEN|STATIONARY",
  "threat_zone": "Primary affected risk zone description",
  "forecast_6h": "Direction and spread distance in next 6 hours",
  "multi_horizon_assessment": {
    "h6_summary": "6h scale and risk assessment",
    "h12_summary": "12h scale and risk assessment",
    "h24_summary": "24h scale and risk assessment"
  },
  "tactical_recommendations": [
    "Tactical recommendation 1",
    "Tactical recommendation 2",
    "Tactical recommendation 3"
  ],
  "sitrep_markdown": "Full SITREP in professional Markdown"
}"""


def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        f = float(val)
        return default if math.isnan(f) else f
    except (ValueError, TypeError):
        return default


def _safe_int(val: Any, default: int = 0) -> int:
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _safe_dict(val: Any) -> Dict[str, Any]:
    return val if isinstance(val, dict) else {}


def clean_json_text(text: str) -> str:
    """
    Strips thinking tags (<think>...</think>), markdown code fences (```json ... ```),
    and whitespace from model responses to guarantee clean JSON parsing.
    """
    if not text:
        return ""
    cleaned = text.strip()
    # Strip closed <think>...</think> reasoning blocks (case-insensitive, multiline)
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", cleaned, flags=re.IGNORECASE).strip()

    # Handle unclosed <think> tag:
    if re.search(r"<think>", cleaned, flags=re.IGNORECASE):
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, flags=re.IGNORECASE)
        if fence_match:
            cleaned = fence_match.group(1).strip()
        else:
            open_braces = [m.start() for m in re.finditer(r"\{", cleaned)]
            close_braces = [m.start() for m in re.finditer(r"\}", cleaned)]
            candidate = None
            for ob in open_braces:
                for cb in reversed(close_braces):
                    if ob < cb:
                        sub = cleaned[ob:cb + 1].strip()
                        try:
                            json.loads(sub)
                            candidate = sub
                            break
                        except Exception:
                            continue
                if candidate is not None:
                    break

            if candidate is not None:
                cleaned = candidate
            else:
                think_match = re.search(r"<think>", cleaned, flags=re.IGNORECASE)
                if think_match:
                    after_think = cleaned[think_match.end():]
                    brace_pos = after_think.find("{")
                    if brace_pos != -1:
                        cleaned = after_think[brace_pos:].strip()
                    else:
                        cleaned = re.sub(r"<think>[\s\S]*", "", cleaned, flags=re.IGNORECASE).strip()

    # Extract markdown code fence block if present
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, flags=re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()

    # If surrounded by non-json commentary, isolate outermost JSON object
    if not (cleaned.startswith("{") and cleaned.endswith("}")):
        json_match = re.search(r"\{[\s\S]*\}", cleaned)
        if json_match:
            cleaned = json_match.group(0).strip()

    return cleaned


# Windows memory structure for native load inspection without external dependencies
class _MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", ctypes.c_ulong),
        ("dwMemoryLoad", ctypes.c_ulong),
        ("ullTotalPhys", ctypes.c_ulonglong),
        ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong),
        ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong),
        ("ullAvailVirtual", ctypes.c_ulonglong),
        ("sllAvailExtendedVirtual", ctypes.c_ulonglong),
    ]


def _get_system_ram_percent() -> float:
    """
    Inspects host physical memory utilization percentage.
    Prioritizes psutil if installed, falls back to Windows GlobalMemoryStatusEx, or returns 0.0.
    """
    try:
        import psutil  # type: ignore
        return float(psutil.virtual_memory().percent)
    except Exception:
        pass

    if os.name == "nt":
        try:
            stat = _MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(_MEMORYSTATUSEX)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
                return float(stat.dwMemoryLoad)
        except Exception:
            pass

    return 0.0


@dataclass
class RouterConfig:
    """
    Runtime configuration for HybridTieredRouter loaded from environment variables with sensible defaults.
    """
    router_mode: str = "auto"
    router_frp_threshold: float = 50.0
    router_ping_timeout_sec: float = 2.0
    router_max_latency_ms: float = 500.0
    router_health_cache_sec: float = 15.0
    router_max_concurrent_requests: int = 4
    router_max_ram_percent: float = 92.0

    openai_api_key: str = ""
    openai_model: str = "gpt-6-luna"
    openai_base_url: str = "https://api.openai.com/v1"
    openai_timeout_sec: float = 30.0

    local_llm_model: str = "qwen3:8b"
    local_llm_base_url: str = "http://localhost:11434/v1"
    local_llm_api_key: str = "ollama"
    local_llm_timeout_sec: float = 90.0

    def __getattr__(self, name: str) -> Any:
        lower_name = name.lower()
        if lower_name in self.__dict__:
            return self.__dict__[lower_name]
        raise AttributeError(f"'RouterConfig' object has no attribute '{name}'")

    @classmethod
    def from_env(cls) -> "RouterConfig":
        def _env_float(key: str, default: float) -> float:
            val = os.environ.get(key)
            if val is None or not val.strip():
                return default
            return _safe_float(val.strip(), default)

        def _env_int(key: str, default: int) -> int:
            val = os.environ.get(key)
            if val is None or not val.strip():
                return default
            return _safe_int(val.strip(), default)

        return cls(
            router_mode=(os.environ.get("ROUTER_MODE") or "auto").strip().lower(),
            router_frp_threshold=_env_float("ROUTER_FRP_THRESHOLD", 50.0),
            router_ping_timeout_sec=_env_float("ROUTER_PING_TIMEOUT_SEC", 2.0),
            router_max_latency_ms=_env_float("ROUTER_MAX_LATENCY_MS", 500.0),
            router_health_cache_sec=_env_float("ROUTER_HEALTH_CACHE_SEC", 15.0),
            router_max_concurrent_requests=_env_int("ROUTER_MAX_CONCURRENT_REQUESTS", 4),
            router_max_ram_percent=_env_float("ROUTER_MAX_RAM_PERCENT", 92.0),
            openai_api_key=(os.environ.get("OPENAI_API_KEY") or "").strip(),
            openai_model=(os.environ.get("OPENAI_MODEL") or "gpt-6-luna").strip(),
            openai_base_url=(os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1").strip(),
            openai_timeout_sec=_env_float("OPENAI_TIMEOUT_SEC", 30.0),
            local_llm_model=(os.environ.get("LOCAL_LLM_MODEL") or "qwen3:8b").strip(),
            local_llm_base_url=(os.environ.get("LOCAL_LLM_BASE_URL") or "http://localhost:11434/v1").strip(),
            local_llm_api_key=(os.environ.get("LOCAL_LLM_API_KEY") or "ollama").strip(),
            local_llm_timeout_sec=_env_float("LOCAL_LLM_TIMEOUT_SEC", 90.0),
        )


def enrich_telemetry_with_gis(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministically enriches raw telemetry with:
    1. MCD12Q1 vegetation biome and fuel flammability parameters.
    2. Topography forward slope degrees along spread vector and McArthur acceleration multiplier.
    3. Tactical logistics: Nearest firefighting certified airbase and flight time.
    4. Multi-horizon 3-layer expected burn sizes (6h, 12h, 24h) and persistence confidence.
    """
    enriched = dict(telemetry)
    kinematics = _safe_dict(enriched.get("kinematics"))
    centroid = kinematics.get("current_centroid") or kinematics.get("centroid") or {}
    lat = _safe_float(centroid.get("lat") or centroid.get("latitude") or enriched.get("latitude"), 0.0)
    lon = _safe_float(centroid.get("lon") or centroid.get("longitude") or enriched.get("longitude"), 0.0)
    raw_bearing = kinematics.get("current_bearing_deg")
    if raw_bearing is None:
        raw_bearing = kinematics.get("net_bearing_deg")
    bearing = _safe_float(raw_bearing, 0.0)

    # 1. Vegetation & Biome classification
    if "vegetation_fuel_context" not in enriched and (lat != 0.0 or lon != 0.0):
        try:
            from backend.services.landcover_service import classify_hotspot_biome
            enriched["vegetation_fuel_context"] = classify_hotspot_biome(lat, lon)
        except Exception as exc:
            logger.debug("Vegetation classification enrichment failed: %s", exc)

    # 2. Terrain & Forward Slope
    if "terrain_context" not in enriched and (lat != 0.0 or lon != 0.0):
        try:
            from backend.services.terrain_service import calculate_forward_slope
            enriched["terrain_context"] = calculate_forward_slope(lat, lon, bearing)
        except Exception as exc:
            logger.debug("Terrain slope calculation enrichment failed: %s", exc)

    # 3. Tactical Logistics: Nearest Airbase
    if "tactical_proximity" not in enriched and (lat != 0.0 or lon != 0.0):
        try:
            from backend.services.airbase_service import airbase_service
            base = airbase_service.find_nearest_airbase(lat, lon, min_runway_m=1200.0, max_distance_km=500.0)
            dist_km = base.get("distance_km") or 120.0
            enriched["tactical_proximity"] = {
                "nearest_airbase": {
                    "icao": base.get("icao", "VNFOB"),
                    "name": base.get("name", "Forward Operating Base"),
                    "distance_km": round(dist_km, 1),
                    "runway_m": base.get("runway_length_m", 1500),
                    "aerial_firefighting_capable": base.get("fire_fighting_capable", True),
                    "estimated_flight_minutes": round((dist_km / 450.0) * 60.0, 1),
                }
            }
        except Exception as exc:
            logger.debug("Airbase lookup enrichment failed: %s", exc)

    # 4. Multi-horizon 3-layer simulation (6h, 12h, 24h)
    if "multi_horizon_size" not in enriched and (lat != 0.0 or lon != 0.0):
        try:
            from backend.services.grid_risk_service import predict_live_grid
            slope_m = 1.0
            if "terrain_context" in enriched:
                slope_m = _safe_float(enriched["terrain_context"].get("slope_multiplier"), 1.0)
            grid_res = predict_live_grid(lat, lon, slope_multiplier=slope_m)
            enriched["multi_horizon_size"] = grid_res.get("multi_horizon_size", {})
            enriched["persistence_index"] = grid_res.get("persistence_index", {})
        except Exception as exc:
            logger.debug("Grid risk multi-horizon calculation failed: %s", exc)

    return enriched


def _generate_heuristic_sitrep(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic rule-based tactical SITREP generator.
    Guarantees reliable, mathematically grounded responses even when completely offline or unauthenticated.
    """
    event_id = telemetry.get("event_id") or "FE-UNKNOWN"
    duration_h = _safe_float(telemetry.get("duration_hours"), 0.0)
    kinematics = _safe_dict(telemetry.get("kinematics"))
    weather = _safe_dict(telemetry.get("weather"))
    wind_align = _safe_dict(telemetry.get("wind_alignment"))

    compass_dir = kinematics.get("current_compass_dir") or kinematics.get("net_compass_dir") or "N/A"
    raw_bearing = kinematics.get("current_bearing_deg")
    if raw_bearing is None:
        raw_bearing = kinematics.get("net_bearing_deg")
    bearing_deg = _safe_float(raw_bearing, 0.0)
    ros_kmh = _safe_float(kinematics.get("current_ros_kmh"), 0.0)

    raw_frp = kinematics.get("total_frp_mw")
    if raw_frp is None:
        raw_frp = telemetry.get("total_frp_mw")
    total_frp = _safe_float(raw_frp, 0.0)

    frp_trend = kinematics.get("frp_trend") or telemetry.get("frp_trend") or "STABLE"

    wind_spd = _safe_float(weather.get("wind_speed_kmh"), 12.0)
    rh_pct = _safe_float(weather.get("relative_humidity_pct"), 50.0)
    temp_c = _safe_float(weather.get("temperature_c"), 30.0)
    align_status = wind_align.get("status") or "MODERATE_WIND_DRIVEN"
    wind_towards = _safe_float(wind_align.get("wind_towards_deg"), 0.0)

    # GIS context fields
    terrain = _safe_dict(telemetry.get("terrain_context"))
    veg = _safe_dict(telemetry.get("vegetation_fuel_context"))
    tactical = _safe_dict(telemetry.get("tactical_proximity"))
    multi_horizon = _safe_dict(telemetry.get("multi_horizon_size"))

    slope_deg = _safe_float(terrain.get("forward_slope_deg"), 0.0)
    slope_multiplier = _safe_float(terrain.get("slope_multiplier"), 1.0)
    slope_effect = terrain.get("slope_effect") or "FLAT_OR_UNDULATING"

    biome_name = veg.get("land_cover_class") or "Thảm thực vật tự nhiên"
    crown_pot = veg.get("crown_fire_potential") or "LOW"
    spotting_km = _safe_float(veg.get("spotting_distance_km"), 0.3)

    airbase = _safe_dict(tactical.get("nearest_airbase"))
    airbase_name = airbase.get("name") or "Căn cứ dã chiến"
    airbase_dist = _safe_float(airbase.get("distance_km"), 0.0)
    airbase_mins = _safe_float(airbase.get("estimated_flight_minutes"), 0.0)

    # Determine risk level
    if (rh_pct < 30.0 and wind_spd >= 20.0 and total_frp > 100.0) or (duration_h >= 24.0 and wind_spd >= 20.0 and total_frp >= 75.0) or slope_deg >= 18.0:
        risk_level = "EXTREME"
    elif rh_pct < 45.0 and (wind_spd >= 15.0 or total_frp > 50.0 or slope_deg >= 8.0):
        risk_level = "HIGH"
    elif total_frp > 20.0 or duration_h > 6.0:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    # Mechanism
    if slope_deg >= 10.0 and ("OPPOSING" in align_status or wind_spd < 10.0):
        mechanism = "SLOPE_DRIVEN"
        mech_en = f"Uphill slope spread ({slope_deg:.1f}°), accelerated x{slope_multiplier:.1f}"
    elif "STRONG_WIND" in align_status or "MODERATE_WIND" in align_status:
        mechanism = "WIND_DRIVEN"
        mech_en = f"Wind-driven head fire ({wind_spd:.1f} km/h)"
    elif "OPPOSING" in align_status:
        mechanism = "SLOPE_DRIVEN"
        mech_en = "Slope-driven backing fire or smoldering against wind"
    else:
        mechanism = "FUEL_DRIVEN"
        mech_en = f"Fuel-driven perimeter expansion in {biome_name}"

    proj_distance_6h = round(ros_kmh * 6.0 * slope_multiplier, 2)
    if proj_distance_6h < 0.2:
        proj_distance_6h = round(max(0.3, wind_spd * 0.05 * slope_multiplier), 2)

    # 3-Horizon burn sizes
    h6_info = _safe_dict(multi_horizon.get("6h"))
    h12_info = _safe_dict(multi_horizon.get("12h"))
    h24_info = _safe_dict(multi_horizon.get("24h"))
    area_6h = _safe_float(h6_info.get("expected_area_ha"), round(proj_distance_6h * 20.0, 1))
    area_12h = _safe_float(h12_info.get("expected_area_ha"), round(area_6h * 2.2, 1))
    area_24h = _safe_float(h24_info.get("expected_area_ha"), round(area_12h * 1.8, 1))

    summary = (
        f"Wildfire {event_id} ({biome_name}) has sustained for {duration_h:.1f} hours with total FRP of {total_frp:.1f} MW. "
        f"Propagation vector heads {compass_dir} ({bearing_deg:.1f}°) at rate of spread {ros_kmh:.2f} km/h, "
        f"primary mechanism: {mech_en}."
    )

    threat_zone = f"{compass_dir} flank corridor within a {proj_distance_6h + 1.2:.1f} km radius from fire centroid"
    forecast_6h = (
        f"Over the next 6 hours, the fire front is projected to advance approximately {proj_distance_6h} km toward {compass_dir} "
        f"(expected footprint {area_6h:.1f} ha) with energy trend {frp_trend}."
    )

    recs = [
        f"Establish a containment firebreak ahead of the primary head toward {compass_dir} at least {proj_distance_6h + 0.6:.1f} km from centroid.",
        f"Monitor crown fire potential ({crown_pot}) in {biome_name}; spotting range estimated up to {spotting_km:.1f} km.",
    ]
    if airbase_dist > 0.0:
        recs.append(f"Scramble aerial firefighting sorties from {airbase_name} (distance {airbase_dist:.1f} km, ~{airbase_mins:.0f} min flight time).")
    else:
        recs.append(f"Prioritize protection of dense fuel stands and downwind assets ({wind_towards:.0f}°).")

    multi_horizon_assessment = {
        "h6_summary": f"6h Horizon: Projected footprint {area_6h:.1f} ha ({h6_info.get('threat_milestone', 'Tier 1-2')}), persistence confidence {h6_info.get('persistence_confidence', 0.88):.2f}.",
        "h12_summary": f"12h Horizon: Projected footprint {area_12h:.1f} ha, transitioning to diurnal cooling phase with persistence confidence {h12_info.get('persistence_confidence', 0.82):.2f}.",
        "h24_summary": f"24h Horizon: Potential footprint expands to {area_24h:.1f} ha, strategic containment line completion required (persistence confidence {h24_info.get('persistence_confidence', 0.50):.2f}).",
    }

    sitrep_md = f"""### TACTICAL SITUATION REPORT (TACTICAL SITREP)
**Event ID:** `{event_id}` | **Risk Level:** `{risk_level}`
* **Cumulative Active Duration:** {duration_h:.1f} hours | **Fuel Biome:** {biome_name}
* **Propagation Vector:** Bearing **{compass_dir}** ({bearing_deg:.1f}°) | Rate of Spread: **{ros_kmh:.2f} km/h**
* **Topography Profile:** Forward Slope **{slope_deg:.1f}°** ({slope_effect}) | Acceleration Factor: **x{slope_multiplier:.2f}**
* **Fire Radiative Power (FRP):** {total_frp:.1f} MW (Trend: `{frp_trend}`)
* **Field Meteorology:** Wind {wind_spd:.1f} km/h | Relative Humidity: {rh_pct:.1f}% | Temperature: {temp_c:.1f}°C
* **Firefighting Logistics:** Nearest Airbase **{airbase_name}** ({airbase_dist:.1f} km, ~{airbase_mins:.0f} min transit)

#### 1. Tactical Evaluation & Spread Mechanism
The wildfire is advancing primarily via **{mechanism}**. Given fuel biome {biome_name} and relative humidity {rh_pct:.1f}%, crown fire potential is evaluated at **{crown_pot}**.

#### 2. Multi-Horizon Projections (6h / 12h / 24h)
* **6h Horizon:** {multi_horizon_assessment['h6_summary']}
* **12h Horizon:** {multi_horizon_assessment['h12_summary']}
* **24h Horizon:** {multi_horizon_assessment['h24_summary']}

#### 3. Actionable Tactical Recommendations
1. {recs[0]}
2. {recs[1]}
3. {recs[2]}
"""

    return {
        "summary": summary,
        "summary_vi": summary,
        "risk_level": risk_level,
        "spread_mechanism": mechanism,
        "threat_zone": threat_zone,
        "forecast_6h": forecast_6h,
        "multi_horizon_assessment": multi_horizon_assessment,
        "tactical_recommendations": recs,
        "sitrep_markdown": sitrep_md,
        "model_provider": "heuristic_engine_grounded",
        "enriched_telemetry": telemetry,
    }


def _normalize_sitrep_keys(parsed: Any, telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ensures all expected tactical SITREP keys exist and are populated,
    falling back to heuristic calculation for any missing key.
    """
    if not isinstance(parsed, dict):
        parsed = {}

    # Synchronize summary and summary_vi
    if "summary" in parsed and parsed["summary"] and ("summary_vi" not in parsed or not parsed["summary_vi"]):
        parsed["summary_vi"] = parsed["summary"]
    elif "summary_vi" in parsed and parsed["summary_vi"] and ("summary" not in parsed or not parsed["summary"]):
        parsed["summary"] = parsed["summary_vi"]

    required_keys = [
        "summary",
        "summary_vi",
        "risk_level",
        "spread_mechanism",
        "threat_zone",
        "forecast_6h",
        "tactical_recommendations",
        "sitrep_markdown",
    ]
    fallback = _generate_heuristic_sitrep(telemetry)
    for k in required_keys:
        if k not in parsed or not parsed[k]:
            parsed[k] = fallback[k]

    if "multi_horizon_assessment" not in parsed or not isinstance(parsed["multi_horizon_assessment"], dict):
        parsed["multi_horizon_assessment"] = fallback["multi_horizon_assessment"]

    parsed["enriched_telemetry"] = telemetry
    return parsed


class HybridTieredRouter:
    """
    Intelligent dynamic routing engine that balances workload between:
    - Cloud Layer (Frontier GPT-6 Luna via OpenAI API) for urgent/conflagration fires or when edge is overloaded.
    - Edge Layer (Local Qwen3-8B on Ollama via RTX 4060) for routine wildfires, offline field stations, or cost saving.
    - Heuristic Engine for immediate, zero-dependency mathematical fallback.
    """

    def __init__(self, config: Optional[RouterConfig] = None):
        self.config = config or RouterConfig.from_env()
        self._active_requests = 0
        self._lock = threading.Lock()
        self._health_cache = {
            "is_online": False,
            "latency_ms": 9999.0,
            "timestamp": 0.0,
            "base_url": self.config.openai_base_url,
        }

    def reload_config(self) -> None:
        """Refreshes configuration from current environment variables."""
        old_base_url = self.config.openai_base_url
        self.config = RouterConfig.from_env()
        if self.config.openai_base_url != old_base_url:
            self._health_cache["timestamp"] = 0.0

    def check_cloud_connectivity(self, force_refresh: bool = False) -> Tuple[bool, float]:
        """
        Non-blocking TCP socket connection check to the configured Cloud host:port.
        Results are cached for ROUTER_HEALTH_CACHE_SEC (default 15.0s) to eliminate overhead.
        Returns: (is_online: bool, latency_ms: float)
        """
        now = time.monotonic()
        cached_ts = self._health_cache["timestamp"]

        if not force_refresh and (now - cached_ts < self.config.router_health_cache_sec):
            return bool(self._health_cache["is_online"]), float(self._health_cache["latency_ms"])

        if not self.config.openai_api_key:
            self._health_cache = {
                "is_online": False,
                "latency_ms": 9999.0,
                "timestamp": now,
                "base_url": self.config.openai_base_url,
            }
            return False, 9999.0

        t0 = time.monotonic()
        try:
            parsed = urlparse(self.config.openai_base_url)
            host = parsed.hostname or "api.openai.com"
            try:
                port = parsed.port or (443 if parsed.scheme == "https" else 80)
            except (ValueError, TypeError):
                port = 443 if parsed.scheme == "https" else 80

            sock = socket.create_connection((host, port), timeout=self.config.router_ping_timeout_sec)
            sock.close()
            latency_ms = (time.monotonic() - t0) * 1000.0
            is_online = latency_ms <= self.config.router_max_latency_ms
            self._health_cache = {
                "is_online": is_online,
                "latency_ms": latency_ms,
                "timestamp": now,
                "base_url": self.config.openai_base_url,
            }
            return is_online, latency_ms
        except Exception as e:
            logger.debug("Cloud reachability check failed: %s", e)
            self._health_cache = {
                "is_online": False,
                "latency_ms": 9999.0,
                "timestamp": now,
                "base_url": self.config.openai_base_url,
            }
            return False, 9999.0

    def check_system_load(self) -> Tuple[bool, int, float]:
        """
        Evaluates current Edge system load using active concurrent requests and host RAM usage.
        Returns: (is_overloaded: bool, active_requests: int, ram_percent: float)
        """
        with self._lock:
            active = self._active_requests

        ram_pct = _get_system_ram_percent()
        is_overloaded = (
            active >= self.config.router_max_concurrent_requests
            or ram_pct >= self.config.router_max_ram_percent
        )
        return is_overloaded, active, ram_pct

    def evaluate_urgency(self, telemetry: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Determines wildfire severity and urgency based on FRP threshold, risk level, and propagation kinematics.
        """
        kinematics = _safe_dict(telemetry.get("kinematics"))
        raw_frp = kinematics.get("total_frp_mw")
        if raw_frp is None:
            raw_frp = telemetry.get("total_frp_mw")
        total_frp = _safe_float(raw_frp, 0.0)

        frp_trend = kinematics.get("frp_trend") or telemetry.get("frp_trend") or "STABLE"
        status = telemetry.get("status") or ""

        risk_level = telemetry.get("risk_level")
        if not risk_level:
            duration_h = _safe_float(telemetry.get("duration_hours"), 0.0)
            weather = _safe_dict(telemetry.get("weather"))
            wind_spd = _safe_float(weather.get("wind_speed_kmh"), 12.0)
            rh_pct = _safe_float(weather.get("relative_humidity_pct"), 50.0)
            if (rh_pct < 30.0 and wind_spd >= 20.0 and total_frp > 100.0) or (
                duration_h >= 24.0 and wind_spd >= 20.0 and total_frp >= 75.0
            ):
                risk_level = "EXTREME"
            elif rh_pct < 45.0 and (wind_spd >= 15.0 or total_frp > 50.0):
                risk_level = "HIGH"
            elif total_frp > 20.0 or duration_h > 6.0:
                risk_level = "MODERATE"
            else:
                risk_level = "LOW"

        is_urgent = (
            (total_frp >= self.config.router_frp_threshold)
            or (risk_level in ("HIGH", "EXTREME"))
            or (status == "MULTI_DAY_CONFLAGRATION")
            or (frp_trend == "INTENSIFYING" and total_frp >= 30.0)
        )

        factors = {
            "total_frp_mw": total_frp,
            "frp_trend": frp_trend,
            "status": status,
            "risk_level": risk_level,
            "is_urgent": is_urgent,
        }
        return is_urgent, factors

    def decide_route(
        self,
        telemetry: Dict[str, Any],
        provider_override: Optional[str] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Decides the primary target route based on policy, network health, urgency, and system load.
        Returns: (target_route: str, decision_factors: Dict[str, Any])
        """
        mode = (provider_override or self.config.router_mode or "auto").strip().lower()

        is_online, latency_ms = self.check_cloud_connectivity()
        is_overloaded, active_reqs, ram_pct = self.check_system_load()
        is_urgent, urgency_info = self.evaluate_urgency(telemetry)

        factors = {
            "total_frp_mw": urgency_info["total_frp_mw"],
            "is_urgent": is_urgent,
            "is_online": is_online,
            "ping_ms": round(latency_ms, 2),
            "is_overloaded": is_overloaded,
            "active_requests": active_reqs,
            "ram_percent": round(ram_pct, 1),
            "router_mode": self.config.router_mode,
            "provider_override": provider_override,
        }

        # Explicit mode overrides
        if mode in ("fallback", "fallback_only"):
            factors["decision_reason"] = "Explicit fallback tier requested"
            return "fallback", factors

        if mode in ("cloud", "openai", "cloud_only"):
            factors["decision_reason"] = "Cloud tier requested via override or mode"
            return "cloud", factors

        if mode in ("edge", "local", "ollama", "edge_only"):
            factors["decision_reason"] = "Edge tier requested via override or mode"
            return "edge", factors

        if mode == "gemini":
            factors["decision_reason"] = "Gemini provider explicitly requested"
            return "gemini", factors

        # Dynamic routing (mode == "auto")
        if is_urgent and is_online and (latency_ms <= self.config.router_max_latency_ms):
            target = "cloud"
            factors["decision_reason"] = "Urgent wildfire condition routed to Frontier Cloud model"
        elif is_overloaded and is_online:
            target = "cloud"
            factors["decision_reason"] = "Edge system overloaded; offloading inference to Cloud"
        else:
            target = "edge"
            if not is_online:
                factors["decision_reason"] = "Offline or unreachable Cloud; routed to Edge"
            else:
                factors["decision_reason"] = "Routine wildfire event; routed to Edge ($0 cost)"

        return target, factors

    def _call_openai_compatible(
        self,
        base_url: str,
        api_key: str,
        model: str,
        telemetry: Dict[str, Any],
        timeout_sec: float,
    ) -> Dict[str, Any]:
        """
        Calls an OpenAI-compatible /v1/chat/completions endpoint (OpenAI or Ollama).
        """
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        user_content = json.dumps(telemetry, ensure_ascii=False, indent=2)
        payload: Dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "response_format": {"type": "json_object"},
        }

        # Frontier reasoning models (e.g. gpt-6-luna, o1, o3) enforce default temperature=1
        is_fixed_temp_model = any(k in model.lower() for k in ("gpt-6", "o1", "o3", "o4", "luna", "sol", "terra"))
        if not is_fixed_temp_model:
            payload["temperature"] = 0.2

        try:
            req = Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
            )
            with urlopen(req, timeout=timeout_sec) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            err_body = ""
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                pass
            if e.code == 400 and "temperature" in err_body and "temperature" in payload:
                payload.pop("temperature", None)
                retry_req = Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                )
                with urlopen(retry_req, timeout=timeout_sec) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
            else:
                raise e

        raw_text = data["choices"][0]["message"]["content"]
        cleaned = clean_json_text(raw_text)
        parsed = json.loads(cleaned)
        return parsed

    def _call_cloud(self, telemetry: Dict[str, Any], timeout_sec: Optional[float] = None) -> Dict[str, Any]:
        """Invokes Cloud Layer model (OpenAI)."""
        timeout = timeout_sec or self.config.openai_timeout_sec
        return self._call_openai_compatible(
            base_url=self.config.openai_base_url,
            api_key=self.config.openai_api_key,
            model=self.config.openai_model,
            telemetry=telemetry,
            timeout_sec=timeout,
        )

    def _call_edge(self, telemetry: Dict[str, Any], timeout_sec: Optional[float] = None) -> Dict[str, Any]:
        """Invokes Edge Layer model (Ollama / Local LLM)."""
        timeout = timeout_sec or self.config.local_llm_timeout_sec
        return self._call_openai_compatible(
            base_url=self.config.local_llm_base_url,
            api_key=self.config.local_llm_api_key,
            model=self.config.local_llm_model,
            telemetry=telemetry,
            timeout_sec=timeout,
        )

    def _call_gemini(self, telemetry: Dict[str, Any], timeout_sec: Optional[float] = None) -> Dict[str, Any]:
        """Invokes Google Gemini REST API."""
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        user_content = json.dumps(telemetry, ensure_ascii=False, indent=2)
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{SYSTEM_PROMPT}\n\n[DỮ LIỆU TELEMETRY]\n{user_content}"}],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }
        req = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        timeout = timeout_sec or 20.0
        with urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            cand = data.get("candidates", [])[0]
            text = cand.get("content", {}).get("parts", [])[0].get("text", "")
            cleaned = clean_json_text(text)
            parsed = json.loads(cleaned)
            return parsed

    def route_and_execute(
        self,
        telemetry: Dict[str, Any],
        provider_override: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Executes request with dynamic routing and cascading automatic fallback:
        - Target Cloud -> Fallback Edge -> Fallback Heuristic
        - Target Edge  -> Fallback Cloud (if online) -> Fallback Heuristic
        - Appends comprehensive routing_metadata to the response.
        """
        t_start = time.monotonic()
        telemetry = enrich_telemetry_with_gis(telemetry)
        with self._lock:
            self._active_requests += 1

        try:
            target_route, decision_factors = self.decide_route(telemetry, provider_override=provider_override)
            fallback_history: List[Dict[str, Any]] = []
            # 1. Direct Fallback
            if target_route == "fallback":
                res = _generate_heuristic_sitrep(telemetry)
                res["routing_metadata"] = {
                    "tier": "fallback",
                    "model": "heuristic-v1",
                    "target_route": "fallback",
                    "fallback_used": False,
                    "fallback_history": [],
                    "latency_ms": round((time.monotonic() - t_start) * 1000.0, 2),
                    "decision_factors": decision_factors,
                }
                return res

            # 2. Gemini Route
            if target_route == "gemini":
                try:
                    res = self._call_gemini(telemetry, timeout_sec=timeout_seconds)
                    res = _normalize_sitrep_keys(res, telemetry)
                    gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
                    res["model_provider"] = f"gemini ({gemini_model})"
                    res["routing_metadata"] = {
                        "tier": "cloud",
                        "model": gemini_model,
                        "target_route": "gemini",
                        "fallback_used": False,
                        "fallback_history": [],
                        "latency_ms": round((time.monotonic() - t_start) * 1000.0, 2),
                        "decision_factors": decision_factors,
                    }
                    return res
                except Exception as e:
                    logger.warning("Gemini invocation failed: %s. Initiating cascade to Heuristic.", e)
                    fallback_history.append({"tier": "cloud_gemini", "error": str(e)})

            # 3. Target Cloud
            if target_route == "cloud":
                # Primary Attempt: Cloud
                try:
                    res = self._call_cloud(telemetry, timeout_sec=timeout_seconds)
                    res = _normalize_sitrep_keys(res, telemetry)
                    res["model_provider"] = f"openai ({self.config.openai_model})"
                    res["routing_metadata"] = {
                        "tier": "cloud",
                        "model": self.config.openai_model,
                        "target_route": "cloud",
                        "fallback_used": False,
                        "fallback_history": [],
                        "latency_ms": round((time.monotonic() - t_start) * 1000.0, 2),
                        "decision_factors": decision_factors,
                    }
                    return res
                except Exception as e_cloud:
                    logger.warning("Cloud tier execution failed: %s. Cascading to Edge tier.", e_cloud)
                    fallback_history.append({"tier": "cloud", "model": self.config.openai_model, "error": str(e_cloud)})

                # Cascading Fallback 1: Edge (Ollama)
                try:
                    res = self._call_edge(telemetry, timeout_sec=timeout_seconds)
                    res = _normalize_sitrep_keys(res, telemetry)
                    res["model_provider"] = f"local ({self.config.local_llm_model})"
                    res["routing_metadata"] = {
                        "tier": "edge",
                        "model": self.config.local_llm_model,
                        "target_route": "cloud",
                        "fallback_used": True,
                        "fallback_history": fallback_history,
                        "latency_ms": round((time.monotonic() - t_start) * 1000.0, 2),
                        "decision_factors": decision_factors,
                    }
                    return res
                except Exception as e_edge:
                    logger.warning("Edge tier fallback failed: %s. Cascading to Heuristic tier.", e_edge)
                    fallback_history.append({"tier": "edge", "model": self.config.local_llm_model, "error": str(e_edge)})

                # Cascading Fallback 2: Heuristic
                res = _generate_heuristic_sitrep(telemetry)
                res["routing_metadata"] = {
                    "tier": "fallback",
                    "model": "heuristic-v1",
                    "target_route": "cloud",
                    "fallback_used": True,
                    "fallback_history": fallback_history,
                    "latency_ms": round((time.monotonic() - t_start) * 1000.0, 2),
                    "decision_factors": decision_factors,
                }
                return res

            # 4. Target Edge
            if target_route == "edge":
                # Primary Attempt: Edge
                try:
                    res = self._call_edge(telemetry, timeout_sec=timeout_seconds)
                    res = _normalize_sitrep_keys(res, telemetry)
                    res["model_provider"] = f"local ({self.config.local_llm_model})"
                    res["routing_metadata"] = {
                        "tier": "edge",
                        "model": self.config.local_llm_model,
                        "target_route": "edge",
                        "fallback_used": False,
                        "fallback_history": [],
                        "latency_ms": round((time.monotonic() - t_start) * 1000.0, 2),
                        "decision_factors": decision_factors,
                    }
                    return res
                except Exception as e_edge:
                    logger.warning("Edge tier execution failed: %s. Checking Cloud fallback eligibility.", e_edge)
                    fallback_history.append({"tier": "edge", "model": self.config.local_llm_model, "error": str(e_edge)})

                # Cascading Fallback 1: Cloud (if online)
                if decision_factors.get("is_online", False):
                    try:
                        res = self._call_cloud(telemetry, timeout_sec=timeout_seconds)
                        res = _normalize_sitrep_keys(res, telemetry)
                        res["model_provider"] = f"openai ({self.config.openai_model})"
                        res["routing_metadata"] = {
                            "tier": "cloud",
                            "model": self.config.openai_model,
                            "target_route": "edge",
                            "fallback_used": True,
                            "fallback_history": fallback_history,
                            "latency_ms": round((time.monotonic() - t_start) * 1000.0, 2),
                            "decision_factors": decision_factors,
                        }
                        return res
                    except Exception as e_cloud:
                        logger.warning("Cloud tier fallback failed: %s. Cascading to Heuristic tier.", e_cloud)
                        fallback_history.append({"tier": "cloud", "model": self.config.openai_model, "error": str(e_cloud)})

                # Cascading Fallback 2: Heuristic
                res = _generate_heuristic_sitrep(telemetry)
                res["routing_metadata"] = {
                    "tier": "fallback",
                    "model": "heuristic-v1",
                    "target_route": "edge",
                    "fallback_used": True,
                    "fallback_history": fallback_history,
                    "latency_ms": round((time.monotonic() - t_start) * 1000.0, 2),
                    "decision_factors": decision_factors,
                }
                return res

            # Catch-all
            res = _generate_heuristic_sitrep(telemetry)
            res["routing_metadata"] = {
                "tier": "fallback",
                "model": "heuristic-v1",
                "target_route": target_route,
                "fallback_used": bool(fallback_history),
                "fallback_history": fallback_history,
                "latency_ms": round((time.monotonic() - t_start) * 1000.0, 2),
                "decision_factors": decision_factors,
            }
            return res

        finally:
            with self._lock:
                self._active_requests = max(0, self._active_requests - 1)

    # Public alias for contract compliance
    route_and_analyze = route_and_execute


# Global singleton router instance
_global_router: Optional[HybridTieredRouter] = None


def get_router(refresh_config: bool = True) -> HybridTieredRouter:
    """
    Returns the singleton HybridTieredRouter instance.
    Optionally refreshes configuration from environment variables.
    """
    global _global_router
    if _global_router is None:
        _global_router = HybridTieredRouter()
    elif refresh_config:
        _global_router.reload_config()
    return _global_router


def analyze_fire_spread_with_llm(
    telemetry: Dict[str, Any],
    provider: Optional[str] = None,
    timeout_seconds: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Analyzes fire telemetry using the Hybrid Tiered Router.
    Backward-compatible:
      - provider == 'fallback' -> directly invokes _generate_heuristic_sitrep (preserves existing contracts).
      - provider in ('openai', 'cloud') -> forces Cloud tier.
      - provider in ('local', 'edge', 'ollama') -> forces Edge tier.
      - provider in (None, 'auto') -> uses dynamic multi-criteria routing.
    """
    telemetry = enrich_telemetry_with_gis(telemetry)
    if provider == "fallback":
        return _generate_heuristic_sitrep(telemetry)

    router = get_router()
    return router.route_and_execute(
        telemetry=telemetry,
        provider_override=provider,
        timeout_seconds=timeout_seconds,
    )
