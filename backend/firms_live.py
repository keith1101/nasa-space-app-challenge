"""
Fetch the latest regional detections from the NASA FIRMS Area API.
Backward-compatible facade delegating to `backend.services.cache_service`.
"""

from backend.services.cache_service import cache_manager, SOURCES, AREA


def status():
    """Returns FIRMS live connectivity status and metadata."""
    return cache_manager.live_client.status()


def records():
    """Return an atomic three-source snapshot, refreshing at most every 15 minutes."""
    return cache_manager.live_client.fetch_records()


__all__ = ["status", "records", "SOURCES", "AREA"]
