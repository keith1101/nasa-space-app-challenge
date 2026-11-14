"""Bounded global FIRMS ingestion and LC_Type1 sampling on the shared backend."""
import csv
import io
import os
import threading
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from backend.landcover import LandCoverUnavailable, _paths, vegetation_catalog

SOURCES = ('MODIS_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT')
_LOCK = threading.Lock()
_SNAPSHOT = None
_ATTEMPT = 0.0
_ERROR = None
_KEY = None
_CLASS_LOCK = threading.Lock()
_CLASS_CACHE = {}
MAX_BYTES = 80_000_000
MAX_ROWS = 150_000
REFRESH_SECONDS = 900


def _confidence(row):
    raw = row.get('confidence', '').strip().lower()
    if raw == 'h':
        return 95.0
    if raw == 'n':
        return 80.0
    if raw == 'l':
        return 50.0
    try:
        return max(0.0, min(100.0, float(raw)))
    except (TypeError, ValueError):
        return 0.0


def _fetch_source(key, source):
    url = f'https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{source}/world/1'
    with urlopen(url, timeout=90) as response:
        body = response.read(MAX_BYTES + 1)
    if len(body) > MAX_BYTES:
        raise ValueError(f'{source} exceeds response byte limit')
    reader = csv.DictReader(io.StringIO(body.decode('utf-8-sig')))
    if not reader.fieldnames or not {'latitude', 'longitude', 'acq_date'}.issubset(reader.fieldnames):
        raise ValueError(f'{source} response is not a FIRMS CSV')
    points = []
    detections = []
    for row in reader:
        if len(points) >= MAX_ROWS:
            raise ValueError(f'{source} exceeds row limit')
        lat, lon = float(row['latitude']), float(row['longitude'])
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue
        try:
            frp = max(0.0, float(row.get('frp') or 0))
        except ValueError:
            frp = 0.0
        points.append([lat, lon, frp, _confidence(row), 0, 1, -1])
        detections.append({'latitude': lat, 'longitude': lon, 'frp': frp,
                           'confidence': row.get('confidence', ''), 'source': source,
                           'acq_date': row['acq_date'], 'acq_time': row.get('acq_time', '')})
    return points, detections


def snapshot():
    global _SNAPSHOT, _ATTEMPT, _ERROR, _KEY
    key = os.environ.get('FIRMS_MAP_KEY', '').strip()
    if not key:
        raise LandCoverUnavailable('FIRMS_MAP_KEY chưa được cấu hình trên backend chung.')
    with _LOCK:
        now = time.monotonic()
        if _KEY != key or now - _ATTEMPT >= REFRESH_SECONDS:
            _ATTEMPT, _KEY = now, key
            source = SOURCES[0]
            try:
                groups = []
                detections = []
                for source in SOURCES:
                    source_points, source_detections = _fetch_source(key, source)
                    groups.extend(source_points)
                    detections.extend(source_detections)
                _SNAPSHOT = {'points': groups, 'detections': detections,
                             'fetched_at': datetime.now(timezone.utc).isoformat()}
                _ERROR = None
            except (HTTPError, URLError, TimeoutError, OSError, ValueError, UnicodeError) as exc:
                if isinstance(exc, HTTPError):
                    reason = f'HTTP {exc.code}'
                elif isinstance(exc, URLError):
                    reason = type(exc.reason).__name__
                else:
                    reason = type(exc).__name__
                _ERROR = f'FIRMS {source}: {reason}'  # Never expose the key-bearing URL.
        if _SNAPSHOT is None:
            raise LandCoverUnavailable(_ERROR or 'FIRMS global chưa có dữ liệu live.')
        return _SNAPSHOT, _ERROR


def vegetation_global():
    snap, error = snapshot()
    paths = _paths()
    if not paths:
        raise LandCoverUnavailable('Backend chung chưa có GeoTIFF LC_Type1 toàn cầu trong data/landcover.')
    signature = (snap['fetched_at'], tuple((str(p), p.stat().st_mtime_ns, p.stat().st_size) for p in paths))
    with _CLASS_LOCK:
        if _CLASS_CACHE.get('signature') != signature:
            result = vegetation_catalog({'harmonized_points': snap['points'], 'countries': []})
            _CLASS_CACHE['result'] = {'mode': 'live_global', 'data_mode': 'live_global_raw',
                'fetched_at': snap['fetched_at'], 'sources': list(SOURCES),
                'land_cover_year': os.getenv('MCD12_YEAR', 'unknown'),
                'raster_files_count': len(paths), 'counts': result['counts'], 'points': result['points']}
            _CLASS_CACHE['signature'] = signature
        return {**_CLASS_CACHE['result'], 'last_error': error}
