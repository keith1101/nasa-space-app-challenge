"""
Models Package for Active Fire Harmonization.
Provides DTOs, domain record definitions, and API response schemas.
"""

from backend.models.records import RawDetection, HarmonizedFireEvent
from backend.models.schemas import (
    HarmonizeMetrics,
    HarmonizeResponse,
    DataStatusResponse,
    ProvinceItemResponse,
    HAS_PYDANTIC,
)

__all__ = [
    "RawDetection",
    "HarmonizedFireEvent",
    "HarmonizeMetrics",
    "HarmonizeResponse",
    "DataStatusResponse",
    "ProvinceItemResponse",
    "HAS_PYDANTIC",
]
