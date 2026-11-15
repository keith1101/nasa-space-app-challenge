"""
Core Domain & Algorithmic Package for Fire Harmonization.
Provides geometry, data standardization, ST-DBSCAN clustering, and multi-sensor Bayesian fusion.
"""

from backend.core.geometry import (
    haversine_km,
    elliptical_footprint_match,
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
)
from backend.core.clustering import cluster_records_spatio_temporal
from backend.core.fusion import (
    compute_flux_density_centroid,
    reconcile_pass_frp,
    fuse_bayesian_confidence,
)
from backend.core.engine import FireHarmonizer

__all__ = [
    "haversine_km",
    "elliptical_footprint_match",
    "point_in_geojson_geometry",
    "norm_modis_conf_scalar",
    "norm_viirs_conf_scalar",
    "norm_sat_scalar",
    "parse_dt_scalar",
    "validate_wgs84_coord",
    "safe_finite_float",
    "to_records",
    "standardize_modis_records",
    "standardize_viirs_records",
    "cluster_records_spatio_temporal",
    "compute_flux_density_centroid",
    "reconcile_pass_frp",
    "fuse_bayesian_confidence",
    "FireHarmonizer",
]
