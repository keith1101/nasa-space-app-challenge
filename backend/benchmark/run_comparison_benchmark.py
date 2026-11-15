"""
Comparative Inference Runner for Head-to-Head LLM Evaluation.
Evaluates Local LoRA / Quantized Model (Qwen3-8B) vs OpenAI Frontier (GPT-6 Luna)
on N = 50 real active fire events from NASA FIRMS.
"""

import concurrent.futures
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, Set
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.services.llm_service import SYSTEM_PROMPT

logger = logging.getLogger("benchmark_runner")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def clean_json_text(text: str) -> str:
    """Strips thinking tags, markdown code fences, and whitespace from LLM response."""
    cleaned = text.strip()
    # Strip <think>...</think> if present
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", cleaned).strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()
    return cleaned


def call_openai_chat(
    model: str,
    prompt: str,
    api_key: str,
    base_url: str = "https://api.openai.com/v1",
    timeout: float = 90.0,
    temperature: Optional[float] = None,
) -> Tuple[Optional[Dict[str, Any]], float, Optional[str]]:
    """
    Calls OpenAI-compatible chat completion endpoint and measures exact latency.
    Returns (parsed_json_dict, elapsed_ms, error_msg).
    """
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_object"},
    }
    if temperature is not None:
        payload["temperature"] = temperature

    t0 = time.monotonic()
    try:
        req = Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
        with urlopen(req, timeout=timeout) as resp:
            elapsed_ms = (time.monotonic() - t0) * 1000.0
            raw_body = resp.read().decode("utf-8")
            data = json.loads(raw_body)
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(clean_json_text(content))
            return parsed, elapsed_ms, None
    except HTTPError as http_err:
        elapsed_ms = (time.monotonic() - t0) * 1000.0
        err_body = http_err.read().decode("utf-8", errors="replace")[:300]
        return None, elapsed_ms, f"HTTPError {http_err.code}: {err_body}"
    except Exception as exc:
        elapsed_ms = (time.monotonic() - t0) * 1000.0
        return None, elapsed_ms, str(exc)


def run_benchmark_on_sample(
    sample: Dict[str, Any],
    local_model: str = "qwen3:8b",
    openai_model: str = "gpt-6-luna",
    local_base_url: str = "http://localhost:11434/v1",
    openai_base_url: str = "https://api.openai.com/v1",
) -> Dict[str, Any]:
    """Runs inference for a single fire sample on both models."""
    sample_id = sample.get("benchmark_sample_id") or sample.get("event_id")
    kinematics = sample.get("kinematics", {})
    weather = sample.get("weather", {})
    wind_alignment = sample.get("wind_alignment", {})

    prompt_payload = {
        "event_id": sample.get("event_id"),
        "status": sample.get("status"),
        "duration_hours": sample.get("duration_hours"),
        "waypoint_count": sample.get("waypoint_count"),
        "origin_centroid": sample.get("origin_centroid"),
        "current_centroid": sample.get("current_centroid"),
        "kinematics": kinematics,
        "weather": weather,
        "wind_alignment": wind_alignment,
    }
    prompt_str = json.dumps(prompt_payload, ensure_ascii=False, indent=2)

    # Run Local and OpenAI models concurrently
    openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        local_future = executor.submit(
            call_openai_chat,
            model=local_model,
            prompt=prompt_str,
            api_key="ollama",
            base_url=local_base_url,
            timeout=120.0,
            temperature=0.2,
        )
        openai_future = executor.submit(
            call_openai_chat,
            model=openai_model,
            prompt=prompt_str,
            api_key=openai_api_key,
            base_url=openai_base_url,
            timeout=60.0,
            temperature=None,
        )
        local_out, local_latency, local_err = local_future.result()
        openai_out, openai_latency, openai_err = openai_future.result()

    return {
        "sample_id": sample_id,
        "ground_truth": {
            "bearing_deg": kinematics.get("current_bearing_deg") or kinematics.get("net_bearing_deg"),
            "compass_dir": kinematics.get("current_compass_dir") or kinematics.get("net_compass_dir"),
            "ros_kmh": kinematics.get("current_ros_kmh"),
            "duration_hours": sample.get("duration_hours"),
            "frp_trend": kinematics.get("frp_trend"),
            "total_frp_mw": kinematics.get("total_frp_mw"),
            "wind_speed_kmh": weather.get("wind_speed_kmh"),
            "humidity_pct": weather.get("relative_humidity_pct"),
            "wind_alignment_status": wind_alignment.get("status"),
        },
        "local_model": {
            "model_name": local_model,
            "latency_ms": round(local_latency, 1),
            "error": local_err,
            "response": local_out,
        },
        "openai_model": {
            "model_name": openai_model,
            "latency_ms": round(openai_latency, 1),
            "error": openai_err,
            "response": openai_out,
        },
    }


def execute_full_comparative_benchmark(
    dataset_file: Path,
    output_log_file: Path,
    max_samples: Optional[int] = None,
    local_model: str = "qwen3:8b",
    openai_model: str = "gpt-6-luna",
) -> Path:
    """Executes comparative benchmark across all dataset samples and writes JSONL log with checkpoint resumption."""
    with open(dataset_file, "r", encoding="utf-8") as f:
        samples = json.load(f)

    if max_samples:
        samples = samples[:max_samples]

    output_log_file.parent.mkdir(parents=True, exist_ok=True)

    # Check for existing completed records to support resume
    completed_ids: Set[str] = set()
    if output_log_file.exists():
        with open(output_log_file, "r", encoding="utf-8") as existing_f:
            for line in existing_f:
                line = line.strip()
                if line:
                    try:
                        rec = json.loads(line)
                        if "sample_id" in rec:
                            completed_ids.add(rec["sample_id"])
                    except Exception:
                        pass

    logger.info(
        "Starting comparative benchmark: %d total samples (%d already completed). Local: %s | OpenAI: %s",
        len(samples),
        len(completed_ids),
        local_model,
        openai_model,
    )

    with open(output_log_file, "a", encoding="utf-8") as out_f:
        for idx, sample in enumerate(samples, start=1):
            sid = sample.get("benchmark_sample_id", f"SAMPLE-{idx:03d}")
            if sid in completed_ids:
                logger.info("[%d/%d] Skipping already completed %s", idx, len(samples), sid)
                continue

            logger.info("[%d/%d] Evaluating %s in parallel (Local & OpenAI)...", idx, len(samples), sid)
            res = run_benchmark_on_sample(
                sample,
                local_model=local_model,
                openai_model=openai_model,
            )
            out_f.write(json.dumps(res, ensure_ascii=False) + "\n")
            out_f.flush()
            completed_ids.add(sid)
            logger.info(
                "[%d/%d] Done %s -> Local: %.1fs (Err=%s), OpenAI: %.1fs (Err=%s)",
                idx,
                len(samples),
                sid,
                res["local_model"]["latency_ms"] / 1000.0,
                bool(res["local_model"]["error"]),
                res["openai_model"]["latency_ms"] / 1000.0,
                bool(res["openai_model"]["error"]),
            )

    logger.info("Benchmark complete. %d total records in %s", len(completed_ids), output_log_file)
    return output_log_file


if __name__ == "__main__":
    data_path = ROOT_DIR / "data" / "benchmark" / "real_firms_50_events.json"
    log_path = ROOT_DIR / "data" / "benchmark" / "results" / "comparison_log.jsonl"
    execute_full_comparative_benchmark(data_path, log_path)
