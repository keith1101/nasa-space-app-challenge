"""Build conservative observation labels from a 15-day FIRMS/POWER pilot.

No absent-fire labels are emitted: an empty satellite detection window is not
proof of extinction or no spread. This is a data QA step, not model training.
"""
import csv
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PILOT = ROOT / 'data' / 'training' / 'pilot'
HORIZONS = (6, 12, 24)
GRID_DEG = 0.02
RADIUS_KM = 3.0
WEATHER = ('T2M', 'RH2M', 'WS10M', 'WD10M', 'PRECTOTCORR')


def distance_km(a, b):
    lat1, lon1 = math.radians(a['lat']), math.radians(a['lon'])
    lat2, lon2 = math.radians(b['lat']), math.radians(b['lon'])
    delta_lat, delta_lon = lat2 - lat1, lon2 - lon1
    h = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return 12742 * math.asin(min(1, math.sqrt(h)))


def cell(point):
    return (math.floor(point['lat'] / GRID_DEG), math.floor(point['lon'] / GRID_DEG))


def load_detections():
    files = sorted(PILOT.glob('VIIRS_NOAA20_SP_*_5d.csv'))
    if len(files) != 3:
        raise ValueError(f'Expected 3 pilot FIRMS CSV files, found {len(files)}')
    detections = []
    seen = set()
    for file in files:
        with file.open(encoding='utf-8-sig', newline='') as handle:
            for row in csv.DictReader(handle):
                raw_time = str(row['acq_time']).zfill(4)
                stamp = datetime.strptime(row['acq_date'] + raw_time, '%Y-%m-%d%H%M').replace(tzinfo=timezone.utc)
                lat, lon = float(row['latitude']), float(row['longitude'])
                if not (10.4 <= lat <= 10.8 and 105.8 <= lon <= 106.1):
                    continue
                point = {'time': stamp, 'lat': lat, 'lon': lon, 'frp': float(row.get('frp') or 0),
                         'confidence': row.get('confidence', '')}
                key = (stamp, lat, lon)
                if key not in seen:
                    detections.append(point)
                    seen.add(key)
    return sorted(detections, key=lambda p: p['time'])


def load_weather():
    data = json.loads((PILOT / 'weather_hourly.json').read_text(encoding='utf-8-sig'))
    parameters = data['properties']['parameter']
    missing = set(WEATHER) - set(parameters)
    if missing:
        raise ValueError(f'Missing POWER variables: {sorted(missing)}')
    return parameters


def build():
    points = load_detections()
    weather = load_weather()
    if not points:
        raise ValueError('No FIRMS detections in the pilot area')
    output = PILOT / 'processed'
    output.mkdir(parents=True, exist_ok=True)
    rows = []
    positive = {h: {'repeat': 0, 'spread': 0} for h in HORIZONS}
    last_weather = max(datetime.strptime(k, '%Y%m%d%H').replace(tzinfo=timezone.utc)
                       for k in weather['T2M'])
    for i, p in enumerate(points):
        c = cell(p)
        time_key = p['time'].strftime('%Y%m%d%H')
        row = {'acquired_utc': p['time'].isoformat(), 'latitude': p['lat'], 'longitude': p['lon'],
               'grid_row': c[0], 'grid_col': c[1], 'frp': p['frp'], 'confidence': p['confidence'],
               'weather_source': 'POWER point 10.59386,105.94162 (pilot only)'}
        for variable in WEATHER:
            raw = weather[variable].get(time_key)
            value = None if raw is None or float(raw) <= -900 else float(raw)
            row[variable] = '' if value is None else value
        for hours in HORIZONS:
            future = [q for q in points[i + 1:] if p['time'] < q['time'] <= p['time'] + timedelta(hours=hours)]
            repeat = [q for q in future if distance_km(p, q) <= RADIUS_KM]
            adjacent = [q for q in future if max(abs(cell(q)[0] - c[0]), abs(cell(q)[1] - c[1])) == 1]
            row[f'observed_repeat_{hours}h'] = '1' if repeat else ''
            row[f'observed_neighbor_{hours}h'] = '1' if adjacent else ''
            row[f'neighbor_cells_{hours}h'] = ';'.join(sorted({f'{cell(q)[0]}:{cell(q)[1]}' for q in adjacent}))
            row[f'weather_window_complete_{hours}h'] = int(p['time'] + timedelta(hours=hours) <= last_weather)
            positive[hours]['repeat'] += bool(repeat)
            positive[hours]['spread'] += bool(adjacent)
        rows.append(row)
    target = output / 'pilot_observation_labels.csv'
    with target.open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    report = {'detections': len(points), 'rows': len(rows), 'positive_observations': positive,
              'negative_labels': 0, 'weather_location': [10.59386, 105.94162],
              'note': 'Blank targets are unknown, not negative. No model is trained.'}
    (output / 'pilot_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    print(target)


if __name__ == '__main__':
    build()
