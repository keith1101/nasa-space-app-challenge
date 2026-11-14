"""
Geodesic & Spatial Footprint Geometry Utilities for Fire Harmonization.
Provides Haversine distances, anisotropic bow-tie scan/track footprint envelopes,
and ray-casting point-in-polygon tests.
Zero external C-library dependency.
"""

import math
from typing import Tuple, Dict, Any, List


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Geodesic Haversine distance in kilometers between two WGS84 coordinates."""
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(dlambda / 2.0) ** 2)
    c = 2.0 * math.asin(min(1.0, math.sqrt(max(0.0, a))))
    return r * c


def elliptical_footprint_match(
    lat1: float,
    lon1: float,
    scan1: float,
    track1: float,
    lat2: float,
    lon2: float,
    scan2: float,
    track2: float,
    base_eps_km: float = 1.25,
    upper_eps_km: float = 3.5,
    use_footprint: bool = True,
) -> Tuple[bool, float]:
    """
    Evaluates whether two active fire detections fall within the same spatial footprint envelope.
    Uses anisotropic cross-track (East-West scan) and along-track (North-South track) semi-axes
    to prevent false North-South merges from elongated off-nadir MODIS bow-tie pixels.
    Returns (is_match, geodesic_distance_km).
    """
    d_km = haversine_km(lat1, lon1, lat2, lon2)
    if d_km <= base_eps_km:
        return True, d_km
    if not use_footprint or d_km > upper_eps_km:
        return False, d_km

    # Geodesic East-West (cross-track scan) and North-South (along-track) components in km
    mean_lat_rad = math.radians(0.5 * (lat1 + lat2))
    dy_km = abs(lat2 - lat1) * (math.pi / 180.0) * 6371.0
    dx_km = abs(lon2 - lon1) * (math.pi / 180.0) * 6371.0 * math.cos(mean_lat_rad)

    # Semi-major (cross-track scan) and semi-minor (along-track) matching tolerances with PSF margin
    a_scan = min(upper_eps_km, max(base_eps_km, 0.5 * (scan1 + scan2) + 0.35))
    b_track = min(upper_eps_km, max(base_eps_km, 0.5 * (track1 + track2) + 0.55))

    norm_ellip = (dx_km / a_scan) ** 2 + (dy_km / b_track) ** 2
    return (norm_ellip <= 1.0), d_km


def _point_in_ring(lon: float, lat: float, ring: List[List[float]]) -> bool:
    """Ray-casting point-in-polygon test for a single linear ring."""
    inside = False
    n = len(ring)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        intersect = ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside


def point_in_geojson_geometry(lon: float, lat: float, geom: Dict[str, Any]) -> bool:
    """Checks whether (lon, lat) falls inside a GeoJSON Polygon or MultiPolygon geometry."""
    gtype = geom.get("type")
    coords = geom.get("coordinates", [])
    if gtype == "Polygon":
        if not coords or not _point_in_ring(lon, lat, coords[0]):
            return False
        for hole in coords[1:]:
            if _point_in_ring(lon, lat, hole):
                return False
        return True
    elif gtype == "MultiPolygon":
        for poly in coords:
            if poly and _point_in_ring(lon, lat, poly[0]):
                in_hole = any(_point_in_ring(lon, lat, hole) for hole in poly[1:])
                if not in_hole:
                    return True
        return False
    return False
