"""
Domain Data Structures and Record Definitions for Active Fire Harmonization.
Provides typed definitions for raw telemetry and harmonized events.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class RawDetection:
    """Represents a single standardized active fire detection from MODIS or VIIRS."""
    latitude: float
    longitude: float
    acq_date: str
    acq_time: str
    datetime_utc: str
    satellite: str
    sensor: str
    sensor_family: str  # "MODIS" or "VIIRS"
    spatial_res_m: int  # 1000 or 375
    conf_norm: float    # [0.05, 0.99]
    frp: float          # Megawatts (MW)
    brightness: float   # Kelvin (K)
    scan: float         # Pixel cross-track width (km)
    track: float        # Pixel along-track height (km)
    footprint_radius_km: float
    daynight: str       # "D" or "N"
    province_name: Optional[str] = None
    in_vietnam: Optional[bool] = None
    province_iso: Optional[str] = None


@dataclass
class HarmonizedFireEvent:
    """Represents a fused physical fire event output from ST-DBSCAN & Bayesian Fusion."""
    cluster_id: int
    latitude: float
    longitude: float
    acq_date: str
    acq_time_min: str
    acq_time_max: str
    datetime_utc: str
    classification: str       # "HARMONIZED_DUAL", "VIIRS_EXCLUSIVE", "MODIS_EXCLUSIVE"
    corroboration: str        # "DUAL_SENSOR_FAMILY", "MULTI_SATELLITE", "SINGLE_SATELLITE"
    raw_count: int
    modis_count: int
    viirs_count: int
    satellite_count: int
    harmonized_confidence: float  # [0.0, 1.0]
    harmonized_frp: float         # Megawatts (MW)
    max_brightness: float         # Kelvin (K)
    spatial_resolution_m: int     # 375 or 1000
    max_scan_km: float
    max_track_km: float
    satellites: str
    sensors: str
    daynight: str
    is_deduplicated: bool
    province_name: Optional[str] = None
    in_vietnam: Optional[bool] = None
    province_iso: Optional[str] = None
