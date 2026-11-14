"""Sample MCD12Q1.061 LC_Type1 at harmonized FIRMS hotspot locations."""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANDCOVER_DIR = ROOT / "data" / "landcover"

# IGBP classes: forests, shrublands, savannas, grasslands, croplands and
# cropland/natural vegetation mosaics. Permanent wetlands are excluded because
# their pixels can contain substantial open water.
VEGETATION_CLASSES = frozenset((*range(1, 11), 12, 14))
CLASS_NAMES = {
    1: "Evergreen needleleaf forest", 2: "Evergreen broadleaf forest",
    3: "Deciduous needleleaf forest", 4: "Deciduous broadleaf forest",
    5: "Mixed forest", 6: "Closed shrubland", 7: "Open shrubland",
    8: "Woody savanna", 9: "Savanna", 10: "Grassland",
    11: "Permanent wetland", 12: "Cropland", 13: "Urban and built-up",
    14: "Cropland/natural vegetation mosaic", 15: "Snow and ice",
    16: "Barren", 17: "Water",
}


class LandCoverUnavailable(RuntimeError):
    pass


def _raster_path():
    configured = os.getenv("MCD12_LC_TYPE1_TIF", "").strip()
    if configured:
        path = Path(configured).expanduser()
        if not path.is_absolute():
            path = ROOT / path
        if not path.is_file():
            raise LandCoverUnavailable(f"Không tìm thấy GeoTIFF LC_Type1: {path}")
        return path
    files = sorted(LANDCOVER_DIR.glob("*LC_Type1*.tif")) + sorted(LANDCOVER_DIR.glob("*LC_Type1*.tiff"))
    if len(files) != 1:
        raise LandCoverUnavailable(
            "Cần đúng một GeoTIFF MCD12Q1.061 LC_Type1 trong data/landcover, "
            "hoặc đặt MCD12_LC_TYPE1_TIF tới file cần dùng."
        )
    return files[0]


def vegetation_fires(harmonized):
    """Return vegetation-only features, with coverage explicitly accounted for."""
    path = _raster_path()
    try:
        import rasterio
        from rasterio.warp import transform
    except ImportError as exc:
        raise LandCoverUnavailable("Thiếu rasterio: chạy python -m pip install rasterio") from exc

    features = harmonized["harmonized_geojson"]["features"]
    stats = {"total": len(features), "covered": 0, "vegetation": 0,
             "nonvegetation": 0, "unknown": 0, "outside": 0}
    selected = []
    try:
        with rasterio.open(path) as raster:
            if raster.count != 1 or raster.crs is None:
                raise LandCoverUnavailable("GeoTIFF LC_Type1 phải có một band và CRS hợp lệ.")
            for feature in features:
                lon, lat = feature["geometry"]["coordinates"]
                xs, ys = transform("EPSG:4326", raster.crs, [lon], [lat])
                x, y = xs[0], ys[0]
                if not (raster.bounds.left <= x < raster.bounds.right and
                        raster.bounds.bottom < y <= raster.bounds.top):
                    stats["outside"] += 1
                    continue
                sample = next(raster.sample([(x, y)], masked=True))[0]
                if bool(getattr(sample, "mask", False)):
                    stats["unknown"] += 1
                    continue
                value = float(sample)
                code = int(value)
                if value != code or code not in CLASS_NAMES:
                    stats["unknown"] += 1
                    continue
                stats["covered"] += 1
                if code in VEGETATION_CLASSES:
                    stats["vegetation"] += 1
                    selected.append({**feature, "properties": {
                        **feature["properties"], "land_cover_code": code,
                        "land_cover_name": CLASS_NAMES[code],
                    }})
                else:
                    stats["nonvegetation"] += 1
    except (OSError, ValueError) as exc:
        raise LandCoverUnavailable(f"Không đọc được GeoTIFF LC_Type1: {exc}") from exc

    return {"mode": "vegetation", "source": path.name,
            "land_cover_year": os.getenv("MCD12_YEAR", "unknown"),
            "classes": sorted(VEGETATION_CLASSES), "counts": stats,
            "harmonized_geojson": {"type": "FeatureCollection", "features": selected}}
