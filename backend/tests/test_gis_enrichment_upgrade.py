"""
Automated Unit and Integration Test Suite for GIS Pre-enrichment & Multi-Horizon 3-Layer Spread.
Tests:
1. Biome & Fuel Flammability Classification (MCD12Q1 IGBP).
2. Terrain Elevation, Forward Slope, and McArthur Acceleration Factor.
3. Multi-Horizon Expected Burn Sizes (6h / 12h / 24h) and Persistence Indices.
4. Telemetry v2 GIS Enrichment Pipeline.
5. End-to-End Tactical SITREP Generation (Heuristic & Hybrid Router).
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.services.landcover_service import (
    classify_hotspot_biome,
    IGBP_CLASS_NAMES,
)
from backend.services.terrain_service import (
    get_elevation_at_point,
    calculate_forward_slope,
)
from backend.services.grid_risk_service import (
    cell_centers,
    sample_grid_landcover,
    calculate_grid_risk,
    predict_live_grid,
    HORIZONS,
)
from backend.services.llm_service import (
    enrich_telemetry_with_gis,
    analyze_fire_spread_with_llm,
    _generate_heuristic_sitrep,
)


class TestBiomeClassification(unittest.TestCase):
    """Verifies MODIS MCD12Q1 IGBP biome grouping and fuel characteristics."""

    def test_needleleaf_forest_high_crown_risk(self):
        # IGBP Code 1 = Evergreen Needleleaf Forests
        res = classify_hotspot_biome(19.5, 104.8, known_code=1)
        self.assertEqual(res["biome_group"], "FOREST")
        self.assertTrue(res["is_forest"])
        self.assertEqual(res["fuel_category"], "TIMBER_LITTER_RESINOUS")
        self.assertEqual(res["crown_fire_potential"], "HIGH")
        self.assertGreaterEqual(res["spotting_distance_km"], 1.0)
        self.assertEqual(res["flammability_index"], "EXTREME")

    def test_broadleaf_forest_moderate_risk(self):
        # IGBP Code 2 = Evergreen Broadleaf Forests
        res = classify_hotspot_biome(19.5, 104.8, known_code=2)
        self.assertEqual(res["biome_group"], "FOREST")
        self.assertTrue(res["is_forest"])
        self.assertEqual(res["fuel_category"], "HARDWOOD_LITTER")
        self.assertEqual(res["crown_fire_potential"], "MODERATE")

    def test_shrubland_and_savanna(self):
        # IGBP Code 7 = Open Shrublands; Code 9 = Savannas
        res_shrub = classify_hotspot_biome(19.5, 104.8, known_code=7)
        self.assertEqual(res_shrub["biome_group"], "SHRUBLAND_SAVANNA")
        self.assertFalse(res_shrub["is_forest"])

        res_savanna = classify_hotspot_biome(19.5, 104.8, known_code=9)
        self.assertEqual(res_savanna["biome_group"], "SHRUBLAND_SAVANNA")
        self.assertEqual(res_savanna["fuel_category"], "WOODY_SAVANNA")

    def test_grassland_flash_fuels(self):
        # IGBP Code 10 = Grasslands
        res = classify_hotspot_biome(19.5, 104.8, known_code=10)
        self.assertEqual(res["biome_group"], "GRASSLAND")
        self.assertEqual(res["flammability_index"], "VERY_HIGH")
        self.assertEqual(res["fuel_category"], "FINE_SHORT_GRASS")

    def test_cropland_agricultural_burning(self):
        # IGBP Code 12 = Croplands
        res = classify_hotspot_biome(19.5, 104.8, known_code=12)
        self.assertEqual(res["biome_group"], "CROPLAND")
        self.assertEqual(res["fuel_category"], "AGRICULTURAL_RESIDUE")

    def test_non_vegetation(self):
        # IGBP Code 13 = Urban; 17 = Water
        res_urban = classify_hotspot_biome(19.5, 104.8, known_code=13)
        self.assertEqual(res_urban["biome_group"], "NON_VEGETATION")
        self.assertEqual(res_urban["crown_fire_potential"], "NONE")


class TestTerrainSlopeAndAcceleration(unittest.TestCase):
    """Verifies DEM elevation, forward slope angle, and McArthur acceleration."""

    def test_elevation_lookup(self):
        elev = get_elevation_at_point(19.45, 104.89)
        self.assertIsInstance(elev, float)
        self.assertGreater(elev, 0.0)

    def test_forward_slope_calculation(self):
        res = calculate_forward_slope(19.45, 104.89, bearing_deg=45.0, sample_distance_m=1000.0)
        self.assertIn("elevation_msl_m", res)
        self.assertIn("forward_slope_deg", res)
        self.assertIn("slope_multiplier", res)
        self.assertIn("slope_effect", res)
        self.assertGreater(res["slope_multiplier"], 0.0)

    def test_mcarthur_slope_physics_formula(self):
        import math
        # 10 deg upslope should double rate of spread: exp(0.069 * 10) ~ 1.9937
        upslope_multiplier = math.exp(0.069 * 10.0)
        self.assertAlmostEqual(upslope_multiplier, 2.0, delta=0.02)

        # 20 deg upslope should quadruple rate of spread: exp(0.069 * 20) ~ 3.975
        upslope_20 = math.exp(0.069 * 20.0)
        self.assertAlmostEqual(upslope_20, 4.0, delta=0.05)


class TestMultiHorizonGridPropagation(unittest.TestCase):
    """Verifies 3-layer 6h/12h/24h expected burn areas and persistence confidence."""

    def setUp(self):
        self.lat, self.lon = 19.45, 104.89
        self.centers, _, _ = cell_centers(self.lat, self.lon)
        self.codes = sample_grid_landcover(self.centers)
        self.hourly = [
            {
                "temperature_2m": 32.0,
                "relative_humidity_2m": 35.0,
                "wind_speed_10m": 18.0,
                "wind_direction_10m": 225.0,
                "precipitation": 0.0,
            }
            for _ in range(24)
        ]

    def test_calculate_grid_risk_with_multi_horizon(self):
        res = calculate_grid_risk(self.lat, self.lon, self.codes, self.hourly, slope_multiplier=1.5)
        self.assertIn("multi_horizon_size", res)
        m_size = res["multi_horizon_size"]

        for h in ("6h", "12h", "24h"):
            self.assertIn(h, m_size)
            h_data = m_size[h]
            self.assertIn("expected_area_km2", h_data)
            self.assertIn("expected_area_ha", h_data)
            self.assertIn("persistence_confidence", h_data)
            self.assertIn("threat_milestone", h_data)
            self.assertGreater(h_data["expected_area_ha"], 0.0)
            self.assertGreater(h_data["persistence_confidence"], 0.0)

        # Expected area generally grows over time
        a6 = m_size["6h"]["expected_area_ha"]
        a12 = m_size["12h"]["expected_area_ha"]
        a24 = m_size["24h"]["expected_area_ha"]
        self.assertLessEqual(a6, a12)
        self.assertLessEqual(a12, a24)

        # Persistence confidence generally decays over time
        p6 = m_size["6h"]["persistence_confidence"]
        p12 = m_size["12h"]["persistence_confidence"]
        p24 = m_size["24h"]["persistence_confidence"]
        self.assertGreaterEqual(p6, p12)
        self.assertGreaterEqual(p12, p24)

    def test_predict_live_grid_service(self):
        res = predict_live_grid(self.lat, self.lon, slope_multiplier=1.2)
        self.assertIn("multi_horizon_size", res)
        self.assertIn("cells", res)
        self.assertIn("grid", res)
        self.assertEqual(res["grid"]["slope_multiplier_applied"], 1.2)


class TestTelemetryGISEnrichment(unittest.TestCase):
    """Verifies automatic enrichment of raw telemetry with GIS, fuel, and airbase data."""

    def test_enrich_telemetry_fields(self):
        raw_telemetry = {
            "event_id": "FE-TEST-ENRICH",
            "duration_hours": 12.0,
            "kinematics": {
                "current_centroid": {"lat": 19.4521, "lon": 104.8912},
                "current_bearing_deg": 48.0,
                "current_compass_dir": "NE",
                "current_ros_kmh": 0.35,
                "total_frp_mw": 85.0,
            },
            "weather": {
                "wind_speed_kmh": 20.0,
                "relative_humidity_pct": 30.0,
                "temperature_c": 34.0,
            },
            "wind_alignment": {
                "status": "STRONG_WIND_DRIVEN",
                "wind_towards_deg": 50.0,
            },
        }

        enriched = enrich_telemetry_with_gis(raw_telemetry)

        # 1. Vegetation Fuel Context
        self.assertIn("vegetation_fuel_context", enriched)
        veg = enriched["vegetation_fuel_context"]
        self.assertIn("biome_group", veg)
        self.assertIn("crown_fire_potential", veg)

        # 2. Terrain Slope Context
        self.assertIn("terrain_context", enriched)
        terrain = enriched["terrain_context"]
        self.assertIn("forward_slope_deg", terrain)
        self.assertIn("slope_multiplier", terrain)

        # 3. Tactical Logistics / Airbases
        self.assertIn("tactical_proximity", enriched)
        tactical = enriched["tactical_proximity"]
        self.assertIn("nearest_airbase", tactical)
        airbase = tactical["nearest_airbase"]
        self.assertIn("name", airbase)
        self.assertIn("distance_km", airbase)

        # 4. Multi-horizon 3-layer simulation
        self.assertIn("multi_horizon_size", enriched)
        m_size = enriched["multi_horizon_size"]
        self.assertIn("6h", m_size)
        self.assertIn("12h", m_size)
        self.assertIn("24h", m_size)


class TestTacticalSITREPGeneration(unittest.TestCase):
    """Verifies SITREP tactical report contains enriched GIS analysis and 3 horizons."""

    def test_heuristic_sitrep_with_gis_enrichment(self):
        telemetry = {
            "event_id": "FE-TEST-SITREP",
            "duration_hours": 16.0,
            "latitude": 19.45,
            "longitude": 104.89,
            "kinematics": {
                "current_bearing_deg": 45.0,
                "current_compass_dir": "NE",
                "current_ros_kmh": 0.40,
                "total_frp_mw": 90.0,
            },
            "weather": {
                "wind_speed_kmh": 22.0,
                "relative_humidity_pct": 28.0,
                "temperature_c": 35.0,
            },
        }

        res = analyze_fire_spread_with_llm(telemetry, provider="fallback")
        self.assertEqual(res["model_provider"], "heuristic_engine_grounded")
        self.assertIn("multi_horizon_assessment", res)
        assessment = res["multi_horizon_assessment"]
        self.assertIn("h6_summary", assessment)
        self.assertIn("h12_summary", assessment)
        self.assertIn("h24_summary", assessment)

        md = res["sitrep_markdown"]
        self.assertIn("TACTICAL SITUATION REPORT (TACTICAL SITREP)", md)
        self.assertIn("6h Horizon", md)
        self.assertIn("12h Horizon", md)
        self.assertIn("24h Horizon", md)
        self.assertIn("Topography Profile", md)
        self.assertIn("Firefighting Logistics", md)

        # Enriched telemetry should be retained
        self.assertIn("enriched_telemetry", res)
        self.assertIn("vegetation_fuel_context", res["enriched_telemetry"])


if __name__ == "__main__":
    unittest.main()
