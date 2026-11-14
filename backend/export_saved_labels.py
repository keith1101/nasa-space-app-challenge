"""Create distributable LC_Type1 labels for the bundled global fire catalog."""
import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from backend.landcover import _paths, vegetation_catalog

CATALOG = ROOT / 'frontend/public/data/fires_global_harmonized.json'
OUTPUT = ROOT / 'data/landcover/saved_catalog_labels.json'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-partial', action='store_true', help='Export only areas already covered by rasters')
    args = parser.parse_args()
    year = os.getenv('MCD12_YEAR', '').strip()
    if not re.fullmatch(r'\d{4}', year):
        parser.error('Set MCD12_YEAR to the raster year, e.g. 2024')
    paths = _paths()
    if not paths:
        parser.error('No LC_Type1 GeoTIFF found under data/landcover')
    for path in paths:
        match = re.search(r'(?:doy|_)(20\d{2})', path.name)
        if match and match.group(1) != year:
            parser.error(f'Raster year conflicts with MCD12_YEAR: {path.name}')
    source = CATALOG.read_bytes()
    catalog = json.loads(source)
    result = vegetation_catalog(catalog, include_labels=True)
    stats = result['counts']
    print('Labeled:', stats['covered'], '/', stats['total'], 'Outside:', stats['outside'], 'Unknown:', stats['unknown'])
    if stats['covered'] != stats['total'] and not args.allow_partial:
        parser.error('Coverage incomplete. Add rasters or pass --allow-partial; unknown points will stay hidden.')
    snapshot = {'schema': 1, 'product': 'MCD12Q1.061', 'layer': 'LC_Type1', 'year': year,
                'catalog_sha256': hashlib.sha256(source).hexdigest(), 'counts': stats,
                'labels': result['labels']}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUTPUT.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(snapshot, separators=(',', ':')), encoding='utf-8')
    tmp.replace(OUTPUT)
    print('Saved:', OUTPUT)


if __name__ == '__main__':
    main()
