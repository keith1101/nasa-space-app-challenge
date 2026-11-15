"""
Zero-Dependency Fallback HTTP Server Handler.
Executes using standard library `http.server.BaseHTTPRequestHandler`
when FastAPI/Uvicorn are not installed.
"""

import json
import math
import mimetypes
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, parse_qs

from backend.services.cache_service import cache_manager


def safe_query_float(raw: str, default: float, lo: float, hi: float) -> float:
    """Safely parses a query string float with bounds clamping."""
    try:
        val = float(raw)
        if not math.isfinite(val):
            return default
    except (ValueError, TypeError):
        return default
    return max(lo, min(hi, val))


class FallbackHTTPHandler(BaseHTTPRequestHandler):
    """Zero-dependency HTTP handler when FastAPI/Uvicorn are not installed."""

    data_dir: Path
    dist_dir: Path
    compute_live_func: Any
    load_json_func: Any
    compute_trajectories_func: Any = None
    compute_llm_analysis_func: Any = None
    compute_vegetation_func: Any = None
    predict_grid_func: Any = None
    compute_airbase_func: Any = None
    compute_mission_route_func: Any = None

    def _send_json(self, payload: Any, status: int = 200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path == "/api/data-status":
            cache_manager.ensure_raw_cache()
            status_meta = cache_manager.live_client.status()
            stamp = cache_manager.get_cached_records().get("stamp", "local")
            self._send_json({**status_meta, "mode": "live" if stamp != "local" else "local"})
            return

        if path == "/api/metrics":
            try:
                self._send_json(self.load_json_func("analytics_summary.json"))
            except FileNotFoundError as e:
                self._send_json({"detail": str(e)}, status=404)
            return

        if path == "/api/calendar":
            try:
                data = self.load_json_func("calendar_matrix.json")
                prov = qs.get("province", [None])[0]
                if prov:
                    clean_p = prov.strip()
                    if clean_p in data:
                        self._send_json(data[clean_p])
                    else:
                        self._send_json({"detail": f"Region '{prov}' not found."}, status=404)
                else:
                    self._send_json(data)
            except FileNotFoundError as e:
                self._send_json({"detail": str(e)}, status=404)
            return

        if path == "/api/provinces":
            try:
                data = self.load_json_func("calendar_matrix.json")
                self._send_json(
                    [
                        {
                            "name": k,
                            "scope": v.get("scope", "vietnam_province"),
                            "peak_season": v.get("peak_season", ""),
                            "observed_7d_harmonized": v.get("observed_7d_harmonized", 0),
                        }
                        for k, v in data.items()
                    ]
                )
            except FileNotFoundError as e:
                self._send_json({"detail": str(e)}, status=404)
            return

        if path == "/api/harmonize":
            eps_km = safe_query_float(qs.get("eps_km", ["1.25"])[0], 1.25, 0.25, 5.0)
            time_window_hours = safe_query_float(qs.get("time_window_hours", ["3.0"])[0], 3.0, 0.5, 24.0)
            use_footprint = qs.get("use_footprint", ["true"])[0].lower() not in ("false", "0")
            vietnam_only = qs.get("vietnam_only", ["false"])[0].lower() in ("true", "1")
            date_filter = qs.get("date_filter", ["all"])[0]
            daynight = qs.get("daynight", ["all"])[0]
            res = self.compute_live_func(
                eps_km=eps_km,
                time_window_hours=time_window_hours,
                use_footprint=use_footprint,
                vietnam_only=vietnam_only,
                date_filter=date_filter,
                daynight=daynight,
            )
            self._send_json(res)
            return

        if path == "/api/fire-trajectories":
            if not self.compute_trajectories_func:
                self._send_json({"detail": "Trajectory tracking not configured"}, status=501)
                return
            max_time_gap = safe_query_float(qs.get("max_time_gap_hours", ["36.0"])[0], 36.0, 1.0, 168.0)
            base_eps = safe_query_float(qs.get("base_spatial_eps_km", ["1.5"])[0], 1.5, 0.5, 10.0)
            max_vel = safe_query_float(qs.get("max_spread_velocity_kmh", ["3.5"])[0], 3.5, 0.5, 10.0)
            vn_only = qs.get("vietnam_only", ["false"])[0].lower() in ("true", "1")
            enrich = qs.get("enrich_weather", ["true"])[0].lower() not in ("false", "0")
            res = self.compute_trajectories_func(
                max_time_gap_hours=max_time_gap,
                base_spatial_eps_km=base_eps,
                max_spread_velocity_kmh=max_vel,
                vietnam_only=vn_only,
                enrich_weather=enrich,
            )
            self._send_json(res)
            return

        if path == "/api/fire-analysis":
            if not self.compute_llm_analysis_func:
                self._send_json({"detail": "LLM analysis not configured"}, status=501)
                return
            event_id = qs.get("event_id", [None])[0]
            provider = qs.get("provider", [None])[0]
            try:
                res = self.compute_llm_analysis_func(event_id=event_id, provider=provider)
                self._send_json(res)
            except ValueError as err:
                self._send_json({"detail": str(err)}, status=404)
            except Exception as err:
                self._send_json({"detail": str(err)}, status=500)
            return

        if path == "/api/vegetation-fires":
            if not self.compute_vegetation_func:
                self._send_json({"detail": "Vegetation service not configured"}, status=501)
                return
            try:
                self._send_json(self.compute_vegetation_func())
            except Exception as err:
                self._send_json({"detail": str(err)}, status=503)
            return

        if path == "/api/live-experimental-grid":
            if not self.predict_grid_func:
                self._send_json({"detail": "Grid risk service not configured"}, status=501)
                return
            try:
                lat = float(qs.get("latitude", [""])[0])
                lon = float(qs.get("longitude", [""])[0])
                self._send_json(self.predict_grid_func(lat, lon))
            except ValueError as err:
                self._send_json({"detail": str(err)}, status=400)
            except Exception as err:
                self._send_json({"detail": str(err)}, status=503)
            return

        if path == "/api/flight/airbases/nearest":
            if not self.compute_airbase_func:
                self._send_json({"detail": "Airbase service not configured"}, status=501)
                return
            try:
                lat_str = qs.get("latitude", [None])[0] or qs.get("lat", [None])[0]
                lon_str = qs.get("longitude", [None])[0] or qs.get("lon", [None])[0]
                if not lat_str or not lon_str:
                    self._send_json({"detail": "latitude and longitude required"}, status=400)
                    return
                lat = float(lat_str)
                lon = float(lon_str)
                min_runway = safe_query_float(qs.get("min_runway", ["1200.0"])[0], 1200.0, 500.0, 5000.0)
                max_dist = safe_query_float(qs.get("max_distance_km", ["500.0"])[0], 500.0, 10.0, 2000.0)
                fire_capable_only = qs.get("fire_capable_only", ["false"])[0].lower() in ("true", "1", "yes")
                self._send_json(self.compute_airbase_func(lat, lon, min_runway, max_dist, fire_capable_only=fire_capable_only))
            except Exception as err:
                self._send_json({"detail": str(err)}, status=500)
            return

        if path == "/api/flight/mission-route":
            if not self.compute_mission_route_func:
                self._send_json({"detail": "Mission routing service not configured"}, status=501)
                return
            try:
                o_lat = float(qs.get("origin_lat", [""])[0])
                o_lon = float(qs.get("origin_lon", [""])[0])
                t_lat = float(qs.get("target_lat", [""])[0])
                t_lon = float(qs.get("target_lon", [""])[0])
                cruise_alt = safe_query_float(qs.get("cruise_alt_m", ["2500.0"])[0], 2500.0, 300.0, 10000.0)
                origin_icao = qs.get("origin_icao", [None])[0]
                o_elev_raw = qs.get("origin_elev_m", [None])[0]
                t_elev_raw = qs.get("target_elev_m", [None])[0]
                origin_elev = float(o_elev_raw) if o_elev_raw is not None and o_elev_raw != "" else None
                target_elev = float(t_elev_raw) if t_elev_raw is not None and t_elev_raw != "" else None
                self._send_json(self.compute_mission_route_func(
                    o_lat, o_lon, t_lat, t_lon, cruise_alt, origin_icao, origin_elev, target_elev
                ))
            except Exception as err:
                self._send_json({"detail": str(err)}, status=400)
            return

        # Serve static files from frontend/public/data or frontend/dist with path-traversal protection
        rel_path = path.lstrip("/")
        if rel_path.startswith("data/"):
            data_root = self.data_dir.resolve()
            data_file = (self.data_dir / rel_path[len("data/") :]).resolve()
            if not data_file.is_relative_to(data_root):
                self._send_json({"detail": "Forbidden"}, status=403)
                return
            if data_file.exists() and data_file.is_file():
                body = data_file.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(body)
                return

        if self.dist_dir.exists():
            dist_root = self.dist_dir.resolve()
            candidate = (self.dist_dir / (rel_path if rel_path else "index.html")).resolve()
            if not candidate.is_relative_to(dist_root):
                self._send_json({"detail": "Forbidden"}, status=403)
                return
            target = candidate if (candidate.exists() and candidate.is_file()) else (self.dist_dir / "index.html")
            if target.exists() and target.is_file():
                ctype, _ = mimetypes.guess_type(str(target))
                if target.suffix == ".geojson" or target.suffix == ".json":
                    ctype = "application/json; charset=utf-8"
                elif target.suffix == ".js":
                    ctype = "application/javascript; charset=utf-8"
                elif target.suffix == ".css":
                    ctype = "text/css; charset=utf-8"
                body = target.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", ctype or "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(body)
                return

        self._send_json({"detail": "Not found"}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path == "/api/fire-analysis":
            if not self.compute_llm_analysis_func:
                self._send_json({"detail": "LLM analysis not configured"}, status=501)
                return
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                post_body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
                payload = json.loads(post_body)
            except Exception:
                payload = {}

            provider = qs.get("provider", [None])[0] or payload.get("provider")
            event_id = payload.get("event_id") or qs.get("event_id", [None])[0]
            custom_telemetry = payload.get("telemetry") or (payload if "kinematics" in payload else None)

            try:
                res = self.compute_llm_analysis_func(
                    event_id=event_id,
                    custom_telemetry=custom_telemetry,
                    provider=provider,
                )
                self._send_json(res)
            except ValueError as err:
                self._send_json({"detail": str(err)}, status=404)
            except Exception as err:
                self._send_json({"detail": str(err)}, status=500)
            return

        if path == "/api/vegetation-fires":
            if not self.compute_vegetation_func:
                self._send_json({"detail": "Vegetation service not configured"}, status=501)
                return
            try:
                self._send_json(self.compute_vegetation_func())
            except Exception as err:
                self._send_json({"detail": str(err)}, status=503)
            return

        if path == "/api/live-experimental-grid":
            if not self.predict_grid_func:
                self._send_json({"detail": "Grid risk service not configured"}, status=501)
                return
            try:
                lat = float(qs.get("latitude", [""])[0])
                lon = float(qs.get("longitude", [""])[0])
                self._send_json(self.predict_grid_func(lat, lon))
            except ValueError as err:
                self._send_json({"detail": str(err)}, status=400)
            except Exception as err:
                self._send_json({"detail": str(err)}, status=503)
            return

        if path == "/api/flight/airbases/nearest":
            if not self.compute_airbase_func:
                self._send_json({"detail": "Airbase service not configured"}, status=501)
                return
            try:
                lat_str = qs.get("latitude", [None])[0] or qs.get("lat", [None])[0]
                lon_str = qs.get("longitude", [None])[0] or qs.get("lon", [None])[0]
                if not lat_str or not lon_str:
                    self._send_json({"detail": "latitude and longitude required"}, status=400)
                    return
                lat = float(lat_str)
                lon = float(lon_str)
                min_runway = safe_query_float(qs.get("min_runway", ["1200.0"])[0], 1200.0, 500.0, 5000.0)
                max_dist = safe_query_float(qs.get("max_distance_km", ["500.0"])[0], 500.0, 10.0, 2000.0)
                fire_capable_only = qs.get("fire_capable_only", ["false"])[0].lower() in ("true", "1", "yes")
                self._send_json(self.compute_airbase_func(lat, lon, min_runway, max_dist, fire_capable_only=fire_capable_only))
            except Exception as err:
                self._send_json({"detail": str(err)}, status=500)
            return

        if path == "/api/flight/mission-route":
            if not self.compute_mission_route_func:
                self._send_json({"detail": "Mission routing service not configured"}, status=501)
                return
            try:
                o_lat = float(qs.get("origin_lat", [""])[0])
                o_lon = float(qs.get("origin_lon", [""])[0])
                t_lat = float(qs.get("target_lat", [""])[0])
                t_lon = float(qs.get("target_lon", [""])[0])
                cruise_alt = safe_query_float(qs.get("cruise_alt_m", ["2500.0"])[0], 2500.0, 300.0, 10000.0)
                origin_icao = qs.get("origin_icao", [None])[0]
                o_elev_raw = qs.get("origin_elev_m", [None])[0]
                t_elev_raw = qs.get("target_elev_m", [None])[0]
                origin_elev = float(o_elev_raw) if o_elev_raw is not None and o_elev_raw != "" else None
                target_elev = float(t_elev_raw) if t_elev_raw is not None and t_elev_raw != "" else None
                self._send_json(self.compute_mission_route_func(
                    o_lat, o_lon, t_lat, t_lon, cruise_alt, origin_icao, origin_elev, target_elev
                ))
            except Exception as err:
                self._send_json({"detail": str(err)}, status=400)
            return

        self._send_json({"detail": "Not found"}, status=404)
