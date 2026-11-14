"""
Services Package for Active Fire Harmonization.
Provides Geospatial joins, Climatological analytics, and thread-safe Cache management.
"""

from backend.services.province_service import (
    compute_geometry_bbox,
    load_vietnam_provinces,
    assign_province,
)
from backend.services.calendar_service import (
    compute_z_scores_and_peaks,
    generate_multi_year_calendar,
    build_empirical_daily_breakdown,
    MACRO_REGIONS,
    MONTH_ABBR,
)
from backend.services.cache_service import (
    HarmonizationCacheManager,
    LiveFIRMSClient,
    cache_manager,
)

__all__ = [
    "compute_geometry_bbox",
    "load_vietnam_provinces",
    "assign_province",
    "compute_z_scores_and_peaks",
    "generate_multi_year_calendar",
    "build_empirical_daily_breakdown",
    "MACRO_REGIONS",
    "MONTH_ABBR",
    "HarmonizationCacheManager",
    "LiveFIRMSClient",
    "cache_manager",
]
