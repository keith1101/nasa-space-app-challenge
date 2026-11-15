"""
NASA FIRMS Harmonization Engine: MODIS & VIIRS Hotspots
Track 04: Harmonization of MODIS and VIIRS Hot Spots
NASA Space Apps Challenge

Backward-compatible Facade Module.
Re-exports the domain logic from `backend.core`.
"""

from backend.core.geometry import (
    haversine_km,
    elliptical_footprint_match,
    _point_in_ring,
    point_in_geojson_geometry,
)
from backend.core.standardizer import (
    norm_modis_conf_scalar,
    norm_viirs_conf_scalar,
    norm_sat_scalar,
    parse_dt_scalar,
    validate_wgs84_coord,
    safe_finite_float,
    to_records,
    standardize_modis_records,
    standardize_viirs_records,
    HAS_PANDAS,
    pd,
)
from backend.core.clustering import cluster_records_spatio_temporal
from backend.core.fusion import (
    compute_flux_density_centroid,
    reconcile_pass_frp,
    fuse_bayesian_confidence,
)
from backend.core.engine import FireHarmonizer

try:
    import numpy as np
except ImportError:
    np = None

try:
    import geopandas as gpd
    from shapely.geometry import Point
    HAS_GEOPANDAS = True
except ImportError:
    gpd = None
    Point = None
    HAS_GEOPANDAS = False

__all__ = [
    "haversine_km",
    "elliptical_footprint_match",
    "_point_in_ring",
    "point_in_geojson_geometry",
    "FireHarmonizer",
    "cluster_records_spatio_temporal",
    "standardize_modis_records",
    "standardize_viirs_records",
    "HAS_PANDAS",
    "HAS_GEOPANDAS",
]
