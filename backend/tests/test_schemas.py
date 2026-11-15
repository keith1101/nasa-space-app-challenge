"""Unit tests for models and schemas."""

import unittest
from backend.models import (
    HarmonizeMetrics,
    DataStatusResponse,
    ProvinceItemResponse,
    RawDetection,
    HarmonizedFireEvent,
    HAS_PYDANTIC,
)


class TestSchemas(unittest.TestCase):
    def test_record_instantiation(self):
        rec = RawDetection(
            latitude=14.0,
            longitude=108.0,
            acq_date="2026-11-05",
            acq_time="0315",
            datetime_utc="2026-11-05T03:15:00",
            satellite="Terra",
            sensor="MODIS_Terra",
            sensor_family="MODIS",
            spatial_res_m=1000,
            conf_norm=0.80,
            frp=15.0,
            brightness=320.0,
            scan=1.0,
            track=1.0,
            footprint_radius_km=0.707,
            daynight="D",
        )
        self.assertEqual(rec.satellite, "Terra")
        self.assertEqual(rec.spatial_res_m, 1000)

    def test_schema_types(self):
        status_data = {
            "mode": "live",
            "key_configured": True,
            "fetched_at": "2026-11-15T00:00:00Z",
            "last_error": None,
            "refresh_seconds": 900,
        }
        if HAS_PYDANTIC:
            item = DataStatusResponse(**status_data)
            self.assertEqual(item.mode, "live")
            self.assertTrue(item.key_configured)
        else:
            self.assertEqual(status_data["mode"], "live")


if __name__ == "__main__":
    unittest.main()
