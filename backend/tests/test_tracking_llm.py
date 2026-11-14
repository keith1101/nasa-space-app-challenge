"""
Scientific & Algorithmic Unit Tests for Spatio-Temporal Tracking & LLM Spread Analysis.
Run with: python -m unittest backend/tests/test_tracking_llm.py
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.core.kinematics import (
    calculate_geodesic_bearing,
    bearing_to_compass_16,
    calculate_rate_of_spread,
    analyze_wind_fire_alignment,
    compute_trajectory_kinematics,
)
from backend.core.tracking import (
    _parse_record_timestamp,
    group_detections_into_pass_nodes,
    track_fire_events,
)
from backend.services.weather_service import (
    get_weather_at_point,
    enrich_fire_event_with_weather,
)
from backend.services.llm_service import (
    _generate_heuristic_sitrep,
    analyze_fire_spread_with_llm,
)
from backend.api.routes import (
    compute_live_fire_trajectories,
    compute_fire_llm_analysis,
)


class TestKinematicsEngine(unittest.TestCase):
    def test_geodesic_bearing_cardinal_directions(self):
        # Due North (same lon, lat2 > lat1)
        b_north = calculate_geodesic_bearing(10.0, 105.0, 11.0, 105.0)
        self.assertAlmostEqual(b_north, 0.0, delta=0.5)
        self.assertEqual(bearing_to_compass_16(b_north), "N")

        # Due South (same lon, lat2 < lat1)
        b_south = calculate_geodesic_bearing(11.0, 105.0, 10.0, 105.0)
        self.assertAlmostEqual(b_south, 180.0, delta=0.5)
        self.assertEqual(bearing_to_compass_16(b_south), "S")

        # Due East (lat constant at equator, lon2 > lon1)
        b_east = calculate_geodesic_bearing(0.0, 105.0, 0.0, 106.0)
        self.assertAlmostEqual(b_east, 90.0, delta=0.5)
        self.assertEqual(bearing_to_compass_16(b_east), "E")

        # Due West (lat constant at equator, lon2 < lon1)
        b_west = calculate_geodesic_bearing(0.0, 106.0, 0.0, 105.0)
        self.assertAlmostEqual(b_west, 270.0, delta=0.5)
        self.assertEqual(bearing_to_compass_16(b_west), "W")

    def test_rate_of_spread_and_stationary_protection(self):
        # 3.0 km in 2.0 hours = 1.5 km/h
        ros = calculate_rate_of_spread(3.0, 2.0)
        self.assertAlmostEqual(ros, 1.5, places=2)

        # Zero delta hours or negative distance protection
        self.assertEqual(calculate_rate_of_spread(3.0, 0.0), 0.0)
        self.assertEqual(calculate_rate_of_spread(-1.0, 2.0), 0.0)

    def test_wind_fire_alignment_mechanisms(self):
        # Fire spreading East (90 deg), Wind blowing FROM West (270 deg) -> Wind blows TOWARDS East (90 deg)
        # Perfect alignment (delta angle 0) -> HIGH_WIND_ALIGNMENT / WIND_DRIVEN
        res_wind = analyze_wind_fire_alignment(90.0, 270.0, wind_speed_kmh=25.0)
        self.assertEqual(res_wind["spread_mechanism"], "WIND_DRIVEN")
        self.assertEqual(res_wind["alignment_class"], "HIGH_WIND_ALIGNMENT")

        # Fire spreading North (0 deg), Wind blowing FROM North (0 deg) -> Wind blows TOWARDS South (180 deg)
        # Headwind (delta angle 180) -> BACKING_FIRE / FUEL_OR_SLOPE_DRIVEN
        res_backing = analyze_wind_fire_alignment(0.0, 0.0, wind_speed_kmh=15.0)
        self.assertEqual(res_backing["spread_mechanism"], "FUEL_OR_SLOPE_DRIVEN")
        self.assertEqual(res_backing["alignment_class"], "HEADWIND_BACKING_FIRE")

        # Low wind (< 8 km/h) -> FUEL_OR_TERRAIN_DOMINATED
        res_calm = analyze_wind_fire_alignment(45.0, 225.0, wind_speed_kmh=5.0)
        self.assertEqual(res_calm["spread_mechanism"], "FUEL_OR_TERRAIN_DOMINATED")

    def test_trajectory_kinematics_multi_step(self):
        nodes = [
            {"latitude": 14.00, "longitude": 108.00, "timestamp_hours": 10.0, "total_frp": 15.0},
            {"latitude": 14.01, "longitude": 108.01, "timestamp_hours": 14.0, "total_frp": 30.0},
            {"latitude": 14.03, "longitude": 108.03, "timestamp_hours": 20.0, "total_frp": 55.0},
        ]
        res = compute_trajectory_kinematics(nodes)
        self.assertEqual(res["kinematic_steps"], 2)
        self.assertEqual(res["frp_trend"], "INTENSIFYING")
        self.assertGreater(res["net_distance_km"], 0.0)
        self.assertEqual(res["net_compass_dir"], "NE")


class TestSpatioTemporalTracking(unittest.TestCase):
    def test_timestamp_parsing_across_midnight(self):
        ts_d1 = _parse_record_timestamp("2026-11-05", "2330")
        ts_d2 = _parse_record_timestamp("2026-11-06", "0030")
        self.assertAlmostEqual(ts_d2 - ts_d1, 1.0, places=2)

    def test_pass_node_grouping(self):
        recs = [
            {"latitude": 15.0, "longitude": 107.0, "acq_date": "2026-11-05", "acq_time": "0630", "frp": 10.0, "satellite": "Aqua"},
            {"latitude": 15.0, "longitude": 107.0, "acq_date": "2026-11-05", "acq_time": "0645", "frp": 12.0, "satellite": "NOAA-20"},
            {"latitude": 15.0, "longitude": 107.0, "acq_date": "2026-11-06", "acq_time": "0630", "frp": 18.0, "satellite": "Aqua"},
        ]
        nodes = group_detections_into_pass_nodes(recs, temporal_cluster_window_h=3.0)
        self.assertEqual(len(nodes), 2)
        self.assertEqual(nodes[0]["observation_count"], 2)
        self.assertEqual(nodes[1]["observation_count"], 1)

    def test_event_duration_tracking(self):
        # Two passes 24 hours apart at same location -> Persistent Multi-Pass Fire Event
        recs = [
            {"latitude": 12.000, "longitude": 108.000, "acq_date": "2026-11-05", "acq_time": "0600", "frp": 20.0, "satellite": "Aqua", "province_name": "Đắk Lắk", "in_vietnam": True},
            {"latitude": 12.008, "longitude": 108.008, "acq_date": "2026-11-06", "acq_time": "0630", "frp": 35.0, "satellite": "Aqua", "province_name": "Đắk Lắk", "in_vietnam": True},
        ]
        events = track_fire_events(recs, max_time_gap_hours=36.0, max_spread_velocity_kmh=3.5)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertAlmostEqual(ev["duration_hours"], 24.5, places=1)
        self.assertEqual(ev["pass_count"], 2)
        self.assertIn("NE", ev["kinematics"]["net_compass_dir"])


class TestWeatherAndLLMIntegration(unittest.TestCase):
    def test_weather_enrichment_fallback(self):
        # Weather query for Central Highlands coordinates
        w = get_weather_at_point(12.5, 108.0, timeout_seconds=3.0)
        self.assertIn("temperature_c", w)
        self.assertIn("wind_speed_kmh", w)
        self.assertIn("wind_direction_from_deg", w)
        self.assertIn("relative_humidity_pct", w)

    def test_heuristic_sitrep_fallback(self):
        dummy_telemetry = {
            "event_id": "FE-0001",
            "duration_hours": 28.5,
            "status": "MULTI_DAY_CONFLAGRATION",
            "province_name": "Gia Lai",
            "kinematics": {
                "net_distance_km": 4.2,
                "current_ros_kmh": 0.35,
                "net_compass_dir": "NE",
                "current_compass_dir": "NE",
                "current_bearing_deg": 45.0,
                "frp_trend": "INTENSIFYING",
                "total_frp_mw": 85.0,
            },
            "weather": {
                "temperature_c": 32.5,
                "relative_humidity_pct": 38.0,
                "wind_speed_kmh": 22.0,
                "wind_direction_from_deg": 220.0,
            },
            "wind_alignment": {
                "spread_mechanism": "WIND_DRIVEN",
                "alignment_class": "HIGH_WIND_ALIGNMENT",
            },
        }
        sitrep = _generate_heuristic_sitrep(dummy_telemetry)
        self.assertIn("summary_vi", sitrep)
        self.assertEqual(sitrep["risk_level"], "EXTREME")
        self.assertEqual(sitrep["spread_mechanism"], "WIND_DRIVEN")
        self.assertIn("sitrep_markdown", sitrep)

    def test_live_fire_trajectories_pipeline(self):
        res = compute_live_fire_trajectories(vietnam_only=False, enrich_weather=False)
        self.assertIn("event_count", res)
        self.assertGreater(res["event_count"], 0)
        self.assertIn("events", res)

    def test_llm_fire_analysis_endpoint(self):
        analysis_res = compute_fire_llm_analysis(provider="fallback")
        self.assertIn("event_id", analysis_res)
        self.assertIn("telemetry", analysis_res)
        self.assertIn("analysis", analysis_res)
        self.assertIn("summary_vi", analysis_res["analysis"])


if __name__ == "__main__":
    unittest.main()
