"""Conservative FIRMS observation labels for a small historical pilot.

FIRMS detections alone cannot establish extinction or negative spread labels.
All event endings are right-censored and candidate associations are provisional.
"""
import csv
import json
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / 'data/training/pilot'
OUTPUT = INPUT / 'processed'
SOURCE = 'VIIRS_NOAA20_SP'
ASSOC_KM = 2.0
ASSOC_HOURS = 36
CELL_DEG = 0.02
HORIZONS = (6, 12, 24)


def distance_km(a, b):
    a1, a2, b1, b2 = map(math.radians, (a['lat'], a['lon'], b['lat'], b['lon']))
    h = math.sin((b1-a1)/2)**2 + math.cos(a1)*math.cos(b1)*math.sin((b2-a2)/2)**2
    return 12742 * math.asin(min(1., math.sqrt(h)))


def grid(p):
    return math.floor(p['lat'] / CELL_DEG), math.floor(p['lon'] / CELL_DEG)


def read_detections(folder=INPUT):
    files = sorted(folder.glob(f'{SOURCE}_*_5d.csv'))
    if len(files) != 3:
        raise ValueError(f'Expected 3 {SOURCE} pilot CSV files, got {len(files)}')
    points, seen = [], set()
    for file in files:
        with file.open(encoding='utf-8-sig', newline='') as handle:
            reader = csv.DictReader(handle)
            required = {'latitude', 'longitude', 'acq_date', 'acq_time', 'frp'}
            if not reader.fieldnames or not required.issubset(reader.fieldnames):
                raise ValueError(f'Missing FIRMS columns in {file.name}')
            for row in reader:
                stamp = datetime.strptime(row['acq_date'] + str(row['acq_time']).zfill(4),
                                          '%Y-%m-%d%H%M').replace(tzinfo=timezone.utc)
                lat, lon = float(row['latitude']), float(row['longitude'])
                if not (10.4 <= lat <= 10.8 and 105.8 <= lon <= 106.1):
                    raise ValueError(f'Out-of-area detection in {file.name}: {lat}, {lon}')
                key = (stamp, lat, lon)
                if key not in seen:
                    seen.add(key)
                    points.append({'time': stamp, 'lat': lat, 'lon': lon, 'frp': float(row['frp'])})
    return sorted(points, key=lambda p: (p['time'], p['lat'], p['lon']))


def provisional_events(points):
    """Connected components using same-sensor observations <=36h and <=2km."""
    parent = list(range(len(points)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    def union(i, j):
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[max(ri, rj)] = min(ri, rj)
    for i, p in enumerate(points):
        for j in range(i - 1, -1, -1):
            if p['time'] - points[j]['time'] > timedelta(hours=ASSOC_HOURS):
                break
            if distance_km(p, points[j]) <= ASSOC_KM:
                union(i, j)
    groups = defaultdict(list)
    for i in range(len(points)):
        groups[find(i)].append(i)
    return sorted(groups.values(), key=lambda indexes: points[indexes[0]]['time'])


def write_csv(path, fieldnames, rows):
    with path.open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build(folder=INPUT):
    points = read_detections(folder)
    if not points:
        raise ValueError('No detections to label')
    events = provisional_events(points)
    output = folder / 'processed'
    output.mkdir(parents=True, exist_ok=True)
    summary, detections, positives = [], [], []
    for event_num, indexes in enumerate(events, 1):
        event_id = f'pilot-{event_num:05d}'
        selected = [points[i] for i in indexes]
        first, last = selected[0]['time'], selected[-1]['time']
        summary.append({'event_id': event_id, 'first_seen_utc': first.isoformat(),
                        'last_seen_utc': last.isoformat(), 'detections': len(indexes),
                        'observed_span_lower_bound_h': round((last-first).total_seconds()/3600, 2),
                        'ignition_time_utc': '', 'extinction_time_utc': '',
                        'left_censored': 1, 'right_censored': 1,
                        'event_status': 'provisional_satellite_component'})
        for p in selected:
            gr, gc = grid(p)
            detections.append({'event_id': event_id, 'acquired_utc': p['time'].isoformat(),
                               'latitude': p['lat'], 'longitude': p['lon'],
                               'cell_row': gr, 'cell_col': gc, 'frp': p['frp']})
            for horizon in HORIZONS:
                future = [q for q in selected if p['time'] < q['time'] <= p['time'] + timedelta(hours=horizon)]
                adjacent = {grid(q) for q in future if max(abs(grid(q)[0]-gr), abs(grid(q)[1]-gc)) == 1}
                for target_row, target_col in sorted(adjacent):
                    positives.append({'event_id': event_id, 'origin_utc': p['time'].isoformat(),
                                      'origin_cell_row': gr, 'origin_cell_col': gc,
                                      'target_cell_row': target_row, 'target_cell_col': target_col,
                                      'horizon_h': horizon, 'observed_detection_label': 1,
                                      'is_physical_spread_confirmed': 0})
    write_csv(output/'events.csv', list(summary[0]), summary)
    write_csv(output/'detections.csv', list(detections[0]), detections)
    write_csv(output/'observed_neighbor_positives.csv',
              ['event_id', 'origin_utc', 'origin_cell_row', 'origin_cell_col',
               'target_cell_row', 'target_cell_col', 'horizon_h',
               'observed_detection_label', 'is_physical_spread_confirmed'], positives)
    report = {'source': SOURCE, 'events': len(events), 'detections': len(points),
              'positive_neighbor_observations': len(positives), 'verified_negative_labels': 0,
              'verified_extinction_times': 0, 'association_km': ASSOC_KM,
              'association_max_gap_h': ASSOC_HOURS, 'grid_degrees': CELL_DEG,
              'horizons_h': HORIZONS, 'training_ready': False,
              'reason': 'No observation coverage, verified perimeters, or extinction labels.'}
    (output/'label_manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    return report


if __name__ == '__main__':
    build()
