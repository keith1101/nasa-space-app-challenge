"""
Exact Spatio-Temporal Directed Acyclic Graph (ST-DAG) Fire Tracking Engine.
Links multi-pass satellite active fire detections across multiple days into
continuous fire event trajectories, computing duration and propagation vectors.
Zero external C-library dependency.
"""

import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional

from backend.core.geometry import haversine_km
from backend.core.kinematics import compute_trajectory_kinematics


class TimestampResult(float):
    """
    Subclass of float representing epoch hours that behaves as a float (arithmetic, comparisons)
    while unpacking into (epoch_hours, iso_string) for backwards-compatible tuple unpacking.
    """
    iso_str: str

    def __new__(cls, ts_h: float, iso_str: str):
        inst = super().__new__(cls, ts_h)
        inst.iso_str = iso_str
        return inst

    def __iter__(self):
        yield float(self)
        yield self.iso_str

    def __getitem__(self, index):
        if index == 0:
            return float(self)
        elif index == 1:
            return self.iso_str
        raise IndexError("TimestampResult index out of range (0 or 1)")

    def __repr__(self):
        return f"TimestampResult({float(self)}, '{self.iso_str}')"


def _parse_record_timestamp(rec: Any, time_raw: Optional[Any] = None) -> TimestampResult:
    """
    Extracts TimestampResult(epoch_hours, iso_string) from a record or (date_str, time_str) pair.
    Supports existing '_ts_hours', 'datetime_utc', or 'acq_date' + 'acq_time'.
    """
    if not isinstance(rec, dict):
        rec = {"acq_date": str(rec), "acq_time": time_raw}

    if "_ts_hours" in rec and rec["_ts_hours"] is not None:
        ts_h = float(rec["_ts_hours"])
        iso_str = rec.get("datetime_utc", "")
        if not iso_str:
            dt = datetime.fromtimestamp(ts_h * 3600.0, tz=timezone.utc)
            iso_str = dt.isoformat()
        return TimestampResult(ts_h, iso_str)

    iso_str = rec.get("datetime_utc") or ""
    if iso_str:
        try:
            dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
            return TimestampResult(dt.timestamp() / 3600.0, dt.isoformat())
        except Exception:
            pass

    date_str = str(rec.get("acq_date", "1970-01-01")).strip()
    time_raw = rec.get("acq_time", 0)
    try:
        t_int = int(time_raw)
        hh = t_int // 100
        mm = t_int % 100
    except (ValueError, TypeError):
        hh, mm = 0, 0

    try:
        parts = [int(p) for p in date_str.split("-")]
        dt = datetime(parts[0], parts[1], parts[2], hh, mm, tzinfo=timezone.utc)
    except Exception:
        dt = datetime(1970, 1, 1, 0, 0, tzinfo=timezone.utc)

    return TimestampResult(dt.timestamp() / 3600.0, dt.isoformat())


def group_detections_into_pass_nodes(
    records: List[Dict[str, Any]],
    pass_window_hours: float = 3.0,
    spatial_merge_km: float = 2.0,
    temporal_cluster_window_h: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Groups contemporaneous raw or harmonized records from the same satellite pass
    into unified Pass Centroid Nodes.
    Computes flux-density weighted centroid coordinates.
    """
    if temporal_cluster_window_h is not None:
        pass_window_hours = temporal_cluster_window_h

    if not records:
        return []

    # Enrich with timestamp hours
    enriched = []
    for r in records:
        ts_h, iso_str = _parse_record_timestamp(r)
        frp_val = float(r.get("harmonized_frp") or r.get("frp") or 0.0)
        enriched.append({
            "orig": r,
            "latitude": float(r["latitude"]),
            "longitude": float(r["longitude"]),
            "ts_h": ts_h,
            "iso_str": iso_str,
            "frp": max(0.1, frp_val),
        })

    # Sort chronologically
    enriched.sort(key=lambda x: (x["ts_h"], x["latitude"], x["longitude"]))
    n = len(enriched)

    visited = [False] * n
    pass_nodes: List[Dict[str, Any]] = []

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        cluster = [enriched[i]]

        for j in range(i + 1, n):
            if visited[j]:
                continue
            dt_h = enriched[j]["ts_h"] - enriched[i]["ts_h"]
            if dt_h > pass_window_hours:
                break
            d_km = haversine_km(
                enriched[i]["latitude"],
                enriched[i]["longitude"],
                enriched[j]["latitude"],
                enriched[j]["longitude"],
            )
            if d_km <= spatial_merge_km:
                visited[j] = True
                cluster.append(enriched[j])

        # Compute flux-density weighted centroid
        sum_frp = sum(item["frp"] for item in cluster)
        c_lat = sum(item["latitude"] * item["frp"] for item in cluster) / sum_frp
        c_lon = sum(item["longitude"] * item["frp"] for item in cluster) / sum_frp
        c_tsh = sum(item["ts_h"] for item in cluster) / len(cluster)
        earliest_iso = min(item["iso_str"] for item in cluster)

        pass_nodes.append({
            "latitude": round(c_lat, 5),
            "longitude": round(c_lon, 5),
            "timestamp_hours": c_tsh,
            "datetime_utc": earliest_iso,
            "frp": round(sum_frp, 2),
            "detection_count": len(cluster),
            "observation_count": len(cluster),
            "records": [item["orig"] for item in cluster],
        })

    return pass_nodes


def track_fire_events(
    records: List[Dict[str, Any]],
    max_time_gap_hours: float = 36.0,
    base_spatial_eps_km: float = 1.5,
    max_spread_velocity_kmh: float = 3.5,
    pass_window_hours: float = 3.0,
) -> List[Dict[str, Any]]:
    """
    Builds a Spatio-Temporal Directed Acyclic Graph (ST-DAG) across multi-pass satellite scans.
    Partitions detections into distinct Fire Events with continuous trajectories and kinematics.

    Args:
        records: List of raw or harmonized active fire records.
        max_time_gap_hours: Maximum time interval allowed between consecutive linked scans (default 36h).
        base_spatial_eps_km: Base satellite footprint resolution margin (default 1.5 km).
        max_spread_velocity_kmh: Upper physical bound of fire spread velocity (default 3.5 km/h).
        pass_window_hours: Temporal window for clustering contemporaneous detections in a single pass (default 3.0h).

    Returns:
        List of structured Fire Event dictionaries, ordered by total FRP descending.
    """
    pass_nodes = group_detections_into_pass_nodes(
        records, pass_window_hours=pass_window_hours, spatial_merge_km=base_spatial_eps_km
    )

    m = len(pass_nodes)
    if m == 0:
        return []

    # Sort pass nodes chronologically
    pass_nodes.sort(key=lambda p: (p["timestamp_hours"], p["latitude"], p["longitude"]))

    # Adjacency list for DAG & Disjoint Set / BFS for Connected Components
    adj: List[List[int]] = [[] for _ in range(m)]
    undirected_adj: List[List[int]] = [[] for _ in range(m)]

    for a in range(m):
        node_a = pass_nodes[a]
        for b in range(a + 1, m):
            node_b = pass_nodes[b]
            dt_h = node_b["timestamp_hours"] - node_a["timestamp_hours"]
            if dt_h > max_time_gap_hours:
                # Chronologically sorted, but later nodes might be within window, so continue searching
                continue
            if dt_h <= 1e-4:
                # Same pass, already grouped or spatially separated
                continue

            # Dynamic expansion radius: delta_d <= eps_base + v_max * delta_t
            max_allowed_dist_km = base_spatial_eps_km + (max_spread_velocity_kmh * dt_h)
            d_km = haversine_km(
                node_a["latitude"], node_a["longitude"],
                node_b["latitude"], node_b["longitude"]
            )

            if d_km <= max_allowed_dist_km:
                adj[a].append(b)
                undirected_adj[a].append(b)
                undirected_adj[b].append(a)

    # Find weakly connected components
    visited_comp = [False] * m
    components: List[List[int]] = []

    for i in range(m):
        if visited_comp[i]:
            continue
        visited_comp[i] = True
        comp = [i]
        queue = [i]
        while queue:
            curr = queue.pop(0)
            for neighbor in undirected_adj[curr]:
                if not visited_comp[neighbor]:
                    visited_comp[neighbor] = True
                    comp.append(neighbor)
                    queue.append(neighbor)
        components.append(comp)

    fire_events: List[Dict[str, Any]] = []

    for event_idx, comp_indices in enumerate(components, start=1):
        # Sort waypoints in this fire event chronologically
        comp_nodes = [pass_nodes[k] for k in comp_indices]
        comp_nodes.sort(key=lambda p: p["timestamp_hours"])

        # Format waypoints
        waypoints: List[Dict[str, Any]] = []
        all_raw_records: List[Dict[str, Any]] = []

        for p in comp_nodes:
            waypoints.append({
                "latitude": p["latitude"],
                "longitude": p["longitude"],
                "timestamp_hours": round(p["timestamp_hours"], 4),
                "datetime_utc": p["datetime_utc"],
                "frp": p["frp"],
                "detection_count": p["detection_count"],
            })
            all_raw_records.extend(p["records"])

        kinematics = compute_trajectory_kinematics(waypoints)
        duration_hours = kinematics["duration_hours"]

        if duration_hours >= 24.0:
            status = "MULTI_DAY_CONFLAGRATION"
        elif duration_hours >= 3.0:
            status = "PERSISTENT_ACTIVE_FIRE"
        else:
            status = "SINGLE_PASS_EVENT" if len(waypoints) == 1 else "RECENT_ACTIVE_FIRE"

        w_first = waypoints[0]
        w_last = waypoints[-1]

        event_dict: Dict[str, Any] = {
            "event_id": f"FE-{event_idx:04d}",
            "status": status,
            "duration_hours": duration_hours,
            "first_detected_utc": w_first["datetime_utc"],
            "last_detected_utc": w_last["datetime_utc"],
            "waypoint_count": len(waypoints),
            "pass_count": len(waypoints),
            "raw_detection_count": len(all_raw_records),
            "origin_centroid": {
                "latitude": w_first["latitude"],
                "longitude": w_first["longitude"],
            },
            "current_centroid": {
                "latitude": w_last["latitude"],
                "longitude": w_last["longitude"],
            },
            "kinematics": kinematics,
            "waypoints": waypoints,
        }
        fire_events.append(event_dict)

    # Sort events by total FRP descending (highest energy fires first)
    fire_events.sort(key=lambda ev: ev["kinematics"]["total_frp_mw"], reverse=True)
    return fire_events
