"""
Kinematic & Vector Dynamics Engine for Wildfire Trajectories.
Calculates geodesic bearing (azimuth), compass directions, rate of spread (ROS),
wind alignment, and multi-temporal kinematic summaries.
Zero external C-library dependency.
"""

import math
from typing import Dict, Any, List, Optional
from backend.core.geometry import haversine_km

COMPASS_SECTORS_16 = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
]


def calculate_geodesic_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes initial geodesic bearing (forward azimuth) from (lat1, lon1) to (lat2, lon2).
    Formula:
        θ = atan2(sin(Δλ) * cos(φ2), cos(φ1)*sin(φ2) - sin(φ1)*cos(φ2)*cos(Δλ))
    Returns degrees in range [0.0, 360.0).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)

    y = math.sin(dlambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)

    theta_rad = math.atan2(y, x)
    theta_deg = math.degrees(theta_rad)
    return (theta_deg + 360.0) % 360.0


def bearing_to_compass_16(bearing_deg: Optional[float]) -> str:
    """Converts bearing in [0, 360) to 16-point compass abbreviation (e.g. N, NE, ENE)."""
    if bearing_deg is None or not math.isfinite(bearing_deg):
        return "N/A"
    norm_deg = (bearing_deg % 360.0 + 360.0) % 360.0
    idx = int((norm_deg + 11.25) / 22.5) % 16
    return COMPASS_SECTORS_16[idx]


def calculate_rate_of_spread(distance_km: float, delta_hours: float) -> float:
    """
    Calculates rate of spread (ROS) in km/h.
    Guards against non-positive time intervals and negative distances.
    """
    if delta_hours <= 1e-4 or distance_km <= 0.0:
        return 0.0
    return distance_km / delta_hours


def analyze_wind_fire_alignment(
    fire_bearing_deg: float,
    wind_direction_from_deg: float,
    wind_speed_kmh: float = 0.0,
) -> Dict[str, Any]:
    """
    Evaluates whether the fire spread vector aligns with ambient wind direction.
    wind_direction_from_deg: Meteorological convention (direction FROM which wind blows).
    Wind vector pushes flames TOWARDS: (wind_from + 180) % 360.
    """
    wind_towards = (wind_direction_from_deg + 180.0) % 360.0
    diff = abs(fire_bearing_deg - wind_towards)
    alignment_angle = min(diff, 360.0 - diff)

    if wind_speed_kmh < 8.0:
        spread_mechanism = "FUEL_OR_TERRAIN_DOMINATED"
        alignment_class = "CALM_WIND"
        status = "CALM_TERRAIN_DOMINATED"
        description = "Gió yếu (< 8 km/h), đám cháy chủ yếu lan theo thảm thực vật hoặc địa hình sườn dốc."
    elif alignment_angle <= 30.0:
        spread_mechanism = "WIND_DRIVEN"
        alignment_class = "HIGH_WIND_ALIGNMENT"
        status = "STRONG_WIND_DRIVEN"
        description = "Đám cháy lan thuận theo chiều gió thổi mạnh (Wind-Driven Spread)."
    elif alignment_angle <= 60.0:
        spread_mechanism = "WIND_DRIVEN"
        alignment_class = "MODERATE_WIND_ALIGNMENT"
        status = "MODERATE_WIND_DRIVEN"
        description = "Đám cháy chịu ảnh hưởng đáng kể từ hướng gió."
    elif alignment_angle <= 120.0:
        spread_mechanism = "FLANKING_OR_FUEL_DRIVEN"
        alignment_class = "CROSS_WIND_FLANKING"
        status = "CROSS_WIND_FLANKING"
        description = "Lửa lan xiên góc với gió (Flanking Fire), chịu tác động bởi địa hình hoặc thảm thực vật."
    else:
        spread_mechanism = "FUEL_OR_SLOPE_DRIVEN"
        alignment_class = "HEADWIND_BACKING_FIRE"
        status = "OPPOSING_WIND_BACKING_OR_SLOPE"
        description = "Lửa lan ngược hướng gió hoặc leo dốc núi (Backing Fire / Slope-Driven)."

    return {
        "wind_towards_deg": round(wind_towards, 1),
        "alignment_angle_deg": round(alignment_angle, 1),
        "status": status,
        "spread_mechanism": spread_mechanism,
        "alignment_class": alignment_class,
        "description": description,
        "wind_speed_kmh": round(wind_speed_kmh, 1),
    }


def compute_trajectory_kinematics(waypoints: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes full kinematic dynamics for a chronological list of fire waypoints.
    Each waypoint must contain:
        latitude: float, longitude: float, timestamp_hours: float, frp: float
    """
    n = len(waypoints)
    if n == 0:
        return {
            "waypoint_count": 0,
            "duration_hours": 0.0,
            "net_displacement_km": 0.0,
            "net_distance_km": 0.0,
            "total_path_distance_km": 0.0,
            "net_bearing_deg": None,
            "net_compass_dir": "STATIONARY",
            "current_bearing_deg": None,
            "current_compass_dir": "STATIONARY",
            "current_ros_kmh": 0.0,
            "average_ros_kmh": 0.0,
            "frp_trend": "STABLE",
            "total_frp_mw": 0.0,
            "mean_frp_mw": 0.0,
            "peak_frp_mw": 0.0,
        }

    total_frp = sum(float(wp.get("frp") or wp.get("total_frp") or 0.0) for wp in waypoints)
    peak_frp = max(float(wp.get("frp") or wp.get("total_frp") or 0.0) for wp in waypoints)
    mean_frp = total_frp / n

    if n == 1:
        return {
            "waypoint_count": 1,
            "kinematic_steps": 0,
            "duration_hours": 0.0,
            "net_displacement_km": 0.0,
            "net_distance_km": 0.0,
            "total_path_distance_km": 0.0,
            "net_bearing_deg": None,
            "net_compass_dir": "STATIONARY",
            "current_bearing_deg": None,
            "current_compass_dir": "STATIONARY",
            "current_ros_kmh": 0.0,
            "average_ros_kmh": 0.0,
            "frp_trend": "INITIAL_DETECTION",
            "total_frp_mw": round(total_frp, 2),
            "mean_frp_mw": round(mean_frp, 2),
            "peak_frp_mw": round(peak_frp, 2),
        }

    # Step-by-step calculations
    step_distances: List[float] = []
    step_times: List[float] = []
    for i in range(1, n):
        w_prev = waypoints[i - 1]
        w_curr = waypoints[i]
        d_km = haversine_km(
            w_prev["latitude"], w_prev["longitude"], w_curr["latitude"], w_curr["longitude"]
        )
        dt_hours = max(0.0, w_curr["timestamp_hours"] - w_prev["timestamp_hours"])
        step_distances.append(d_km)
        step_times.append(dt_hours)

    total_path_distance_km = sum(step_distances)
    w_first = waypoints[0]
    w_last = waypoints[-1]
    net_displacement_km = haversine_km(
        w_first["latitude"], w_first["longitude"], w_last["latitude"], w_last["longitude"]
    )
    duration_hours = max(0.0, w_last["timestamp_hours"] - w_first["timestamp_hours"])

    net_bearing_deg = calculate_geodesic_bearing(
        w_first["latitude"], w_first["longitude"], w_last["latitude"], w_last["longitude"]
    )
    net_compass_dir = bearing_to_compass_16(net_bearing_deg)

    # Current step (last two waypoints)
    current_bearing_deg = calculate_geodesic_bearing(
        waypoints[-2]["latitude"],
        waypoints[-2]["longitude"],
        w_last["latitude"],
        w_last["longitude"],
    )
    current_compass_dir = bearing_to_compass_16(current_bearing_deg)
    current_ros_kmh = calculate_rate_of_spread(step_distances[-1], step_times[-1])
    average_ros_kmh = calculate_rate_of_spread(total_path_distance_km, duration_hours)

    # FRP Trend analysis
    first_half = waypoints[: max(1, n // 2)]
    second_half = waypoints[max(1, n // 2) :]
    mean_frp_first = sum(float(w.get("frp") or w.get("total_frp") or 0.0) for w in first_half) / len(first_half)
    mean_frp_second = sum(float(w.get("frp") or w.get("total_frp") or 0.0) for w in second_half) / len(second_half)

    if mean_frp_second >= mean_frp_first * 1.20 and mean_frp_second - mean_frp_first > 5.0:
        frp_trend = "INTENSIFYING"
    elif mean_frp_second <= mean_frp_first * 0.80 and mean_frp_first - mean_frp_second > 5.0:
        frp_trend = "DECAYING"
    else:
        frp_trend = "STABLE"

    return {
        "waypoint_count": n,
        "kinematic_steps": max(0, n - 1),
        "duration_hours": round(duration_hours, 2),
        "net_displacement_km": round(net_displacement_km, 3),
        "net_distance_km": round(net_displacement_km, 3),
        "total_path_distance_km": round(total_path_distance_km, 3),
        "net_bearing_deg": round(net_bearing_deg, 1),
        "net_compass_dir": net_compass_dir,
        "current_bearing_deg": round(current_bearing_deg, 1),
        "current_compass_dir": current_compass_dir,
        "current_ros_kmh": round(current_ros_kmh, 3),
        "average_ros_kmh": round(average_ros_kmh, 3),
        "frp_trend": frp_trend,
        "total_frp_mw": round(total_frp, 2),
        "mean_frp_mw": round(mean_frp, 2),
        "peak_frp_mw": round(peak_frp, 2),
    }
