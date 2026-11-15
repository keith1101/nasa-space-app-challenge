"""Unit tests for geometry module (Haversine, elliptical footprint, PIP)."""

import unittest
from backend.core.geometry import (
    haversine_km,
    elliptical_footprint_match,
    point_in_geojson_geometry,
    _point_in_ring,
)


class TestGeometry(unittest.TestCase):
    def test_haversine_distance(self):
        d1 = haversine_km(14.0, 108.0, 14.0, 108.0)
        self.assertAlmostEqual(d1, 0.0)

        # ~1.0 km North
        d2 = haversine_km(14.0, 108.0, 14.009, 108.0)
        self.assertAlmostEqual(d2, 1.0, delta=0.05)

    def test_elliptical_footprint_matching_anisotropy(self):
        # 1.5 km East with scan=3.2 (cross-track scan width): should match
        matched_east, _ = elliptical_footprint_match(
            15.0, 107.0, 3.2, 1.1, 15.0, 107.0140, 0.5, 0.4, base_eps_km=1.25
        )
        self.assertTrue(matched_east)

        # 1.8 km North with track=1.1 (narrow along-track height): should reject
        matched_north, _ = elliptical_footprint_match(
            15.0, 107.0, 3.2, 1.1, 15.0162, 107.0, 0.4, 0.4, base_eps_km=1.25
        )
        self.assertFalse(matched_north)

    def test_point_in_polygon(self):
        poly = {
            "type": "Polygon",
            "coordinates": [[[107.0, 14.0], [109.0, 14.0], [109.0, 16.0], [107.0, 16.0], [107.0, 14.0]]],
        }
        self.assertTrue(point_in_geojson_geometry(108.0, 15.0, poly))
        self.assertFalse(point_in_geojson_geometry(106.0, 15.0, poly))


if __name__ == "__main__":
    unittest.main()
