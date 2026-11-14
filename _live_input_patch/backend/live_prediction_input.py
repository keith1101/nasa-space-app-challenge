"""Observed live hotspot and forecast inputs; no untrained prediction is emitted."""
import math
from datetime import datetime, timezone

from backend.fire_risk import _weather, _landcover
from backend.global_live import snapshot
from backend.landcover import _paths, VEGETATION_CLASSES, LandCoverUnavailable


def _acquired(row):
    try:
        date = str(row['acq_date'])
        time = str(row['acq_time']).strip().zfill(4)
        return datetime.strptime(date + time, '%Y-%m-%d%H%M').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError, KeyError):
        return None


def get_live_prediction_input(latitude, longitude):
    if not (math.isfinite(latitude) and math.isfinite(longitude)
            and -90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise ValueError('Invalid coordinates')
    snap, last_error = snapshot()
    matches = [d for d in snap['detections']
               if abs(d['latitude'] - latitude) < 0.00001
               and abs(d['longitude'] - longitude) < 0.00001]
    if not matches:
        raise ValueError('Coordinates are absent from current FIRMS global snapshot')
    match = max(matches, key=lambda d: _acquired(d) or datetime.min.replace(tzinfo=timezone.utc))
    acquired = _acquired(match)
    age = (datetime.now(timezone.utc) - acquired).total_seconds() / 3600 if acquired else None
    paths = _paths()
    code = None
    if paths:
        try:
            import rasterio
        except ImportError as exc:
            raise LandCoverUnavailable('Missing rasterio; install with python -m pip install rasterio') from exc
        for path in paths:
            with rasterio.open(path) as raster:
                code = _landcover(latitude, longitude, [raster])
            if code is not None:
                break
    weather = _weather(latitude, longitude)
    fields = ('time', 'temperature_2m', 'relative_humidity_2m', 'wind_speed_10m',
              'wind_direction_10m', 'precipitation')
    hourly = [{key: weather[key][i] for key in fields} for i in range(24)]
    return {
        'mode': 'live_inputs_only',
        'hotspot': {**match, 'acquired_at_utc': acquired.isoformat() if acquired else None,
                    'age_hours': round(age, 2) if age is not None else None},
        'snapshot_fetched_at_utc': snap['fetched_at'],
        'snapshot_last_error': last_error,
        'land_cover': {'code': code, 'vegetation': code in VEGETATION_CLASSES if code is not None else None,
                       'status': 'classified' if code is not None else 'coverage_unknown'},
        'forecast': {'provider': 'Open-Meteo', 'model_requested': 'ecmwf_ifs',
                     'retrieved_at_utc': datetime.now(timezone.utc).isoformat(),
                     'hourly': hourly},
        'prediction': {'remaining_burn_hours': None, 'spread_cells': None,
                       'status': 'training_not_ready',
                       'reason': 'No verified extinction, perimeter, or observed negative labels.'},
    }
