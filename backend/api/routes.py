"""
FastAPI Routes and Core Dispatcher for NASA FIRMS Harmonization Platform.
Defines endpoints for live ST-DBSCAN clustering, telemetry status, metrics, and calendar.
"""

import json
import math
from pathlib import Path
from typing import Optional, Dict, Any, List

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "frontend" / "public" / "data"

from backend.core.engine import FireHarmonizer
from backend.core.tracking import track_fire_events
from backend.services.weather_service import enrich_fire_event_with_weather
from backend.services.llm_service import analyze_fire_spread_with_llm
from backend.services.landcover_service import compute_global_vegetation, LandCoverUnavailable
from backend.services.grid_risk_service import predict_live_grid
from backend.services.province_service import assign_province
from backend.services.cache_service import cache_manager
from backend.services.airbase_service import airbase_service
from backend.models import (
    HarmonizeResponse,
    DataStatusResponse,
    ProvinceItemResponse,
    NearestAirbaseResponse,
    MissionRouteResponse,
    HAS_PYDANTIC,
)

try:
    from fastapi import APIRouter, Query, HTTPException
    HAS_FASTAPI = True
except ImportError:
    APIRouter = object
    Query = lambda default, *args, **kwargs: default
    HTTPException = Exception
    HAS_FASTAPI = False


def load_json_file(filename: str) -> Any:
    """Reads JSON artifacts from frontend/public/data."""
    path = DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"File {filename} not found.")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def compute_live_harmonization(
    eps_km: float = 1.25,
    time_window_hours: float = 3.0,
    use_footprint: bool = True,
    vietnam_only: bool = False,
    date_filter: str = "all",
    daynight: str = "all",
) -> Dict[str, Any]:
    """Executes live Spatio-Temporal DBSCAN & Bayesian Confidence Fusion with custom parameters."""
    try:
        eps_val = float(eps_km)
        if not math.isfinite(eps_val):
            eps_val = 1.25
    except (ValueError, TypeError):
        eps_val = 1.25
    eps_val = max(0.25, min(10.0, eps_val))

    try:
        tw_val = float(time_window_hours)
        if not math.isfinite(tw_val):
            tw_val = 3.0
    except (ValueError, TypeError):
        tw_val = 3.0
    tw_val = max(0.5, min(48.0, tw_val))

    cache_manager.ensure_raw_cache()
    cached = cache_manager.get_cached_records()
    recs_m = cached["modis_recs"]
    recs_v = cached["viirs_recs"]
    province_features = cached["province_features"]

    if vietnam_only:
        recs_m = [r for r in recs_m if r.get("in_vietnam")]
        recs_v = [r for r in recs_v if r.get("in_vietnam")]

    if date_filter and date_filter != "all":
        recs_m = [r for r in recs_m if str(r.get("acq_date")) == date_filter]
        recs_v = [r for r in recs_v if str(r.get("acq_date")) == date_filter]

    if daynight and daynight in ("D", "N"):
        recs_m = [r for r in recs_m if str(r.get("daynight")) == daynight]
        recs_v = [r for r in recs_v if str(r.get("daynight")) == daynight]

    harmonizer = FireHarmonizer(
        spatial_eps_km=eps_val,
        time_window_hours=tw_val,
        use_footprint=bool(use_footprint),
    )
    harm_recs, metrics = harmonizer.harmonize_records(recs_m, recs_v)

    features_h = []
    if harm_recs:
        harm_with_prov = assign_province(harm_recs, province_features)
        for row in harm_with_prov:
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
                        "harmonized_frp": round(float(row["harmonized_frp"]), 1),
                        "max_brightness": round(float(row["max_brightness"]), 1),
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

    return {
        "metrics": metrics,
        "harmonized_geojson": {"type": "FeatureCollection", "features": features_h},
    }


def compute_live_fire_trajectories(
    max_time_gap_hours: float = 36.0,
    base_spatial_eps_km: float = 1.5,
    max_spread_velocity_kmh: float = 3.5,
    vietnam_only: bool = False,
    enrich_weather: bool = True,
) -> Dict[str, Any]:
    """
    Computes multi-pass Spatio-Temporal DAG fire event tracking and trajectory kinematics.
    """
    cache_manager.ensure_raw_cache()
    cached = cache_manager.get_cached_records()
    recs_m = cached["modis_recs"]
    recs_v = cached["viirs_recs"]

    if vietnam_only:
        recs_m = [r for r in recs_m if r.get("in_vietnam")]
        recs_v = [r for r in recs_v if r.get("in_vietnam")]

    harmonizer = FireHarmonizer(spatial_eps_km=1.25, time_window_hours=3.0)
    harm_recs, _ = harmonizer.harmonize_records(recs_m, recs_v)

    events = track_fire_events(
        harm_recs,
        max_time_gap_hours=max_time_gap_hours,
        base_spatial_eps_km=base_spatial_eps_km,
        max_spread_velocity_kmh=max_spread_velocity_kmh,
    )

    if enrich_weather:
        # Enrich top 10 most energetic events with Open-Meteo ambient weather
        for ev in events[:10]:
            enrich_fire_event_with_weather(ev)

    return {
        "event_count": len(events),
        "multi_day_conflagrations": sum(1 for e in events if e["status"] == "MULTI_DAY_CONFLAGRATION"),
        "persistent_active_fires": sum(1 for e in events if e["status"] == "PERSISTENT_ACTIVE_FIRE"),
        "events": events,
    }


def compute_fire_llm_analysis(
    event_id: Optional[str] = None,
    custom_telemetry: Optional[Dict[str, Any]] = None,
    provider: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generates tactical SITREP and spread mechanism analysis using configured LLM provider.
    """
    if custom_telemetry:
        telemetry = custom_telemetry
    else:
        trajectories = compute_live_fire_trajectories(enrich_weather=True)
        events = trajectories.get("events", [])
        if not events:
            raise ValueError("No active fire events detected in current dataset.")
        if event_id:
            matched = [e for e in events if e["event_id"] == event_id]
            if not matched:
                raise ValueError(f"Fire event '{event_id}' not found.")
            telemetry = matched[0]
        else:
            telemetry = events[0]

    if "weather" not in telemetry:
        telemetry = enrich_fire_event_with_weather(telemetry)

    analysis = analyze_fire_spread_with_llm(telemetry, provider=provider)
    enriched_telem = analysis.get("enriched_telemetry") or telemetry
    return {
        "event_id": enriched_telem.get("event_id"),
        "telemetry": enriched_telem,
        "analysis": analysis,
    }


def compute_nearest_airbase(
    lat: float,
    lon: float,
    min_runway: float = 1200.0,
    max_distance_km: float = 500.0,
    fire_capable_only: bool = False,
) -> Dict[str, Any]:
    """Finds nearest compatible airbase or falls back to procedural Forward Operating Base (FOB)."""
    return airbase_service.find_nearest_airbase(
        lat=lat,
        lon=lon,
        min_runway_m=min_runway,
        max_distance_km=max_distance_km,
        fire_capable_only=fire_capable_only,
    )


def compute_mission_route(
    origin_lat: float,
    origin_lon: float,
    target_lat: float,
    target_lon: float,
    cruise_alt_m: float = 2500.0,
    origin_icao: Optional[str] = None,
    origin_elev_m: Optional[float] = None,
    target_elev_m: Optional[float] = None,
) -> Dict[str, Any]:
    """Generates 3D tactical transit waypoints from origin runway to target wildfire."""
    return airbase_service.generate_mission_route(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        target_lat=target_lat,
        target_lon=target_lon,
        cruise_alt_m=cruise_alt_m,
        origin_icao=origin_icao,
        origin_elev_m=origin_elev_m,
        target_elev_m=target_elev_m,
    )


def create_api_router() -> Any:
    """Factory function creating FastAPI APIRouter instance if FastAPI is installed."""
    if not HAS_FASTAPI:
        return None

    router = APIRouter(prefix="/api", tags=["Harmonization"])

    @router.get("/data-status", response_model=DataStatusResponse if HAS_PYDANTIC else None)
    def data_status():
        cache_manager.ensure_raw_cache()
        status_meta = cache_manager.live_client.status()
        stamp = cache_manager.get_cached_records().get("stamp", "local")
        return {**status_meta, "mode": "live" if stamp != "local" else "local"}

    @router.get("/metrics")
    def get_metrics():
        """Returns harmonization comparative metrics, daily breakdown, and key findings."""
        try:
            return load_json_file("analytics_summary.json")
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))

    @router.get("/calendar")
    def get_calendar(province: Optional[str] = Query(None, description="Province or macro-region name")):
        """Returns multi-year monthly calendar heatmap data."""
        try:
            data = load_json_file("calendar_matrix.json")
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        if province:
            clean_p = province.strip()
            if clean_p in data:
                return data[clean_p]
            raise HTTPException(status_code=404, detail=f"Region '{province}' not found.")
        return data

    @router.get("/provinces", response_model=List[ProvinceItemResponse] if HAS_PYDANTIC else None)
    def get_provinces():
        """Returns list of all regions and provinces with peak fire seasons."""
        try:
            data = load_json_file("calendar_matrix.json")
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        return [
            {
                "name": k,
                "scope": v.get("scope", "vietnam_province"),
                "peak_season": v.get("peak_season", ""),
                "observed_7d_harmonized": v.get("observed_7d_harmonized", 0),
            }
            for k, v in data.items()
        ]

    @router.get("/harmonize", response_model=HarmonizeResponse if HAS_PYDANTIC else None)
    def run_live_harmonization(
        eps_km: float = Query(1.25, ge=0.25, le=5.0, description="Spatial clustering radius in km"),
        time_window_hours: float = Query(3.0, ge=0.5, le=24.0, description="Temporal clustering window in hours"),
        use_footprint: bool = Query(True, description="Include MODIS/VIIRS scan & track bow-tie footprint matching"),
        vietnam_only: bool = Query(False, description="Filter strictly to Vietnam administrative boundaries"),
        date_filter: str = Query("all", description="Filter by acquisition date (YYYY-MM-DD) or 'all'"),
        daynight: str = Query("all", description="Filter by orbital pass ('D', 'N', or 'all')"),
    ):
        """Executes live Spatio-Temporal DBSCAN & Bayesian Confidence Fusion with custom parameters."""
        return compute_live_harmonization(
            eps_km=eps_km,
            time_window_hours=time_window_hours,
            use_footprint=use_footprint,
            vietnam_only=vietnam_only,
            date_filter=date_filter,
            daynight=daynight,
        )

    @router.get("/fire-trajectories")
    def get_fire_trajectories(
        max_time_gap_hours: float = Query(36.0, ge=1.0, le=168.0, description="Max hours gap between linked passes"),
        base_spatial_eps_km: float = Query(1.5, ge=0.5, le=10.0, description="Base footprint margin in km"),
        max_spread_velocity_kmh: float = Query(3.5, ge=0.5, le=10.0, description="Max physical spread velocity in km/h"),
        vietnam_only: bool = Query(False, description="Filter strictly to Vietnam"),
        enrich_weather: bool = Query(True, description="Query Open-Meteo for ambient wind & weather"),
    ):
        """Builds multi-pass Spatio-Temporal DAG, tracking fire duration and propagation vectors."""
        return compute_live_fire_trajectories(
            max_time_gap_hours=max_time_gap_hours,
            base_spatial_eps_km=base_spatial_eps_km,
            max_spread_velocity_kmh=max_spread_velocity_kmh,
            vietnam_only=vietnam_only,
            enrich_weather=enrich_weather,
        )

    @router.get("/fire-analysis")
    def get_fire_analysis(
        event_id: Optional[str] = Query(None, description="Fire event ID (e.g. FE-0001)"),
        provider: Optional[str] = Query(None, description="LLM provider: gemini, openai, local, or heuristic fallback"),
    ):
        """Generates tactical wildfire SITREP using provider-agnostic LLM with weather alignment."""
        try:
            return compute_fire_llm_analysis(event_id=event_id, provider=provider)
        except ValueError as err:
            raise HTTPException(status_code=404, detail=str(err))

    @router.post("/fire-analysis")
    def post_fire_analysis(
        payload: Dict[str, Any],
        provider: Optional[str] = Query(None, description="LLM provider override"),
    ):
        """Generates tactical wildfire SITREP from custom telemetry JSON payload."""
        try:
            event_id = payload.get("event_id")
            custom_telemetry = payload.get("telemetry") or payload
            return compute_fire_llm_analysis(event_id=event_id, custom_telemetry=custom_telemetry, provider=provider)
        except Exception as err:
            raise HTTPException(status_code=400, detail=str(err))

    @router.get("/vegetation-fires")
    def get_vegetation_fires():
        """Returns global active fire hotspots classified on MCD12Q1 vegetation biomes."""
        try:
            return compute_global_vegetation()
        except LandCoverUnavailable as err:
            raise HTTPException(status_code=503, detail=str(err))

    @router.get("/live-experimental-grid")
    def get_live_experimental_grid(
        latitude: float = Query(..., description="Hotspot latitude"),
        longitude: float = Query(..., description="Hotspot longitude"),
    ):
        """Simulates 1-km directional fire risk grid across 6h, 12h, 24h horizons."""
        try:
            return predict_live_grid(latitude, longitude)
        except Exception as err:
            raise HTTPException(status_code=503, detail=str(err))

    @router.get("/flight/airbases/nearest", response_model=NearestAirbaseResponse if HAS_PYDANTIC else None)
    def get_nearest_airbase(
        latitude: Optional[float] = Query(None, description="Target fire latitude"),
        longitude: Optional[float] = Query(None, description="Target fire longitude"),
        lat: Optional[float] = Query(None, description="Target fire latitude alias"),
        lon: Optional[float] = Query(None, description="Target fire longitude alias"),
        min_runway: float = Query(1200.0, ge=500.0, le=5000.0, description="Minimum runway length in meters"),
        max_distance_km: float = Query(500.0, ge=10.0, le=2000.0, description="Max search radius in km"),
        fire_capable_only: bool = Query(False, description="Filter strictly to aerial firefighting certified bases"),
    ):
        """Finds nearest firefighting airbase within 500km with runway length filtering, fallback to FOB."""
        target_lat = latitude if latitude is not None else lat
        target_lon = longitude if longitude is not None else lon
        if target_lat is None or target_lon is None:
            raise HTTPException(status_code=400, detail="Latitude and longitude parameters are required.")
        return compute_nearest_airbase(
            lat=target_lat,
            lon=target_lon,
            min_runway=min_runway,
            max_distance_km=max_distance_km,
            fire_capable_only=fire_capable_only,
        )

    @router.get("/flight/mission-route", response_model=MissionRouteResponse if HAS_PYDANTIC else None)
    def get_mission_route(
        origin_lat: float = Query(..., description="Origin airbase latitude"),
        origin_lon: float = Query(..., description="Origin airbase longitude"),
        target_lat: float = Query(..., description="Target wildfire latitude"),
        target_lon: float = Query(..., description="Target wildfire longitude"),
        cruise_alt_m: float = Query(2500.0, ge=300.0, le=10000.0, description="Cruising altitude in meters"),
        origin_icao: Optional[str] = Query(None, description="ICAO code of origin airbase"),
        origin_elev_m: Optional[float] = Query(None, description="Known origin elevation in meters MSL"),
        target_elev_m: Optional[float] = Query(None, description="Target ground elevation in meters MSL"),
    ):
        """Generates 3D tactical transit waypoints from runway to target wildfire."""
        return compute_mission_route(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            target_lat=target_lat,
            target_lon=target_lon,
            cruise_alt_m=cruise_alt_m,
            origin_icao=origin_icao,
            origin_elev_m=origin_elev_m,
            target_elev_m=target_elev_m,
        )

    return router
