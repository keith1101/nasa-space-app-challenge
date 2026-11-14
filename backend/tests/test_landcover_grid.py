"""
Unit tests for Landcover Classification & Grid Risk Simulation Services.
Run with: python -m unittest backend.tests.test_landcover_grid
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.services.landcover_service import (
    VEGETATION_CLASSES,
    get_landcover_paths,
    compute_global_vegetation,
)
from backend.services.grid_risk_service import (
    cell_centers,
    sample_grid_landcover,
    calculate_grid_risk,
    predict_live_grid,
    SIDE,
    HORIZONS,
)


class TestLandcoverAndGridServices(unittest.TestCase):
    def test_vegetation_classes_definition(self):
        # IGBP standard classes: 1 to 10, 12, 14 are vegetation
        self.assertIn(1, VEGETATION_CLASSES)   # Evergreen Needleleaf Forest
        self.assertIn(7, VEGETATION_CLASSES)   # Open Shrublands
        self.assertIn(10, VEGETATION_CLASSES)  # Grasslands
        self.assertIn(12, VEGETATION_CLASSES)  # Croplands
        self.assertNotIn(13, VEGETATION_CLASSES)  # Urban
        self.assertNotIn(16, VEGETATION_CLASSES)  # Barren / Desert
        self.assertNotIn(17, VEGETATION_CLASSES)  # Water Bodies

    def test_compute_global_vegetation_with_precomputed_labels(self):
        res = compute_global_vegetation()
        self.assertEqual(res["mode"], "vegetation_global")
        self.assertIn("counts", res)
        self.assertGreater(res["counts"]["total"], 0)
        self.assertGreater(res["counts"]["vegetation"], 0)
        self.assertGreater(len(res["points"]), 0)

    def test_grid_risk_cell_centers(self):
        lat, lon = 19.45, 104.89
        centers, dy, dx = cell_centers(lat, lon)
        self.assertEqual(len(centers), SIDE * SIDE)
        self.assertGreater(dy, 0.0)
        self.assertGreater(dx, 0.0)
        # Center cell should be at (5, 5) with exact coordinate match
        center_cell = next(c for c in centers if c[0] == 5 and c[1] == 5)
        self.assertAlmostEqual(center_cell[2], lat, places=4)
        self.assertAlmostEqual(center_cell[3], lon, places=4)

    def test_predict_live_grid_simulation(self):
        lat, lon = 19.45, 104.89
        res = predict_live_grid(lat, lon)
        self.assertIn("cells", res)
        self.assertIn("grid", res)
        self.assertIn("persistence_index", res)
        self.assertEqual(res["grid"]["side"], 11)
        self.assertEqual(res["grid"]["horizons_hours"], list(HORIZONS))
        for h_str in ("6", "12", "24"):
            self.assertIn(h_str, res["persistence_index"])


if __name__ == "__main__":
    unittest.main()
