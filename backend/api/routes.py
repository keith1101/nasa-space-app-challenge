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
from backend.services.province_service import assign_province
from backend.services.cache_service import cache_manager
from backend.models import (
    HarmonizeResponse,
    DataStatusResponse,
    ProvinceItemResponse,
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

    return router
