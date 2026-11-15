"""Unit tests for spatio-temporal clustering engine."""

import unittest
from backend.core.clustering import cluster_records_spatio_temporal


class TestClustering(unittest.TestCase):
    def test_single_point_cluster(self):
        pts = [{"latitude": 14.0, "longitude": 108.0, "_ts_hours": 100.0, "footprint_radius_km": 0.5}]
        cids = cluster_records_spatio_temporal(pts, spatial_eps_km=1.25, time_window_hours=3.0)
        self.assertEqual(cids, [0])

    def test_time_window_separation(self):
        pts = [
            {"latitude": 14.0, "longitude": 108.0, "_ts_hours": 10.0, "scan": 1.0, "track": 1.0, "footprint_radius_km": 0.7},
            {"latitude": 14.001, "longitude": 108.001, "_ts_hours": 10.5, "scan": 1.0, "track": 1.0, "footprint_radius_km": 0.7},
            {"latitude": 14.001, "longitude": 108.001, "_ts_hours": 15.0, "scan": 1.0, "track": 1.0, "footprint_radius_km": 0.7},
        ]
        cids = cluster_records_spatio_temporal(pts, spatial_eps_km=1.25, time_window_hours=3.0)
        self.assertEqual(cids[0], cids[1])
        self.assertNotEqual(cids[1], cids[2])


if __name__ == "__main__":
    unittest.main()
