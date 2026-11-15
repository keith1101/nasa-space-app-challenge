"""
Regional Dataset Builder Facade for NASA FIRMS Harmonization Platform.
Backward-compatible facade delegating to `backend.pipelines.regional_builder`.
"""

from backend.pipelines.regional_builder import (
    load_data,
    assign_province,
    generate_multi_year_calendar,
    _compute_z_scores_and_peaks,
    _compute_geometry_bbox,
    main,
    DATA_DIR,
    RAW_DIR,
    GEOJSON_DIR,
    PUBLIC_DATA_DIR,
    DIST_DATA_DIR,
)

__all__ = [
    "load_data",
    "assign_province",
    "generate_multi_year_calendar",
    "_compute_z_scores_and_peaks",
    "_compute_geometry_bbox",
    "main",
    "DATA_DIR",
    "RAW_DIR",
    "GEOJSON_DIR",
    "PUBLIC_DATA_DIR",
    "DIST_DATA_DIR",
]

if __name__ == "__main__":
    main()
