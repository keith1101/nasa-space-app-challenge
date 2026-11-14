"""Unit tests for backend API routes and live harmonization dispatch."""

import unittest
from backend.api.routes import compute_live_harmonization, load_json_file
from backend.api.fallback_server import safe_query_float


class TestAPI(unittest.TestCase):
    def test_safe_query_float(self):
        self.assertEqual(safe_query_float("2.5", 1.0, 0.0, 10.0), 2.5)
        self.assertEqual(safe_query_float("nan", 1.0, 0.0, 10.0), 1.0)
        self.assertEqual(safe_query_float("-5.0", 1.0, 0.0, 10.0), 0.0)
        self.assertEqual(safe_query_float("15.0", 1.0, 0.0, 10.0), 10.0)
        self.assertEqual(safe_query_float("invalid", 1.0, 0.0, 10.0), 1.0)

    def test_load_json_file(self):
        metrics = load_json_file("analytics_summary.json")
        self.assertIn("title", metrics)
        self.assertIn("metrics", metrics)

    def test_compute_live_harmonization(self):
        res = compute_live_harmonization(eps_km=1.25, time_window_hours=3.0, use_footprint=True, vietnam_only=False)
        self.assertIn("metrics", res)
        self.assertIn("harmonized_geojson", res)
        self.assertEqual(res["harmonized_geojson"]["type"], "FeatureCollection")
        self.assertGreater(len(res["harmonized_geojson"]["features"]), 500)


if __name__ == "__main__":
    unittest.main()
