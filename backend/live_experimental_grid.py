"""Bounded, uncalibrated 1-km grid scenario from a current FIRMS detection."""
import math
import threading
import time
from datetime import datetime, timezone

from backend.landcover import LandCoverUnavailable, VEGETATION_CLASSES, _paths
from backend.live_prediction_input import get_live_prediction_input

SIDE = 11
CENTER = SIDE // 2
CELL_KM = 1.0
HORIZONS = (6, 12, 24)
_CACHE = {}
_LOCK = threading.Lock()


def cell_centers(lat, lon):
    dy = CELL_KM / 111.2
    dx = CELL_KM / (111.2 * max(.05, math.cos(math.radians(lat))))
    return [(r, c, lat + (CENTER-r)*dy, lon + (c-CENTER)*dx)
            for r in range(SIDE) for c in range(SIDE)], dy, dx


def sample_landcover(centers):
    import rasterio
    from rasterio.warp import transform
    codes = {}
    for path in _paths():
        remaining = [(r, c, lat, lon) for r, c, lat, lon in centers if (r, c) not in codes]
        if not remaining:
            break
        with rasterio.open(path) as raster:
            if raster.crs is None or raster.count != 1:
                raise LandCoverUnavailable(f'Invalid LC_Type1 raster: {path.name}')
            xs, ys = transform('EPSG:4326', raster.crs,
                               [v[3] for v in remaining], [v[2] for v in remaining])
            within = [(v[0], v[1], x, y) for v, x, y in zip(remaining, xs, ys)
                      if raster.bounds.left <= x < raster.bounds.right
                      and raster.bounds.bottom < y <= raster.bounds.top]
            for (r, c, _, _), sample in zip(within, raster.sample([(x, y) for _, _, x, y in within], masked=True)):
                value = sample[0]
                if not bool(getattr(value, 'mask', False)):
                    code = int(value)
                    if 1 <= code <= 17:
                        codes[(r, c)] = code
    return codes


def calculate(lat, lon, codes, hourly):
    if codes.get((CENTER, CENTER)) not in VEGETATION_CLASSES:
        raise LandCoverUnavailable('Selected FIRMS hotspot lacks vegetation raster coverage')
    if len(hourly) < 24:
        raise LandCoverUnavailable('24 hourly forecast values are required')
    for row in hourly[:24]:
        values = [float(row[k]) for k in ('temperature_2m', 'relative_humidity_2m',
                                           'wind_speed_10m', 'wind_direction_10m', 'precipitation')]
        if any(not math.isfinite(v) for v in values):
            raise LandCoverUnavailable('Forecast contains invalid values')
    level = {(CENTER, CENTER): 1.0}
    series = {}
    persistence = 1.0
    for h in range(1, 25):
        w = hourly[h-1]
        rain = max(0., float(w['precipitation']))
        rh = max(0., min(100., float(w['relative_humidity_2m'])))
        wind = max(0., float(w['wind_speed_10m']))  # Open-Meteo default km/h
        to_angle = math.radians(float(w['wind_direction_10m']) + 180.)
        dryness = max(.05, min(1., (100. - rh) / 75.))
        rain_factor = math.exp(-rain / 3.)
        persistence *= math.exp(-rain / 10.) * (.985 + .015 * dryness)
        next_level = dict(level)
        for (r, c), source in level.items():
            if source < .002:
                continue
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    rr, cc = r + dr, c + dc
                    if (dr == dc == 0 or not (0 <= rr < SIDE and 0 <= cc < SIDE)
                            or codes.get((rr, cc)) not in VEGETATION_CLASSES):
                        continue
                    bearing = math.atan2(dc, -dr)
                    aligned = (1. + math.cos(bearing - to_angle)) / 2.
                    step = (.012 + .075 * min(wind, 40.) / 40. * aligned) * dryness * rain_factor
                    step /= math.hypot(dr, dc)
                    candidate = source * step
                    prev = next_level.get((rr, cc), 0.)
                    next_level[(rr, cc)] = 1. - (1. - prev) * (1. - candidate)
        level = next_level
        if h in HORIZONS:
            # The score is heuristic. It is not a calibrated fire-spread probability.
            series[h] = (dict(level), round(max(0., min(1., persistence)), 3))
    centers, dy, dx = cell_centers(lat, lon)
    cells = []
    for horizon, (scores, _) in series.items():
        for r, c, cell_lat, cell_lon in centers:
            if (r, c) == (CENTER, CENTER) or codes.get((r, c)) not in VEGETATION_CLASSES:
                continue
            cells.append({'latitude': round(cell_lat, 6), 'longitude': round(cell_lon, 6),
                          'lat_half_size': round(dy / 2, 8), 'lon_half_size': round(dx / 2, 8),
                          'horizon_hours': horizon, 'relative_risk': round(scores.get((r, c), 0.), 4),
                          'land_cover_code': codes[(r, c)]})
    return {'persistence_index': {str(h): series[h][1] for h in HORIZONS},
            'cells': cells, 'grid': {'side': SIDE, 'cell_km': CELL_KM, 'horizons_hours': HORIZONS,
                                   'covered_cells': len(codes), 'total_cells': SIDE * SIDE}}


def predict(lat, lon):
    inputs = get_live_prediction_input(lat, lon)
    hot = inputs['hotspot']
    # Age is metadata, never a reason to hide a hotspot from the 24-hour FIRMS map.
    # Older points produce a conditional *current weather* scenario, not a claim
    # that their fire remains active.
    age = hot['age_hours']
    observation_status = ('unknown_time' if age is None else
                          'recent_detection' if -1 <= age <= 6 else 'older_detection')
    forecast = inputs['forecast']['hourly']
    first = datetime.fromisoformat(forecast[0]['time'].replace('Z', '+00:00'))
    if first.tzinfo is None:
        first = first.replace(tzinfo=timezone.utc)
    if abs((datetime.now(timezone.utc) - first).total_seconds()) > 3 * 3600:
        raise LandCoverUnavailable('Forecast starts too far from current time')
    key = (round(lat, 5), round(lon, 5), inputs['snapshot_fetched_at_utc'],
           inputs['forecast']['retrieved_at_utc'][:13])
    with _LOCK:
        cached = _CACHE.get(key)
        if cached and time.monotonic() - cached[0] < 900:
            return cached[1]
    centers, _, _ = cell_centers(lat, lon)
    scores = calculate(lat, lon, sample_landcover(centers), forecast)
    result = {'mode': 'experimental_relative_indices', 'fetched_at': inputs['snapshot_fetched_at_utc'],
              'observed_at_utc': hot['acquired_at_utc'], 'weather_first_hour': forecast[0]['time'],
              'observation_age_hours': age, 'observation_status': observation_status,
              'firms_snapshot_last_error': inputs['snapshot_last_error'],
              'active_fire_confirmed_now': False,
              'weather_provider': inputs['forecast']['provider'], 'source': hot['source'],
              **scores, 'remaining_burn_hours': None,
              'model_status': 'xgboost_not_validated_not_used',
              'limitations': 'Conditional scenario if fire is still active; older FIRMS detections do not confirm current burning. Horizons start at forecast first hour. Uncalibrated indices, not probabilities, remaining burn time, or a perimeter.'}
    with _LOCK:
        if len(_CACHE) > 64:
            _CACHE.clear()
        _CACHE[key] = (time.monotonic(), result)
    return result
