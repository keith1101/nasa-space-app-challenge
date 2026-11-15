"""
API Request & Response Schemas for NASA FIRMS Harmonization Platform.
Provides Pydantic schemas for FastAPI auto-documentation and validation,
with automatic fallback to typing.TypedDict in standard-library environments.
"""

from typing import Optional, List, Dict, Any

try:
    from pydantic import BaseModel, Field
    HAS_PYDANTIC = True
except ImportError:
    BaseModel = object
    Field = lambda *args, **kwargs: kwargs.get("default", None)
    HAS_PYDANTIC = False


if HAS_PYDANTIC:
    class HarmonizeMetrics(BaseModel):
        total_raw_detections: int = Field(..., description="Total raw MODIS + VIIRS detections")
        raw_modis_count: int = Field(..., description="Raw MODIS detections")
        raw_viirs_count: int = Field(..., description="Raw VIIRS detections")
        harmonized_fire_events: int = Field(..., description="Unified physical fire events")
        deduplication_rate_percent: float = Field(..., description="Percentage of redundant observations eliminated")
        dual_confirmed_events: int = Field(..., description="Corroborated by both MODIS and VIIRS")
        multi_satellite_verified_events: int = Field(..., description="Observed across 2+ distinct satellites")
        viirs_exclusive_events: int = Field(..., description="Observed solely by VIIRS 375m")
        modis_exclusive_events: int = Field(..., description="Observed solely by MODIS 1km")
        high_resolution_375m_ratio_percent: float = Field(..., description="Ratio of events localized with 375m precision")
        mean_harmonized_frp: float = Field(..., description="Average Fire Radiative Power (MW) per event")
        total_harmonized_frp: float = Field(..., description="Total Reconciled Fire Radiative Power (MW)")
        spatial_eps_km: float = Field(..., description="Spatial clustering radius (km)")
        time_window_hours: float = Field(..., description="Temporal clustering window (hours)")

    class HarmonizeResponse(BaseModel):
        metrics: HarmonizeMetrics
        harmonized_geojson: Dict[str, Any]

    class DataStatusResponse(BaseModel):
        mode: str = Field(..., description="'live' if connected to NASA FIRMS, otherwise 'local'")
        key_configured: bool = Field(..., description="Whether FIRMS_MAP_KEY is present")
        fetched_at: Optional[str] = Field(None, description="ISO timestamp of latest telemetry fetch")
        last_error: Optional[str] = Field(None, description="Error message if fetch failed")
        refresh_seconds: int = Field(900, description="Rate limit interval in seconds")

    class ProvinceItemResponse(BaseModel):
        name: str
        scope: str
        peak_season: str
        observed_7d_harmonized: int

else:
    # TypedDict Fallback for pure Python environments
    from typing import TypedDict

    class HarmonizeMetrics(TypedDict):
        total_raw_detections: int
        raw_modis_count: int
        raw_viirs_count: int
        harmonized_fire_events: int
        deduplication_rate_percent: float
        dual_confirmed_events: int
        multi_satellite_verified_events: int
        viirs_exclusive_events: int
        modis_exclusive_events: int
        high_resolution_375m_ratio_percent: float
        mean_harmonized_frp: float
        total_harmonized_frp: float
        spatial_eps_km: float
        time_window_hours: float

    class HarmonizeResponse(TypedDict):
        metrics: HarmonizeMetrics
        harmonized_geojson: Dict[str, Any]

    class DataStatusResponse(TypedDict):
        mode: str
        key_configured: bool
        fetched_at: Optional[str]
        last_error: Optional[str]
        refresh_seconds: int

    class ProvinceItemResponse(TypedDict):
        name: str
        scope: str
        peak_season: str
        observed_7d_harmonized: int
