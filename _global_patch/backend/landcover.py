"""Global vegetation overlay for the compact FIRMS catalog and live Vietnam feed."""
import os
from contextlib import ExitStack
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANDCOVER_DIR = ROOT / 'data' / 'landcover'
VEGETATION_CLASSES = frozenset((*range(1, 11), 12, 14))

class LandCoverUnavailable(RuntimeError):
    pass


def _paths():
    configured = os.getenv('MCD12_LC_TYPE1_TIF', '').strip()
    if configured:
        path = Path(configured).expanduser()
        if not path.is_absolute():
            path = ROOT / path
        if not path.is_file():
            raise LandCoverUnavailable(f'Không tìm thấy LC_Type1: {path}')
        return [path]
    return sorted({*LANDCOVER_DIR.rglob('*LC_Type1*.tif'), *LANDCOVER_DIR.rglob('*LC_Type1*.tiff')})


def vegetation_catalog(catalog, live_features=(), live=False):
    """Classify global saved points, replacing the Vietnam window with live points if available."""
    try:
        import rasterio
        from rasterio.warp import transform
    except ImportError as exc:
        raise LandCoverUnavailable('Thiếu rasterio: python -m pip install rasterio') from exc
    paths = _paths()
    saved = catalog['harmonized_points']
    inside = lambda p: 8.2 <= p[0] <= 23.5 and 102.1 <= p[1] <= 109.8
    points = [p for p in saved if not (live and inside(p))]
    sources = ['saved'] * len(points)
    if live:
        for f in live_features:
            lon, lat = f['geometry']['coordinates']
            props = f['properties']
            points.append([lat, lon, props['harmonized_frp'], props['harmonized_confidence'],
                           int(props['corroboration'] == 'CROSS_SENSOR'), props['raw_count'], -1])
            sources.append('live')
    continents = {c['id']: c['continent'] for c in catalog['countries']}
    result = {'mode': 'vegetation_global', 'data_mode': 'live_vietnam_plus_saved_global' if live else 'saved_global',
              'land_cover_year': os.getenv('MCD12_YEAR', 'unknown'),
              'raster_files': [p.name for p in paths], 'classes': sorted(VEGETATION_CLASSES),
              'counts': {'total': len(points), 'covered': 0, 'vegetation': 0,
                         'nonvegetation': 0, 'unknown': 0, 'outside': 0},
              'regions': {}, 'points': []}
    def region(i):
        p = points[i]
        return 'Vietnam live window' if sources[i] == 'live' else continents.get(p[6], 'Unassigned')
    def mark(i, status):
        r = result['regions'].setdefault(region(i), {'total': 0, 'covered': 0, 'vegetation': 0,
                'nonvegetation': 0, 'unknown': 0, 'outside': 0, 'source': sources[i]})
        r['total'] += 1
        r[status] += 1
        result['counts'][status] += 1
        if status in ('vegetation', 'nonvegetation'):
            r['covered'] += 1
            result['counts']['covered'] += 1
    pending = set(range(len(points)))
    in_footprint = set()
    try:
        with ExitStack() as stack:
            rasters = []
            for path in paths:
                raster = stack.enter_context(rasterio.open(path))
                if raster.count != 1 or raster.crs is None:
                    raise LandCoverUnavailable(f'{path.name}: cần GeoTIFF một band LC_Type1 có CRS.')
                rasters.append(raster)
            for raster in rasters:
                # Transform one batch per raster, not one transformation per hotspot.
                indexes = sorted(pending)
                if not indexes:
                    break
                xs, ys = transform('EPSG:4326', raster.crs,
                                   [points[i][1] for i in indexes], [points[i][0] for i in indexes])
                candidates = [(i, (x, y)) for i, x, y in zip(indexes, xs, ys)
                              if raster.bounds.left <= x < raster.bounds.right and
                                 raster.bounds.bottom < y <= raster.bounds.top]
                in_footprint.update(i for i, _ in candidates)
                for (i, _), sample in zip(candidates, raster.sample([xy for _, xy in candidates], masked=True)):
                    val = sample[0]
                    if bool(getattr(val, 'mask', False)):
                        continue  # A second tile may cover this NoData pixel.
                    value = float(val)
                    code = int(value)
                    if value != code or code not in range(1, 18):
                        continue
                    pending.remove(i)
                    if code in VEGETATION_CLASSES:
                        mark(i, 'vegetation')
                        result['points'].append(points[i])
                    else:
                        mark(i, 'nonvegetation')
            for i in sorted(pending):
                mark(i, 'unknown' if i in in_footprint else 'outside')
    except (OSError, ValueError) as exc:
        raise LandCoverUnavailable(f'Không đọc được raster LC_Type1: {exc}') from exc
    return result
