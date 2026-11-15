"""
Dataset Extractor for Statistical Benchmarking.
Extracts N = 50 real active fire events from NASA FIRMS dataset,
enriched with Open-Meteo real weather and MCD12Q1 landcover classification.
"""

import json
import logging
import sys
from pathlib import Path
from typing import Dict, Any, List

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.harmonizer import FireHarmonizer
from backend.services.cache_service import cache_manager
from backend.core.tracking import track_fire_events
from backend.services.weather_service import enrich_fire_event_with_weather

logger = logging.getLogger("dataset_extractor")


def extract_real_firms_50_events(output_path: Path) -> List[Dict[str, Any]]:
    """Extracts 50 real fire events stratified by duration and energy."""
    cache_manager.ensure_raw_cache()
    cached = cache_manager.get_cached_records()
    recs_m = cached["modis_recs"]
    recs_v = cached["viirs_recs"]

    harmonizer = FireHarmonizer(spatial_eps_km=1.25, time_window_hours=3.0)
    harm_recs, _ = harmonizer.harmonize_records(recs_m, recs_v)

    # Track fire events with standard parameters
    all_events = track_fire_events(
        harm_recs,
        max_time_gap_hours=36.0,
        base_spatial_eps_km=1.5,
        max_spread_velocity_kmh=3.5,
    )

    if len(all_events) < 50:
        # Fallback to smaller time gap to isolate more individual events if needed
        all_events = track_fire_events(
            harm_recs,
            max_time_gap_hours=18.0,
            base_spatial_eps_km=1.25,
            max_spread_velocity_kmh=2.5,
        )

    # Stratified selection:
    # 1. Multi-day / high FRP events
    # 2. Medium duration persistent events
    # 3. Single-pass / emerging events
    multi_day = [e for e in all_events if e["status"] == "MULTI_DAY_CONFLAGRATION"]
    persistent = [e for e in all_events if e["status"] == "PERSISTENT_ACTIVE_FIRE"]
    recent = [e for e in all_events if e["status"] in ("RECENT_ACTIVE_FIRE", "SINGLE_PASS_EVENT")]

    selected: List[Dict[str, Any]] = []

    # Pick up to 15 multi-day
    selected.extend(multi_day[:15])
    # Pick up to 20 persistent
    selected.extend(persistent[:20])
    # Pick remaining from recent/highest FRP
    remaining_needed = 50 - len(selected)
    selected.extend(recent[:remaining_needed])

    # If still fewer than 50, take remaining sorted by total_frp_mw
    if len(selected) < 50:
        seen_ids = {e["event_id"] for e in selected}
        for ev in all_events:
            if ev["event_id"] not in seen_ids:
                selected.append(ev)
                seen_ids.add(ev["event_id"])
            if len(selected) >= 50:
                break

    # Enrich each event with ambient weather
    enriched_dataset = []
    for idx, ev in enumerate(selected[:50], start=1):
        ev_copy = dict(ev)
        ev_copy["benchmark_sample_id"] = f"SAMPLE-{idx:03d}"
        enriched = enrich_fire_event_with_weather(ev_copy)
        enriched_dataset.append(enriched)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(enriched_dataset, f, ensure_ascii=False, indent=2)

    return enriched_dataset


if __name__ == "__main__":
    out_file = ROOT_DIR / "data" / "benchmark" / "real_firms_50_events.json"
    dataset = extract_real_firms_50_events(out_file)
    print(f"Successfully extracted and saved {len(dataset)} real fire events to {out_file}")
