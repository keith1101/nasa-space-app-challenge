"""
Geospatial Province Services for Administrative Boundary Joins.
Provides bounding-box pre-filtering and point-in-polygon ray-casting.
Supports O(1) cluster province inheritance for pre-assigned points.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
from backend.core.geometry import point_in_geojson_geometry


def compute_geometry_bbox(geom: Dict[str, Any]) -> Tuple[float, float, float, float]:
    """Returns (min_lon, min_lat, max_lon, max_lat) for a Polygon or MultiPolygon."""
    min_lon, min_lat = 180.0, 90.0
    max_lon, max_lat = -180.0, -90.0
    gtype = geom.get("type")
    coords = geom.get("coordinates", [])
    rings = coords if gtype == "Polygon" else [ring for poly in coords for ring in poly]
    for ring in rings:
        for pt in ring:
            lon, lat = pt[0], pt[1]
            if lon < min_lon:
                min_lon = lon
            if lon > max_lon:
                max_lon = lon
            if lat < min_lat:
                min_lat = lat
            if lat > max_lat:
                max_lat = lat
    return (min_lon, min_lat, max_lon, max_lat)


def load_vietnam_provinces(geojson_path: Path) -> List[Dict[str, Any]]:
    """Loads and cleans Vietnam province GeoJSON features with precomputed bounding boxes."""
    with open(geojson_path, "r", encoding="utf-8") as f:
        prov_geojson = json.load(f)

    province_features: List[Dict[str, Any]] = []
    for feat in prov_geojson.get("features", []):
        props = dict(feat.get("properties", {}))
        # Clean trailing tabs/whitespace in province names (e.g. "Hà Nội\t")
        props["shapeName"] = str(props.get("shapeName", "")).strip()
        props["shapeISO"] = str(props.get("shapeISO", "VN")).strip()
        geom = feat.get("geometry", {})
        bbox = compute_geometry_bbox(geom)
        province_features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": geom,
                "_bbox": bbox,
            }
        )
    return province_features


def assign_province(
    records: List[Dict[str, Any]], province_features: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Spatial point-in-polygon join of fire records with cleaned Vietnam administrative boundaries.
    Leverages O(1) province inheritance if record already has _prov_inherited=True.
    """
    out: List[Dict[str, Any]] = []
    for r in records:
        if r.get("_prov_inherited") and "province_name" in r:
            out.append(dict(r))
            continue

        lon = float(r["longitude"])
        lat = float(r["latitude"])
        matched_name = None
        matched_iso = None

        for pf in province_features:
            min_lon, min_lat, max_lon, max_lat = pf["_bbox"]
            if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
                if point_in_geojson_geometry(lon, lat, pf["geometry"]):
                    matched_name = pf["properties"]["shapeName"]
                    matched_iso = pf["properties"]["shapeISO"]
                    break

        item = dict(r)
        item["in_vietnam"] = matched_name is not None
        item["province_name"] = matched_name if matched_name is not None else "Border / Offshore Zone"
        item["province_iso"] = matched_iso if matched_iso is not None else "VN-EXT"
        out.append(item)
    return out
