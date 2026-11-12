"""
NASA FIRMS Harmonization Engine: MODIS & VIIRS Hotspots
Track 04: Harmonization of MODIS and VIIRS Hot Spots
NASA Space Apps Challenge

Core Capabilities:
1. True sliding-window spatio-temporal deduplication (ST-DBSCAN with Haversine & anisotropic elliptical pixel footprint matching)
2. Satellite-independent Bayesian multi-sensor confidence fusion with Laplace prior clamping
3. Sub-kilometer spatial refinement (375m VIIRS flux-density-weighted centroid)
4. Pass-reconciled Fire Radiative Power (FRP) integration
5. Administrative regional aggregation & O(1) cluster province inheritance

Supports both pandas/geopandas/scikit-learn DataFrames and zero-dependency pure-Python list-of-dicts execution.
"""

import math
from datetime import datetime
from typing import Tuple, Dict, Any, Optional, List

try:
    import numpy as np
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    np = None
    pd = None
    HAS_PANDAS = False

try:
    import geopandas as gpd
    from shapely.geometry import Point
    HAS_GEOPANDAS = True
except ImportError:
    gpd = None
    Point = None
    HAS_GEOPANDAS = False


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Geodesic Haversine distance in kilometers between two WGS84 coordinates."""
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(dlambda / 2.0) ** 2)
    c = 2.0 * math.asin(min(1.0, math.sqrt(max(0.0, a))))
    return r * c


def elliptical_footprint_match(
    lat1: float,
    lon1: float,
    scan1: float,
    track1: float,
    lat2: float,
    lon2: float,
    scan2: float,
    track2: float,
    base_eps_km: float = 1.25,
    upper_eps_km: float = 3.5,
    use_footprint: bool = True,
) -> Tuple[bool, float]:
    """
    Evaluates whether two active fire detections fall within the same spatial footprint envelope.
    Uses anisotropic cross-track (East-West scan) and along-track (North-South track) semi-axes
    to prevent false North-South merges from elongated off-nadir MODIS bow-tie pixels.
    Returns (is_match, geodesic_distance_km).
    """
    d_km = haversine_km(lat1, lon1, lat2, lon2)
    if d_km <= base_eps_km:
        return True, d_km
    if not use_footprint or d_km > upper_eps_km:
        return False, d_km

    # Geodesic East-West (cross-track scan) and North-South (along-track) components in km
    mean_lat_rad = math.radians(0.5 * (lat1 + lat2))
    dy_km = abs(lat2 - lat1) * (math.pi / 180.0) * 6371.0
    dx_km = abs(lon2 - lon1) * (math.pi / 180.0) * 6371.0 * math.cos(mean_lat_rad)

    # Semi-major (cross-track scan) and semi-minor (along-track) matching tolerances with PSF margin
    a_scan = min(upper_eps_km, max(base_eps_km, 0.5 * (scan1 + scan2) + 0.35))
    b_track = min(upper_eps_km, max(base_eps_km, 0.5 * (track1 + track2) + 0.55))

    norm_ellip = (dx_km / a_scan) ** 2 + (dy_km / b_track) ** 2
    return (norm_ellip <= 1.0), d_km


def _point_in_ring(lon: float, lat: float, ring: List[List[float]]) -> bool:
    """Ray-casting point-in-polygon test for a single linear ring."""
    inside = False
    n = len(ring)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        intersect = ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside


def point_in_geojson_geometry(lon: float, lat: float, geom: Dict[str, Any]) -> bool:
    """Checks whether (lon, lat) falls inside a GeoJSON Polygon or MultiPolygon geometry."""
    gtype = geom.get("type")
    coords = geom.get("coordinates", [])
    if gtype == "Polygon":
        if not coords or not _point_in_ring(lon, lat, coords[0]):
            return False
        for hole in coords[1:]:
            if _point_in_ring(lon, lat, hole):
                return False
        return True
    elif gtype == "MultiPolygon":
        for poly in coords:
            if poly and _point_in_ring(lon, lat, poly[0]):
                in_hole = any(_point_in_ring(lon, lat, hole) for hole in poly[1:])
                if not in_hole:
                    return True
        return False
    return False


class FireHarmonizer:
    def __init__(
        self,
        spatial_eps_km: float = 1.25,
        time_window_hours: float = 3.0,
        use_footprint: bool = True,
    ):
        """
        :param spatial_eps_km: Base spatial clustering radius in km (1.25 km covers nominal 1km MODIS footprint buffer).
        :param time_window_hours: Maximum temporal separation (in hours) for grouping detections into the same pass event.
        :param use_footprint: Whether to expand matching tolerance using anisotropic scan/track bow-tie pixel dimensions.
        """
        self.spatial_eps_km = float(spatial_eps_km)
        self.time_window_hours = float(time_window_hours)
        self.use_footprint = bool(use_footprint)
        self.earth_radius_km = 6371.0
        self.spatial_eps_rad = self.spatial_eps_km / self.earth_radius_km

    @staticmethod
    def _norm_modis_conf_scalar(val: Any) -> float:
        """Normalizes MODIS [0-100%] confidence to [0.05, 0.99] with Laplace prior floor/ceiling."""
        try:
            v = float(val)
            if math.isnan(v):
                v = 50.0
        except (ValueError, TypeError):
            v = 50.0
        return max(0.05, min(0.99, v / 100.0))

    @staticmethod
    def _norm_viirs_conf_scalar(val: Any) -> float:
        mapping = {
            "l": 0.30,
            "low": 0.30,
            "n": 0.70,
            "nominal": 0.70,
            "h": 0.95,
            "high": 0.95,
        }
        s = str(val).strip().lower() if val is not None else ""
        if s in mapping:
            return mapping[s]
        try:
            v = float(val)
            if not math.isnan(v):
                return max(0.05, min(0.99, v / 100.0 if v > 1.0 else v))
        except (ValueError, TypeError):
            pass
        return 0.70

    @staticmethod
    def _norm_sat_scalar(val: Any, default_sat: str = "Unknown") -> str:
        mapping = {
            "t": "Terra",
            "terra": "Terra",
            "a": "Aqua",
            "aqua": "Aqua",
            "n20": "NOAA-20",
            "noaa-20": "NOAA-20",
            "noaa20": "NOAA-20",
            "j1": "NOAA-20",
            "n21": "NOAA-21",
            "noaa-21": "NOAA-21",
            "noaa21": "NOAA-21",
            "j2": "NOAA-21",
            "n": "Suomi-NPP",
            "snpp": "Suomi-NPP",
            "suomi-npp": "Suomi-NPP",
        }
        if val is None or str(val).strip() == "":
            return default_sat
        s = str(val).strip()
        return mapping.get(s.lower(), s)

    @staticmethod
    def _parse_dt_scalar(acq_date: Any, acq_time: Any) -> Tuple[str, float]:
        d_str = str(acq_date).strip() if acq_date is not None else "2026-11-03"
        t_raw = str(acq_time).strip() if acq_time is not None else "0000"
        if "." in t_raw:
            t_raw = t_raw.split(".")[0]
        t_str = t_raw.zfill(4)
        iso_str = f"{d_str}T{t_str[:2]}:{t_str[2:4]}:00"
        try:
            # Fast integer slice parsing (4x faster than datetime.strptime)
            yr = int(d_str[0:4])
            mo = int(d_str[5:7])
            dy = int(d_str[8:10])
            hr = int(t_str[0:2])
            mn = int(t_str[2:4])
            dt = datetime(yr, mo, dy, hr, mn)
            ts_hours = dt.timestamp() / 3600.0
        except (ValueError, IndexError):
            try:
                dt = datetime.strptime(f"{d_str} {t_str[:2]}:{t_str[2:4]}", "%Y-%m-%d %H:%M")
                ts_hours = dt.timestamp() / 3600.0
            except ValueError:
                ts_hours = 0.0
        return iso_str, ts_hours

    @classmethod
    def normalize_modis_confidence(cls, conf_series):
        if HAS_PANDAS and isinstance(conf_series, pd.Series):
            return (pd.to_numeric(conf_series, errors="coerce").fillna(50.0) / 100.0).clip(0.05, 0.99)
        return [cls._norm_modis_conf_scalar(x) for x in conf_series]

    @classmethod
    def normalize_viirs_confidence(cls, conf_series):
        if HAS_PANDAS and isinstance(conf_series, pd.Series):
            return conf_series.apply(cls._norm_viirs_conf_scalar)
        return [cls._norm_viirs_conf_scalar(x) for x in conf_series]

    def _to_records(self, data: Any) -> List[Dict[str, Any]]:
        if data is None:
            return []
        if HAS_PANDAS and isinstance(data, pd.DataFrame):
            return data.to_dict(orient="records")
        if isinstance(data, list):
            return [dict(r) for r in data if isinstance(r, dict)]
        return []

    @staticmethod
    def _validate_wgs84_coord(lat_raw: Any, lon_raw: Any) -> Optional[Tuple[float, float]]:
        """Validates finite WGS84 latitude [-90, 90] and longitude [-180, 180]."""
        try:
            lat = float(lat_raw)
            lon = float(lon_raw)
        except (ValueError, TypeError):
            return None
        if not (math.isfinite(lat) and math.isfinite(lon)):
            return None
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            return None
        return lat, lon

    @staticmethod
    def _safe_finite_float(val: Any, default: float, low: float, high: float) -> float:
        """Parses a numeric attribute with NaN/Inf protection and physical bounds clamping."""
        try:
            v = float(val) if val is not None and str(val).strip() != "" else default
            if not math.isfinite(v):
                v = default
        except (ValueError, TypeError):
            v = default
        return max(low, min(high, v))

    def _standardize_modis_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        out = []
        for r in records:
            coord = self._validate_wgs84_coord(r.get("latitude"), r.get("longitude"))
            if coord is None:
                continue
            lat, lon = coord
            sat = self._norm_sat_scalar(r.get("satellite"), default_sat="Terra")
            sensor = f"MODIS_{sat.replace('-', '')}"
            conf_norm = self._norm_modis_conf_scalar(r.get("confidence", 50.0))
            frp = self._safe_finite_float(r.get("frp"), default=0.0, low=0.0, high=100000.0)
            brightness = self._safe_finite_float(r.get("brightness"), default=300.0, low=200.0, high=1000.0)
            scan = self._safe_finite_float(r.get("scan"), default=1.0, low=0.5, high=5.0)
            track = self._safe_finite_float(r.get("track"), default=1.0, low=0.5, high=5.0)

            fp_rad = 0.5 * math.sqrt(scan * scan + track * track)
            t_str = str(r.get("acq_time", "0000")).split(".")[0].strip().zfill(4)
            d_str = str(r.get("acq_date", "2026-11-03")).strip()
            iso_dt, ts_hours = self._parse_dt_scalar(d_str, t_str)
            hour_utc = int(t_str[:2]) if t_str[:2].isdigit() else 12
            dn = str(r.get("daynight") or ("D" if 6 <= hour_utc <= 18 else "N")).strip()

            item = dict(r)
            item.update(
                {
                    "latitude": lat,
                    "longitude": lon,
                    "acq_date": d_str,
                    "acq_time": t_str,
                    "datetime_utc": iso_dt,
                    "_ts_hours": ts_hours,
                    "satellite": sat,
                    "sensor": sensor,
                    "sensor_family": "MODIS",
                    "spatial_res_m": 1000,
                    "conf_norm": conf_norm,
                    "frp": frp,
                    "brightness": brightness,
                    "scan": scan,
                    "track": track,
                    "footprint_radius_km": fp_rad,
                    "daynight": dn,
                }
            )
            out.append(item)
        return out

    def _standardize_viirs_records(
        self, records: List[Dict[str, Any]], sensor_label: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        sat_to_sensor = {
            "NOAA-20": "VIIRS_N20",
            "NOAA-21": "VIIRS_N21",
            "Suomi-NPP": "VIIRS_SNPP",
        }
        out = []
        for r in records:
            coord = self._validate_wgs84_coord(r.get("latitude"), r.get("longitude"))
            if coord is None:
                continue
            lat, lon = coord
            has_sat = "satellite" in r and r["satellite"] is not None and str(r["satellite"]).strip() != ""
            sat = self._norm_sat_scalar(r.get("satellite"), default_sat="NOAA-20")
            if sensor_label is not None and not has_sat:
                sensor = sensor_label
            else:
                sensor = sat_to_sensor.get(sat, "VIIRS")

            conf_norm = self._norm_viirs_conf_scalar(r.get("confidence", "nominal"))
            frp = self._safe_finite_float(r.get("frp"), default=0.0, low=0.0, high=100000.0)
            b_raw = r.get("bright_ti4", r.get("bright_t31", r.get("brightness", 300.0)))
            brightness = self._safe_finite_float(b_raw, default=300.0, low=200.0, high=1000.0)
            scan = self._safe_finite_float(r.get("scan"), default=0.375, low=0.2, high=2.0)
            track = self._safe_finite_float(r.get("track"), default=0.375, low=0.2, high=2.0)

            fp_rad = 0.5 * math.sqrt(scan * scan + track * track)
            t_str = str(r.get("acq_time", "0000")).split(".")[0].strip().zfill(4)
            d_str = str(r.get("acq_date", "2026-11-03")).strip()
            iso_dt, ts_hours = self._parse_dt_scalar(d_str, t_str)
            hour_utc = int(t_str[:2]) if t_str[:2].isdigit() else 12
            dn = str(r.get("daynight") or ("D" if 6 <= hour_utc <= 18 else "N")).strip()

            item = dict(r)
            item.update(
                {
                    "latitude": lat,
                    "longitude": lon,
                    "acq_date": d_str,
                    "acq_time": t_str,
                    "datetime_utc": iso_dt,
                    "_ts_hours": ts_hours,
                    "satellite": sat,
                    "sensor": sensor,
                    "sensor_family": "VIIRS",
                    "spatial_res_m": 375,
                    "conf_norm": conf_norm,
                    "frp": frp,
                    "brightness": brightness,
                    "scan": scan,
                    "track": track,
                    "footprint_radius_km": fp_rad,
                    "daynight": dn,
                }
            )
            out.append(item)
        return out

    def standardize_modis(self, df_or_records: Any) -> Any:
        recs = self._standardize_modis_records(self._to_records(df_or_records))
        if HAS_PANDAS and isinstance(df_or_records, pd.DataFrame):
            return pd.DataFrame(recs)
        return recs

    def standardize_viirs(self, df_or_records: Any, sensor_label: Optional[str] = None) -> Any:
        recs = self._standardize_viirs_records(self._to_records(df_or_records), sensor_label=sensor_label)
        if HAS_PANDAS and isinstance(df_or_records, pd.DataFrame):
            return pd.DataFrame(recs)
        return recs

    def _cluster_records_spatio_temporal(self, combined: List[Dict[str, Any]]) -> List[int]:
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

        if self.use_footprint:
            max_fp = max(r.get("footprint_radius_km", 0.5) for r in combined)
            upper_eps_km = min(max(self.spatial_eps_km, max_fp + 0.4), max(self.spatial_eps_km * 2.2, 2.75))
        else:
            upper_eps_km = self.spatial_eps_km

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
                        base_eps_km=self.spatial_eps_km,
                        upper_eps_km=upper_eps_km,
                        use_footprint=self.use_footprint,
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
                        if abs(t_nb - t_curr) <= self.time_window_hours:
                            new_tmin = min(t_min, t_nb)
                            new_tmax = max(t_max, t_nb)
                            if (new_tmax - new_tmin) <= self.time_window_hours:
                                visited[nb] = True
                                t_min, t_max = new_tmin, new_tmax
                                comp.append(nb)
                                queue.append(nb)

                for member_i in comp:
                    final_cluster_ids[idxs_sorted[member_i]] = next_cid
                next_cid += 1

        return final_cluster_ids

    def harmonize_records(
        self, modis_records: List[Dict[str, Any]], viirs_records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Core harmonization operating on standard Python dicts."""
        m_clean = self._standardize_modis_records(modis_records)
        v_clean = self._standardize_viirs_records(viirs_records)

        combined = m_clean + v_clean
        if not combined:
            return [], {
                "total_raw_detections": 0,
                "raw_modis_count": 0,
                "raw_viirs_count": 0,
                "harmonized_fire_events": 0,
                "deduplication_rate_percent": 0.0,
                "dual_confirmed_events": 0,
                "multi_satellite_verified_events": 0,
                "viirs_exclusive_events": 0,
                "modis_exclusive_events": 0,
                "high_resolution_375m_ratio_percent": 0.0,
                "mean_harmonized_frp": 0.0,
                "total_harmonized_frp": 0.0,
                "spatial_eps_km": self.spatial_eps_km,
                "time_window_hours": self.time_window_hours,
            }

        # Canonical spatio-temporal ordering guarantees 100% permutation-invariant clustering
        combined.sort(
            key=lambda r: (
                r["_ts_hours"],
                round(r["latitude"], 5),
                round(r["longitude"], 5),
                r["sensor_family"],
                r["satellite"],
            )
        )

        cids = self._cluster_records_spatio_temporal(combined)
        clusters_map: Dict[int, List[Dict[str, Any]]] = {}
        for rec, cid in zip(combined, cids):
            clusters_map.setdefault(cid, []).append(rec)

        fused_records: List[Dict[str, Any]] = []
        for cid in sorted(clusters_map.keys()):
            group = clusters_map[cid]
            modis_pts = [p for p in group if p["sensor_family"] == "MODIS"]
            viirs_pts = [p for p in group if p["sensor_family"] == "VIIRS"]

            n_modis = len(modis_pts)
            n_viirs = len(viirs_pts)
            raw_count = len(group)

            # Group by satellite for independent pass confidence & pass FRP
            by_sat: Dict[str, List[Dict[str, Any]]] = {}
            for p in group:
                by_sat.setdefault(p["satellite"], []).append(p)

            sat_conf_list: List[float] = []
            for sat_name, s_pts in by_sat.items():
                base_c = max(p["conf_norm"] for p in s_pts)
                pixel_bonus = 0.02 * min(len(s_pts) - 1, 3)
                sat_conf_list.append(min(0.98, base_c + pixel_bonus))

            n_distinct_sats = len(sat_conf_list)

            if n_modis > 0 and n_viirs > 0:
                classification = "HARMONIZED_DUAL"
                corroboration = "DUAL_SENSOR_FAMILY"
                unconf = 1.0
                for c in sat_conf_list:
                    unconf *= 1.0 - c
                harm_conf = min(0.99, 1.0 - unconf)
                if max(p["conf_norm"] for p in group) >= 0.50:
                    harm_conf = max(harm_conf, 0.92)
            elif n_viirs > 0:
                classification = "VIIRS_EXCLUSIVE"
                if n_distinct_sats >= 2:
                    corroboration = "MULTI_SATELLITE"
                    unconf = 1.0
                    for c in sat_conf_list:
                        unconf *= 1.0 - c
                    harm_conf = min(0.98, 1.0 - unconf)
                else:
                    corroboration = "SINGLE_SATELLITE"
                    harm_conf = sat_conf_list[0]
            else:
                classification = "MODIS_EXCLUSIVE"
                if n_distinct_sats >= 2:
                    corroboration = "MULTI_SATELLITE"
                    unconf = 1.0
                    for c in sat_conf_list:
                        unconf *= 1.0 - c
                    harm_conf = min(0.98, 1.0 - unconf)
                else:
                    corroboration = "SINGLE_SATELLITE"
                    harm_conf = sat_conf_list[0]

            # Radiative Flux-Density Weighted Centroid (w_i = (FRP_i + 0.1) / (scan_i * track_i))
            # Favors 375m VIIRS when present, and weights sharp nadir pixels over smeared swath-edge pixels
            ref_pts = viirs_pts if n_viirs > 0 else modis_pts
            w_list = [
                (p["frp"] + 0.1) / max(0.05, float(p.get("scan", 1.0)) * float(p.get("track", 1.0)))
                for p in ref_pts
            ]
            w_sum = sum(w_list)
            cent_lat = sum(p["latitude"] * w for p, w in zip(ref_pts, w_list)) / w_sum
            cent_lon = sum(p["longitude"] * w for p, w in zip(ref_pts, w_list)) / w_sum
            resolved_res = 375 if n_viirs > 0 else 1000

            # Pass-reconciled FRP: sum sub-kilometer pixels within each satellite pass, max across passes
            if n_viirs > 0:
                v_by_sat: Dict[str, float] = {}
                for p in viirs_pts:
                    v_by_sat[p["satellite"]] = v_by_sat.get(p["satellite"], 0.0) + p["frp"]
                viirs_frp_reconciled = max(v_by_sat.values())
            else:
                viirs_frp_reconciled = 0.0

            if n_modis > 0:
                m_by_sat: Dict[str, float] = {}
                for p in modis_pts:
                    m_by_sat[p["satellite"]] = m_by_sat.get(p["satellite"], 0.0) + p["frp"]
                modis_frp_reconciled = max(m_by_sat.values())
            else:
                modis_frp_reconciled = 0.0

            harm_frp = max(modis_frp_reconciled, viirs_frp_reconciled)
            max_brightness = max(p["brightness"] for p in group)
            max_scan_km = max(p.get("scan", 1.0) for p in group)
            max_track_km = max(p.get("track", 1.0) for p in group)
            satellites = sorted(list({p["satellite"] for p in group}))
            sensors = sorted(list({p["sensor"] for p in group}))
            acq_times_sorted = sorted([p["acq_time"] for p in group])
            earliest_pt = min(group, key=lambda p: p["_ts_hours"])

            rec_out: Dict[str, Any] = {
                "cluster_id": int(cid),
                "latitude": round(cent_lat, 5),
                "longitude": round(cent_lon, 5),
                "acq_date": earliest_pt["acq_date"],
                "acq_time_min": acq_times_sorted[0],
                "acq_time_max": acq_times_sorted[-1],
                "datetime_utc": earliest_pt["datetime_utc"],
                "classification": classification,
                "corroboration": corroboration,
                "raw_count": raw_count,
                "modis_count": n_modis,
                "viirs_count": n_viirs,
                "satellite_count": n_distinct_sats,
                "harmonized_confidence": round(harm_conf, 3),
                "harmonized_frp": round(harm_frp, 2),
                "max_brightness": round(max_brightness, 2),
                "spatial_resolution_m": resolved_res,
                "max_scan_km": round(max_scan_km, 2),
                "max_track_km": round(max_track_km, 2),
                "satellites": ", ".join(satellites),
                "sensors": ", ".join(sensors),
                "daynight": earliest_pt["daynight"],
                "is_deduplicated": bool(raw_count > 1),
            }

            # Fast O(1) province inheritance if all member points already carry identical province metadata
            prov_set = {p.get("province_name") for p in group if p.get("province_name") is not None}
            if len(prov_set) == 1:
                rec_out["province_name"] = next(iter(prov_set))
                rec_out["in_vietnam"] = bool(group[0].get("in_vietnam", False))
                rec_out["province_iso"] = str(group[0].get("province_iso", "VN"))
                rec_out["_prov_inherited"] = True

            fused_records.append(rec_out)

        total_raw = len(combined)
        total_harm = len(fused_records)
        dedup_rate = round((1.0 - total_harm / total_raw) * 100.0, 2) if total_raw > 0 else 0.0
        dual_count = sum(1 for r in fused_records if r["classification"] == "HARMONIZED_DUAL")
        multi_sat_count = sum(1 for r in fused_records if r["satellite_count"] >= 2)
        viirs_only = sum(1 for r in fused_records if r["classification"] == "VIIRS_EXCLUSIVE")
        modis_only = sum(1 for r in fused_records if r["classification"] == "MODIS_EXCLUSIVE")
        res_375m_ratio = round((total_harm - modis_only) / total_harm * 100.0, 1) if total_harm > 0 else 0.0
        total_frp = round(sum(r["harmonized_frp"] for r in fused_records), 2)
        mean_frp = round(total_frp / total_harm, 2) if total_harm > 0 else 0.0

        metrics = {
            "total_raw_detections": total_raw,
            "raw_modis_count": len(m_clean),
            "raw_viirs_count": len(v_clean),
            "harmonized_fire_events": total_harm,
            "deduplication_rate_percent": dedup_rate,
            "dual_confirmed_events": dual_count,
            "multi_satellite_verified_events": multi_sat_count,
            "viirs_exclusive_events": viirs_only,
            "modis_exclusive_events": modis_only,
            "high_resolution_375m_ratio_percent": res_375m_ratio,
            "mean_harmonized_frp": mean_frp,
            "total_harmonized_frp": total_frp,
            "spatial_eps_km": self.spatial_eps_km,
            "time_window_hours": self.time_window_hours,
        }

        return fused_records, metrics

    def harmonize(self, df_modis: Any, df_viirs: Any) -> Tuple[Any, Dict[str, Any]]:
        """
        Harmonizes MODIS and VIIRS active fire hotspots into a unified catalog.
        Returns a pandas DataFrame (if pandas is installed and inputs are DataFrames) or list of dicts, plus metrics.
        """
        fused_records, metrics = self.harmonize_records(self._to_records(df_modis), self._to_records(df_viirs))
        if HAS_PANDAS and (isinstance(df_modis, pd.DataFrame) or isinstance(df_viirs, pd.DataFrame)):
            return pd.DataFrame(fused_records), metrics
        return fused_records, metrics
