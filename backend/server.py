"""
Backend Server for NASA FIRMS Harmonization Platform
Serves real-time harmonization REST APIs (including live ST-DBSCAN parameter tuning)
and the Interactive React Frontend.
Supports FastAPI/Uvicorn when installed, with automatic fallback to Python's built-in
ThreadingHTTPServer when running in a zero-dependency standard-library environment.
"""

import json
import math
import mimetypes
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional, Dict, Any
from urllib.parse import urlparse, parse_qs

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.harmonizer import FireHarmonizer
from backend.build_dataset import load_data, assign_province

try:
    from fastapi import FastAPI, Query, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

DATA_DIR = ROOT_DIR / "frontend" / "public" / "data"
DIST_DIR = ROOT_DIR / "frontend" / "dist"

# Cached in-memory datasets for sub-100ms live harmonization
_CACHE: Dict[str, Any] = {
    "loaded": False,
    "modis_recs": None,
    "viirs_recs": None,
    "province_features": None,
}


def _ensure_raw_cache():
    if not _CACHE["loaded"]:
        vn_modis, vn_viirs, province_features = load_data()
        harmonizer = FireHarmonizer()
        m_std = assign_province(harmonizer._standardize_modis_records(vn_modis), province_features)
        v_std = assign_province(harmonizer._standardize_viirs_records(vn_viirs), province_features)
        _CACHE["modis_recs"] = m_std
        _CACHE["viirs_recs"] = v_std
        _CACHE["province_features"] = province_features
        _CACHE["loaded"] = True


def load_json_file(filename: str) -> Any:
    path = DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"File {filename} not found.")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def compute_live_harmonization(
    eps_km: float = 1.25,
    time_window_hours: float = 3.0,
    use_footprint: bool = True,
    vietnam_only: bool = False,
    date_filter: str = "all",
    daynight: str = "all",
) -> Dict[str, Any]:
    try:
        eps_val = float(eps_km)
        if not math.isfinite(eps_val):
            eps_val = 1.25
    except (ValueError, TypeError):
        eps_val = 1.25
    eps_val = max(0.25, min(10.0, eps_val))

    try:
        tw_val = float(time_window_hours)
        if not math.isfinite(tw_val):
            tw_val = 3.0
    except (ValueError, TypeError):
        tw_val = 3.0
    tw_val = max(0.5, min(48.0, tw_val))

    _ensure_raw_cache()
    recs_m = _CACHE["modis_recs"]
    recs_v = _CACHE["viirs_recs"]
    province_features = _CACHE["province_features"]

    if vietnam_only:
        recs_m = [r for r in recs_m if r.get("in_vietnam")]
        recs_v = [r for r in recs_v if r.get("in_vietnam")]

    if date_filter and date_filter != "all":
        recs_m = [r for r in recs_m if str(r.get("acq_date")) == date_filter]
        recs_v = [r for r in recs_v if str(r.get("acq_date")) == date_filter]

    if daynight and daynight in ("D", "N"):
        recs_m = [r for r in recs_m if str(r.get("daynight")) == daynight]
        recs_v = [r for r in recs_v if str(r.get("daynight")) == daynight]

    harmonizer = FireHarmonizer(
        spatial_eps_km=eps_val,
        time_window_hours=tw_val,
        use_footprint=bool(use_footprint),
    )
    harm_recs, metrics = harmonizer.harmonize_records(recs_m, recs_v)

    features_h = []
    if harm_recs:
        harm_with_prov = assign_province(harm_recs, province_features)
        for row in harm_with_prov:
            features_h.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [round(float(row["longitude"]), 5), round(float(row["latitude"]), 5)],
                    },
                    "properties": {
                        "cluster_id": int(row["cluster_id"]),
                        "classification": str(row["classification"]),
                        "corroboration": str(row.get("corroboration", "SINGLE_SATELLITE")),
                        "satellites": str(row["satellites"]),
                        "sensors": str(row["sensors"]),
                        "satellite_count": int(row.get("satellite_count", 1)),
                        "acq_date": str(row["acq_date"]),
                        "acq_time": f"{str(row['acq_time_min']).zfill(4)}-{str(row['acq_time_max']).zfill(4)}",
                        "daynight": str(row.get("daynight", "D")),
                        "harmonized_confidence": round(float(row["harmonized_confidence"]) * 100.0, 1),
                        "harmonized_frp": round(float(row["harmonized_frp"]), 1),
                        "max_brightness": round(float(row["max_brightness"]), 1),
                        "spatial_resolution_m": int(row["spatial_resolution_m"]),
                        "max_scan_km": round(float(row.get("max_scan_km", 1.0)), 2),
                        "max_track_km": round(float(row.get("max_track_km", 1.0)), 2),
                        "raw_count": int(row["raw_count"]),
                        "modis_count": int(row["modis_count"]),
                        "viirs_count": int(row["viirs_count"]),
                        "is_deduplicated": bool(row["is_deduplicated"]),
                        "province": str(row["province_name"]),
                        "in_vietnam": bool(row["in_vietnam"]),
                    },
                }
            )

    return {
        "metrics": metrics,
        "harmonized_geojson": {"type": "FeatureCollection", "features": features_h},
    }


if HAS_FASTAPI:
    app = FastAPI(
        title="NASA FIRMS Harmonization API",
        description="Real-Time Spatio-Temporal Harmonization of MODIS and VIIRS Active Fire Hotspots",
        version="2.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/metrics")
    def get_metrics():
        """Returns harmonization comparative metrics, daily breakdown, and key findings."""
        try:
            return load_json_file("analytics_summary.json")
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))

    @app.get("/api/calendar")
    def get_calendar(province: Optional[str] = Query(None, description="Province or macro-region name")):
        """Returns multi-year monthly calendar heatmap data."""
        try:
            data = load_json_file("calendar_matrix.json")
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        if province:
            clean_p = province.strip()
            if clean_p in data:
                return data[clean_p]
            raise HTTPException(status_code=404, detail=f"Region '{province}' not found.")
        return data

    @app.get("/api/provinces")
    def get_provinces():
        """Returns list of all regions and provinces with peak fire seasons."""
        try:
            data = load_json_file("calendar_matrix.json")
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        return [
            {
                "name": k,
                "scope": v.get("scope", "vietnam_province"),
                "peak_season": v.get("peak_season", ""),
                "observed_7d_harmonized": v.get("observed_7d_harmonized", 0),
            }
            for k, v in data.items()
        ]

    @app.get("/api/harmonize")
    def run_live_harmonization(
        eps_km: float = Query(1.25, ge=0.25, le=5.0, description="Spatial clustering radius in km"),
        time_window_hours: float = Query(3.0, ge=0.5, le=24.0, description="Temporal clustering window in hours"),
        use_footprint: bool = Query(True, description="Include MODIS/VIIRS scan & track bow-tie footprint matching"),
        vietnam_only: bool = Query(False, description="Filter strictly to Vietnam administrative boundaries"),
        date_filter: str = Query("all", description="Filter by acquisition date (YYYY-MM-DD) or 'all'"),
        daynight: str = Query("all", description="Filter by orbital pass ('D', 'N', or 'all')"),
    ):
        """Executes live Spatio-Temporal DBSCAN & Bayesian Confidence Fusion with custom parameters."""
        return compute_live_harmonization(
            eps_km=eps_km,
            time_window_hours=time_window_hours,
            use_footprint=use_footprint,
            vietnam_only=vietnam_only,
            date_filter=date_filter,
            daynight=daynight,
        )

    if DIST_DIR.exists():
        assets_dir = DIST_DIR / "assets"
        data_dir = DIST_DIR / "data"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
        if data_dir.exists():
            app.mount("/data", StaticFiles(directory=str(data_dir)), name="data")

        @app.get("/{full_path:path}")
        def serve_frontend(full_path: str):
            dist_root = DIST_DIR.resolve()
            file_path = (DIST_DIR / full_path).resolve()
            if file_path.is_relative_to(dist_root) and file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(DIST_DIR / "index.html"))


def _safe_query_float(raw: str, default: float, lo: float, hi: float) -> float:
    try:
        val = float(raw)
        if not math.isfinite(val):
            return default
    except (ValueError, TypeError):
        return default
    return max(lo, min(hi, val))


class FallbackHTTPHandler(BaseHTTPRequestHandler):
    """Zero-dependency HTTP handler when FastAPI/Uvicorn are not installed."""

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

        if path == "/api/metrics":
            try:
                self._send_json(load_json_file("analytics_summary.json"))
            except FileNotFoundError as e:
                self._send_json({"detail": str(e)}, status=404)
            return

        if path == "/api/calendar":
            try:
                data = load_json_file("calendar_matrix.json")
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
                data = load_json_file("calendar_matrix.json")
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
            eps_km = _safe_query_float(qs.get("eps_km", ["1.25"])[0], 1.25, 0.25, 5.0)
            time_window_hours = _safe_query_float(qs.get("time_window_hours", ["3.0"])[0], 3.0, 0.5, 24.0)
            use_footprint = qs.get("use_footprint", ["true"])[0].lower() not in ("false", "0")
            vietnam_only = qs.get("vietnam_only", ["false"])[0].lower() in ("true", "1")
            date_filter = qs.get("date_filter", ["all"])[0]
            daynight = qs.get("daynight", ["all"])[0]
            res = compute_live_harmonization(
                eps_km=eps_km,
                time_window_hours=time_window_hours,
                use_footprint=use_footprint,
                vietnam_only=vietnam_only,
                date_filter=date_filter,
                daynight=daynight,
            )
            self._send_json(res)
            return

        # Serve static files from frontend/public/data or frontend/dist with path-traversal protection
        rel_path = path.lstrip("/")
        if rel_path.startswith("data/"):
            data_root = DATA_DIR.resolve()
            data_file = (DATA_DIR / rel_path[len("data/") :]).resolve()
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

        if DIST_DIR.exists():
            dist_root = DIST_DIR.resolve()
            candidate = (DIST_DIR / (rel_path if rel_path else "index.html")).resolve()
            if not candidate.is_relative_to(dist_root):
                self._send_json({"detail": "Forbidden"}, status=403)
                return
            target = candidate if (candidate.exists() and candidate.is_file()) else (DIST_DIR / "index.html")
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


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print("\n=======================================================")
    print("NASA FIRMS Harmonization Platform (ST-DBSCAN v2.2)")
    print("Server running on: http://localhost:8000")
    print("=======================================================\n")
    if HAS_FASTAPI:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    else:
        server = ThreadingHTTPServer(("0.0.0.0", 8000), FallbackHTTPHandler)
        server.serve_forever()
