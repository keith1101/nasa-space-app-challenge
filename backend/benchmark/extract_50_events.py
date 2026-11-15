"""
Dataset Extractor for Statistical Benchmarking.
Extracts N = 50 real active fire events from NASA FIRMS dataset,
stratified across multi-day, persistent, and emerging regimes,
filtered by MCD12Q1 vegetation biomes (IGBP classes 1-10, 12, 14),
enriched with Open-Meteo real weather, kinematics, and human-readable administrative locations.
"""

import json
import logging
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.harmonizer import FireHarmonizer
from backend.services.cache_service import cache_manager
from backend.core.tracking import track_fire_events
from backend.services.weather_service import enrich_fire_event_with_weather
from backend.services.landcover_service import (
    VEGETATION_CLASSES,
    classify_hotspot_biome,
    get_landcover_code_at_point,
)
from backend.services.province_service import (
    load_vietnam_provinces,
    assign_province,
    compute_geometry_bbox,
)
from backend.core.geometry import point_in_geojson_geometry

logger = logging.getLogger("dataset_extractor")


def _load_world_countries(world_geojson_path: Path) -> List[Dict[str, Any]]:
    """Loads world country boundaries with precomputed bounding boxes."""
    if not world_geojson_path.exists():
        logger.warning("world_countries.geojson not found at %s", world_geojson_path)
        return []
    try:
        with open(world_geojson_path, "r", encoding="utf-8") as f:
            world_data = json.load(f)
        country_features: List[Dict[str, Any]] = []
        for feat in world_data.get("features", []):
            props = feat.get("properties", {})
            name = props.get("NAME") or props.get("ADMIN") or props.get("SOVEREIGNT", "")
            geom = feat.get("geometry", {})
            bbox = compute_geometry_bbox(geom)
            country_features.append({
                "name": name,
                "geometry": geom,
                "_bbox": bbox,
            })
        return country_features
    except Exception as exc:
        logger.warning("Failed to load world countries: %s", exc)
        return []


def is_coordinate_on_land(
    lat: float,
    lon: float,
    prov_features: List[Dict[str, Any]],
    countries: List[Dict[str, Any]],
) -> Tuple[bool, Optional[str]]:
    """
    Determines whether a coordinate is on land (Vietnam or another recognized country)
    or in open water / offshore. Returns (is_land, country_or_region).
    """
    for pf in prov_features:
        min_lon, min_lat, max_lon, max_lat = pf["_bbox"]
        if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
            if point_in_geojson_geometry(lon, lat, pf["geometry"]):
                return True, "Vietnam"

    for c in countries:
        min_lon, min_lat, max_lon, max_lat = c["_bbox"]
        if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
            if point_in_geojson_geometry(lon, lat, c["geometry"]):
                return True, c["name"]

    return False, None


def resolve_administrative_location(
    lat: float,
    lon: float,
    prov_features: List[Dict[str, Any]],
    countries: List[Dict[str, Any]],
) -> str:
    """
    Resolves human-readable administrative location name for a given coordinate.
    Prioritizes Vietnamese provinces, then neighboring Southeast Asian provinces/countries.
    """
    assigned = assign_province([{"latitude": lat, "longitude": lon}], prov_features)
    if assigned and assigned[0].get("in_vietnam"):
        return f"{assigned[0]['province_name']}, Việt Nam"

    # Neighboring Country Resolution
    matched_country = None
    for c in countries:
        min_lon, min_lat, max_lon, max_lat = c["_bbox"]
        if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
            if point_in_geojson_geometry(lon, lat, c["geometry"]):
                matched_country = c["name"]
                break

    if matched_country == "Laos":
        if 19.0 <= lat <= 20.6 and 102.8 <= lon <= 104.5:
            return "Xieng Khouang, Lào"
        elif 17.5 <= lat <= 19.0 and 102.0 <= lon <= 103.2:
            return "Vientiane, Lào"
        elif 17.8 <= lat <= 19.0 and 103.2 <= lon <= 105.0:
            return "Bolikhamsai, Lào"
        elif 16.5 <= lat <= 17.8 and 104.5 <= lon <= 106.5:
            return "Khammouane, Lào"
        elif 15.5 <= lat <= 16.8 and 105.5 <= lon <= 107.0:
            return "Savannakhet, Lào"
        elif 14.8 <= lat <= 15.8 and 106.0 <= lon <= 107.6:
            return "Sekong, Lào"
        elif 14.0 <= lat <= 15.2 and 105.5 <= lon <= 107.2:
            return "Attapeu, Lào"
        elif 14.8 <= lat <= 15.8 and 105.2 <= lon <= 106.3:
            return "Champasak, Lào"
        return "Lào"

    elif matched_country == "Cambodia":
        if 13.0 <= lat <= 14.6 and 106.2 <= lon <= 107.8:
            return "Ratanakiri, Campuchia"
        elif 12.0 <= lat <= 13.5 and 106.2 <= lon <= 107.8:
            return "Mondulkiri, Campuchia"
        elif 13.0 <= lat <= 14.5 and 105.5 <= lon <= 106.4:
            return "Stung Treng, Campuchia"
        elif 12.0 <= lat <= 13.5 and 105.5 <= lon <= 106.4:
            return "Kratie, Campuchia"
        elif 13.0 <= lat <= 14.5 and 103.5 <= lon <= 105.5:
            return "Preah Vihear, Campuchia"
        elif 13.0 <= lat <= 14.2 and 102.5 <= lon <= 104.2:
            return "Siem Reap, Campuchia"
        elif 12.0 <= lat <= 13.5 and 102.5 <= lon <= 104.2:
            return "Battambang, Campuchia"
        elif 10.5 <= lat <= 12.0 and 104.0 <= lon <= 106.0:
            return "Kompong Cham, Campuchia"
        return "Campuchia"

    elif matched_country == "China":
        if 21.0 <= lat <= 26.0 and 106.0 <= lon <= 110.0:
            return "Quảng Tây, Trung Quốc"
        elif 21.0 <= lat <= 26.0 and 100.0 <= lon <= 106.0:
            return "Vân Nam, Trung Quốc"
        return "Trung Quốc"

    elif matched_country == "Thailand":
        return "Đông Bắc Thái Lan, Thái Lan"

    elif matched_country == "Myanmar":
        return "Myanmar"

    elif matched_country == "Vietnam":
        return "Việt Nam"

    return "Khu vực Đông Nam Á"


def format_detected_timestamps(iso_str: str) -> Tuple[str, str]:
    """Formats detected time into ISO-8601 UTC and Indochina local time (GMT+7)."""
    clean_iso = iso_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(clean_iso)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)

    utc_formatted = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    local_dt = dt.astimezone(timezone(timedelta(hours=7)))
    local_formatted = local_dt.strftime("%Y-%m-%d %H:%M:%S (GMT+7)")
    return utc_formatted, local_formatted


def extract_real_firms_50_events(output_path: Path) -> List[Dict[str, Any]]:
    """
    Extracts 50 real fire events with physical spatial velocity limits,
    filtered by MCD12Q1 vegetation biomes, stratified across 3 duration regimes,
    and enriched with Open-Meteo meteorology and administrative locations.
    """
    prov_path = ROOT_DIR / "data" / "geojson" / "vietnam_provinces.geojson"
    world_path = ROOT_DIR / "data" / "geojson" / "world_countries.geojson"

    prov_features = load_vietnam_provinces(prov_path) if prov_path.exists() else []
    world_countries = _load_world_countries(world_path)

    cache_manager.ensure_raw_cache()
    cached = cache_manager.get_cached_records()
    recs_m = cached["modis_recs"]
    recs_v = cached["viirs_recs"]

    harmonizer = FireHarmonizer(spatial_eps_km=1.25, time_window_hours=3.0)
    harm_recs, _ = harmonizer.harmonize_records(recs_m, recs_v)

    # Track fire events with physical velocity limits and spatial jump clamp
    # Completely eliminates the legacy percolation artifact (936 detections chained into FE-0002)
    all_events = track_fire_events(
        harm_recs,
        max_time_gap_hours=36.0,
        base_spatial_eps_km=1.5,
        max_spread_velocity_kmh=3.5,
        max_spatial_jump_km=8.0,
    )

    logger.info("Total tracked raw events: %d", len(all_events))

    # Filter by Vegetation Biomes (IGBP classes 1-10, 12, 14) and Land Boundary
    # Excludes offshore gas flaring anomalies and non-vegetation landcovers
    vegetation_events: List[Dict[str, Any]] = []
    for ev in all_events:
        o_lat = float(ev["origin_centroid"]["latitude"])
        o_lon = float(ev["origin_centroid"]["longitude"])
        c_lat = float(ev["current_centroid"]["latitude"])
        c_lon = float(ev["current_centroid"]["longitude"])

        o_on_land, _ = is_coordinate_on_land(o_lat, o_lon, prov_features, world_countries)
        c_on_land, _ = is_coordinate_on_land(c_lat, c_lon, prov_features, world_countries)

        if not (o_on_land and c_on_land):
            # Exclude offshore marine flaring and points outside land boundaries
            continue

        o_code = get_landcover_code_at_point(o_lat, o_lon)
        c_code = get_landcover_code_at_point(c_lat, c_lon)

        if o_code in VEGETATION_CLASSES and c_code in VEGETATION_CLASSES:
            ev["_origin_igbp_code"] = o_code
            ev["_current_igbp_code"] = c_code
            vegetation_events.append(ev)

    logger.info("Events retained after MCD12Q1 vegetation filter: %d", len(vegetation_events))

    # Stratified Sampling across 50 events:
    # 1. Multi-day conflagrations (15 events)
    # 2. Persistent active fires (20 events)
    # 3. Emerging / single-pass fires (15 events)
    # Sorted by total FRP descending to select high-signal events within each stratum
    multi_day = sorted(
        [e for e in vegetation_events if e["status"] == "MULTI_DAY_CONFLAGRATION"],
        key=lambda e: e.get("total_frp_mw", 0.0),
        reverse=True,
    )
    persistent = sorted(
        [e for e in vegetation_events if e["status"] == "PERSISTENT_ACTIVE_FIRE"],
        key=lambda e: e.get("total_frp_mw", 0.0),
        reverse=True,
    )
    emerging = sorted(
        [e for e in vegetation_events if e["status"] in ("RECENT_ACTIVE_FIRE", "SINGLE_PASS_EVENT")],
        key=lambda e: e.get("total_frp_mw", 0.0),
        reverse=True,
    )

    selected: List[Dict[str, Any]] = []
    selected.extend(multi_day[:15])
    selected.extend(persistent[:20])
    selected.extend(emerging[:15])

    # Fallback padding if any stratum is short
    if len(selected) < 50:
        seen_ids = {e["event_id"] for e in selected}
        for ev in sorted(vegetation_events, key=lambda e: e.get("total_frp_mw", 0.0), reverse=True):
            if ev["event_id"] not in seen_ids:
                selected.append(ev)
                seen_ids.add(ev["event_id"])
            if len(selected) >= 50:
                break

    selected = selected[:50]

    # Enrich each event with ambient meteorology, locations, timestamps, and biomes
    enriched_dataset: List[Dict[str, Any]] = []
    for idx, ev in enumerate(selected, start=1):
        sample_id = f"SAMPLE-{idx:03d}"
        ev_copy = dict(ev)
        ev_copy["benchmark_sample_id"] = sample_id

        # Weather enrichment via Open-Meteo
        weather_enriched = enrich_fire_event_with_weather(ev_copy)

        c_lat = float(weather_enriched["current_centroid"]["latitude"])
        c_lon = float(weather_enriched["current_centroid"]["longitude"])

        # Timestamp formatting
        first_utc = weather_enriched.get("first_detected_utc") or weather_enriched["waypoints"][0]["datetime_utc"]
        det_utc, det_local = format_detected_timestamps(first_utc)

        # Administrative location resolution
        loc_name = resolve_administrative_location(c_lat, c_lon, prov_features, world_countries)

        # Biome classification
        known_code = weather_enriched.get("_current_igbp_code")
        biome_info = classify_hotspot_biome(c_lat, c_lon, known_code=known_code)
        biome_class = biome_info["land_cover_class"]

        # Clean internal underscore keys
        weather_enriched.pop("_origin_igbp_code", None)
        weather_enriched.pop("_current_igbp_code", None)

        # Explicit standardized top-level keys
        structured_sample = {
            "benchmark_sample_id": sample_id,
            "event_id": weather_enriched["event_id"],
            "status": weather_enriched["status"],
            "detected_time_utc": det_utc,
            "detected_time_local": det_local,
            "location_name": loc_name,
            "biome_class": biome_class,
            "duration_hours": weather_enriched["duration_hours"],
            "first_detected_utc": weather_enriched["first_detected_utc"],
            "last_detected_utc": weather_enriched["last_detected_utc"],
            "centroid_lat": weather_enriched["centroid_lat"],
            "centroid_lon": weather_enriched["centroid_lon"],
            "total_frp_mw": weather_enriched["total_frp_mw"],
            "peak_frp_mw": weather_enriched["peak_frp_mw"],
            "overall_rate_of_spread_kmh": weather_enriched["overall_rate_of_spread_kmh"],
            "overall_bearing_deg": weather_enriched["overall_bearing_deg"],
            "overall_bearing_compass": weather_enriched["overall_bearing_compass"],
            "waypoint_count": weather_enriched["waypoint_count"],
            "pass_count": weather_enriched["pass_count"],
            "raw_detection_count": weather_enriched["raw_detection_count"],
            "origin_centroid": weather_enriched["origin_centroid"],
            "current_centroid": weather_enriched["current_centroid"],
            "kinematics": weather_enriched["kinematics"],
            "weather": weather_enriched.get("weather", {}),
            "wind_alignment": weather_enriched.get("wind_alignment", {}),
            "waypoints": weather_enriched["waypoints"],
        }
        enriched_dataset.append(structured_sample)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(enriched_dataset, f, ensure_ascii=False, indent=2)

    logger.info("Successfully exported %d benchmark events to %s", len(enriched_dataset), output_path)
    return enriched_dataset


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    out_file = ROOT_DIR / "data" / "benchmark" / "real_firms_50_events.json"
    dataset = extract_real_firms_50_events(out_file)
    print(f"Successfully extracted and saved {len(dataset)} real fire events to {out_file}")
