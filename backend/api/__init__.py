"""
API Package for NASA FIRMS Harmonization Platform.
Provides FastAPI router and Fallback HTTP Server.
"""

from backend.api.routes import (
    load_json_file,
    compute_live_harmonization,
    create_api_router,
)
from backend.api.fallback_server import (
    FallbackHTTPHandler,
    safe_query_float,
)

__all__ = [
    "load_json_file",
    "compute_live_harmonization",
    "create_api_router",
    "FallbackHTTPHandler",
    "safe_query_float",
]
