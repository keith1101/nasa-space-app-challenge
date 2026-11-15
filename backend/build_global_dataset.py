"""
Global Planetary Dataset Builder Facade for NASA FIRMS Harmonization Platform.
Backward-compatible facade delegating to `backend.pipelines.global_builder`.
"""

from backend.pipelines.global_builder import (
    build_global_harmonized_catalog,
    main,
    DATA_DIR,
    RAW_DIR,
    GEOJSON_DIR,
    PUBLIC_DATA_DIR,
    DIST_DATA_DIR,
)

__all__ = [
    "build_global_harmonized_catalog",
    "main",
    "DATA_DIR",
    "RAW_DIR",
    "GEOJSON_DIR",
    "PUBLIC_DATA_DIR",
    "DIST_DATA_DIR",
]

if __name__ == "__main__":
    main()
