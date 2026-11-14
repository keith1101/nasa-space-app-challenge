"""Bounded AppEEARS MCD12Q1 LC_Type1 task runner for the saved global FIRMS catalog."""
import argparse
import json
import math
import os
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
CATALOG = PROJECT / 'frontend/public/data/fires_global_harmonized.json'
STATE = ROOT / 'tasks.json'
BASE = 'https://appeears.earthdatacloud.nasa.gov/api'
YEAR = 2024
STEP = 5


def request(method, route, token, payload=None, binary=False):
    headers = {'Authorization': 'Bearer ' + token}
    if payload is not None:
        headers['Content-Type'] = 'application/json'
    data = json.dumps(payload).encode('utf-8') if payload is not None else None
    req = Request(BASE + route, data=data, headers=headers, method=method)
    for retry in range(3):
        try:
            with urlopen(req, timeout=180) as response:
                return response.read() if binary else json.load(response)
        except HTTPError as exc:
            body = exc.read(600).decode('utf-8', errors='replace')
            if exc.code not in (429, 500, 502, 503, 504) or retry == 2:
                raise RuntimeError(f'AppEEARS HTTP {exc.code}: {body}') from exc
        except (URLError, TimeoutError) as exc:
            if retry == 2:
                raise RuntimeError(f'AppEEARS request failed: {exc}') from exc
        time.sleep(2 ** retry)


def save(state):
    tmp = STATE.with_suffix('.tmp')
    tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding='utf-8')
    tmp.replace(STATE)


def cells():
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    result = {}
    for lat, lon, *_ in catalog['harmonized_points']:
        if not (-90 <= lat < 90 and -180 <= lon < 180):
            continue
        south, west = math.floor(lat / STEP) * STEP, math.floor(lon / STEP) * STEP
        key = f'{south:+04d}_{west:+05d}'
        result[key] = result.get(key, 0) + 1
    return result


def polygon(key):
    south, west = map(int, key.split('_'))
    east, north = west + STEP, south + STEP
    return {'type': 'FeatureCollection', 'features': [{
        'type': 'Feature', 'properties': {}, 'geometry': {'type': 'Polygon',
        'coordinates': [[[west, south], [east, south], [east, north], [west, north], [west, south]]]}}]}


def task(key):
    return {'task_name': f'lc-type1-{YEAR}-{key}', 'task_type': 'area', 'params': {
        'dates': [{'startDate': f'01-01-{YEAR}', 'endDate': f'12-31-{YEAR}'}],
        'layers': [{'product': 'MCD12Q1.061', 'layer': 'LC_Type1'}],
        'output': {'projection': 'geographic', 'format': {'type': 'geotiff'}},
        'geo': polygon(key)}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['plan', 'submit', 'download'])
    parser.add_argument('--limit', type=int, default=3, help='Maximum tasks per invocation (1-10)')
    args = parser.parse_args()
    if not 1 <= args.limit <= 10:
        parser.error('--limit must be 1..10')
    occupied = cells()
    state = json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}
    if args.mode == 'plan':
        print(f'{len(occupied)} occupied 5-degree cells; submitted: {sum(bool(v.get("task_id")) for v in state.values())}; downloaded: {sum(v.get("downloaded", False) for v in state.values())}')
        print('Next:', list(sorted((k for k in occupied if k not in state), key=lambda k: -occupied[k]))[:args.limit])
        return
    token = os.getenv('APPEEARS_TOKEN', '').strip()
    if not token:
        parser.error('Set APPEEARS_TOKEN in this PowerShell session (do not save it to a file).')
    if args.mode == 'submit':
        todo = sorted((k for k in occupied if k not in state), key=lambda k: -occupied[k])[:args.limit]
        for key in todo:
            try:
                result = request('POST', '/task', token, task(key))
                if not result.get('task_id'):
                    raise RuntimeError(f'No task_id: {result}')
                state[key] = {'task_id': result['task_id'], 'downloaded': False, 'points': occupied[key]}
                save(state)
                print(key, result['task_id'], result.get('status'))
            except RuntimeError as exc:
                print(key, 'STOP:', exc)
                break
    else:
        processed = 0
        for key, item in state.items():
            if processed >= args.limit:
                break
            if item.get('downloaded'):
                continue
            try:
                status = request('GET', '/task/' + item['task_id'], token)
                if status.get('status') != 'done':
                    print(key, status.get('status'))
                    continue
                bundle = request('GET', '/bundle/' + item['task_id'], token)
                tiffs = [f for f in bundle.get('files', []) if 'LC_Type1' in f.get('file_name', '') and f.get('file_name', '').lower().endswith(('.tif', '.tiff'))]
                if not tiffs:
                    print(key, 'No LC_Type1 TIFF in bundle:', [f.get('file_name') for f in bundle.get('files', [])])
                    continue
                folder = PROJECT / 'data/landcover/global' / key
                folder.mkdir(parents=True, exist_ok=True)
                for file in tiffs:
                    name = Path(file['file_name']).name
                    if not name.startswith('MCD12Q1'):
                        raise RuntimeError(f'Unexpected raster name: {name}')
                    target = folder / name
                    if not target.exists():
                        body = request('GET', '/bundle/' + item['task_id'] + '/' + file['file_id'], token, binary=True)
                        if body[:4] not in (b'II*\x00', b'MM\x00*', b'II+\x00', b'MM\x00+'):
                            raise RuntimeError(f'Not a TIFF: {name}; response prefix {body[:40]!r}')
                        partial = target.with_suffix(target.suffix + '.partial')
                        partial.write_bytes(body)
                        partial.replace(target)
                    print(key, 'saved', target, target.stat().st_size)
                item['downloaded'] = True
                save(state)
                processed += 1
            except RuntimeError as exc:
                print(key, 'STOP:', exc)
                break


if __name__ == '__main__':
    main()
