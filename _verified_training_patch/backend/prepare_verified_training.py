"""Create auditable labels and as-of features. Never infer absence from missing FIRMS."""
import csv
import json
import math
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PILOT = ROOT / 'data/training/pilot/processed'
VERIFIED = ROOT / 'data/training/verified'
OUT = ROOT / 'data/training/verified/processed'
HORIZONS = (6, 12, 24)
MIN_EVENTS = 30  # pilot policy, not a performance guarantee


def stamp(raw):
    t = datetime.fromisoformat(str(raw).replace('Z', '+00:00'))
    if t.tzinfo is None:
        raise ValueError('Timestamp requires UTC offset')
    return t.astimezone(timezone.utc)


def read(name, required, folder=None):
    folder = VERIFIED if folder is None else folder
    path = folder / name
    if not path.exists():
        return None
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames or not set(required).issubset(reader.fieldnames):
            raise ValueError(f'{name}: required columns {required}')
        return list(reader)


def write(name, rows, fields):
    with (OUT / name).open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def asof_weather(weather, t, lat, lon):
    eligible = [w for w in weather if stamp(w['available_at_utc']) <= t
                and stamp(w['valid_at_utc']) <= t
                and t - stamp(w['valid_at_utc']) <= timedelta(hours=3)
                and abs(float(w['latitude']) - lat) <= .1
                and abs(float(w['longitude']) - lon) <= .1]
    if not eligible:
        return None
    return max(eligible, key=lambda w: (stamp(w['valid_at_utc']), stamp(w['available_at_utc'])))


def asof_landcover(rows, t, lat, lon):
    eligible = [r for r in rows if stamp(r['available_at_utc']) <= t
                and int(r['land_cover_year']) <= t.year
                and abs(float(r['latitude']) - lat) <= .01
                and abs(float(r['longitude']) - lon) <= .01
                and 1 <= int(r['land_cover_code']) <= 17]
    return max(eligible, key=lambda r: (int(r['land_cover_year']), stamp(r['available_at_utc']))) if eligible else None


def perimeter_at(rows, t, horizon=None):
    # Use only a survey near the required time, not an old/stale perimeter.
    if horizon == 'positive':
        selected = [r for r in rows if t - timedelta(hours=2) <= stamp(r['observed_at_utc']) <= t]
        if not selected:
            return None
        time = max(stamp(r['observed_at_utc']) for r in selected)
    elif horizon == 'negative':
        selected = [r for r in rows if t <= stamp(r['observed_at_utc']) <= t + timedelta(hours=2)]
        if not selected:
            return None
        time = min(stamp(r['observed_at_utc']) for r in selected)
    else:
        selected = [r for r in rows if t - timedelta(hours=3) <= stamp(r['observed_at_utc']) <= t]
        if not selected:
            return None
        time = max(stamp(r['observed_at_utc']) for r in selected)
    return {(int(r['cell_row']), int(r['cell_col'])): int(r['burned'])
            for r in selected if stamp(r['observed_at_utc']) == time
            and r['coverage_verified'] == '1'}


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    det = read('detections.csv', ('event_id', 'acquired_utc', 'latitude', 'longitude', 'cell_row', 'cell_col', 'frp'), PILOT)
    if det is None:
        raise ValueError('Run backend/build_fire_event_labels.py first')
    links = read('event_links.csv', ('provisional_event_id', 'verified_event_id', 'reviewed', 'source'))
    incidents = read('incident_outcomes.csv', ('verified_event_id', 'extinction_time_utc', 'source'))
    perimeter = read('perimeter_cells.csv', ('verified_event_id', 'observed_at_utc', 'cell_row', 'cell_col', 'burned', 'coverage_verified', 'source'))
    weather = read('weather_asof.csv', ('latitude', 'longitude', 'available_at_utc', 'valid_at_utc', 'temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'wind_direction_10m', 'precipitation'))
    landcover = read('landcover_asof.csv', ('latitude', 'longitude', 'available_at_utc', 'land_cover_year', 'land_cover_code', 'source'))
    missing = [name for name, rows in [('event_links.csv', links), ('incident_outcomes.csv', incidents),
                                       ('perimeter_cells.csv', perimeter), ('weather_asof.csv', weather),
                                       ('landcover_asof.csv', landcover)] if rows is None]
    links = links or []
    incidents = incidents or []
    perimeter = perimeter or []
    weather = weather or []
    landcover = landcover or []
    verified_links = {}
    for link in links:
        if link['reviewed'] != '1' or not link['source'].strip() or not link['verified_event_id'].strip():
            continue
        key = link['provisional_event_id']
        if key in verified_links and verified_links[key] != link['verified_event_id']:
            raise ValueError(f'Conflicting event link: {key}')
        verified_links[key] = link['verified_event_id']
    outcome = {}
    for row in incidents:
        if row['source'].strip() and row['extinction_time_utc'].strip():
            eid = row['verified_event_id']
            if eid in outcome:
                raise ValueError(f'Duplicate incident outcome: {eid}')
            outcome[eid] = stamp(row['extinction_time_utc'])
    by_event = defaultdict(list)
    for row in perimeter:
        if row['source'].strip():
            if row['burned'] not in ('0', '1') or row['coverage_verified'] not in ('0', '1'):
                raise ValueError('Perimeter burned/coverage_verified must be 0 or 1')
            by_event[row['verified_event_id']].append(row)
    duration_rows, spread_rows, skipped = [], [], defaultdict(int)
    for p in det:
        eid = verified_links.get(p['event_id'])
        if eid is None:
            skipped['unlinked'] += 1
            continue
        t, lat, lon = stamp(p['acquired_utc']), float(p['latitude']), float(p['longitude'])
        w = asof_weather(weather, t, lat, lon)
        lc = asof_landcover(landcover, t, lat, lon)
        if w is None or lc is None:
            skipped['weather_unavailable_asof' if w is None else 'landcover_unavailable_asof'] += 1
            continue
        features = {'verified_event_id': eid, 'origin_utc': t.isoformat(),
                    'latitude': lat, 'longitude': lon, 'frp': p['frp'],
                    'land_cover_code': lc['land_cover_code'],
                    'temperature_2m': w['temperature_2m'], 'relative_humidity_2m': w['relative_humidity_2m'],
                    'wind_speed_10m': w['wind_speed_10m'], 'wind_direction_10m': w['wind_direction_10m'],
                    'precipitation': w['precipitation']}
        end = outcome.get(eid)
        if end is not None and end >= t:
            duration_rows.append({**features, 'remaining_hours': round((end - t).total_seconds()/3600, 3),
                                  'label_source': 'verified_incident_outcome'})
        elif end is not None:
            skipped['detection_after_reported_extinction'] += 1
        before = perimeter_at(by_event[eid], t)
        if before is None:
            skipped['perimeter_before_missing'] += 1
            continue
        cr, cc = int(p['cell_row']), int(p['cell_col'])
        if before.get((cr, cc)) != 1:
            skipped['origin_not_verified_burned'] += 1
            continue
        for h in HORIZONS:
            after_pos = perimeter_at(by_event[eid], t + timedelta(hours=h), horizon='positive')
            after_neg = perimeter_at(by_event[eid], t + timedelta(hours=h), horizon='negative')
            if after_pos is None and after_neg is None:
                skipped[f'perimeter_after_{h}h_missing'] += 1
                continue
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == dc == 0:
                        continue
                    target = (cr + dr, cc + dc)
                    if before.get(target) != 0:
                        continue
                    label = (1 if after_pos is not None and after_pos.get(target) == 1
                             else 0 if after_neg is not None and after_neg.get(target) == 0 else None)
                    if label is None:
                        continue
                    spread_rows.append({**features, 'horizon_h': h, 'origin_cell_row': cr,
                                        'origin_cell_col': cc, 'target_cell_row': target[0],
                                        'target_cell_col': target[1], 'spread_label': label,
                                        'label_source': 'verified_perimeter_and_coverage'})
    duration_fields = ['verified_event_id', 'origin_utc', 'latitude', 'longitude', 'frp', 'land_cover_code',
                       'temperature_2m', 'relative_humidity_2m', 'wind_speed_10m',
                       'wind_direction_10m', 'precipitation', 'remaining_hours', 'label_source']
    spread_fields = duration_fields[:11] + ['horizon_h', 'origin_cell_row', 'origin_cell_col',
                    'target_cell_row', 'target_cell_col', 'spread_label', 'label_source']
    write('duration.csv', duration_rows, duration_fields)
    write('spread.csv', spread_rows, spread_fields)
    duration_events = {r['verified_event_id'] for r in duration_rows}
    spread_events = {r['verified_event_id'] for r in spread_rows}
    classes = {int(r['spread_label']) for r in spread_rows}
    ready = len(duration_events) >= MIN_EVENTS and len(spread_events) >= MIN_EVENTS and classes == {0, 1}
    manifest = {'missing_inputs': missing, 'pilot_detections': len(det), 'linked_events': len(set(verified_links.values())),
                'duration_rows': len(duration_rows), 'duration_events': len(duration_events),
                'spread_rows': len(spread_rows), 'spread_events': len(spread_events),
                'spread_positive': sum(r['spread_label'] == 1 for r in spread_rows),
                'spread_negative': sum(r['spread_label'] == 0 for r in spread_rows),
                'skipped': dict(skipped), 'training_ready': ready,
                'policy': f'at least {MIN_EVENTS} independent verified events per task and both spread classes',
                'note': 'Readiness permits experimental training only; performance requires holdout evaluation.'}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps(manifest, indent=2))
    return manifest


if __name__ == '__main__':
    build()
