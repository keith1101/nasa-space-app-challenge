"""Experimental event-separated temporal holdout; never serve unvalidated model."""
import csv
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data/training/verified/processed'
FEATURES = ('latitude', 'longitude', 'frp', 'land_cover_code', 'temperature_2m', 'relative_humidity_2m',
            'wind_speed_10m', 'wind_direction_10m', 'precipitation')


def read(name):
    with (DATA / name).open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def split(rows):
    groups = defaultdict(list)
    for row in rows:
        groups[row['verified_event_id']].append(row)
    ordered = sorted(groups, key=lambda k: min(r['origin_utc'] for r in groups[k]))
    cut = max(1, int(len(ordered) * .8))
    if cut >= len(ordered):
        raise ValueError('Need at least two events')
    test_start = min(r['origin_utc'] for k in ordered[cut:] for r in groups[k])
    train_ids = [k for k in ordered[:cut] if max(r['origin_utc'] for r in groups[k]) < test_start]
    train = [r for k in train_ids for r in groups[k]]
    test = [r for k in ordered[cut:] for r in groups[k]]
    if not train or not test:
        raise ValueError('Insufficient nonoverlapping chronological events')
    return train, test, train_ids, ordered[cut:]


def xmat(rows, spread=False):
    cols = FEATURES + (('horizon_h', 'target_cell_row', 'target_cell_col',
                        'origin_cell_row', 'origin_cell_col') if spread else ())
    return [[float(row[col]) for col in cols] for row in rows]


def run():
    manifest = json.loads((DATA / 'manifest.json').read_text(encoding='utf-8'))
    if not manifest['training_ready']:
        raise ValueError('Training blocked: verified event/perimeter labels insufficient; see manifest.json')
    try:
        import numpy as np
        from sklearn.metrics import mean_absolute_error, average_precision_score, brier_score_loss
        from xgboost import XGBRegressor, XGBClassifier
    except ImportError as exc:
        raise ValueError('Install optional dependencies: python -m pip install numpy scikit-learn xgboost') from exc
    report = {}
    for task, label in [('duration', 'remaining_hours'), ('spread', 'spread_label')]:
        train, test, train_ids, test_ids = split(read(task + '.csv'))
        ytrain = np.array([float(r[label]) for r in train])
        ytest = np.array([float(r[label]) for r in test])
        is_spread = task == 'spread'
        if is_spread and (len(set(ytrain)) < 2 or len(set(ytest)) < 2):
            raise ValueError('Spread holdout must contain both classes in train and test')
        xt, xv = xmat(train, is_spread), xmat(test, is_spread)
        if is_spread:
            model = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=.05,
                                  subsample=.8, colsample_bytree=.8, random_state=42, n_jobs=2,
                                  eval_metric='logloss')
            model.fit(xt, ytrain.astype(int))
            pred = model.predict_proba(xv)[:, 1]
            base = np.full(len(ytest), ytrain.mean())
            report[task] = {'xgb_brier': float(brier_score_loss(ytest, pred)),
                            'baseline_brier': float(brier_score_loss(ytest, base)),
                            'xgb_pr_auc': float(average_precision_score(ytest, pred)),
                            'baseline_pr_auc': float(average_precision_score(ytest, base))}
        else:
            model = XGBRegressor(n_estimators=100, max_depth=3, learning_rate=.05,
                                 subsample=.8, colsample_bytree=.8, random_state=42, n_jobs=2)
            model.fit(xt, ytrain)
            pred = np.maximum(0, model.predict(xv))
            report[task] = {'xgb_mae_hours': float(mean_absolute_error(ytest, pred)),
                            'baseline_mae_hours': float(mean_absolute_error(ytest,
                                np.full(len(ytest), np.median(ytrain))))}
        report[task].update(train_events=len(train_ids), test_events=len(test_ids),
                            train_rows=len(train), test_rows=len(test),
                            test_start_utc=min(r['origin_utc'] for r in test))
    report['limitations'] = ('Experimental holdout only; verified outcomes may be selected/nonrepresentative. '
                             'No calibrated live model or operational map exported.')
    (DATA / 'baseline_report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    try:
        run()
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(2)
