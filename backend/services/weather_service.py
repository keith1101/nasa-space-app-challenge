"""
Open-Meteo Weather Enrichment Service for Wildfire Spread Analysis.
Fetches ambient wind speed, wind direction, relative humidity, and temperature.
Zero external API key required. Features in-memory caching and offline graceful fallback.
"""

import json
import logging
import time
from typing import Dict, Any, Optional
from urllib.error import HTTPError, URLError
from urllib.request import urlopen, Request

from backend.core.kinematics import analyze_wind_fire_alignment

logger = logging.getLogger("weather_service")

# In-memory weather cache: (lat_round, lon_round) -> (timestamp, data)
_WEATHER_CACHE: Dict[str, Any] = {}
_CACHE_TTL_SECONDS = 1800.0  # 30 minutes


def get_weather_at_point(
    latitude: float,
    longitude: float,
    timeout_seconds: float = 6.0,
) -> Dict[str, Any]:
    """
    Fetches real-time ambient weather from Open-Meteo API.
    Falls back to regional seasonal climatological estimates if offline.
    """
    lat_key = round(latitude, 2)
    lon_key = round(longitude, 2)
    cache_key = f"{lat_key}_{lon_key}"

    now = time.monotonic()
    if cache_key in _WEATHER_CACHE:
        cached_ts, cached_data = _WEATHER_CACHE[cache_key]
        if now - cached_ts < _CACHE_TTL_SECONDS:
            return cached_data

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat_key}&longitude={lon_key}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation"
        f"&wind_speed_unit=kmh"
    )

    req = Request(
        url,
        headers={"User-Agent": "NASASpaceApps-WildfireHarmonizer/2.2 (academic-research)"},
    )

    try:
        with urlopen(req, timeout=timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
            current = payload.get("current", {})
            weather_res = {
                "temperature_c": float(current.get("temperature_2m", 30.0)),
                "relative_humidity_pct": float(current.get("relative_humidity_2m", 50.0)),
                "wind_speed_kmh": float(current.get("wind_speed_10m", 12.0)),
                "wind_direction_from_deg": float(current.get("wind_direction_10m", 180.0)),
                "precipitation_mm": float(current.get("precipitation", 0.0)),
                "source": "Open-Meteo API",
                "is_fallback": False,
            }
            _WEATHER_CACHE[cache_key] = (now, weather_res)
            return weather_res
    except (HTTPError, URLError, TimeoutError, Exception) as exc:
        logger.warning("Open-Meteo request failed (%s). Using offline fallback.", exc)
        # Seasonal tropical baseline estimate
        fallback_res = {
            "temperature_c": 32.0,
            "relative_humidity_pct": 45.0,
            "wind_speed_kmh": 15.0,
            "wind_direction_from_deg": 180.0,
            "precipitation_mm": 0.0,
            "source": "Regional Climatological Fallback",
            "is_fallback": True,
        }
        _WEATHER_CACHE[cache_key] = (now, fallback_res)
        return fallback_res


def enrich_fire_event_with_weather(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriches a fire event with ambient weather and computes wind-fire alignment metrics.
    """
    target = event.get("current_centroid") or event.get("origin_centroid") or {}
    lat = float(target.get("latitude", 0.0))
    lon = float(target.get("longitude", 0.0))

    weather = get_weather_at_point(lat, lon)
    kinematics = event.get("kinematics", {})
    bearing = kinematics.get("current_bearing_deg")
    if bearing is None:
        bearing = kinematics.get("net_bearing_deg") or 0.0

    alignment = analyze_wind_fire_alignment(
        fire_bearing_deg=float(bearing),
        wind_direction_from_deg=weather["wind_direction_from_deg"],
        wind_speed_kmh=weather["wind_speed_kmh"],
    )

    enriched_event = dict(event)
    enriched_event["weather"] = weather
    enriched_event["wind_alignment"] = alignment
    return enriched_event
