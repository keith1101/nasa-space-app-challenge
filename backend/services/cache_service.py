"""
Thread-Safe In-Memory Cache Manager & NASA FIRMS Background Telemetry Service.
Maintains cached standardized detections for sub-100ms live harmonization queries.
Supports background daemon polling to eliminate on-demand request blocking.
"""

import csv
import io
import os
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

ROOT_DIR = Path(__file__).resolve().parent.parent.parent

from backend.core.engine import FireHarmonizer
from backend.services.province_service import assign_province, load_vietnam_provinces

SOURCES = (("MODIS_NRT", "MODIS"), ("VIIRS_NOAA20_NRT", "NOAA-20"), ("VIIRS_NOAA21_NRT", "NOAA-21"))
AREA = "102.1,8.2,109.8,23.5"


class LiveFIRMSClient:
    """Handles rate-limited and secret-safe communication with NASA FIRMS REST API."""

    def __init__(self):
        self._lock = threading.Lock()
        self._snapshot: Optional[Tuple[List[Dict[str, Any]], List[Dict[str, Any]], str]] = None
        self._last_attempt = 0.0
        self._last_error: Optional[str] = None
        self._last_key: Optional[str] = None

    def status(self) -> Dict[str, Any]:
        configured = bool(os.environ.get("FIRMS_MAP_KEY", "").strip())
        return {
            "mode": "live" if self._snapshot else "local",
            "key_configured": configured,
            "fetched_at": self._snapshot[2] if self._snapshot else None,
            "last_error": self._last_error if configured else "FIRMS_MAP_KEY is missing in the server process",
            "refresh_seconds": 900,
        }

    def fetch_records(self) -> Optional[Tuple[List[Dict[str, Any]], List[Dict[str, Any]], str]]:
        """Return an atomic three-source snapshot, refreshing at most every 15 minutes."""
        key = os.environ.get("FIRMS_MAP_KEY", "").strip()
        if not key:
            return None
        with self._lock:
            now = time.monotonic()
            if key == self._last_key and now - self._last_attempt < 900:
                return self._snapshot
            self._last_attempt = now
            self._last_key = key
            source = "INITIAL"
            try:
                groups = []
                for source, satellite in SOURCES:
                    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{source}/{AREA}/5"
                    with urlopen(url, timeout=25) as response:
                        body = response.read(20_000_001)
                    if len(body) > 20_000_000:
                        raise ValueError("FIRMS response exceeds 20 MB")
                    reader = csv.DictReader(io.StringIO(body.decode("utf-8-sig")))
                    if not reader.fieldnames or not {"latitude", "longitude", "acq_date"}.issubset(reader.fieldnames):
                        raise ValueError(f"Invalid FIRMS CSV from {source}")
                    rows = []
                    for row in reader:
                        lat, lon = float(row["latitude"]), float(row["longitude"])
                        if 8.2 <= lat <= 23.5 and 102.1 <= lon <= 109.8:
                            row["latitude"], row["longitude"] = lat, lon
                            if satellite != "MODIS":
                                row["satellite"] = satellite
                            rows.append(row)
                    groups.append(rows)
                self._snapshot = (groups[0], groups[1] + groups[2], datetime.now(timezone.utc).isoformat())
                self._last_error = None
            except (HTTPError, URLError, TimeoutError, OSError, ValueError, UnicodeError) as exc:
                if isinstance(exc, HTTPError):
                    reason = f"HTTP {exc.code}"
                elif isinstance(exc, URLError):
                    cause = exc.reason
                    reason = f"{type(cause).__name__}: {str(cause).replace(key, '[REDACTED]')}"
                else:
                    reason = type(exc).__name__
                self._last_error = f"FIRMS {source} request failed ({reason}); retry in 15 minutes"
            return self._snapshot


class HarmonizationCacheManager:
    """Manages thread-safe in-memory cache and optional background daemon polling."""

    def __init__(self, data_loader_func=None):
        self._lock = threading.Lock()
        self._cache: Dict[str, Any] = {
            "loaded": False,
            "modis_recs": None,
            "viirs_recs": None,
            "province_features": None,
            "stamp": None,
        }
        self._live_client = LiveFIRMSClient()
        self._data_loader_func = data_loader_func
        self._bg_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    @property
    def live_client(self) -> LiveFIRMSClient:
        return self._live_client

    def ensure_raw_cache(self) -> None:
        """Loads and pre-processes standardized records into memory cache."""
        snapshot = self._live_client.fetch_records()
        stamp = snapshot[2] if snapshot else "local"

        if self._cache.get("stamp") == stamp and self._cache["loaded"]:
            return

        with self._lock:
            if self._cache.get("stamp") == stamp and self._cache["loaded"]:
                return

            if self._data_loader_func is not None:
                vn_modis, vn_viirs, province_features = self._data_loader_func()
            else:
                from backend.build_dataset import load_data
                vn_modis, vn_viirs, province_features = load_data()

            if snapshot:
                vn_modis, vn_viirs = snapshot[:2]

            harmonizer = FireHarmonizer()
            m_std = assign_province(harmonizer._standardize_modis_records(vn_modis), province_features)
            v_std = assign_province(harmonizer._standardize_viirs_records(vn_viirs), province_features)

            self._cache.update(
                modis_recs=m_std,
                viirs_recs=v_std,
                province_features=province_features,
                stamp=stamp,
                loaded=True,
            )

    def get_cached_records(self) -> Dict[str, Any]:
        """Returns the in-memory cache dict, ensuring it is populated."""
        self.ensure_raw_cache()
        return self._cache

    def start_background_poller(self, interval_sec: int = 900) -> None:
        """Starts a background daemon thread that periodically refreshes live telemetry."""
        if self._bg_thread is not None and self._bg_thread.is_alive():
            return
        self._stop_event.clear()

        def _worker():
            while not self._stop_event.is_set():
                try:
                    self.ensure_raw_cache()
                except Exception as e:
                    print(f"[FIRMS Background Worker] Refresh error: {e}", file=sys.stderr)
                self._stop_event.wait(interval_sec)

        self._bg_thread = threading.Thread(target=_worker, name="FIRMS-Background-Poller", daemon=True)
        self._bg_thread.start()

    def stop_background_poller(self) -> None:
        """Stops the background daemon thread gracefully."""
        if self._bg_thread is not None:
            self._stop_event.set()
            self._bg_thread.join(timeout=3.0)
            self._bg_thread = None


# Global singleton instance
cache_manager = HarmonizationCacheManager()
