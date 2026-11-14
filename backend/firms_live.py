"""Fetch the latest regional detections from the NASA FIRMS Area API."""
import csv
import io
import os
import threading
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

SOURCES = (("MODIS_NRT", "MODIS"), ("VIIRS_NOAA20_NRT", "NOAA-20"), ("VIIRS_NOAA21_NRT", "NOAA-21"))
AREA = "102.1,8.2,109.8,23.5"
_LOCK = threading.Lock()
_SNAPSHOT = None
_LAST_ATTEMPT = 0.0
_LAST_ERROR = None
_LAST_KEY = None


def status():
    configured = bool(os.environ.get("FIRMS_MAP_KEY", "").strip())
    return {"mode": "live" if _SNAPSHOT else "local", "key_configured": configured,
            "fetched_at": _SNAPSHOT[2] if _SNAPSHOT else None,
            "last_error": _LAST_ERROR if configured else "FIRMS_MAP_KEY is missing in the server process",
            "refresh_seconds": 900}


def records():
    """Return an atomic three-source snapshot, refreshing at most every 15 minutes."""
    global _SNAPSHOT, _LAST_ATTEMPT, _LAST_ERROR, _LAST_KEY
    key = os.environ.get("FIRMS_MAP_KEY", "").strip()
    if not key:
        return None
    with _LOCK:
        now = time.monotonic()
        if key == _LAST_KEY and now - _LAST_ATTEMPT < 900:
            return _SNAPSHOT
        _LAST_ATTEMPT = now
        _LAST_KEY = key
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
            _SNAPSHOT = (groups[0], groups[1] + groups[2], datetime.now(timezone.utc).isoformat())
            _LAST_ERROR = None
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, UnicodeError) as exc:
            # Never expose an exception URL because the request path contains the Map Key.
            if isinstance(exc, HTTPError):
                reason = f"HTTP {exc.code}"
            elif isinstance(exc, URLError):
                cause = exc.reason
                # The exception string can contain the request URL and the secret key.
                reason = f"{type(cause).__name__}: {str(cause).replace(key, '[REDACTED]')}"
            else:
                reason = type(exc).__name__
            _LAST_ERROR = f"FIRMS {source} request failed ({reason}); retry in 15 minutes"
        return _SNAPSHOT
