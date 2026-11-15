"""
Unit tests for System Reliability Verifier.
Verifies all 5 KPI scoring algorithms, prompt generation, and GIS enrichment logic.
"""

import json
import unittest
from pathlib import Path

from backend.benchmark.system_reliability_verifier import (
    _extract_bearing_or_compass,
    score_sample_reliability,
    build_tactical_prompt,
    enrich_sample_telemetry,
)


class TestSystemReliabilityVerifier(unittest.TestCase):

    def setUp(self):
        self.sample = {
            "event_id": "FE-TEST-001",
            "benchmark_sample_id": "SAMPLE-TEST-001",
            "status": "PERSISTENT_SPREAD",
            "location_name": "Quảng Nam, Việt Nam",
            "duration_hours": 24.0,
            "centroid_lat": 15.5,
            "centroid_lon": 108.0,
            "current_centroid": {"latitude": 15.5, "longitude": 108.0},
            "overall_bearing_compass": "NW",
            "overall_bearing_deg": 315.0,
            "overall_rate_of_spread_kmh": 0.5,
            "total_frp_mw": 150.0,
            "peak_frp_mw": 110.0,
            "weather": {
                "temperature_c": 32.0,
                "relative_humidity_pct": 45.0,
                "wind_speed_kmh": 15.0,
                "wind_direction_from_deg": 135.0,
                "precipitation_mm": 0.0,
            },
            "wind_alignment": {
                "wind_towards_deg": 315.0,
                "alignment_angle_deg": 0.0,
                "spread_mechanism": "WIND_DRIVEN",
                "description": "Wind aligned with fire propagation",
            },
            "kinematics": {
                "current_bearing_deg": 315.0,
                "current_compass_dir": "NW",
                "current_ros_kmh": 0.5,
                "total_frp_mw": 150.0,
                "peak_frp_mw": 110.0,
                "frp_trend": "INCREASING",
            },
        }

        self.enriched = {
            "terrain_context": {
                "elevation_msl_m": 450.0,
                "forward_slope_deg": 5.0,
                "slope_multiplier": 1.25,
                "slope_effect": "MODERATE_UPSLOPE_ACCELERATION",
            },
            "vegetation_fuel_context": {
                "land_cover_class": "Evergreen Broadleaf Forests",
                "fuel_category": "HARDWOOD_LITTER",
                "crown_fire_potential": "HIGH",
                "spotting_distance_km": 1.2,
                "flammability_index": "HIGH",
            },
            "tactical_proximity": {
                "nearest_airbase": {
                    "icao": "VVCL",
                    "name": "Chu Lai Air Base",
                    "distance_km": 45.0,
                    "estimated_flight_minutes": 6.0,
                    "aerial_firefighting_capable": True,
                }
            },
            "multi_horizon_size": {
                "6h": {"expected_area_ha": 35.0, "persistence_confidence": 0.88},
                "12h": {"expected_area_ha": 120.0, "persistence_confidence": 0.72},
                "24h": {"expected_area_ha": 350.0, "persistence_confidence": 0.55},
            },
        }

        self.valid_response = {
            "summary_vi": "Đám cháy rừng quy mô lớn đang lan nhanh về hướng Tây Bắc (NW) với cường độ bức xạ mạnh.",
            "risk_level": "EXTREME",
            "spread_mechanism": "WIND_DRIVEN",
            "threat_zone": "Khu vực sườn núi Tây Bắc đe dọa các cụm rừng phòng hộ xung quanh.",
            "forecast_6h": "Dự kiến đám cháy lan theo hướng NW cự ly khoảng 3.75 km và diện tích cháy mở rộng thêm ~35 ha.",
            "multi_horizon_assessment": {
                "h6_summary": "Lan truyền 3.75 km, diện tích 35 ha",
                "h12_summary": "Lan truyền 7.5 km, diện tích 120 ha",
                "h24_summary": "Lan truyền 15.0 km, diện tích 350 ha",
            },
            "tactical_recommendations": [
                "Lập đường băng cản lửa tại sườn núi phía Tây Bắc để chặn đầu mũi cháy chính.",
                "Xuất kích máy bay chữa cháy từ Căn cứ Không quân Chu Lai tiếp cận sau 6 phút để dội nước cô lập.",
                "Huy động lực lượng dân quân và kiểm lâm phát quang tuyến phòng thủ mặt đất.",
            ],
            "sitrep_markdown": "# BÁO CÁO TÁC CHIẾN CỨU HỎA RỪNG\n\nNghiêm trọng cấp EXTREME...",
        }

    def test_compass_extraction(self):
        self.assertEqual(_extract_bearing_or_compass("Lan truyền về hướng Tây Bắc."), "NW")
        self.assertEqual(_extract_bearing_or_compass("Heading in direction SE rapidly."), "SE")
        self.assertEqual(_extract_bearing_or_compass("Lan rộng về phía Đông Nam."), "SE")
        self.assertIsNone(_extract_bearing_or_compass("Khong co huong cu the."))

    def test_compass_extraction_intermediate_16_points(self):
        self.assertEqual(_extract_bearing_or_compass("Dự báo lan truyền theo hướng Bắc Đông Bắc"), "NNE")
        self.assertEqual(_extract_bearing_or_compass("Lan theo hướng Tây Tây Bắc với diện tích 70 ha"), "WNW")
        self.assertEqual(_extract_bearing_or_compass("Lan truyền về hướng Đông Đông Nam"), "ESE")
        self.assertEqual(_extract_bearing_or_compass("Lan về phía Nam Tây Nam (SSW)"), "SSW")
        self.assertEqual(_extract_bearing_or_compass("Lan theo hướng Tây Tây Nam"), "WSW")
        self.assertEqual(_extract_bearing_or_compass("Lan truyền về phía Bắc Tây Bắc"), "NNW")
        self.assertEqual(_extract_bearing_or_compass("Lan truyền về hướng Đông Đông Bắc"), "ENE")
        self.assertEqual(_extract_bearing_or_compass("Lan về phía Nam Đông Nam"), "SSE")

    def test_compass_extraction_proper_noun_and_token_protection(self):
        # Province and country names should NOT cause false directional matches
        self.assertEqual(_extract_bearing_or_compass("Đám cháy tại Bắc Giang đang lan mạnh về hướng Nam."), "S")
        self.assertEqual(_extract_bearing_or_compass("Đám cháy tại Quảng Nam, Việt Nam đang lan mạnh về hướng Bắc."), "N")
        self.assertIsNone(_extract_bearing_or_compass("Một đám cháy nhỏ đã được phát hiện tại Thừa Thiên Huế, Việt Nam."))
        # Arbitrary single tokens like 'N = 50' or 'S-70' must not be matched as compass directions
        self.assertIsNone(_extract_bearing_or_compass("Đám cháy đang được kiểm soát, diện tích 5 ha, theo dõi mẫu N = 50."))
        self.assertIsNone(_extract_bearing_or_compass("Trực thăng S-70 Blackhawk tham gia cứu hỏa."))
        # Multiple directions with distinct spread context: prioritize earliest directional statement
        self.assertEqual(_extract_bearing_or_compass("Đám cháy lan mạnh về hướng Tây Bắc, khói bao trùm cả vùng Đông Bắc."), "NW")

    def test_kpi1_json_validity(self):
        # Valid response passes KPI 1
        res = score_sample_reliability(self.sample, self.enriched, self.valid_response, None, 1200.0)
        self.assertEqual(res["kpi1_valid_schema"], 1)

        # Missing key fails KPI 1
        bad_resp = dict(self.valid_response)
        bad_resp.pop("threat_zone")
        res_bad = score_sample_reliability(self.sample, self.enriched, bad_resp, None, 1200.0)
        self.assertEqual(res_bad["kpi1_valid_schema"], 0)

        # Invalid risk level fails KPI 1
        bad_risk = dict(self.valid_response)
        bad_risk["risk_level"] = "CATASTROPHIC"
        res_risk = score_sample_reliability(self.sample, self.enriched, bad_risk, None, 1200.0)
        self.assertEqual(res_risk["kpi1_valid_schema"], 0)

    def test_kpi2_kinematic_fidelity_and_zero_hallucination(self):
        # Faithful response (NW matching NW)
        res = score_sample_reliability(self.sample, self.enriched, self.valid_response, None, 1200.0)
        self.assertEqual(res["kpi2_kinematic_fidelity"], 1)

        # Severe opposite direction hallucination (SE vs NW, 180 deg)
        hallucinated_resp = dict(self.valid_response)
        hallucinated_resp["summary_vi"] = "Đám cháy lan mạnh về hướng Đông Nam (SE)."
        hallucinated_resp["threat_zone"] = "Vùng phía Đông Nam (SE)."
        hallucinated_resp["forecast_6h"] = "Dự kiến lan truyền 4 km về hướng Đông Nam (SE)."
        res_hall = score_sample_reliability(self.sample, self.enriched, hallucinated_resp, None, 1200.0)
        self.assertEqual(res_hall["kpi2_kinematic_fidelity"], 0)

        # Physical contradiction: Calm wind (< 3 km/h) but claiming WIND_DRIVEN
        calm_sample = dict(self.sample)
        calm_sample["weather"] = {"wind_speed_kmh": 1.2}
        res_calm = score_sample_reliability(calm_sample, self.enriched, self.valid_response, None, 1200.0)
        self.assertEqual(res_calm["kpi2_kinematic_fidelity"], 0)

        # Physical contradiction: Fast-moving wildfire (ROS=3.5 km/h) claimed STATIONARY
        fast_sample = dict(self.sample)
        fast_sample["overall_rate_of_spread_kmh"] = 3.5
        fast_sample["kinematics"]["current_ros_kmh"] = 3.5
        stat_resp = dict(self.valid_response)
        stat_resp["spread_mechanism"] = "STATIONARY"
        res_stat = score_sample_reliability(fast_sample, self.enriched, stat_resp, None, 1200.0)
        self.assertEqual(res_stat["kpi2_kinematic_fidelity"], 0)

    def test_kpi3_distance_feasibility(self):
        # Feasible distance: 3.75 km is close to expected 0.5 * 6h * 1.25 = 3.75 km
        res = score_sample_reliability(self.sample, self.enriched, self.valid_response, None, 1200.0)
        self.assertEqual(res["kpi3_distance_feasible"], 1)

        # Unphysical supersonic distance (150 km in 6h)
        crazy_resp = dict(self.valid_response)
        crazy_resp["forecast_6h"] = "Dự kiến lan truyền 150 km trong 6 giờ tới."
        crazy_resp["multi_horizon_assessment"] = {"h6_summary": "150 km lan truyền"}
        res_crazy = score_sample_reliability(self.sample, self.enriched, crazy_resp, None, 1200.0)
        self.assertEqual(res_crazy["kpi3_distance_feasible"], 0)

        # Missing quantitative 6h prediction (neither km nor ha provided)
        no_numbers_resp = dict(self.valid_response)
        no_numbers_resp["forecast_6h"] = "Đám cháy đang lan truyền với diễn biến rất phức tạp."
        no_numbers_resp["multi_horizon_assessment"] = {
            "h6_summary": "Đám cháy lan rộng",
            "h12_summary": "Đám cháy phức tạp",
            "h24_summary": "Khó kiểm soát",
        }
        res_no_num = score_sample_reliability(self.sample, self.enriched, no_numbers_resp, None, 1200.0)
        self.assertEqual(res_no_num["kpi3_distance_feasible"], 0)
        self.assertIn("Missing quantitative 6h spread prediction", res_no_num["audit_trail"]["kpi3_reasons"][0])

    def test_kpi4_risk_stratification_calibration(self):
        # Total FRP = 150 MW (> 100 MW) -> must be HIGH or EXTREME
        res = score_sample_reliability(self.sample, self.enriched, self.valid_response, None, 1200.0)
        self.assertEqual(res["kpi4_risk_calibrated"], 1)

        # If misclassified as LOW for 150 MW fire
        bad_cal = dict(self.valid_response)
        bad_cal["risk_level"] = "LOW"
        res_bad = score_sample_reliability(self.sample, self.enriched, bad_cal, None, 1200.0)
        self.assertEqual(res_bad["kpi4_risk_calibrated"], 0)

        # Low FRP (< 15 MW) mapped to MODERATE is valid
        low_sample = dict(self.sample)
        low_sample["total_frp_mw"] = 8.5
        low_sample["peak_frp_mw"] = 6.0
        low_resp = dict(self.valid_response)
        low_resp["risk_level"] = "MODERATE"
        res_low = score_sample_reliability(low_sample, self.enriched, low_resp, None, 1200.0)
        self.assertEqual(res_low["kpi4_risk_calibrated"], 1)

        # Low FRP (< 15 MW) even if peak FRP is 11 MW: MUST be LOW or MODERATE, not EXTREME
        low_sample_peak11 = dict(self.sample)
        low_sample_peak11["total_frp_mw"] = 13.5
        low_sample_peak11["peak_frp_mw"] = 11.0
        ext_resp = dict(self.valid_response)
        ext_resp["risk_level"] = "EXTREME"
        res_low_ext = score_sample_reliability(low_sample_peak11, self.enriched, ext_resp, None, 1200.0)
        self.assertEqual(res_low_ext["kpi4_risk_calibrated"], 0)

    def test_kpi5_tactical_actionability(self):
        # Valid response has both containment line and airbase scramble
        res = score_sample_reliability(self.sample, self.enriched, self.valid_response, None, 1200.0)
        self.assertEqual(res["kpi5_tactical_actionability"], 1)

        # Missing containment line fails KPI 5
        bad_tactics = dict(self.valid_response)
        bad_tactics["tactical_recommendations"] = [
            "Theo dõi thời tiết từ xa.",
            "Cảnh báo người dân trong vùng.",
        ]
        bad_tactics["sitrep_markdown"] = "Chỉ theo dõi."
        res_tactics = score_sample_reliability(self.sample, self.enriched, bad_tactics, None, 1200.0)
        self.assertEqual(res_tactics["kpi5_tactical_actionability"], 0)

        # English terminology for containment (firebreak) and aerial logistics (helicopter/air tanker)
        en_tactics = dict(self.valid_response)
        en_tactics["tactical_recommendations"] = [
            "Establish a wide firebreak along the north ridge.",
            "Dispatch an aerial firefighting helicopter from Chu Lai Airbase, 6 min flight time.",
            "Deploy ground suppression units.",
        ]
        en_tactics["sitrep_markdown"] = "Tactical SITREP complete."
        res_en = score_sample_reliability(self.sample, self.enriched, en_tactics, None, 1200.0)
        self.assertEqual(res_en["kpi5_tactical_actionability"], 1)

    def test_score_sample_reliability_schema_consistency_on_failure(self):
        # When KPI 1 fails, event_id must still be present in the returned dictionary
        bad_resp = None
        res_fail = score_sample_reliability(self.sample, self.enriched, bad_resp, "Network error", 0.0)
        self.assertIn("event_id", res_fail)
        self.assertEqual(res_fail["event_id"], "FE-TEST-001")
        self.assertEqual(res_fail["sample_id"], "SAMPLE-TEST-001")
        self.assertEqual(res_fail["kpi1_valid_schema"], 0)
        self.assertEqual(res_fail["system_score"], 0.0)

    def test_build_tactical_prompt(self):
        prompt_str = build_tactical_prompt(self.sample, self.enriched)
        payload = json.loads(prompt_str)
        self.assertEqual(payload["event_id"], "FE-TEST-001")
        self.assertIn("terrain_context", payload)
        self.assertIn("vegetation_fuel_context", payload)
        self.assertIn("tactical_proximity", payload)
        self.assertIn("multi_horizon_size", payload)


if __name__ == "__main__":
    unittest.main()
