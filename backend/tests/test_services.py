"""Unit tests for services (provinces, calendar, cache manager)."""

import unittest
from backend.services.province_service import compute_geometry_bbox
from backend.services.calendar_service import compute_z_scores_and_peaks
from backend.services.cache_service import cache_manager


class TestServices(unittest.TestCase):
    def test_compute_geometry_bbox(self):
        geom = {
            "type": "Polygon",
            "coordinates": [[[102.0, 8.0], [109.0, 8.0], [109.0, 23.0], [102.0, 23.0], [102.0, 8.0]]],
        }
        bbox = compute_geometry_bbox(geom)
        self.assertEqual(bbox, (102.0, 8.0, 109.0, 23.0))

    def test_jackknife_z_score_no_self_inflation(self):
        monthly = [
            {"year": yr, "month": 3, "harmonized_count": 300 if yr == 2019 else 100}
            for yr in range(2018, 2027)
        ]
        recs, stats = compute_z_scores_and_peaks(monthly)
        rec_2019 = [r for r in recs if r["year"] == 2019][0]
        self.assertAlmostEqual(rec_2019["historical_mean"], 100.0, places=1)
        self.assertGreater(rec_2019["z_score"], 50.0)

    def test_cache_manager_instance(self):
        self.assertIsNotNone(cache_manager.live_client)
        status = cache_manager.live_client.status()
        self.assertIn("mode", status)
        self.assertIn("refresh_seconds", status)


if __name__ == "__main__":
    unittest.main()
