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
