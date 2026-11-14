"""
Scientific & Algorithmic Unit Tests for NASA FIRMS FireHarmonizer Engine
Run with: python -m unittest backend/test_harmonizer.py
"""

import unittest
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.harmonizer import (
    FireHarmonizer,
    elliptical_footprint_match,
    haversine_km,
    point_in_geojson_geometry,
)


class TestFireHarmonizer(unittest.TestCase):
    def setUp(self):
        self.harmonizer = FireHarmonizer(spatial_eps_km=1.25, time_window_hours=3.0, use_footprint=True)

    def test_confidence_and_satellite_standardization(self):
        recs_m = [
            {
                "latitude": 12.5,
                "longitude": 108.0,
                "acq_date": "2026-11-05",
                "acq_time": "0315",
                "satellite": "T",
                "confidence": 80,
                "frp": 15.0,
                "brightness": 320.0,
                "scan": 1.2,
                "track": 1.1,
            },
            {
                "latitude": 12.6,
                "longitude": 108.1,
                "acq_date": "2026-11-05",
                "acq_time": "0315",
                "satellite": "A",
                "confidence": 0,  # Zero-confidence edge case must clamp to Laplace prior 0.05
                "frp": 5.0,
                "brightness": 305.0,
                "scan": 1.0,
                "track": 1.0,
            },
        ]
        recs_v = [
            {
                "latitude": 12.501,
                "longitude": 108.001,
                "acq_date": "2026-11-05",
                "acq_time": "0610",
                "satellite": "N20",
                "confidence": "nominal",
                "frp": 8.0,
                "bright_ti4": 340.0,
            },
            {
                "latitude": 12.502,
                "longitude": 108.002,
                "acq_date": "2026-11-05",
                "acq_time": "0655",
                "satellite": "NOAA-21",
                "confidence": "high",
                "frp": 11.0,
                "bright_ti4": 355.0,
            },
        ]

        m_std = self.harmonizer.standardize_modis(recs_m)
        v_std = self.harmonizer.standardize_viirs(recs_v)

        self.assertEqual(m_std[0]["satellite"], "Terra")
        self.assertEqual(m_std[0]["sensor"], "MODIS_Terra")
        self.assertAlmostEqual(m_std[0]["conf_norm"], 0.80)
        self.assertAlmostEqual(m_std[1]["conf_norm"], 0.05)

        self.assertEqual(v_std[0]["satellite"], "NOAA-20")
        self.assertEqual(v_std[0]["sensor"], "VIIRS_N20")
        self.assertAlmostEqual(v_std[0]["conf_norm"], 0.70)

        self.assertEqual(v_std[1]["satellite"], "NOAA-21")
        self.assertEqual(v_std[1]["sensor"], "VIIRS_N21")
        self.assertAlmostEqual(v_std[1]["conf_norm"], 0.95)

    def test_sliding_temporal_window_no_noon_boundary_split(self):
        """
        Detections 30 minutes apart across 12:00 UTC (11:45 UTC and 12:15 UTC) must merge,
        whereas a detection 5.5 hours earlier (06:00 UTC) at the same coordinates must stay separate.
        """
        recs_m = [
            {
                "latitude": 14.0000,
                "longitude": 108.0000,
                "acq_date": "2026-11-05",
                "acq_time": "1145",
                "satellite": "A",
                "confidence": 75,
                "frp": 20.0,
                "brightness": 325.0,
            }
        ]
        recs_v = [
            # Morning pass at 06:00 UTC (5h45m before 11:45 UTC -> separate cluster)
            {
                "latitude": 14.0002,
                "longitude": 108.0002,
                "acq_date": "2026-11-05",
                "acq_time": "0600",
                "satellite": "NOAA-20",
                "confidence": "nominal",
                "frp": 9.0,
                "bright_ti4": 335.0,
            },
            # Afternoon pass at 12:15 UTC (30m after 11:45 UTC across noon -> same cluster)
            {
                "latitude": 14.0005,
                "longitude": 108.0005,
                "acq_date": "2026-11-05",
                "acq_time": "1215",
                "satellite": "NOAA-20",
                "confidence": "nominal",
                "frp": 18.0,
                "bright_ti4": 345.0,
            },
        ]

        harm_recs, metrics = self.harmonizer.harmonize_records(recs_m, recs_v)
        self.assertEqual(len(harm_recs), 2)
        self.assertEqual(metrics["dual_confirmed_events"], 1)

        dual_row = [r for r in harm_recs if r["classification"] == "HARMONIZED_DUAL"][0]
        self.assertEqual(dual_row["raw_count"], 2)
        self.assertEqual(dual_row["acq_time_min"], "1145")
        self.assertEqual(dual_row["acq_time_max"], "1215")
        self.assertGreaterEqual(dual_row["harmonized_confidence"], 0.92)

    def test_bowtie_footprint_matching_and_frp_reconciliation(self):
        """
        Off-nadir MODIS pixel (scan=3.2km cross-track East-West, track=1.1km along-track North-South)
        must fuse with VIIRS pixels ~1.5km East along the cross-track scan axis when use_footprint=True,
        while rejecting a false neighbor 1.8km North along the narrow track axis.
        Furthermore, FRP must sum within a single VIIRS pass but not double-count across NOAA-20 and NOAA-21.
        """
        # Cross-track East-West offset of 0.0140 deg longitude (~1.50 km East) is inside the 3.2 km scan ellipse
        recs_m = [
            {
                "latitude": 15.0000,
                "longitude": 107.0000,
                "acq_date": "2026-11-06",
                "acq_time": "0630",
                "satellite": "Aqua",
                "confidence": 70,
                "frp": 22.0,
                "brightness": 318.0,
                "scan": 3.2,
                "track": 1.1,
            }
        ]
        recs_v = [
            # Two adjacent NOAA-20 pixels on the flame front ~1.5km East (12 MW + 14 MW = 26 MW on NOAA-20 pass)
            {
                "latitude": 15.0000,
                "longitude": 107.0140,
                "acq_date": "2026-11-06",
                "acq_time": "0645",
                "satellite": "NOAA-20",
                "confidence": "nominal",
                "frp": 12.0,
                "bright_ti4": 340.0,
                "scan": 0.5,
                "track": 0.4,
            },
            {
                "latitude": 15.0005,
                "longitude": 107.0150,
                "acq_date": "2026-11-06",
                "acq_time": "0645",
                "satellite": "NOAA-20",
                "confidence": "nominal",
                "frp": 14.0,
                "bright_ti4": 342.0,
                "scan": 0.5,
                "track": 0.4,
            },
            # Overlapping NOAA-21 pass 45 mins later observing 24 MW on the same fire
            {
                "latitude": 15.0002,
                "longitude": 107.0145,
                "acq_date": "2026-11-06",
                "acq_time": "0730",
                "satellite": "NOAA-21",
                "confidence": "nominal",
                "frp": 24.0,
                "bright_ti4": 341.0,
                "scan": 0.5,
                "track": 0.4,
            },
        ]

        harm_recs, _ = self.harmonizer.harmonize_records(recs_m, recs_v)
        self.assertEqual(len(harm_recs), 1)
        row = harm_recs[0]
        self.assertEqual(row["classification"], "HARMONIZED_DUAL")
        self.assertEqual(row["satellite_count"], 3)
        # Reconciled FRP should be max(MODIS=22, NOAA-20=12+14=26, NOAA-21=24) = 26.0 MW (not 26+24=50 MW!)
        self.assertAlmostEqual(row["harmonized_frp"], 26.0, places=1)
        self.assertEqual(row["spatial_resolution_m"], 375)

        # Verify anisotropy: 1.8km East-West matches (scan=3.2km), whereas 1.8km North-South is rejected (track=1.1km)
        self.assertTrue(
            elliptical_footprint_match(15.0, 107.0, 3.2, 1.1, 15.0, 107.0168, 0.4, 0.4, base_eps_km=1.25)[0]
        )
        self.assertFalse(
            elliptical_footprint_match(15.0, 107.0, 3.2, 1.1, 15.0162, 107.0, 0.4, 0.4, base_eps_km=1.25)[0]
        )

    def test_flux_density_centroid_weighting(self):
        """
        A sharp nadir 375m VIIRS pixel (scan=0.38, track=0.38, area=0.144 km^2) must receive higher spatial
        localization weight than a smeared swath-edge VIIRS pixel (scan=0.80, track=0.80, area=0.64 km^2)
        with identical FRP.
        """
        recs_v = [
            {
                "latitude": 12.0000,
                "longitude": 108.0000,
                "acq_date": "2026-11-05",
                "acq_time": "0615",
                "satellite": "NOAA-20",
                "confidence": "high",
                "frp": 10.0,
                "scan": 0.38,
                "track": 0.38,
            },
            {
                "latitude": 12.0040,
                "longitude": 108.0000,
                "acq_date": "2026-11-05",
                "acq_time": "0655",
                "satellite": "NOAA-21",
                "confidence": "high",
                "frp": 10.0,
                "scan": 0.80,
                "track": 0.80,
            },
        ]
        harm_recs, _ = self.harmonizer.harmonize_records([], recs_v)
        self.assertEqual(len(harm_recs), 1)
        # Centroid latitude must be pulled closer to the sharp nadir pixel (12.0000) than the midpoint (12.0020)
        self.assertLess(harm_recs[0]["latitude"], 12.0010)

    def test_bayesian_fusion_and_low_confidence_dual_guard(self):
        """
        Verifies that two low-confidence detections (MODIS=10%, VIIRS=low=30%) fuse via exact Bayesian
        complement product 1 - (1 - 0.10)*(1 - 0.30) = 0.370 without artificially jumping to >= 0.92,
        whereas nominal/high dual detections receive >= 0.92.
        """
        recs_m = [
            {
                "latitude": 13.5000,
                "longitude": 108.0000,
                "acq_date": "2026-11-05",
                "acq_time": "0630",
                "satellite": "Aqua",
                "confidence": 10,
                "frp": 4.0,
            }
        ]
        recs_v = [
            {
                "latitude": 13.5005,
                "longitude": 108.0005,
                "acq_date": "2026-11-05",
                "acq_time": "0645",
                "satellite": "NOAA-20",
                "confidence": "low",
                "frp": 3.5,
            }
        ]
        harm_recs, _ = self.harmonizer.harmonize_records(recs_m, recs_v)
        self.assertEqual(len(harm_recs), 1)
        self.assertEqual(harm_recs[0]["classification"], "HARMONIZED_DUAL")
        # 1 - (1 - 0.10) * (1 - 0.30) = 1 - 0.63 = 0.370
        self.assertAlmostEqual(harm_recs[0]["harmonized_confidence"], 0.370, places=3)

    def test_input_validation_and_malformed_edge_cases(self):
        """
        Validates rejection of NaN/Inf/out-of-bounds WGS84 coordinates, negative FRP clamping,
        empty input handling, and cross-midnight (23:45 UTC -> 00:15 UTC) temporal continuity.
        """
        # 1. Empty inputs
        empty_recs, empty_metrics = self.harmonizer.harmonize_records([], [])
        self.assertEqual(empty_recs, [])
        self.assertEqual(empty_metrics["harmonized_fire_events"], 0)

        # 2. Malformed rows mixed with valid cross-midnight detections
        recs_m = [
            {"latitude": float("nan"), "longitude": 108.0, "acq_date": "2026-11-05", "acq_time": "2345"},
            {"latitude": 95.0, "longitude": 108.0, "acq_date": "2026-11-05", "acq_time": "2345"},  # Invalid lat > 90
            {"latitude": 14.0, "longitude": -195.0, "acq_date": "2026-11-05", "acq_time": "2345"},  # Invalid lon < -180
            {"longitude": 108.0, "acq_date": "2026-11-05", "acq_time": "2345"},  # Missing latitude
            {
                "latitude": 14.5000,
                "longitude": 108.5000,
                "acq_date": "2026-11-05",
                "acq_time": "2345",
                "satellite": "Terra",
                "confidence": 85,
                "frp": -15.0,  # Negative FRP must clamp to 0.0
                "brightness": float("inf"),  # Inf brightness must fall back to 300.0
                "scan": float("nan"),
                "track": -2.0,
            },
        ]
        recs_v = [
            {
                "latitude": 14.5005,
                "longitude": 108.5005,
                "acq_date": "2026-11-06",
                "acq_time": "0015",  # 30 minutes later across UTC midnight boundary
                "satellite": "NOAA-20",
                "confidence": "high",
                "frp": 12.5,
            }
        ]
        harm_recs, metrics = self.harmonizer.harmonize_records(recs_m, recs_v)
        self.assertEqual(metrics["raw_modis_count"], 1)
        self.assertEqual(metrics["raw_viirs_count"], 1)
        self.assertEqual(len(harm_recs), 1)
        self.assertEqual(harm_recs[0]["classification"], "HARMONIZED_DUAL")
        self.assertAlmostEqual(harm_recs[0]["harmonized_frp"], 12.5, places=1)

    def test_order_invariance_determinism(self):
        """
        Verifies that shuffling the input order of MODIS and VIIRS records produces 100% identical
        cluster counts, classifications, centroids, and metrics.
        """
        import random
        from backend.server import _ensure_raw_cache, _CACHE

        _ensure_raw_cache()
        m_orig = list(_CACHE["modis_recs"])
        v_orig = list(_CACHE["viirs_recs"])

        recs_a, metrics_a = self.harmonizer.harmonize_records(m_orig, v_orig)

        rng = random.Random(12345)
        m_shuf = list(m_orig)
        v_shuf = list(v_orig)
        rng.shuffle(m_shuf)
        rng.shuffle(v_shuf)

        recs_b, metrics_b = self.harmonizer.harmonize_records(m_shuf, v_shuf)
        self.assertEqual(metrics_a, metrics_b)
        self.assertEqual(len(recs_a), len(recs_b))
        for ra, rb in zip(recs_a, recs_b):
            self.assertAlmostEqual(ra["latitude"], rb["latitude"], places=5)
            self.assertAlmostEqual(ra["longitude"], rb["longitude"], places=5)
            self.assertAlmostEqual(ra["harmonized_frp"], rb["harmonized_frp"], places=2)
            self.assertEqual(ra["classification"], rb["classification"])

    def test_jackknife_z_score_no_self_suppression(self):
        """
        Verifies that Leave-One-Year-Out (Jackknife) Z-scores prevent an extreme El Niño anomaly year
        from inflating its own baseline standard deviation.
        """
        from backend.build_dataset import _compute_z_scores_and_peaks

        synthetic_m3 = [
            {"year": yr, "month": 3, "harmonized_count": 300 if yr == 2019 else 100}
            for yr in range(2018, 2027)
        ]
        final_recs, baseline_stats = _compute_z_scores_and_peaks(synthetic_m3)
        rec_2019 = [r for r in final_recs if r["year"] == 2019][0]
        # Under Leave-One-Year-Out, all other 2018-2025 years have count=100, so LOO mean=100.0 (not 125.0)
        self.assertAlmostEqual(rec_2019["historical_mean"], 100.0, places=1)
        self.assertGreater(rec_2019["z_score"], 50.0)
        self.assertEqual(rec_2019["severity"], "extreme")

    def test_geospatial_helpers(self):
        dist = haversine_km(14.0, 108.0, 14.009, 108.0)
        self.assertAlmostEqual(dist, 1.0, delta=0.05)

        poly = {
            "type": "Polygon",
            "coordinates": [[[107.0, 14.0], [109.0, 14.0], [109.0, 16.0], [107.0, 16.0], [107.0, 14.0]]],
        }
        self.assertTrue(point_in_geojson_geometry(108.0, 15.0, poly))
        self.assertFalse(point_in_geojson_geometry(106.0, 15.0, poly))

    def test_live_harmonization_and_unified_calendar(self):
        from backend.server import compute_live_harmonization, load_json_file

        cal = load_json_file("calendar_matrix.json")
        self.assertIn("Hà Nội", cal)
        self.assertNotIn("Hà Nội\t", cal)
        self.assertIn("Australia & Oceania", cal)
        self.assertIn("Đắk Lắk", cal)

        # Verify Leave-One-Year-Out Jackknife Z-score fields and empirical anchor flags
        dak_lak_recs = cal["Đắk Lắk"]["records"]
        nov_2026 = [r for r in dak_lak_recs if r["year"] == 2026 and r["month"] == 11][0]
        self.assertTrue(nov_2026["is_empirical_anchor"])
        self.assertFalse(nov_2026["is_simulated_baseline"])
        self.assertIn("historical_std", nov_2026)

        # Verify formal NASA EOSDIS provenance metadata & partial-day coverage flag
        summary = load_json_file("analytics_summary.json")
        self.assertIn("provenance", summary)
        self.assertIn("MODIS_C6_1", summary["provenance"]["dataset_identifiers"])
        day_nov10 = [d for d in summary["daily_breakdown_7d"] if d["date"] == "2026-11-10"][0]
        self.assertTrue(day_nov10["is_partial_day"])

        res_bbox = compute_live_harmonization(eps_km=1.25, time_window_hours=3.0, use_footprint=True, vietnam_only=False)
        self.assertEqual(res_bbox["metrics"]["total_raw_detections"], 1522)
        self.assertEqual(res_bbox["metrics"]["harmonized_fire_events"], 1078)

        res_vn = compute_live_harmonization(eps_km=1.25, time_window_hours=3.0, use_footprint=True, vietnam_only=True)
        self.assertEqual(res_vn["metrics"]["total_raw_detections"], 934)
        self.assertEqual(res_vn["metrics"]["harmonized_fire_events"], 680)


if __name__ == "__main__":
    unittest.main()
