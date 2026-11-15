"""
Land Cover & Vegetation Classification Service for Active Fires.
Integrates MODIS MCD12Q1 Land Cover Type 1 (LC_Type1) GeoTIFF rasters and precomputed catalog labels.
Classifies active fire points into vegetation vs non-vegetation biomes.
"""

import csv
import hashlib
import io
import json
import logging
import os
import threading
import time
from contextlib import ExitStack
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

logger = logging.getLogger("landcover_service")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
LANDCOVER_DIR = ROOT_DIR / "data" / "landcover"
LABELS_PATH = LANDCOVER_DIR / "saved_catalog_labels.json"
DATA_DIR = ROOT_DIR / "frontend" / "public" / "data"

# IGBP Land Cover classes considered vegetation:
# 1-10: Forests, Shrublands, Savannas, Grasslands
# 12: Croplands
# 14: Cropland/Natural Vegetation Mosaics
VEGETATION_CLASSES = frozenset((*range(1, 11), 12, 14))

SOURCES = ("MODIS_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT")
MAX_BYTES = 80_000_000
MAX_ROWS = 150_000
REFRESH_SECONDS = 900

_VEG_LOCK = threading.Lock()
_VEG_CACHE: Dict[str, Any] = {}

_GLOBAL_LOCK = threading.Lock()
_GLOBAL_SNAPSHOT: Optional[Dict[str, Any]] = None
_GLOBAL_ATTEMPT = 0.0
_GLOBAL_ERROR: Optional[str] = None
_GLOBAL_KEY: Optional[str] = None
_CLASS_LOCK = threading.Lock()
_CLASS_CACHE: Dict[str, Any] = {}


class LandCoverUnavailable(RuntimeError):
    """Raised when Land Cover raster data or dependencies are not accessible."""
    pass


def get_landcover_paths() -> List[Path]:
    """Finds all available MCD12Q1 GeoTIFF raster paths."""
    configured = os.getenv("MCD12_LC_TYPE1_TIF", "").strip()
    if configured:
        p = Path(configured).expanduser()
        if not p.is_absolute():
            p = ROOT_DIR / p
        if not p.is_file():
            raise LandCoverUnavailable(f"Không tìm thấy LC_Type1 raster: {p}")
        return [p]
    return sorted({*LANDCOVER_DIR.rglob("*LC_Type1*.tif"), *LANDCOVER_DIR.rglob("*LC_Type1*.tiff")})


def classify_vegetation_catalog(
    catalog: Dict[str, Any],
    live_features: List[Dict[str, Any]] = (),
    live: bool = False,
    precomputed: Optional[Dict[int, int]] = None,
    include_labels: bool = False,
) -> Dict[str, Any]:
    """
    Classifies global saved points and live points using precomputed labels or GeoTIFF rasters.
    """
    paths = get_landcover_paths()
    saved = catalog.get("harmonized_points", [])
    inside_vn = lambda p: 8.2 <= p[0] <= 23.5 and 102.1 <= p[1] <= 109.8

    source_indexes: List[Optional[int]] = [
        i for i, p in enumerate(saved) if not (live and inside_vn(p))
    ]
    points = [saved[i] for i in source_indexes if i is not None]
    sources = ["saved"] * len(points)

    if live and live_features:
        for f in live_features:
            coords = f.get("geometry", {}).get("coordinates", [0, 0])
            lon, lat = coords[0], coords[1]
            props = f.get("properties", {})
            points.append([
                lat,
                lon,
                props.get("harmonized_frp", 0.0),
                props.get("harmonized_confidence", 0.0),
                int(props.get("corroboration") == "CROSS_SENSOR"),
                props.get("raw_count", 1),
                -1,
            ])
            sources.append("live")
            source_indexes.append(None)

    continents = {c["id"]: c.get("continent", "Unassigned") for c in catalog.get("countries", [])}
    result: Dict[str, Any] = {
        "mode": "vegetation_global",
        "data_mode": "live_vietnam_plus_saved_global" if live else "saved_global",
        "land_cover_year": os.getenv("MCD12_YEAR", "2024"),
        "raster_files": [p.name for p in paths],
        "classes": sorted(VEGETATION_CLASSES),
        "counts": {
            "total": len(points),
            "covered": 0,
            "vegetation": 0,
            "nonvegetation": 0,
            "unknown": 0,
            "outside": 0,
        },
        "regions": {},
        "points": [],
    }

    labels: List[List[int]] = []

    def get_region(i: int) -> str:
        p = points[i]
        if sources[i] == "live":
            return "Vietnam live window"
        cid = p[6] if len(p) > 6 else None
        return continents.get(cid, "Global Hotspots")

    def mark(i: int, status: str):
        r = result["regions"].setdefault(
            get_region(i),
            {
                "total": 0,
                "covered": 0,
                "vegetation": 0,
                "nonvegetation": 0,
                "unknown": 0,
                "outside": 0,
                "source": sources[i],
            },
        )
        r["total"] += 1
        r[status] += 1
        result["counts"][status] += 1
        if status in ("vegetation", "nonvegetation"):
            r["covered"] += 1
            result["counts"]["covered"] += 1

    pending = set(range(len(points)))

    # Fast path: Precomputed label mapping from saved_catalog_labels.json
    if precomputed:
        for i, original in enumerate(source_indexes):
            if original is None:
                continue
            code = precomputed.get(original)
            if code is None or code not in range(1, 18):
                continue
            pending.remove(i)
            if code in VEGETATION_CLASSES:
                mark(i, "vegetation")
                result["points"].append(points[i])
            else:
                mark(i, "nonvegetation")
            if include_labels:
                labels.append([original, code])

    # Dynamic path: Sample rasters for remaining pending points (e.g. live points)
    if pending and paths:
        try:
            import rasterio
            from rasterio.warp import transform
            HAS_RASTERIO = True
        except ImportError:
            HAS_RASTERIO = False

        if HAS_RASTERIO:
            in_footprint = set()
            try:
                with ExitStack() as stack:
                    rasters = []
                    for path in paths:
                        r = stack.enter_context(rasterio.open(path))
                        if r.count == 1 and r.crs is not None:
                            rasters.append(r)

                    for raster in rasters:
                        indexes = sorted(pending)
                        if not indexes:
                            break
                        if str(raster.crs).upper() == "EPSG:4326":
                            indexes = [
                                i for i in indexes
                                if raster.bounds.left <= points[i][1] < raster.bounds.right
                                and raster.bounds.bottom < points[i][0] <= raster.bounds.top
                            ]
                        if not indexes:
                            continue

                        xs, ys = transform(
                            "EPSG:4326",
                            raster.crs,
                            [points[i][1] for i in indexes],
                            [points[i][0] for i in indexes],
                        )
                        candidates = [
                            (i, (x, y))
                            for i, x, y in zip(indexes, xs, ys)
                            if raster.bounds.left <= x < raster.bounds.right
                            and raster.bounds.bottom < y <= raster.bounds.top
                        ]
                        in_footprint.update(i for i, _ in candidates)

                        for (i, _), sample in zip(candidates, raster.sample([xy for _, xy in candidates], masked=True)):
                            val = sample[0]
                            if bool(getattr(val, "mask", False)):
                                continue
                            try:
                                code = int(float(val))
                            except (ValueError, TypeError):
                                continue
                            if code not in range(1, 18):
                                continue

                            pending.remove(i)
                            if include_labels and source_indexes[i] is not None:
                                labels.append([source_indexes[i], code])
                            if code in VEGETATION_CLASSES:
                                mark(i, "vegetation")
                                result["points"].append(points[i])
                            else:
                                mark(i, "nonvegetation")

                    for i in sorted(pending):
                        mark(i, "unknown" if i in in_footprint else "outside")
            except Exception as e:
                logger.warning("Dynamic rasterio sampling encountered: %s", e)
        else:
            # If rasterio is not installed, mark unclassified points gracefully
            for i in sorted(pending):
                mark(i, "unknown")

    if include_labels:
        result["labels"] = sorted(labels)
    return result


def compute_global_vegetation(live_features: List[Dict[str, Any]] = ()) -> Dict[str, Any]:
    """
    Computes vegetation coverage for the global catalog and caches result.
    """
    paths = get_landcover_paths()
    catalog_path = DATA_DIR / "fires_global_harmonized.json"
    if not catalog_path.exists():
        raise LandCoverUnavailable("Không tìm thấy fires_global_harmonized.json trong frontend/public/data.")

    mtime = LABELS_PATH.stat().st_mtime_ns if LABELS_PATH.exists() else 0
    signature = (mtime, len(paths), os.getenv("MCD12_YEAR", "2024"), len(live_features))

    with _VEG_LOCK:
        if _VEG_CACHE.get("signature") != signature:
            with open(catalog_path, "r", encoding="utf-8") as f:
                catalog = json.load(f)

            labels: Optional[Dict[int, int]] = None
            if LABELS_PATH.exists():
                try:
                    data = json.loads(LABELS_PATH.read_text(encoding="utf-8"))
                    labels = {int(i): int(code) for i, code in data.get("labels", [])}
                except Exception as exc:
                    logger.warning("Failed to parse saved_catalog_labels.json: %s", exc)

            res = classify_vegetation_catalog(
                catalog=catalog,
                live_features=live_features,
                live=bool(live_features),
                precomputed=labels,
            )
            res["saved_labels"] = len(labels) if labels else 0
            _VEG_CACHE["result"] = res
            _VEG_CACHE["signature"] = signature
        return _VEG_CACHE["result"]


IGBP_CLASS_NAMES: Dict[int, str] = {
    1: "Evergreen Needleleaf Forests",
    2: "Evergreen Broadleaf Forests",
    3: "Deciduous Needleleaf Forests",
    4: "Deciduous Broadleaf Forests",
    5: "Mixed Forests",
    6: "Closed Shrublands",
    7: "Open Shrublands",
    8: "Woody Savannas",
    9: "Savannas",
    10: "Grasslands",
    11: "Permanent Wetlands",
    12: "Croplands",
    13: "Urban and Built-up Lands",
    14: "Cropland/Natural Vegetation Mosaics",
    15: "Permanent Snow and Ice",
    16: "Barren",
    17: "Water Bodies",
}


def get_landcover_code_at_point(lat: float, lon: float) -> int:
    """
    Samples MCD12Q1 GeoTIFF rasters for a single coordinate.
    Falls back to regional heuristic or code 9 (Savannas) if outside raster coverage.
    """
    paths = get_landcover_paths()
    try:
        import rasterio
        from rasterio.warp import transform
        for path in paths:
            try:
                with rasterio.open(path) as raster:
                    if raster.crs is None or raster.count != 1:
                        continue
                    xs, ys = transform("EPSG:4326", raster.crs, [lon], [lat])
                    x, y = xs[0], ys[0]
                    if raster.bounds.left <= x < raster.bounds.right and raster.bounds.bottom < y <= raster.bounds.top:
                        sample = next(raster.sample([(x, y)], masked=True))
                        val = sample[0]
                        if not bool(getattr(val, "mask", False)):
                            code = int(float(val))
                            if 1 <= code <= 17:
                                return code
            except Exception:
                continue
    except ImportError:
        pass

    # Heuristic fallback based on geographic location
    # Forest/mountainous zones in Indochina
    if 10.0 <= lat <= 23.0 and 102.0 <= lon <= 109.5:
        return 2  # Evergreen Broadleaf Forest
    return 9  # Savannas / Grassland default


def classify_hotspot_biome(lat: float, lon: float, known_code: Optional[int] = None) -> Dict[str, Any]:
    """
    Classifies a hotspot into 5 main biome groups and attaches fuel flammability characteristics.
    Groups:
      - FOREST (IGBP 1-5)
      - SHRUBLAND_SAVANNA (IGBP 6-9)
      - GRASSLAND (IGBP 10)
      - CROPLAND (IGBP 12, 14)
      - NON_VEGETATION / URBAN / WATER (IGBP 11, 13, 15, 16, 17)
    """
    code = known_code if (known_code and 1 <= known_code <= 17) else get_landcover_code_at_point(lat, lon)
    class_name = IGBP_CLASS_NAMES.get(code, "Unknown Biome")

    if 1 <= code <= 5:
        biome_group = "FOREST"
        is_forest = True
        if code in (1, 3):
            fuel_category = "TIMBER_LITTER_RESINOUS"
            crown_fire_potential = "HIGH"
            spotting_distance_km = 1.2
            flammability_index = "EXTREME"
        else:
            fuel_category = "HARDWOOD_LITTER"
            crown_fire_potential = "MODERATE"
            spotting_distance_km = 0.5
            flammability_index = "HIGH" if code == 4 else "MODERATE"
    elif 6 <= code <= 9:
        biome_group = "SHRUBLAND_SAVANNA"
        is_forest = False
        fuel_category = "SHRUB_BRUSH" if code in (6, 7) else "WOODY_SAVANNA"
        crown_fire_potential = "MODERATE" if code in (8, 9) else "LOW"
        spotting_distance_km = 0.6 if code in (8, 9) else 0.3
        flammability_index = "HIGH"
    elif code == 10:
        biome_group = "GRASSLAND"
        is_forest = False
        fuel_category = "FINE_SHORT_GRASS"
        crown_fire_potential = "LOW"
        spotting_distance_km = 0.2
        flammability_index = "VERY_HIGH"
    elif code in (12, 14):
        biome_group = "CROPLAND"
        is_forest = False
        fuel_category = "AGRICULTURAL_RESIDUE"
        crown_fire_potential = "LOW"
        spotting_distance_km = 0.1
        flammability_index = "MODERATE"
    else:
        biome_group = "NON_VEGETATION"
        is_forest = False
        fuel_category = "NON_COMBUSTIBLE"
        crown_fire_potential = "NONE"
        spotting_distance_km = 0.0
        flammability_index = "LOW"

    return {
        "igbp_code": code,
        "land_cover_class": class_name,
        "biome_group": biome_group,
        "is_forest": is_forest,
        "fuel_category": fuel_category,
        "crown_fire_potential": crown_fire_potential,
        "spotting_distance_km": spotting_distance_km,
        "flammability_index": flammability_index,
    }

