"""
Exact Two-Stage Spatio-Temporal DBSCAN Engine (min_samples=1).
Stage 1: Spatial hash grid indexing in O(N).
Stage 2: Chronological BFS with anisotropic elliptical footprint matching & continuous sliding temporal window.
"""

import math
from typing import List, Dict, Any, Tuple
from backend.core.geometry import haversine_km, elliptical_footprint_match


def cluster_records_spatio_temporal(
    combined: List[Dict[str, Any]],
    spatial_eps_km: float = 1.25,
    time_window_hours: float = 3.0,
    use_footprint: bool = True,
) -> List[int]:
    """
    Exact Two-Stage Spatio-Temporal DBSCAN (min_samples=1):
    Stage 1: Spatial grid hash (cell size ~ upper_eps_km) to isolate nearby candidate points in O(N).
    Stage 2: Chronological BFS with distance-ordered neighbors linking detections iff:
             - Anisotropic Elliptical Footprint Match along cross-track (scan) and along-track (track) axes
             - Pairwise temporal difference |t_i - t_j| <= time_window_hours
             - Overall cluster time span (t_max - t_min) <= time_window_hours.
    """
    n = len(combined)
    if n == 0:
        return []

    if use_footprint:
        max_fp = max(r.get("footprint_radius_km", 0.5) for r in combined)
        upper_eps_km = min(max(spatial_eps_km, max_fp + 0.4), max(spatial_eps_km * 2.2, 2.75))
    else:
        upper_eps_km = spatial_eps_km

    # Spatial hash grid (~0.025 deg is ~2.75 km)
    cell_deg = max(0.015, upper_eps_km / 105.0)
    grid: Dict[Tuple[int, int], List[int]] = {}
    for idx, r in enumerate(combined):
        gx = int(math.floor(r["longitude"] / cell_deg))
        gy = int(math.floor(r["latitude"] / cell_deg))
        grid.setdefault((gx, gy), []).append(idx)

    # Find coarse spatial connected components first
    coarse_visited = [False] * n
    coarse_groups: List[List[int]] = []

    for i in range(n):
        if coarse_visited[i]:
            continue
        coarse_visited[i] = True
        comp = [i]
        queue = [i]
        while queue:
            curr = queue.pop(0)
            c_lat = combined[curr]["latitude"]
            c_lon = combined[curr]["longitude"]
            gx = int(math.floor(c_lon / cell_deg))
            gy = int(math.floor(c_lat / cell_deg))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for nb in grid.get((gx + dx, gy + dy), ()):
                        if coarse_visited[nb]:
                            continue
                        if haversine_km(c_lat, c_lon, combined[nb]["latitude"], combined[nb]["longitude"]) <= upper_eps_km:
                            coarse_visited[nb] = True
                            comp.append(nb)
                            queue.append(nb)
        coarse_groups.append(comp)

    final_cluster_ids = [-1] * n
    next_cid = 0

    for idxs in coarse_groups:
        if len(idxs) == 1:
            final_cluster_ids[idxs[0]] = next_cid
            next_cid += 1
            continue

        # Sort candidate group chronologically, breaking ties by latitude/longitude for determinism
        idxs_sorted = sorted(
            idxs,
            key=lambda k: (combined[k]["_ts_hours"], combined[k]["latitude"], combined[k]["longitude"]),
        )
        m = len(idxs_sorted)

        # Precompute anisotropic spatial adjacency & geodesic distance for this candidate group
        spatial_neighbors: List[List[Tuple[float, int]]] = [[] for _ in range(m)]
        for a in range(m):
            ra = combined[idxs_sorted[a]]
            for b in range(a + 1, m):
                rb = combined[idxs_sorted[b]]
                matched, d_km = elliptical_footprint_match(
                    ra["latitude"],
                    ra["longitude"],
                    ra.get("scan", 1.0),
                    ra.get("track", 1.0),
                    rb["latitude"],
                    rb["longitude"],
                    rb.get("scan", 1.0),
                    rb.get("track", 1.0),
                    base_eps_km=spatial_eps_km,
                    upper_eps_km=upper_eps_km,
                    use_footprint=use_footprint,
                )
                if matched:
                    spatial_neighbors[a].append((d_km, b))
                    spatial_neighbors[b].append((d_km, a))

        # Sort each point's neighbors by closest geodesic distance first
        for a in range(m):
            spatial_neighbors[a].sort(key=lambda pair: pair[0])

        visited = [False] * m
        for start_i in range(m):
            if visited[start_i]:
                continue
            visited[start_i] = True
            comp = [start_i]
            queue = [start_i]
            t_min = combined[idxs_sorted[start_i]]["_ts_hours"]
            t_max = t_min

            while queue:
                curr = queue.pop(0)
                t_curr = combined[idxs_sorted[curr]]["_ts_hours"]
                for _, nb in spatial_neighbors[curr]:
                    if visited[nb]:
                        continue
                    t_nb = combined[idxs_sorted[nb]]["_ts_hours"]
                    if abs(t_nb - t_curr) <= time_window_hours:
                        new_tmin = min(t_min, t_nb)
                        new_tmax = max(t_max, t_nb)
                        if (new_tmax - new_tmin) <= time_window_hours:
                            visited[nb] = True
                            t_min, t_max = new_tmin, new_tmax
                            comp.append(nb)
                            queue.append(nb)

            for member_i in comp:
                final_cluster_ids[idxs_sorted[member_i]] = next_cid
            next_cid += 1

    return final_cluster_ids
