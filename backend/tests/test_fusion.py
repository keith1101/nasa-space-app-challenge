"""Unit tests for multi-sensor Bayesian fusion & FRP reconciliation."""

import unittest
from backend.core.fusion import (
    compute_flux_density_centroid,
    reconcile_pass_frp,
    fuse_bayesian_confidence,
)


class TestFusion(unittest.TestCase):
    def test_reconcile_pass_frp_max_across_satellites(self):
        # Two VIIRS pixels on NOAA-20 (10 MW + 15 MW = 25 MW)
        # One VIIRS pixel on NOAA-21 (22 MW)
        v_pts = [
            {"satellite": "NOAA-20", "frp": 10.0},
            {"satellite": "NOAA-20", "frp": 15.0},
            {"satellite": "NOAA-21", "frp": 22.0},
        ]
        m_pts = [{"satellite": "Terra", "frp": 20.0}]

        frp = reconcile_pass_frp(v_pts, m_pts)
        # Should be max(NOAA-20=25, NOAA-21=22, Terra=20) = 25.0 MW (not 25 + 22 = 47 MW!)
        self.assertEqual(frp, 25.0)

    def test_flux_density_centroid_nadir_favoring(self):
        # Pixel 1: Nadir sharp pixel (scan=0.38, track=0.38) at lat 12.0
        # Pixel 2: Swath-edge smeared pixel (scan=0.80, track=0.80) at lat 12.004
        v_pts = [
            {"latitude": 12.0000, "longitude": 108.0, "frp": 10.0, "scan": 0.38, "track": 0.38},
            {"latitude": 12.0040, "longitude": 108.0, "frp": 10.0, "scan": 0.80, "track": 0.80},
        ]
        lat, lon, res = compute_flux_density_centroid(v_pts, [])
        self.assertEqual(res, 375)
        # Nadir pixel has higher weight, pulling centroid closer to 12.0000 than 12.0020
        self.assertLess(lat, 12.0010)

    def test_bayesian_confidence_fusion(self):
        group = [
            {"satellite": "Terra", "conf_norm": 0.80},
            {"satellite": "NOAA-20", "conf_norm": 0.70},
        ]
        classification, corroboration, conf, n_sats = fuse_bayesian_confidence(group, n_modis=1, n_viirs=1)
        self.assertEqual(classification, "HARMONIZED_DUAL")
        self.assertEqual(corroboration, "DUAL_SENSOR_FAMILY")
        self.assertEqual(n_sats, 2)
        # 1 - (1 - 0.80) * (1 - 0.70) = 1 - 0.06 = 0.94 -> clamped/boosted >= 0.92
        self.assertGreaterEqual(conf, 0.92)


if __name__ == "__main__":
    unittest.main()
