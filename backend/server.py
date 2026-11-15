"""
Backend Server for NASA FIRMS Harmonization Platform
Serves real-time harmonization REST APIs (including live ST-DBSCAN parameter tuning)
and the Interactive React Frontend.
Supports FastAPI/Uvicorn when installed, with automatic fallback to Python's built-in
ThreadingHTTPServer when running in a zero-dependency standard-library environment.
"""

import os
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.harmonizer import FireHarmonizer
from backend.build_dataset import load_data, assign_province
from backend import firms_live
from backend.services.cache_service import cache_manager
from backend.services.landcover_service import compute_global_vegetation
from backend.services.grid_risk_service import predict_live_grid
from backend.api.routes import (
    load_json_file,
    compute_live_harmonization,
    compute_live_fire_trajectories,
    compute_fire_llm_analysis,
    compute_nearest_airbase,
    compute_mission_route,
    create_api_router,
    DATA_DIR,
)
from backend.api.fallback_server import (
    FallbackHTTPHandler,
    safe_query_float as _safe_query_float,
)

DIST_DIR = ROOT_DIR / "frontend" / "dist"

# Configure fallback handler with paths
FallbackHTTPHandler.data_dir = DATA_DIR
FallbackHTTPHandler.dist_dir = DIST_DIR
FallbackHTTPHandler.compute_live_func = compute_live_harmonization
FallbackHTTPHandler.load_json_func = load_json_file
FallbackHTTPHandler.compute_trajectories_func = compute_live_fire_trajectories
FallbackHTTPHandler.compute_llm_analysis_func = compute_fire_llm_analysis
FallbackHTTPHandler.compute_vegetation_func = compute_global_vegetation
FallbackHTTPHandler.predict_grid_func = predict_live_grid
FallbackHTTPHandler.compute_airbase_func = compute_nearest_airbase
FallbackHTTPHandler.compute_mission_route_func = compute_mission_route

# Backward-compatible references for external callers and existing test suites
_CACHE = cache_manager._cache
_CACHE_LOCK = cache_manager._lock


def _ensure_raw_cache():
    """Backward-compatible cache populator."""
    cache_manager.ensure_raw_cache()


try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False


if HAS_FASTAPI:
    app = FastAPI(
        title="NASA FIRMS Harmonization API",
        description="Real-Time Spatio-Temporal Harmonization of MODIS and VIIRS Active Fire Hotspots",
        version="2.2.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api_router = create_api_router()
    if api_router:
        app.include_router(api_router)

    @app.on_event("startup")
    def on_startup():
        cache_manager.start_background_poller(interval_sec=900)

    @app.on_event("shutdown")
    def on_shutdown():
        cache_manager.stop_background_poller()

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


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    port = int(os.environ.get("PORT", 8000))
    print("\n=======================================================")
    print("NASA FIRMS Harmonization Platform (ST-DBSCAN v2.2)")
    print(f"Server running on: http://0.0.0.0:{port}")
    print("=======================================================\n")

    # Start background poller daemon for seamless telemetry refresh
    cache_manager.start_background_poller(interval_sec=900)

    if HAS_FASTAPI:
        uvicorn.run(app, host="0.0.0.0", port=port)
    else:
        server = ThreadingHTTPServer(("0.0.0.0", port), FallbackHTTPHandler)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            cache_manager.stop_background_poller()
