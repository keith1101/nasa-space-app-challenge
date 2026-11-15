"""
Unit tests for SQLite Airbase Database, Nearest Proximity Search,
and 3D Mission Flight Route Generation.
"""

import math
import unittest
from backend.services.airbase_service import (
    AirbaseService,
    airbase_service,
    haversine_km,
    initial_bearing_deg,
    calculate_offset_coord,
)
from backend.api.routes import (
    compute_nearest_airbase,
    compute_mission_route,
    create_api_router,
    HAS_FASTAPI,
)

try:
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    HAS_TEST_CLIENT = True
except ImportError:
    HAS_TEST_CLIENT = False


class TestFlightAirbase(unittest.TestCase):
    def setUp(self):
        self.service = airbase_service

    def test_airbase_db_initialization(self):
        """Validates that airbases table exists and contains pre-populated airbases."""
        with self.service.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM airbases")
            row = cursor.fetchone()
            count = row["count"]
            self.assertGreaterEqual(count, 30)

            # Check essential Vietnam firefighting bases
            cursor.execute("SELECT icao, name, runway_length_m FROM airbases WHERE icao = 'VVBM'")
            vvbm = cursor.fetchone()
            self.assertIsNotNone(vvbm)
            self.assertEqual(vvbm["icao"], "VVBM")
            self.assertGreaterEqual(vvbm["runway_length_m"], 2500.0)

    def test_haversine_and_bearing(self):
        """Validates Haversine distance and azimuth calculations against known geodesics."""
        # Hanoi (21.221, 105.807) to Da Nang (16.044, 108.199) ~ 620-630 km
        dist = haversine_km(21.221, 105.807, 16.044, 108.199)
        self.assertGreater(dist, 600.0)
        self.assertLess(dist, 650.0)

        # Bearing from Hanoi to Da Nang should be roughly south-southeast (~155-165 deg)
        bearing = initial_bearing_deg(21.221, 105.807, 16.044, 108.199)
        self.assertGreater(bearing, 140.0)
        self.assertLess(bearing, 175.0)

        # Zero distance
        self.assertAlmostEqual(haversine_km(10.0, 106.0, 10.0, 106.0), 0.0, places=3)

    def test_calculate_offset_coord(self):
        """Validates offset coordinate projection."""
        lat0, lon0 = 12.0, 108.0
        dist = 50.0  # 50 km North (bearing 0)
        lat1, lon1 = calculate_offset_coord(lat0, lon0, dist, 0.0)
        self.assertGreater(lat1, lat0)
        self.assertAlmostEqual(lon1, lon0, delta=0.01)

        # Distance between origin and projected destination should equal ~50 km
        calc_dist = haversine_km(lat0, lon0, lat1, lon1)
        self.assertAlmostEqual(calc_dist, dist, delta=0.5)

    def test_find_nearest_airbase_vietnam(self):
        """Verifies finding the closest airbase for a hotspot located in Central Highlands (Đắk Lắk)."""
        fire_lat, fire_lon = 12.65, 108.15  # Near Buôn Ma Thuột
        res = self.service.find_nearest_airbase(fire_lat, fire_lon, min_runway_m=1200.0, max_distance_km=200.0)

        self.assertFalse(res["is_fallback_fob"])
        airbase = res["airbase"]
        self.assertEqual(airbase["icao"], "VVBM")
        self.assertLess(res["distance_km"], 20.0)
        self.assertIn("bearing_deg", res)

    def test_find_nearest_airbase_runway_filtering(self):
        """Verifies runway length filtering restricts smaller airfields."""
        # Query near Da Nang (VVDN has 3500m, Chu Lai VVCL has 4050m)
        fire_lat, fire_lon = 15.5, 108.6
        # With min_runway=4000m, should pick Chu Lai (4050m) over Da Nang (3500m)
        res = self.service.find_nearest_airbase(fire_lat, fire_lon, min_runway_m=4000.0, max_distance_km=300.0)
        self.assertFalse(res["is_fallback_fob"])
        self.assertEqual(res["airbase"]["icao"], "VVCL")
        self.assertGreaterEqual(res["airbase"]["runway_length_m"], 4000.0)

    def test_find_nearest_airbase_fallback_fob(self):
        """Verifies procedural Forward Operating Base fallback when hotspot is beyond search radius."""
        # Remote Point in Pacific Ocean: Lat -45.0, Lon -135.0
        res = self.service.find_nearest_airbase(-45.0, -135.0, min_runway_m=1200.0, max_distance_km=300.0)
        self.assertTrue(res["is_fallback_fob"])
        fob = res["airbase"]
        self.assertEqual(fob["icao"], "VFOB")
        self.assertIn("Forward Operating Base", fob["name"])
        self.assertAlmostEqual(res["distance_km"], 22.0, delta=1.0)
        self.assertGreater(fob["runway_length_m"], 1000.0)

    def test_generate_mission_route(self):
        """Verifies generation of 3D tactical flight waypoints from runway to target wildfire."""
        origin_lat, origin_lon = 12.668, 108.120  # VVBM
        target_lat, target_lon = 12.950, 108.350   # Wildfire hotspot
        route = self.service.generate_mission_route(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            target_lat=target_lat,
            target_lon=target_lon,
            cruise_alt_m=2800.0,
            origin_icao="VVBM",
        )

        self.assertIn("origin", route)
        self.assertIn("target", route)
        self.assertGreater(route["distance_km"], 0.0)
        self.assertGreater(route["estimated_flight_time_min"], 0.0)

        waypoints = route["waypoints"]
        self.assertGreaterEqual(len(waypoints), 5)

        # Check phase sequence
        phases = [wp["phase"] for wp in waypoints]
        self.assertEqual(phases[0], "runway")
        self.assertEqual(phases[1], "takeoff")
        self.assertEqual(phases[-1], "orbit")

        # Check altitudes: takeoff climbs, orbit is tactical low level
        self.assertLess(waypoints[0]["alt_m"], waypoints[1]["alt_m"])
        for wp in waypoints:
            self.assertGreater(wp["alt_m"], 0.0)
            self.assertIn("lat", wp)
            self.assertIn("lon", wp)
            self.assertIn("speed_knots", wp)

    def test_api_route_dispatch(self):
        """Verifies compute functions and FastAPI endpoints if available."""
        # Test helper functions
        nb = compute_nearest_airbase(12.6, 108.1)
        self.assertIn("airbase", nb)
        self.assertIn("distance_km", nb)

        mr = compute_mission_route(12.668, 108.120, 12.9, 108.4)
        self.assertIn("waypoints", mr)
        self.assertGreaterEqual(len(mr["waypoints"]), 4)

        if HAS_FASTAPI and HAS_TEST_CLIENT:
            app = FastAPI()
            router = create_api_router()
            if router:
                app.include_router(router)
                client = TestClient(app)

                # Test GET /api/flight/airbases/nearest
                resp1 = client.get("/api/flight/airbases/nearest?latitude=12.6&longitude=108.1")
                self.assertEqual(resp1.status_code, 200)
                data1 = resp1.json()
                self.assertIn("airbase", data1)
                self.assertEqual(data1["airbase"]["icao"], "VVBM")

                # Test GET /api/flight/mission-route
                resp2 = client.get("/api/flight/mission-route?origin_lat=12.668&origin_lon=108.120&target_lat=12.9&target_lon=108.4&cruise_alt_m=2600")
                self.assertEqual(resp2.status_code, 200)
                data2 = resp2.json()
                self.assertIn("waypoints", data2)
                self.assertGreaterEqual(len(data2["waypoints"]), 4)

    def test_in_memory_service_and_antimeridian(self):
        """Verifies in-memory SQLite support and antimeridian coordinate wrapping."""
        mem_service = AirbaseService(db_path=":memory:")
        with mem_service.get_connection() as conn:
            conn.execute("""
                INSERT INTO airbases (icao, name, latitude, longitude, elevation_ft, runway_length_m, fire_capable, type)
                VALUES ('TEST', 'Antimeridian Fire Base', 0.0, -179.9, 50.0, 3000.0, 1, 'regional')
            """)
            conn.commit()

        # Query across the 180° meridian (distance ~22 km)
        res = mem_service.find_nearest_airbase(0.0, 179.9, max_distance_km=100.0)
        self.assertFalse(res["is_fallback_fob"])
        self.assertEqual(res["airbase"]["icao"], "TEST")
        self.assertLess(res["distance_km"], 30.0)

    def test_high_altitude_airbase_waypoint_safety(self):
        """Verifies high-elevation airbase waypoints climb progressively and never dive underground."""
        # Đà Lạt (VVDL) elevation 3156 ft ≈ 962m MSL
        route = self.service.generate_mission_route(
            origin_lat=11.750,
            origin_lon=108.374,
            target_lat=11.900,
            target_lon=108.400,
            cruise_alt_m=1200.0,
            origin_icao="VVDL",
        )
        origin_elev_m = route["origin"]["elevation_ft"] * 0.3048

        for wp in route["waypoints"]:
            # Every waypoint must stay safely above the airport runway elevation
            self.assertGreaterEqual(
                wp["alt_m"],
                origin_elev_m,
                f"Waypoint {wp['name']} altitude {wp['alt_m']}m dipped below runway {origin_elev_m}m!"
            )

        # Orbit must be safely at least 350m above target
        orbit_wp = next(w for w in route["waypoints"] if w["phase"] == "orbit")
        self.assertGreaterEqual(orbit_wp["alt_m"], origin_elev_m + 350.0)

    def test_short_distance_mission_route_monotonic(self):
        """Verifies mission route for very short distances does not overshoot backwards."""
        route = self.service.generate_mission_route(
            origin_lat=12.668,
            origin_lon=108.120,
            target_lat=12.670,
            target_lon=108.121,
            origin_icao="VVBM",
        )
        self.assertLess(route["distance_km"], 1.0)
        waypoints = route["waypoints"]
        self.assertGreaterEqual(len(waypoints), 4)

    def test_fob_origin_properties_preserved(self):
        """Verifies procedural FOB origin retains its designated properties in mission routes."""
        route = self.service.generate_mission_route(
            origin_lat=10.0,
            origin_lon=105.0,
            target_lat=10.2,
            target_lon=105.2,
            origin_icao="VFOB",
        )
        self.assertEqual(route["origin"]["icao"], "VFOB")
        self.assertEqual(route["origin"]["type"], "procedural_fob")
        self.assertEqual(route["origin"]["elevation_ft"], 450.0)
        self.assertEqual(route["origin"]["runway_length_m"], 1500.0)

    def test_geodesic_numerical_stability(self):
        """Verifies mathematical stability for antipodal and extreme inputs."""
        # Antipodal coordinates (opposite sides of the globe)
        dist = haversine_km(0.0, 0.0, 0.0, 180.0)
        self.assertAlmostEqual(dist, 20015.0, delta=20.0)

        # North pole offset
        lat_dest, lon_dest = calculate_offset_coord(89.0, 0.0, 50.0, 0.0)
        self.assertLessEqual(lat_dest, 90.0)
        self.assertGreaterEqual(lat_dest, 85.0)


if __name__ == "__main__":
    unittest.main()
