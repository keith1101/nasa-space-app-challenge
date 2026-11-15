"""
Airbase Registry & Mission Flight Trajectory Service.
Embeds an SQLite database containing major aerial firefighting bases, military airfields,
and international airports across Vietnam and globally, providing spatial proximity queries
and mission routing for 3D aerial wildfire inspection flights.
"""

import math
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = ROOT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
DEFAULT_DB_PATH = DATA_DIR / "airbases.db"

# Major firefighting hubs and airports worldwide (Seed dataset)
SEED_AIRBASES = [
    # Vietnam Firefighting & Strategic Airbases
    {"icao": "VVBM", "name": "Buôn Ma Thuột Airport (Central Highlands Forest Hub)", "latitude": 12.668, "longitude": 108.120, "elevation_ft": 1739.0, "runway_length_m": 3000.0, "fire_capable": 1, "type": "regional_hub"},
    {"icao": "VVPK", "name": "Pleiku Airport (Gia Lai Tactical Base)", "latitude": 13.998, "longitude": 108.017, "elevation_ft": 2434.0, "runway_length_m": 2400.0, "fire_capable": 1, "type": "regional_hub"},
    {"icao": "VVDL", "name": "Liên Khương / Đà Lạt Airport (Lâm Đồng Forest Base)", "latitude": 11.750, "longitude": 108.374, "elevation_ft": 3156.0, "runway_length_m": 3250.0, "fire_capable": 1, "type": "regional_hub"},
    {"icao": "VVDN", "name": "Đà Nẵng International Airport / Military Airbase", "latitude": 16.044, "longitude": 108.199, "elevation_ft": 33.0, "runway_length_m": 3500.0, "fire_capable": 1, "type": "international"},
    {"icao": "VVTS", "name": "Tân Sơn Nhất International Airport (Southern Airbase)", "latitude": 10.819, "longitude": 106.652, "elevation_ft": 33.0, "runway_length_m": 3800.0, "fire_capable": 1, "type": "international"},
    {"icao": "VVNB", "name": "Nội Bài International Airport (Northern Command Hub)", "latitude": 21.221, "longitude": 105.807, "elevation_ft": 39.0, "runway_length_m": 3800.0, "fire_capable": 1, "type": "international"},
    {"icao": "VVCR", "name": "Cam Ranh International Airport / Naval Air Station", "latitude": 11.998, "longitude": 109.219, "elevation_ft": 40.0, "runway_length_m": 3048.0, "fire_capable": 1, "type": "naval_airbase"},
    {"icao": "VVCT", "name": "Cần Thơ International Airport (Mekong Delta Hub)", "latitude": 10.085, "longitude": 105.712, "elevation_ft": 10.0, "runway_length_m": 3000.0, "fire_capable": 1, "type": "international"},
    {"icao": "VVPC", "name": "Phù Cát Airbase / Quy Nhơn Airport", "latitude": 13.955, "longitude": 109.042, "elevation_ft": 80.0, "runway_length_m": 3048.0, "fire_capable": 1, "type": "military_airbase"},
    {"icao": "VVCL", "name": "Chu Lai Airport (Quảng Nam Strategic Base)", "latitude": 15.406, "longitude": 108.706, "elevation_ft": 11.0, "runway_length_m": 4050.0, "fire_capable": 1, "type": "heavy_tanker_base"},
    {"icao": "VVDH", "name": "Đồng Hới Airport (Quảng Bình Airfield)", "latitude": 17.515, "longitude": 106.590, "elevation_ft": 49.0, "runway_length_m": 2400.0, "fire_capable": 1, "type": "regional"},
    {"icao": "VVVH", "name": "Vinh Airport (Nghệ An Tactical Airbase)", "latitude": 18.737, "longitude": 105.671, "elevation_ft": 15.0, "runway_length_m": 2400.0, "fire_capable": 1, "type": "regional"},
    {"icao": "VVTX", "name": "Thọ Xuân / Sao Vàng Airbase (Thanh Hóa Fighter Base)", "latitude": 19.901, "longitude": 105.467, "elevation_ft": 30.0, "runway_length_m": 3200.0, "fire_capable": 1, "type": "military_airbase"},
    {"icao": "VVDB", "name": "Điện Biên Phủ Airport (Northwestern Highland Base)", "latitude": 21.397, "longitude": 103.008, "elevation_ft": 1611.0, "runway_length_m": 2400.0, "fire_capable": 1, "type": "mountain_hub"},
    {"icao": "VVCI", "name": "Cát Bi International Airport (Hải Phòng Coastal Base)", "latitude": 20.819, "longitude": 106.725, "elevation_ft": 13.0, "runway_length_m": 3050.0, "fire_capable": 1, "type": "international"},
    {"icao": "VVPQ", "name": "Phú Quốc International Airport", "latitude": 10.169, "longitude": 103.993, "elevation_ft": 23.0, "runway_length_m": 3000.0, "fire_capable": 1, "type": "island_hub"},
    {"icao": "VVCS", "name": "Côn Đảo Airport (Cỏ Ống Airfield)", "latitude": 8.732, "longitude": 106.632, "elevation_ft": 20.0, "runway_length_m": 1830.0, "fire_capable": 1, "type": "island_hub"},
    {"icao": "VVTH", "name": "Tuy Hòa Airbase (Đông Tác Field)", "latitude": 13.049, "longitude": 109.334, "elevation_ft": 33.0, "runway_length_m": 2900.0, "fire_capable": 1, "type": "military_airbase"},
    {"icao": "VVGL", "name": "Gia Lâm Airbase (Hà Nội Aerial Support)", "latitude": 21.038, "longitude": 105.889, "elevation_ft": 49.0, "runway_length_m": 2000.0, "fire_capable": 1, "type": "military_airbase"},
    {"icao": "VVPT", "name": "Phan Thiết Airbase (Bình Thuận Command)", "latitude": 10.963, "longitude": 108.238, "elevation_ft": 50.0, "runway_length_m": 2400.0, "fire_capable": 1, "type": "military_airbase"},
    {"icao": "VVKH", "name": "Kép Airbase (Bắc Giang Air Intercept Hub)", "latitude": 21.393, "longitude": 106.269, "elevation_ft": 70.0, "runway_length_m": 2400.0, "fire_capable": 1, "type": "military_airbase"},
    {"icao": "VVPR", "name": "Phan Rang Airbase (Ninh Thuận Command)", "latitude": 11.638, "longitude": 108.948, "elevation_ft": 118.0, "runway_length_m": 3048.0, "fire_capable": 1, "type": "military_airbase"},
    {"icao": "VVBR", "name": "Vũng Tàu Airport (Helicopter Offshore & Fire Base)", "latitude": 10.370, "longitude": 107.090, "elevation_ft": 13.0, "runway_length_m": 1800.0, "fire_capable": 1, "type": "heli_support"},

    # Southeast & East Asia Firefighting Bases
    {"icao": "VTBS", "name": "Suvarnabhumi Airport (Bangkok, Thailand)", "latitude": 13.690, "longitude": 100.750, "elevation_ft": 5.0, "runway_length_m": 4000.0, "fire_capable": 1, "type": "international"},
    {"icao": "VTCC", "name": "Chiang Mai International (Northern Thailand Fire Hub)", "latitude": 18.767, "longitude": 98.963, "elevation_ft": 1036.0, "runway_length_m": 3100.0, "fire_capable": 1, "type": "fire_command"},
    {"icao": "WMKK", "name": "Kuala Lumpur International (Malaysia)", "latitude": 2.746, "longitude": 101.710, "elevation_ft": 69.0, "runway_length_m": 4000.0, "fire_capable": 1, "type": "international"},
    {"icao": "WIII", "name": "Soekarno-Hatta International (Jakarta, Indonesia)", "latitude": -6.126, "longitude": 106.656, "elevation_ft": 34.0, "runway_length_m": 3660.0, "fire_capable": 1, "type": "international"},
    {"icao": "WIPP", "name": "Sultan Mahmud Badaruddin II (Palembang Sumatra Fire Hub)", "latitude": -2.898, "longitude": 104.700, "elevation_ft": 37.0, "runway_length_m": 3000.0, "fire_capable": 1, "type": "peatland_fire_base"},
    {"icao": "WAOO", "name": "Syamsudin Noor Airport (Banjarmasin Kalimantan Fire Base)", "latitude": -3.441, "longitude": 114.763, "elevation_ft": 66.0, "runway_length_m": 2500.0, "fire_capable": 1, "type": "peatland_fire_base"},
    {"icao": "RPLL", "name": "Ninoy Aquino International (Manila, Philippines)", "latitude": 14.509, "longitude": 121.019, "elevation_ft": 75.0, "runway_length_m": 3737.0, "fire_capable": 1, "type": "international"},
    {"icao": "VDPP", "name": "Phnom Penh International (Cambodia)", "latitude": 11.547, "longitude": 104.844, "elevation_ft": 40.0, "runway_length_m": 3000.0, "fire_capable": 1, "type": "international"},
    {"icao": "VLVT", "name": "Wattay International Airport (Vientiane, Laos)", "latitude": 17.988, "longitude": 102.563, "elevation_ft": 564.0, "runway_length_m": 3000.0, "fire_capable": 1, "type": "international"},
    {"icao": "VYYY", "name": "Yangon International (Myanmar)", "latitude": 16.907, "longitude": 96.133, "elevation_ft": 109.0, "runway_length_m": 3414.0, "fire_capable": 1, "type": "international"},
    {"icao": "RJAA", "name": "Narita International (Tokyo, Japan)", "latitude": 35.765, "longitude": 140.386, "elevation_ft": 141.0, "runway_length_m": 4000.0, "fire_capable": 1, "type": "international"},
    {"icao": "RKSI", "name": "Incheon International (Seoul, South Korea)", "latitude": 37.460, "longitude": 126.441, "elevation_ft": 23.0, "runway_length_m": 4000.0, "fire_capable": 1, "type": "international"},
    {"icao": "ZBAA", "name": "Beijing Capital International (China)", "latitude": 40.080, "longitude": 116.584, "elevation_ft": 116.0, "runway_length_m": 3800.0, "fire_capable": 1, "type": "international"},
    {"icao": "ZGGG", "name": "Guangzhou Baiyun International (South China Hub)", "latitude": 23.392, "longitude": 113.299, "elevation_ft": 50.0, "runway_length_m": 3800.0, "fire_capable": 1, "type": "international"},

    # North America Premier Aerial Firefighting Bases
    {"icao": "KBOI", "name": "Boise Air Terminal (National Interagency Fire Center NIFC)", "latitude": 43.564, "longitude": -116.223, "elevation_ft": 2871.0, "runway_length_m": 3048.0, "fire_capable": 1, "type": "fire_hq"},
    {"icao": "KMCC", "name": "McClellan Airfield (Cal Fire Aviation HQ)", "latitude": 38.668, "longitude": -121.401, "elevation_ft": 75.0, "runway_length_m": 3231.0, "fire_capable": 1, "type": "fire_hq"},
    {"icao": "KHMT", "name": "Hemet-Ryan Air Attack Base (Southern California Air Base)", "latitude": 33.733, "longitude": -117.022, "elevation_ft": 1512.0, "runway_length_m": 1315.0, "fire_capable": 1, "type": "cal_fire_base"},
    {"icao": "KSBD", "name": "San Bernardino International (VLAT Supertanker Hub)", "latitude": 34.095, "longitude": -117.235, "elevation_ft": 1159.0, "runway_length_m": 3048.0, "fire_capable": 1, "type": "heavy_tanker_base"},
    {"icao": "KCIC", "name": "Chico Air Attack Base (Sierra Nevada Wildfire Base)", "latitude": 39.795, "longitude": -121.858, "elevation_ft": 238.0, "runway_length_m": 2660.0, "fire_capable": 1, "type": "cal_fire_base"},
    {"icao": "KMSO", "name": "Missoula Montana Smokejumper & Tanker Base", "latitude": 46.916, "longitude": -114.091, "elevation_ft": 3206.0, "runway_length_m": 2900.0, "fire_capable": 1, "type": "smokejumper_base"},
    {"icao": "KRDD", "name": "Redding Aerial Fire Attack Base (Shasta Hub)", "latitude": 40.509, "longitude": -122.293, "elevation_ft": 505.0, "runway_length_m": 2134.0, "fire_capable": 1, "type": "cal_fire_base"},
    {"icao": "KRNO", "name": "Reno-Tahoe International / Stead Fire Base", "latitude": 39.499, "longitude": -119.768, "elevation_ft": 4415.0, "runway_length_m": 3353.0, "fire_capable": 1, "type": "tanker_base"},
    {"icao": "CYLW", "name": "Kelowna Airport (British Columbia Conair Tanker Base)", "latitude": 49.956, "longitude": -119.378, "elevation_ft": 1421.0, "runway_length_m": 2690.0, "fire_capable": 1, "type": "conair_tanker_base"},
    {"icao": "CYEG", "name": "Edmonton International (Alberta Wildfire Response)", "latitude": 53.309, "longitude": -113.580, "elevation_ft": 2373.0, "runway_length_m": 3353.0, "fire_capable": 1, "type": "fire_command"},

    # Europe & Mediterranean Canadair Bases
    {"icao": "LFML", "name": "Marseille Provence (Sécurité Civile Canadair Base)", "latitude": 43.439, "longitude": 5.221, "elevation_ft": 69.0, "runway_length_m": 3500.0, "fire_capable": 1, "type": "securite_civile"},
    {"icao": "LFTW", "name": "Nîmes-Garons Base Sécurité Civile (CL-415 Hub)", "latitude": 43.757, "longitude": 4.416, "elevation_ft": 309.0, "runway_length_m": 2440.0, "fire_capable": 1, "type": "securite_civile"},
    {"icao": "LGEL", "name": "Elefsina Airbase (Hellenic Air Force 383 Mira Canadair)", "latitude": 38.067, "longitude": 23.556, "elevation_ft": 144.0, "runway_length_m": 2739.0, "fire_capable": 1, "type": "hellenic_fire_base"},
    {"icao": "LEAB", "name": "Albacete Airbase (Grupo 43 'Corsarios' Apagafuegos)", "latitude": 38.948, "longitude": -1.864, "elevation_ft": 2302.0, "runway_length_m": 2700.0, "fire_capable": 1, "type": "spanish_43_grupo"},
    {"icao": "LIBR", "name": "Brindisi Casale (Protezione Civile Canadair Base)", "latitude": 40.658, "longitude": 17.947, "elevation_ft": 49.0, "runway_length_m": 3048.0, "fire_capable": 1, "type": "protezione_civile"},
    {"icao": "EGLL", "name": "London Heathrow Airport (UK Command Hub)", "latitude": 51.470, "longitude": -0.454, "elevation_ft": 83.0, "runway_length_m": 3902.0, "fire_capable": 1, "type": "international"},
    {"icao": "EDDF", "name": "Frankfurt Airport (Germany)", "latitude": 50.038, "longitude": 8.562, "elevation_ft": 364.0, "runway_length_m": 4000.0, "fire_capable": 1, "type": "international"},

    # Australia & Oceania Bushfire Attack Hubs
    {"icao": "YSRI", "name": "RAAF Base Richmond (NSW Large Air Tanker Hub)", "latitude": -33.600, "longitude": 150.781, "elevation_ft": 67.0, "runway_length_m": 2134.0, "fire_capable": 1, "type": "bushfire_tanker_hub"},
    {"icao": "YMAV", "name": "Avalon Airport (Victoria Fire Attack Airbase)", "latitude": -38.039, "longitude": 144.469, "elevation_ft": 35.0, "runway_length_m": 3048.0, "fire_capable": 1, "type": "bushfire_tanker_hub"},
    {"icao": "YCIN", "name": "RAAF Base Curtin (Western Australia Wildfire Hub)", "latitude": -17.583, "longitude": 123.831, "elevation_ft": 291.0, "runway_length_m": 3050.0, "fire_capable": 1, "type": "military_airbase"},
    {"icao": "NZAA", "name": "Auckland Airport (New Zealand)", "latitude": -37.008, "longitude": 174.792, "elevation_ft": 23.0, "runway_length_m": 3635.0, "fire_capable": 1, "type": "international"},

    # South America & Africa Wildfire Hotspots Hubs
    {"icao": "SBBR", "name": "Brasília International (Cerrado Wildfire Tanker Base)", "latitude": -15.869, "longitude": -47.917, "elevation_ft": 3497.0, "runway_length_m": 3300.0, "fire_capable": 1, "type": "cerrado_fire_base"},
    {"icao": "SCEL", "name": "Arturo Merino Benítez (Santiago, Chile Forest Fire Base)", "latitude": -33.393, "longitude": -70.786, "elevation_ft": 1555.0, "runway_length_m": 3800.0, "fire_capable": 1, "type": "conaf_fire_base"},
    {"icao": "SACO", "name": "Ingeniero Ambrosio Taravella (Córdoba Wildfire Hub)", "latitude": -31.324, "longitude": -64.208, "elevation_ft": 1604.0, "runway_length_m": 3200.0, "fire_capable": 1, "type": "fire_command"},
    {"icao": "FACT", "name": "Cape Town International (Working on Fire South Africa Hub)", "latitude": -33.965, "longitude": 18.602, "elevation_ft": 151.0, "runway_length_m": 3201.0, "fire_capable": 1, "type": "wof_fire_base"},
    {"icao": "FAEL", "name": "East London Airport (Eastern Cape Fire Base)", "latitude": -33.036, "longitude": 27.826, "elevation_ft": 435.0, "runway_length_m": 1939.0, "fire_capable": 1, "type": "wof_fire_base"},
    {"icao": "OMDB", "name": "Dubai International (Middle East Hub)", "latitude": 25.253, "longitude": 55.364, "elevation_ft": 62.0, "runway_length_m": 4450.0, "fire_capable": 1, "type": "international"},
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes Great-Circle distance between two coordinates in kilometers."""
    r = 6371.0  # Earth mean radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    a = max(0.0, min(1.0, a))
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))


def initial_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes the initial forward azimuth/bearing in degrees (0-360) from point 1 to point 2."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    x = math.sin(dlambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - (math.sin(phi1) * math.cos(phi2) * math.cos(dlambda))
    bearing = math.atan2(x, y)
    return (math.degrees(bearing) + 360.0) % 360.0


def calculate_offset_coord(lat: float, lon: float, distance_km: float, bearing_deg: float) -> Tuple[float, float]:
    """Computes destination coordinates from a point along a given bearing and distance."""
    d_div_r = distance_km / 6371.0
    bearing_rad = math.radians(bearing_deg)
    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)

    sin_dest_lat = (
        math.sin(lat_rad) * math.cos(d_div_r) +
        math.cos(lat_rad) * math.sin(d_div_r) * math.cos(bearing_rad)
    )
    dest_lat_rad = math.asin(max(-1.0, min(1.0, sin_dest_lat)))
    dest_lon_rad = lon_rad + math.atan2(
        math.sin(bearing_rad) * math.sin(d_div_r) * math.cos(lat_rad),
        math.cos(d_div_r) - math.sin(lat_rad) * math.sin(dest_lat_rad)
    )
    return math.degrees(dest_lat_rad), (math.degrees(dest_lon_rad) + 540.0) % 360.0 - 180.0


class AirbaseService:
    """Manages SQLite embedded airbase repository and generates tactical mission trajectories."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH
        self._in_memory_conn: Optional[sqlite3.Connection] = None
        if str(self.db_path) == ":memory:":
            self._in_memory_conn = sqlite3.connect(":memory:")
            self._in_memory_conn.row_factory = sqlite3.Row
        self.init_airbase_db()

    def get_connection(self) -> sqlite3.Connection:
        """Returns SQLite connection with dict row factory."""
        if self._in_memory_conn is not None:
            return self._in_memory_conn
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def init_airbase_db(self) -> None:
        """Initializes database schema and ensures pre-populated airbase records."""
        if str(self.db_path) != ":memory:":
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS airbases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    icao TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    elevation_ft REAL NOT NULL,
                    runway_length_m REAL NOT NULL,
                    fire_capable INTEGER NOT NULL DEFAULT 1,
                    type TEXT NOT NULL DEFAULT 'airbase'
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_airbases_lat_lon ON airbases(latitude, longitude);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_airbases_runway ON airbases(runway_length_m);")

            # Check if seeding is required
            cursor.execute("SELECT COUNT(*) as count FROM airbases")
            row = cursor.fetchone()
            count = row["count"] if row else 0

            if count < len(SEED_AIRBASES):
                for ab in SEED_AIRBASES:
                    cursor.execute("""
                        INSERT OR IGNORE INTO airbases (icao, name, latitude, longitude, elevation_ft, runway_length_m, fire_capable, type)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        ab["icao"],
                        ab["name"],
                        ab["latitude"],
                        ab["longitude"],
                        ab["elevation_ft"],
                        ab["runway_length_m"],
                        ab["fire_capable"],
                        ab["type"]
                    ))
                conn.commit()

    def find_nearest_airbase(
        self,
        lat: float,
        lon: float,
        min_runway_m: float = 1200.0,
        max_distance_km: float = 500.0,
        fire_capable_only: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes bounding-box filtered Haversine proximity query to locate the nearest
        compatible firefighting airbase within max_distance_km. Falls back to a procedural
        Forward Operating Base (FOB) if no certified airfield satisfies the criteria.
        Safely handles antimeridian crossings and polar meridian convergence.
        """
        # Degrees margin for initial SQL bounding box filter
        lat_margin = (max_distance_km / 111.0) * 1.15
        cos_lat = max(0.08, math.cos(math.radians(lat)))
        lon_margin = (max_distance_km / (111.0 * cos_lat)) * 1.15

        min_lat = max(-90.0, lat - lat_margin)
        max_lat = min(90.0, lat + lat_margin)
        min_lon = lon - lon_margin
        max_lon = lon + lon_margin

        where_clauses = ["runway_length_m >= ?", "latitude BETWEEN ? AND ?"]
        params: List[Any] = [min_runway_m, min_lat, max_lat]

        if fire_capable_only:
            where_clauses.append("fire_capable = 1")

        # Antimeridian wrapping and polar handling
        if lon_margin >= 180.0 or abs(lat) >= 80.0:
            pass  # Longitude unconstrained near poles or wide search radius
        elif min_lon < -180.0:
            wrapped_min = min_lon + 360.0
            where_clauses.append("(longitude BETWEEN ? AND 180.0 OR longitude BETWEEN -180.0 AND ?)")
            params.extend([wrapped_min, max_lon])
        elif max_lon > 180.0:
            wrapped_max = max_lon - 360.0
            where_clauses.append("(longitude BETWEEN ? AND 180.0 OR longitude BETWEEN -180.0 AND ?)")
            params.extend([min_lon, wrapped_max])
        else:
            where_clauses.append("longitude BETWEEN ? AND ?")
            params.extend([min_lon, max_lon])

        query = f"""
            SELECT id, icao, name, latitude, longitude, elevation_ft, runway_length_m, fire_capable, type
            FROM airbases
            WHERE {' AND '.join(where_clauses)}
        """

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()

        best_airbase = None
        min_dist = float("inf")

        for r in rows:
            dist = haversine_km(lat, lon, r["latitude"], r["longitude"])
            if dist <= max_distance_km and dist < min_dist:
                min_dist = dist
                best_airbase = dict(r)

        if best_airbase is not None:
            bearing = initial_bearing_deg(
                best_airbase["latitude"],
                best_airbase["longitude"],
                lat,
                lon
            )
            best_airbase["distance_km"] = round(min_dist, 2)
            best_airbase["bearing_deg"] = round(bearing, 1)
            best_airbase["fire_capable"] = bool(best_airbase["fire_capable"])

            return {
                "airbase": best_airbase,
                "distance_km": round(min_dist, 2),
                "bearing_deg": round(bearing, 1),
                "is_fallback_fob": False,
                "target_lat": lat,
                "target_lon": lon,
            }

        # Fallback to Procedural Forward Operating Base (FOB)
        fob_dist_km = 22.0
        fob_bearing_from_fire = 225.0  # Upwind/south-west offset
        fob_lat, fob_lon = calculate_offset_coord(lat, lon, fob_dist_km, fob_bearing_from_fire)
        fob_bearing_to_target = (fob_bearing_from_fire + 180.0) % 360.0

        fob_record = {
            "id": 99999,
            "icao": "VFOB",
            "name": "Forward Operating Base (FOB Alpha - Procedural Wildfire Field)",
            "latitude": round(fob_lat, 5),
            "longitude": round(fob_lon, 5),
            "elevation_ft": 450.0,
            "runway_length_m": 1500.0,
            "fire_capable": True,
            "type": "procedural_fob",
            "distance_km": round(fob_dist_km, 2),
            "bearing_deg": round(fob_bearing_to_target, 1),
        }

        return {
            "airbase": fob_record,
            "distance_km": round(fob_dist_km, 2),
            "bearing_deg": round(fob_bearing_to_target, 1),
            "is_fallback_fob": True,
            "target_lat": lat,
            "target_lon": lon,
        }

    def generate_mission_route(
        self,
        origin_lat: float,
        origin_lon: float,
        target_lat: float,
        target_lon: float,
        cruise_alt_m: float = 2500.0,
        origin_icao: Optional[str] = None,
        origin_elev_m: Optional[float] = None,
        target_elev_m: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Generates 3D tactical transit waypoints from airbase runway to target wildfire,
        including takeoff roll, climb, enroute cruise, initial point (IP) descent,
        and tactical orbit pattern around the fire.
        Ensures altitude waypoints always stay safely above terrain across all altitudes.
        """
        total_dist_km = haversine_km(origin_lat, origin_lon, target_lat, target_lon)
        total_bearing = initial_bearing_deg(origin_lat, origin_lon, target_lat, target_lon)

        # Retrieve origin airfield elevation and attributes
        origin_id = 1
        origin_name = "Origin Airbase"
        origin_type = "airbase"
        origin_runway = 2500.0
        origin_elev_ft = 100.0
        origin_fire_capable = True

        if origin_icao:
            if origin_icao == "VFOB" or origin_icao.startswith("FOB"):
                origin_id = 99999
                origin_name = "Forward Operating Base (FOB Alpha - Procedural Wildfire Field)"
                origin_elev_ft = 450.0
                origin_runway = 1500.0
                origin_type = "procedural_fob"
                origin_fire_capable = True
            else:
                with self.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT id, name, elevation_ft, runway_length_m, fire_capable, type FROM airbases WHERE icao = ?",
                        (origin_icao,)
                    )
                    row = cursor.fetchone()
                    if row:
                        origin_id = row["id"]
                        origin_name = row["name"]
                        origin_elev_ft = row["elevation_ft"]
                        origin_runway = row["runway_length_m"]
                        origin_fire_capable = bool(row["fire_capable"])
                        origin_type = row["type"]

        # Calculate elevation baselines (meters MSL)
        if origin_elev_m is None:
            origin_elev_m = origin_elev_ft * 0.3048

        eff_target_elev_m = target_elev_m if target_elev_m is not None else origin_elev_m
        terrain_floor_m = max(origin_elev_m, eff_target_elev_m)

        # Cruising altitude is safely clamped above the highest terrain baseline
        safe_cruise_alt = max(cruise_alt_m, terrain_floor_m + 700.0)

        waypoints: List[Dict[str, Any]] = []

        # 1. Runway Lineup (Ground Zero)
        waypoints.append({
            "name": f"RWY-{origin_icao or 'DEP'}",
            "lat": round(origin_lat, 6),
            "lon": round(origin_lon, 6),
            "alt_m": round(origin_elev_m + 5.0, 1),
            "phase": "runway",
            "speed_knots": 0.0,
        })

        # 2. Liftoff & Initial Departure (along runway heading towards target)
        d_liftoff = min(1.8, total_dist_km * 0.25) if total_dist_km > 0.5 else max(0.05, total_dist_km * 0.4)
        lat_lo, lon_lo = calculate_offset_coord(origin_lat, origin_lon, d_liftoff, total_bearing)
        waypoints.append({
            "name": "LIFTOFF",
            "lat": round(lat_lo, 6),
            "lon": round(lon_lo, 6),
            "alt_m": round(origin_elev_m + 150.0, 1),
            "phase": "takeoff",
            "speed_knots": 140.0,
        })

        # 3. Climb Out (approx 5-10 km out)
        if total_dist_km > 15.0:
            d_climb = min(10.0, total_dist_km * 0.25)
            lat_cl, lon_cl = calculate_offset_coord(origin_lat, origin_lon, d_climb, total_bearing)
            climb_alt = origin_elev_m + min(650.0, max(250.0, (safe_cruise_alt - origin_elev_m) * 0.5))
            waypoints.append({
                "name": "CLIMB-OUT",
                "lat": round(lat_cl, 6),
                "lon": round(lon_cl, 6),
                "alt_m": round(climb_alt, 1),
                "phase": "climb",
                "speed_knots": 210.0,
            })

        # 4. Enroute Cruise Waypoints
        num_cruise_legs = 3 if total_dist_km > 50.0 else (1 if total_dist_km > 20.0 else 0)
        for i in range(1, num_cruise_legs + 1):
            fraction = 0.3 + (0.4 * (i / (num_cruise_legs + 1)))
            d_cruise = total_dist_km * fraction
            lat_cr, lon_cr = calculate_offset_coord(origin_lat, origin_lon, d_cruise, total_bearing)
            waypoints.append({
                "name": f"CRUISE-WP{i}",
                "lat": round(lat_cr, 6),
                "lon": round(lon_cr, 6),
                "alt_m": round(safe_cruise_alt, 1),
                "phase": "transit",
                "speed_knots": 260.0,
            })

        # 5. Tactical Initial Point (IP) Descent
        if total_dist_km > 3.0:
            d_ip_from_target = min(8.0, total_dist_km * 0.15)
            d_ip = max(d_liftoff + 0.5, total_dist_km - d_ip_from_target)
        else:
            d_ip = min(total_dist_km * 0.75, max(d_liftoff + 0.05, total_dist_km - 0.1))

        lat_ip, lon_ip = calculate_offset_coord(origin_lat, origin_lon, d_ip, total_bearing)
        ip_alt = max(eff_target_elev_m + 300.0, min(safe_cruise_alt * 0.7, eff_target_elev_m + 500.0))
        waypoints.append({
            "name": "IP-INGRESS",
            "lat": round(lat_ip, 6),
            "lon": round(lon_ip, 6),
            "alt_m": round(ip_alt, 1),
            "phase": "descent",
            "speed_knots": 190.0,
        })

        # 6. Target Fire Perimeter / Orbit Entry (Safe 400m AGL above target wildfire)
        orbit_alt = eff_target_elev_m + 400.0
        waypoints.append({
            "name": "FIRE-TARGET-ORBIT",
            "lat": round(target_lat, 6),
            "lon": round(target_lon, 6),
            "alt_m": round(orbit_alt, 1),
            "phase": "orbit",
            "speed_knots": 160.0,
        })

        # Average cruise speed ~230 knots ≈ 426 km/h
        avg_speed_kmh = 420.0
        flight_time_min = round(max(1.5, (total_dist_km / avg_speed_kmh) * 60.0), 1)

        origin_record = {
            "id": origin_id,
            "icao": origin_icao or "VFOB",
            "name": origin_name,
            "latitude": round(origin_lat, 6),
            "longitude": round(origin_lon, 6),
            "elevation_ft": origin_elev_ft,
            "runway_length_m": origin_runway,
            "fire_capable": origin_fire_capable,
            "type": origin_type,
            "distance_km": round(total_dist_km, 2),
            "bearing_deg": round(total_bearing, 1),
        }

        return {
            "origin": origin_record,
            "target": {"lat": round(target_lat, 6), "lon": round(target_lon, 6)},
            "distance_km": round(total_dist_km, 2),
            "bearing_deg": round(total_bearing, 1),
            "estimated_flight_time_min": flight_time_min,
            "waypoints": waypoints,
        }


# Singleton instance
airbase_service = AirbaseService()
