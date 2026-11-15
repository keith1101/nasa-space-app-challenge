"""
Flight & Tactical Airbase Models for NASA FIRMS Aerial Wildfire Response.
Provides DTOs and Pydantic schemas for airbase registry, flight telemetry,
and mission trajectory planning with automatic fallback to TypedDict/dataclasses.
"""

from typing import Optional, List, Dict, Any

try:
    from pydantic import BaseModel, Field
    HAS_PYDANTIC = True
except ImportError:
    BaseModel = object
    Field = lambda *args, **kwargs: kwargs.get("default", None)
    HAS_PYDANTIC = False


if HAS_PYDANTIC:
    class AirbaseRecord(BaseModel):
        id: int = Field(..., description="Unique airbase ID")
        icao: str = Field(..., description="ICAO 4-letter airport code")
        name: str = Field(..., description="Official airbase or airport designation")
        latitude: float = Field(..., description="Latitude coordinate in WGS84")
        longitude: float = Field(..., description="Longitude coordinate in WGS84")
        elevation_ft: float = Field(..., description="Runway elevation above MSL in feet")
        runway_length_m: float = Field(..., description="Primary runway length in meters")
        fire_capable: bool = Field(True, description="Equipped with aerial retardant/scooper refilling")
        type: str = Field("airbase", description="Facility classification: military_airbase, international, regional")
        distance_km: Optional[float] = Field(None, description="Distance from target hotspot in km")
        bearing_deg: Optional[float] = Field(None, description="Initial compass bearing from airbase to target")

    class NearestAirbaseResponse(BaseModel):
        airbase: AirbaseRecord
        distance_km: float = Field(..., description="Direct distance in km")
        bearing_deg: float = Field(..., description="Magnetic/true bearing to target")
        is_fallback_fob: bool = Field(False, description="True if no airbase exists within max_distance_km")
        target_lat: float
        target_lon: float

    class MissionWaypoint(BaseModel):
        name: str = Field(..., description="Waypoint identifier (e.g. RWY-DEP, CLIMB, CRUISE, IP-ENTRY, ORBIT)")
        lat: float = Field(..., description="Latitude in WGS84")
        lon: float = Field(..., description="Longitude in WGS84")
        alt_m: float = Field(..., description="Altitude in meters MSL")
        phase: str = Field(..., description="Flight phase: runway, takeoff, climb, transit, descent, orbit")
        speed_knots: float = Field(..., description="Target airspeed in knots")

    class MissionRouteResponse(BaseModel):
        origin: AirbaseRecord
        target: Dict[str, float]
        distance_km: float
        bearing_deg: float
        estimated_flight_time_min: float
        waypoints: List[MissionWaypoint]

else:
    from typing import TypedDict

    class AirbaseRecord(TypedDict, total=False):
        id: int
        icao: str
        name: str
        latitude: float
        longitude: float
        elevation_ft: float
        runway_length_m: float
        fire_capable: bool
        type: str
        distance_km: Optional[float]
        bearing_deg: Optional[float]

    class NearestAirbaseResponse(TypedDict):
        airbase: AirbaseRecord
        distance_km: float
        bearing_deg: float
        is_fallback_fob: bool
        target_lat: float
        target_lon: float

    class MissionWaypoint(TypedDict):
        name: str
        lat: float
        lon: float
        alt_m: float
        phase: str
        speed_knots: float

    class MissionRouteResponse(TypedDict):
        origin: AirbaseRecord
        target: Dict[str, float]
        distance_km: float
        bearing_deg: float
        estimated_flight_time_min: float
        waypoints: List[MissionWaypoint]
