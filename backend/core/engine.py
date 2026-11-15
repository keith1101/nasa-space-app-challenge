"""
NASA FIRMS Active Fire Harmonization Engine.
Domain core implementing FireHarmonizer facade.
Combines standardization, anisotropic ST-DBSCAN clustering, and multi-sensor Bayesian fusion.
"""

from typing import Tuple, Dict, Any, Optional, List

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    pd = None
    HAS_PANDAS = False

from backend.core.geometry import haversine_km, elliptical_footprint_match, point_in_geojson_geometry
from backend.core.standardizer import (
    norm_modis_conf_scalar,
    norm_viirs_conf_scalar,
    norm_sat_scalar,
    parse_dt_scalar,
    validate_wgs84_coord,
    safe_finite_float,
    to_records,
    standardize_modis_records,
    standardize_viirs_records,
)
from backend.core.clustering import cluster_records_spatio_temporal
from backend.core.fusion import (
    compute_flux_density_centroid,
    reconcile_pass_frp,
    fuse_bayesian_confidence,
)


class FireHarmonizer:
    """
    Core Spatio-Temporal Active Fire Harmonizer.
    Orchestrates:
    - Anisotropic ST-DBSCAN with Bow-Tie scan/track footprint matching
    - Radiative Flux-Density Weighted Centroid Localization
    - Satellite-Independent Bayesian Confidence Fusion with Laplace Clamping
    - Pass-Reconciled FRP Calculation
    """

    def __init__(
        self,
        spatial_eps_km: float = 1.25,
        time_window_hours: float = 3.0,
        use_footprint: bool = True,
    ):
        self.spatial_eps_km = float(spatial_eps_km)
        self.time_window_hours = float(time_window_hours)
        self.use_footprint = bool(use_footprint)
        self.earth_radius_km = 6371.0
        self.spatial_eps_rad = self.spatial_eps_km / self.earth_radius_km

    # Static helpers preserved for full backward compatibility
    _norm_modis_conf_scalar = staticmethod(norm_modis_conf_scalar)
    _norm_viirs_conf_scalar = staticmethod(norm_viirs_conf_scalar)
    _norm_sat_scalar = staticmethod(norm_sat_scalar)
    _parse_dt_scalar = staticmethod(parse_dt_scalar)
    _validate_wgs84_coord = staticmethod(validate_wgs84_coord)
    _safe_finite_float = staticmethod(safe_finite_float)

    @classmethod
    def normalize_modis_confidence(cls, conf_series):
        if HAS_PANDAS and isinstance(conf_series, pd.Series):
            return (pd.to_numeric(conf_series, errors="coerce").fillna(50.0) / 100.0).clip(0.05, 0.99)
        return [norm_modis_conf_scalar(x) for x in conf_series]

    @classmethod
    def normalize_viirs_confidence(cls, conf_series):
        if HAS_PANDAS and isinstance(conf_series, pd.Series):
            return conf_series.apply(norm_viirs_conf_scalar)
        return [norm_viirs_conf_scalar(x) for x in conf_series]

    def _to_records(self, data: Any) -> List[Dict[str, Any]]:
        return to_records(data)

    def _standardize_modis_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return standardize_modis_records(records)

    def _standardize_viirs_records(
        self, records: List[Dict[str, Any]], sensor_label: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return standardize_viirs_records(records, sensor_label=sensor_label)

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
        return cluster_records_spatio_temporal(
            combined,
            spatial_eps_km=self.spatial_eps_km,
            time_window_hours=self.time_window_hours,
            use_footprint=self.use_footprint,
        )

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

            classification, corroboration, harm_conf, n_distinct_sats = fuse_bayesian_confidence(
                group, n_modis, n_viirs
            )

            cent_lat, cent_lon, resolved_res = compute_flux_density_centroid(viirs_pts, modis_pts)
            harm_frp = reconcile_pass_frp(viirs_pts, modis_pts)

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
        """Harmonizes MODIS and VIIRS active fire hotspots into a unified catalog."""
        fused_records, metrics = self.harmonize_records(self._to_records(df_modis), self._to_records(df_viirs))
        if HAS_PANDAS and (isinstance(df_modis, pd.DataFrame) or isinstance(df_viirs, pd.DataFrame)):
            return pd.DataFrame(fused_records), metrics
        return fused_records, metrics
