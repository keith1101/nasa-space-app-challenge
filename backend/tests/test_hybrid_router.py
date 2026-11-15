"""
Comprehensive Unit and Integration Test Suite for HybridTieredRouter.
Tests:
1. RouterConfig loading, environment overrides, and defaults.
2. clean_json_text sanitization of <think> blocks, markdown code fences, and edge cases.
3. Dynamic multi-criteria routing decisions (connectivity, FRP urgency, system load).
4. Cascading automatic fallbacks (Cloud -> Edge -> Heuristic; Edge -> Cloud -> Heuristic).
5. routing_metadata completeness and SITREP key normalization.
6. Thread-safe active request concurrency tracking.
7. Real-world live execution against local Ollama (qwen3:8b) and OpenAI API (gpt-6-luna).
"""

import json
import os
import socket
import threading
import time
import unittest
from unittest.mock import patch, MagicMock
from urllib.error import URLError
from urllib.request import Request, urlopen

from backend.services.llm_service import (
    RouterConfig,
    HybridTieredRouter,
    clean_json_text,
    _normalize_sitrep_keys,
    analyze_fire_spread_with_llm,
    get_router,
)


def is_ollama_live() -> bool:
    """Helper to detect if local Ollama daemon has qwen3:8b ready."""
    try:
        req = Request("http://localhost:11434/api/tags")
        with urlopen(req, timeout=1.5) as r:
            data = json.loads(r.read().decode("utf-8"))
            models = [m.get("name", "") for m in data.get("models", [])]
            return any("qwen3:8b" in m for m in models)
    except Exception:
        return False


def is_openai_live() -> bool:
    """Helper to detect if OpenAI API key is present and cloud link is reachable."""
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        return False
    try:
        sock = socket.create_connection(("api.openai.com", 443), timeout=2.0)
        sock.close()
        return True
    except Exception:
        return False


class TestRouterConfig(unittest.TestCase):
    """Verifies parameter defaults, environment parsing, and property accessibility."""

    def test_default_config_loading(self):
        # Save and temporarily unset router env vars
        keys = [
            "ROUTER_MODE", "ROUTER_FRP_THRESHOLD", "ROUTER_PING_TIMEOUT_SEC",
            "ROUTER_MAX_LATENCY_MS", "ROUTER_HEALTH_CACHE_SEC",
            "ROUTER_MAX_CONCURRENT_REQUESTS", "ROUTER_MAX_RAM_PERCENT",
            "OPENAI_MODEL", "LOCAL_LLM_MODEL",
        ]
        saved = {k: os.environ.pop(k, None) for k in keys}
        try:
            cfg = RouterConfig.from_env()
            self.assertEqual(cfg.router_mode, "auto")
            self.assertEqual(cfg.router_frp_threshold, 50.0)
            self.assertEqual(cfg.router_ping_timeout_sec, 2.0)
            self.assertEqual(cfg.router_max_latency_ms, 500.0)
            self.assertEqual(cfg.router_health_cache_sec, 15.0)
            self.assertEqual(cfg.router_max_concurrent_requests, 4)
            self.assertEqual(cfg.router_max_ram_percent, 92.0)
            self.assertEqual(cfg.openai_model, "gpt-6-luna")
            self.assertEqual(cfg.openai_base_url, "https://api.openai.com/v1")
            self.assertEqual(cfg.local_llm_model, "qwen3:8b")
            self.assertEqual(cfg.local_llm_base_url, "http://localhost:11434/v1")
        finally:
            for k, v in saved.items():
                if v is not None:
                    os.environ[k] = v

    def test_env_config_overrides(self):
        test_env = {
            "ROUTER_MODE": "cloud_only",
            "ROUTER_FRP_THRESHOLD": "120.5",
            "ROUTER_PING_TIMEOUT_SEC": "3.5",
            "ROUTER_MAX_LATENCY_MS": "350.0",
            "ROUTER_HEALTH_CACHE_SEC": "30.0",
            "ROUTER_MAX_CONCURRENT_REQUESTS": "8",
            "ROUTER_MAX_RAM_PERCENT": "85.5",
            "OPENAI_MODEL": "gpt-6.1-terra",
            "LOCAL_LLM_MODEL": "qwen3:14b",
        }
        with patch.dict(os.environ, test_env, clear=False):
            cfg = RouterConfig.from_env()
            self.assertEqual(cfg.router_mode, "cloud_only")
            self.assertEqual(cfg.router_frp_threshold, 120.5)
            self.assertEqual(cfg.router_ping_timeout_sec, 3.5)
            self.assertEqual(cfg.router_max_latency_ms, 350.0)
            self.assertEqual(cfg.router_health_cache_sec, 30.0)
            self.assertEqual(cfg.router_max_concurrent_requests, 8)
            self.assertEqual(cfg.router_max_ram_percent, 85.5)
            self.assertEqual(cfg.openai_model, "gpt-6.1-terra")
            self.assertEqual(cfg.local_llm_model, "qwen3:14b")

    def test_case_insensitive_attribute_access(self):
        cfg = RouterConfig(router_frp_threshold=75.0, router_mode="edge_only")
        self.assertEqual(cfg.router_frp_threshold, 75.0)
        self.assertEqual(cfg.ROUTER_FRP_THRESHOLD, 75.0)
        self.assertEqual(cfg.ROUTER_MODE, "edge_only")

    def test_empty_and_invalid_env_vars_fallback_to_defaults(self):
        invalid_env = {
            "ROUTER_FRP_THRESHOLD": "",
            "ROUTER_PING_TIMEOUT_SEC": "not_a_float",
            "ROUTER_MAX_LATENCY_MS": " ",
            "ROUTER_HEALTH_CACHE_SEC": "invalid",
            "ROUTER_MAX_CONCURRENT_REQUESTS": "",
            "ROUTER_MAX_RAM_PERCENT": "NaN_str",
            "OPENAI_TIMEOUT_SEC": "xyz",
            "LOCAL_LLM_TIMEOUT_SEC": "",
        }
        with patch.dict(os.environ, invalid_env, clear=False):
            cfg = RouterConfig.from_env()
            self.assertEqual(cfg.router_frp_threshold, 50.0)
            self.assertEqual(cfg.router_ping_timeout_sec, 2.0)
            self.assertEqual(cfg.router_max_latency_ms, 500.0)
            self.assertEqual(cfg.router_health_cache_sec, 15.0)
            self.assertEqual(cfg.router_max_concurrent_requests, 4)
            self.assertEqual(cfg.router_max_ram_percent, 92.0)
            self.assertEqual(cfg.openai_timeout_sec, 30.0)
            self.assertEqual(cfg.local_llm_timeout_sec, 90.0)


class TestCleanJsonText(unittest.TestCase):
    """Verifies that thinking tags, code blocks, and malformed reasoning outputs are cleaned."""

    def test_clean_plain_json(self):
        raw = '{"summary_vi": "Đám cháy nhỏ", "risk_level": "LOW"}'
        self.assertEqual(clean_json_text(raw), raw)

    def test_clean_think_tags(self):
        raw = '<think>I should analyze kinematics and FRP...</think>{"summary_vi": "Đám cháy", "risk_level": "HIGH"}'
        expected = '{"summary_vi": "Đám cháy", "risk_level": "HIGH"}'
        self.assertEqual(clean_json_text(raw), expected)

    def test_clean_multiline_think_tags_case_insensitive(self):
        raw = """<THINK>
Step 1: Check bearing 45 deg.
Step 2: Check wind speed 20 kmh.
</THINK>
{"summary_vi": "Lan nhanh", "risk_level": "EXTREME"}"""
        expected = '{"summary_vi": "Lan nhanh", "risk_level": "EXTREME"}'
        self.assertEqual(clean_json_text(raw), expected)

    def test_clean_markdown_json_fences(self):
        raw = """```json
{
  "summary_vi": "Báo cáo cháy rừng",
  "risk_level": "MODERATE"
}
```"""
        parsed = json.loads(clean_json_text(raw))
        self.assertEqual(parsed["summary_vi"], "Báo cáo cháy rừng")
        self.assertEqual(parsed["risk_level"], "MODERATE")

    def test_clean_generic_markdown_fences(self):
        raw = """```
{
  "summary_vi": "Không có tag json",
  "risk_level": "LOW"
}
```"""
        parsed = json.loads(clean_json_text(raw))
        self.assertEqual(parsed["summary_vi"], "Không có tag json")

    def test_clean_thinking_and_markdown_combined(self):
        raw = """<think>
Evaluating weather humidity 25%.
High risk detected.
</think>
Here is the SITREP:
```json
{
  "summary_vi": "Cực kỳ nguy hiểm",
  "risk_level": "EXTREME"
}
```
End of report."""
        parsed = json.loads(clean_json_text(raw))
        self.assertEqual(parsed["risk_level"], "EXTREME")

    def test_clean_empty_and_whitespace(self):
        self.assertEqual(clean_json_text(""), "")
        self.assertEqual(clean_json_text("   \n\t  "), "")

    def test_clean_unclosed_think_tag_with_inner_braces(self):
        raw = '<think>Analyzing {frp: 50} is high\n{"summary_vi": "Cháy", "risk_level": "HIGH"}'
        cleaned = clean_json_text(raw)
        parsed = json.loads(cleaned)
        self.assertEqual(parsed["summary_vi"], "Cháy")
        self.assertEqual(parsed["risk_level"], "HIGH")

    def test_clean_unclosed_think_with_code_fence(self):
        raw = """<think>Model reasoning with {note: 'unfinished'}
```json
{"summary_vi": "Cháy lớn", "risk_level": "EXTREME"}
```"""
        cleaned = clean_json_text(raw)
        parsed = json.loads(cleaned)
        self.assertEqual(parsed["summary_vi"], "Cháy lớn")
        self.assertEqual(parsed["risk_level"], "EXTREME")


class TestDynamicRoutingDecisions(unittest.TestCase):
    """Verifies decision matrix across network status, FRP urgency, and system load."""

    def setUp(self):
        self.config = RouterConfig(
            router_mode="auto",
            router_frp_threshold=50.0,
            router_ping_timeout_sec=2.0,
            router_max_latency_ms=500.0,
            router_max_concurrent_requests=4,
            router_max_ram_percent=92.0,
        )
        self.router = HybridTieredRouter(self.config)

        self.routine_telemetry = {
            "event_id": "FE-ROUTINE",
            "kinematics": {"total_frp_mw": 20.0, "frp_trend": "STABLE"},
            "status": "RECENT_ACTIVE_FIRE",
            "risk_level": "LOW",
        }
        self.urgent_telemetry = {
            "event_id": "FE-URGENT",
            "kinematics": {"total_frp_mw": 110.0, "frp_trend": "INTENSIFYING"},
            "status": "PERSISTENT_ACTIVE_FIRE",
            "risk_level": "HIGH",
        }

    def test_route_to_edge_when_offline_even_if_urgent(self):
        with patch.object(self.router, "check_cloud_connectivity", return_value=(False, 9999.0)):
            target, factors = self.router.decide_route(self.urgent_telemetry)
            self.assertEqual(target, "edge")
            self.assertFalse(factors["is_online"])
            self.assertTrue(factors["is_urgent"])
            self.assertIn("Offline or unreachable", factors["decision_reason"])

    def test_route_to_edge_when_online_and_routine_frp(self):
        with patch.object(self.router, "check_cloud_connectivity", return_value=(True, 45.0)):
            with patch.object(self.router, "check_system_load", return_value=(False, 0, 50.0)):
                target, factors = self.router.decide_route(self.routine_telemetry)
                self.assertEqual(target, "edge")
                self.assertTrue(factors["is_online"])
                self.assertFalse(factors["is_urgent"])
                self.assertIn("Routine wildfire event", factors["decision_reason"])

    def test_route_to_cloud_when_online_and_urgent_frp(self):
        with patch.object(self.router, "check_cloud_connectivity", return_value=(True, 45.0)):
            with patch.object(self.router, "check_system_load", return_value=(False, 0, 50.0)):
                target, factors = self.router.decide_route(self.urgent_telemetry)
                self.assertEqual(target, "cloud")
                self.assertTrue(factors["is_online"])
                self.assertTrue(factors["is_urgent"])
                self.assertIn("Urgent wildfire condition", factors["decision_reason"])

    def test_route_to_cloud_when_multi_day_conflagration(self):
        conflagration_telemetry = {
            "event_id": "FE-CONF",
            "kinematics": {"total_frp_mw": 35.0},
            "status": "MULTI_DAY_CONFLAGRATION",
        }
        with patch.object(self.router, "check_cloud_connectivity", return_value=(True, 45.0)):
            target, factors = self.router.decide_route(conflagration_telemetry)
            self.assertEqual(target, "cloud")
            self.assertTrue(factors["is_urgent"])

    def test_route_to_cloud_when_extreme_risk_level(self):
        extreme_telemetry = {
            "event_id": "FE-EXT",
            "kinematics": {"total_frp_mw": 30.0},
            "risk_level": "EXTREME",
        }
        with patch.object(self.router, "check_cloud_connectivity", return_value=(True, 45.0)):
            target, factors = self.router.decide_route(extreme_telemetry)
            self.assertEqual(target, "cloud")
            self.assertTrue(factors["is_urgent"])

    def test_route_to_cloud_when_intensifying_trend_with_high_frp(self):
        intensifying_telemetry = {
            "event_id": "FE-INT",
            "kinematics": {"total_frp_mw": 35.0, "frp_trend": "INTENSIFYING"},
        }
        with patch.object(self.router, "check_cloud_connectivity", return_value=(True, 45.0)):
            target, factors = self.router.decide_route(intensifying_telemetry)
            self.assertEqual(target, "cloud")
            self.assertTrue(factors["is_urgent"])

    def test_route_to_cloud_when_edge_concurrency_overloaded(self):
        # Routine fire, but active requests >= router_max_concurrent_requests (4)
        with patch.object(self.router, "check_cloud_connectivity", return_value=(True, 45.0)):
            with patch.object(self.router, "check_system_load", return_value=(True, 5, 60.0)):
                target, factors = self.router.decide_route(self.routine_telemetry)
                self.assertEqual(target, "cloud")
                self.assertTrue(factors["is_overloaded"])
                self.assertIn("overloaded", factors["decision_reason"])

    def test_route_to_cloud_when_edge_ram_overloaded(self):
        # Routine fire, but RAM >= 92%
        with patch.object(self.router, "check_cloud_connectivity", return_value=(True, 45.0)):
            with patch.object(self.router, "check_system_load", return_value=(True, 1, 95.0)):
                target, factors = self.router.decide_route(self.routine_telemetry)
                self.assertEqual(target, "cloud")
                self.assertTrue(factors["is_overloaded"])

    def test_high_ping_latency_routes_to_edge(self):
        # Even if urgent, if ping latency (650ms) exceeds router_max_latency_ms (500ms), fallback to Edge
        with patch.object(self.router, "check_cloud_connectivity", return_value=(False, 650.0)):
            target, factors = self.router.decide_route(self.urgent_telemetry)
            self.assertEqual(target, "edge")

    def test_explicit_router_modes_and_overrides(self):
        # Mode overrides
        self.router.config.router_mode = "cloud_only"
        target, _ = self.router.decide_route(self.routine_telemetry)
        self.assertEqual(target, "cloud")

        self.router.config.router_mode = "edge_only"
        target, _ = self.router.decide_route(self.urgent_telemetry)
        self.assertEqual(target, "edge")

        self.router.config.router_mode = "fallback_only"
        target, _ = self.router.decide_route(self.urgent_telemetry)
        self.assertEqual(target, "fallback")

        # Parameter overrides
        self.router.config.router_mode = "auto"
        target, _ = self.router.decide_route(self.routine_telemetry, provider_override="cloud")
        self.assertEqual(target, "cloud")

        target, _ = self.router.decide_route(self.urgent_telemetry, provider_override="edge")
        self.assertEqual(target, "edge")

        target, _ = self.router.decide_route(self.urgent_telemetry, provider_override="fallback")
        self.assertEqual(target, "fallback")


class TestAutomaticCascadingFallback(unittest.TestCase):
    """Verifies cascading failover across Cloud, Edge, and Heuristic tiers."""

    def setUp(self):
        self.router = HybridTieredRouter()
        self.telemetry = {
            "event_id": "FE-CASCADE-01",
            "duration_hours": 12.0,
            "kinematics": {"total_frp_mw": 85.0, "current_ros_kmh": 0.45, "current_compass_dir": "NE"},
            "weather": {"wind_speed_kmh": 22.0, "relative_humidity_pct": 32.0},
        }

    def test_cloud_success_no_fallback(self):
        mock_cloud_sitrep = {
            "summary_vi": "Cloud phân tích thành công",
            "risk_level": "HIGH",
            "spread_mechanism": "WIND_DRIVEN",
            "threat_zone": "Phía Đông Bắc",
            "forecast_6h": "Lan thêm 2.7 km",
            "tactical_recommendations": ["Tạo đường băng cản lửa"],
            "sitrep_markdown": "# Báo cáo Cloud",
        }
        with patch.object(self.router, "decide_route", return_value=("cloud", {"is_online": True})):
            with patch.object(self.router, "_call_cloud", return_value=mock_cloud_sitrep):
                res = self.router.route_and_execute(self.telemetry)

                self.assertIn("routing_metadata", res)
                meta = res["routing_metadata"]
                self.assertEqual(meta["tier"], "cloud")
                self.assertEqual(meta["target_route"], "cloud")
                self.assertFalse(meta["fallback_used"])
                self.assertEqual(len(meta["fallback_history"]), 0)
                self.assertIn("openai", res["model_provider"])

    def test_cloud_failure_cascades_to_edge(self):
        mock_edge_sitrep = {
            "summary_vi": "Edge cứu cánh thành công",
            "risk_level": "HIGH",
            "spread_mechanism": "WIND_DRIVEN",
            "threat_zone": "Phía Đông Bắc",
            "forecast_6h": "Lan thêm 2.7 km",
            "tactical_recommendations": ["Triển khai đội dập lửa"],
            "sitrep_markdown": "# Báo cáo Edge",
        }
        with patch.object(self.router, "decide_route", return_value=("cloud", {"is_online": True})):
            with patch.object(self.router, "_call_cloud", side_effect=URLError("Connection refused to OpenAI")):
                with patch.object(self.router, "_call_edge", return_value=mock_edge_sitrep):
                    res = self.router.route_and_execute(self.telemetry)

                    self.assertIn("routing_metadata", res)
                    meta = res["routing_metadata"]
                    self.assertEqual(meta["tier"], "edge")
                    self.assertEqual(meta["target_route"], "cloud")
                    self.assertTrue(meta["fallback_used"])
                    self.assertEqual(len(meta["fallback_history"]), 1)
                    self.assertEqual(meta["fallback_history"][0]["tier"], "cloud")
                    self.assertIn("Connection refused", meta["fallback_history"][0]["error"])
                    self.assertIn("local", res["model_provider"])

    def test_cloud_and_edge_failure_cascades_to_heuristic(self):
        with patch.object(self.router, "decide_route", return_value=("cloud", {"is_online": True})):
            with patch.object(self.router, "_call_cloud", side_effect=URLError("OpenAI 500 Server Error")):
                with patch.object(self.router, "_call_edge", side_effect=URLError("Ollama GPU Out Of Memory")):
                    res = self.router.route_and_execute(self.telemetry)

                    self.assertIn("routing_metadata", res)
                    meta = res["routing_metadata"]
                    self.assertEqual(meta["tier"], "fallback")
                    self.assertEqual(meta["target_route"], "cloud")
                    self.assertTrue(meta["fallback_used"])
                    self.assertEqual(len(meta["fallback_history"]), 2)
                    self.assertEqual(meta["fallback_history"][0]["tier"], "cloud")
                    self.assertEqual(meta["fallback_history"][1]["tier"], "edge")
                    self.assertEqual(res["model_provider"], "heuristic_engine_grounded")
                    self.assertIn("summary_vi", res)
                    self.assertIn("sitrep_markdown", res)

    def test_edge_failure_cascades_to_cloud_when_online(self):
        mock_cloud_sitrep = {
            "summary_vi": "Cloud cứu cánh khi Edge hỏng",
            "risk_level": "MODERATE",
            "spread_mechanism": "WIND_DRIVEN",
            "threat_zone": "Vùng hạ lưu gió",
            "forecast_6h": "Lan 1.5 km",
            "tactical_recommendations": ["Quan sát"],
            "sitrep_markdown": "# Báo cáo Cloud",
        }
        with patch.object(self.router, "decide_route", return_value=("edge", {"is_online": True})):
            with patch.object(self.router, "_call_edge", side_effect=URLError("Ollama offline")):
                with patch.object(self.router, "_call_cloud", return_value=mock_cloud_sitrep):
                    res = self.router.route_and_execute(self.telemetry)

                    meta = res["routing_metadata"]
                    self.assertEqual(meta["tier"], "cloud")
                    self.assertEqual(meta["target_route"], "edge")
                    self.assertTrue(meta["fallback_used"])
                    self.assertEqual(len(meta["fallback_history"]), 1)
                    self.assertEqual(meta["fallback_history"][0]["tier"], "edge")

    def test_edge_failure_cascades_to_heuristic_when_offline(self):
        with patch.object(self.router, "decide_route", return_value=("edge", {"is_online": False})):
            with patch.object(self.router, "_call_edge", side_effect=URLError("Ollama crashed")):
                res = self.router.route_and_execute(self.telemetry)

                meta = res["routing_metadata"]
                self.assertEqual(meta["tier"], "fallback")
                self.assertEqual(meta["target_route"], "edge")
                self.assertTrue(meta["fallback_used"])
                self.assertEqual(res["model_provider"], "heuristic_engine_grounded")


class TestRoutingMetadataAndNormalization(unittest.TestCase):
    """Verifies that SITREP keys are normalized and routing metadata is fully populated."""

    def test_normalize_missing_sitrep_keys(self):
        telemetry = {
            "event_id": "FE-NORM",
            "kinematics": {"total_frp_mw": 50.0, "current_ros_kmh": 0.2, "current_compass_dir": "E"},
            "weather": {"wind_speed_kmh": 15.0, "relative_humidity_pct": 40.0},
        }
        # Model returns partial JSON missing threat_zone and tactical_recommendations
        partial_model_output = {
            "summary_vi": "Cháy mức độ vừa",
            "risk_level": "MODERATE",
            "spread_mechanism": "WIND_DRIVEN",
        }
        normalized = _normalize_sitrep_keys(partial_model_output, telemetry)
        self.assertEqual(normalized["summary_vi"], "Cháy mức độ vừa")
        self.assertEqual(normalized["risk_level"], "MODERATE")
        self.assertIn("threat_zone", normalized)
        self.assertIn("forecast_6h", normalized)
        self.assertIn("tactical_recommendations", normalized)
        self.assertIn("sitrep_markdown", normalized)

    def test_normalize_non_dict_parsed_output(self):
        telemetry = {"event_id": "FE-LIST-OUTPUT", "kinematics": {"total_frp_mw": 35.0}}
        # Model returns JSON list instead of dictionary
        list_output = [{"summary_vi": "array output"}]
        normalized = _normalize_sitrep_keys(list_output, telemetry)
        self.assertIsInstance(normalized, dict)
        self.assertIn("summary_vi", normalized)
        self.assertIn("risk_level", normalized)
        self.assertIn("sitrep_markdown", normalized)

    def test_backward_compatible_provider_fallback(self):
        telemetry = {"event_id": "FE-FALLBACK-TEST", "kinematics": {"total_frp_mw": 30.0}}
        res = analyze_fire_spread_with_llm(telemetry, provider="fallback")
        self.assertEqual(res["model_provider"], "heuristic_engine_grounded")
        self.assertIn("summary_vi", res)
        self.assertIn("sitrep_markdown", res)


class TestConcurrencyTracking(unittest.TestCase):
    """Verifies active request concurrency tracking and thread safety."""

    def test_active_requests_lifecycle(self):
        router = HybridTieredRouter()
        self.assertEqual(router._active_requests, 0)

        observed_active = []

        def mock_call(*args, **kwargs):
            observed_active.append(router._active_requests)
            return {"summary_vi": "ok"}

        with patch.object(router, "decide_route", return_value=("cloud", {"is_online": True})):
            with patch.object(router, "_call_cloud", side_effect=mock_call):
                router.route_and_execute({"event_id": "FE-CONCUR"})

        self.assertEqual(observed_active, [1])
        self.assertEqual(router._active_requests, 0)

    def test_route_and_analyze_method_contract(self):
        router = HybridTieredRouter()
        self.assertTrue(hasattr(router, "route_and_analyze"))
        self.assertTrue(callable(router.route_and_analyze))

    def test_concurrency_load_shedding_with_route_and_analyze(self):
        config = RouterConfig(
            router_mode="auto",
            router_max_concurrent_requests=3,
            router_frp_threshold=100.0,
            router_max_ram_percent=95.0,
        )
        router = HybridTieredRouter(config)

        telemetry = {"event_id": "FE-ROUTINE", "kinematics": {"total_frp_mw": 20.0}}
        routes_taken = []
        routes_lock = threading.Lock()

        def worker():
            res = router.route_and_analyze(telemetry)
            with routes_lock:
                routes_taken.append(res["routing_metadata"]["tier"])

        def slow_edge(telem, timeout_sec=None):
            time.sleep(0.06)
            return {"summary_vi": "Edge ok"}

        def slow_cloud(telem, timeout_sec=None):
            time.sleep(0.06)
            return {"summary_vi": "Cloud ok"}

        with patch("backend.services.llm_service._get_system_ram_percent", return_value=40.0):
            with patch.object(router, "check_cloud_connectivity", return_value=(True, 30.0)):
                with patch.object(router, "_call_edge", side_effect=slow_edge):
                    with patch.object(router, "_call_cloud", side_effect=slow_cloud):
                        threads = [threading.Thread(target=worker) for _ in range(6)]
                        for t in threads:
                            t.start()
                        for t in threads:
                            t.join()

        self.assertIn("edge", routes_taken)
        self.assertIn("cloud", routes_taken)
        self.assertEqual(router._active_requests, 0)


class TestAdversarialTelemetryAndHardening(unittest.TestCase):
    """Adversarial stress testing against null, malformed, and out-of-spec inputs."""

    def setUp(self):
        self.router = HybridTieredRouter()

    def test_null_kinematics_does_not_crash(self):
        payload = {"event_id": "FE-NULL-KINEMATICS", "kinematics": None}
        is_urgent, factors = self.router.evaluate_urgency(payload)
        self.assertFalse(is_urgent)
        self.assertEqual(factors["total_frp_mw"], 0.0)

        res = self.router.route_and_execute(payload, provider_override="fallback")
        self.assertIn("summary_vi", res)
        self.assertIn("sitrep_markdown", res)

        res_api = analyze_fire_spread_with_llm(payload, provider="fallback")
        self.assertIn("summary_vi", res_api)

    def test_null_telemetry_metrics_do_not_crash(self):
        payload = {
            "event_id": "FE-NULL-METRICS",
            "duration_hours": None,
            "kinematics": {
                "total_frp_mw": None,
                "current_ros_kmh": None,
                "current_bearing_deg": None,
                "current_compass_dir": None,
            },
            "weather": None,
            "wind_alignment": None,
        }
        is_urgent, factors = self.router.evaluate_urgency(payload)
        self.assertFalse(is_urgent)
        self.assertEqual(factors["total_frp_mw"], 0.0)

        res = self.router.route_and_execute(payload, provider_override="fallback")
        self.assertIn("summary_vi", res)
        self.assertIn("sitrep_markdown", res)

    def test_extreme_and_corrupt_frp_values(self):
        corrupt_cases = [0, -10.0, 1e6, float("nan"), None, "not_numeric"]
        for frp_val in corrupt_cases:
            payload = {
                "event_id": f"FE-FRP-{frp_val}",
                "kinematics": {"total_frp_mw": frp_val},
            }
            try:
                is_urgent, factors = self.router.evaluate_urgency(payload)
                self.assertIsInstance(is_urgent, bool)
                res = self.router.route_and_execute(payload, provider_override="fallback")
                self.assertIn("summary_vi", res)
            except Exception as e:
                self.fail(f"Crashed on total_frp_mw={frp_val}: {e}")

    def test_malformed_cloud_url_port_does_not_crash(self):
        bad_router = HybridTieredRouter(
            RouterConfig(openai_api_key="sk-test", openai_base_url="http://localhost:invalid")
        )
        is_online, latency = bad_router.check_cloud_connectivity(force_refresh=True)
        self.assertFalse(is_online)
        self.assertEqual(latency, 9999.0)


class TestLiveServiceVerification(unittest.TestCase):
    """Real live execution against active Ollama (qwen3:8b) and OpenAI API (gpt-6-luna)."""

    def setUp(self):
        self.telemetry = {
            "event_id": "FE-LIVE-TEST-01",
            "duration_hours": 14.5,
            "province_name": "Gia Lai",
            "kinematics": {
                "total_frp_mw": 38.0,
                "current_ros_kmh": 0.32,
                "current_compass_dir": "NE",
                "current_bearing_deg": 48.0,
                "frp_trend": "STABLE",
            },
            "weather": {
                "temperature_c": 31.0,
                "relative_humidity_pct": 42.0,
                "wind_speed_kmh": 16.0,
                "wind_direction_from_deg": 225.0,
            },
            "wind_alignment": {
                "spread_mechanism": "WIND_DRIVEN",
                "status": "MODERATE_WIND_DRIVEN",
            },
        }

    @unittest.skipUnless(is_ollama_live(), "Ollama daemon with qwen3:8b is not reachable on localhost:11434")
    def test_live_ollama_qwen3_execution(self):
        router = get_router()
        res = router.route_and_execute(self.telemetry, provider_override="edge", timeout_seconds=90.0)

        self.assertIn("summary_vi", res)
        self.assertIn("risk_level", res)
        self.assertIn("spread_mechanism", res)
        self.assertIn("sitrep_markdown", res)
        self.assertIn("routing_metadata", res)
        meta = res["routing_metadata"]
        self.assertIn(meta["tier"], ["edge", "cloud", "heuristic"])
        if meta["tier"] == "edge":
            self.assertEqual(meta["model"], "qwen3:8b")
        self.assertGreater(meta["latency_ms"], 0.0)

    @unittest.skipUnless(is_openai_live(), "OpenAI API is not reachable or OPENAI_API_KEY is unset")
    def test_live_openai_gpt6_execution(self):
        router = get_router()
        res = router.route_and_execute(self.telemetry, provider_override="cloud", timeout_seconds=30.0)

        self.assertIn("summary_vi", res)
        self.assertIn("risk_level", res)
        self.assertIn("spread_mechanism", res)
        self.assertIn("sitrep_markdown", res)
        self.assertIn("routing_metadata", res)
        meta = res["routing_metadata"]
        self.assertEqual(meta["tier"], "cloud")
        self.assertEqual(meta["model"], "gpt-6-luna")
        self.assertGreater(meta["latency_ms"], 0.0)


if __name__ == "__main__":
    unittest.main()
