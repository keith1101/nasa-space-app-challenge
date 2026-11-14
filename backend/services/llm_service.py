"""
Provider-Agnostic LLM Service for Tactical Wildfire Behavior Analysis.
Supports:
1. Google Gemini (REST / SDK)
2. OpenAI API
3. Local OpenAI-compatible LLMs (Ollama, vLLM, llama.cpp)
4. Offline Heuristic Fallback Engine (Zero-failure demo mode)
"""

import json
import logging
import os
from typing import Dict, Any, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger("llm_service")

SYSTEM_PROMPT = """Bạn là Sĩ quan Phân tích Tác chiến Cứu hỏa Rừng (Wildfire Tactical Intelligence Officer).
Nhiệm vụ của bạn là tiếp nhận telemetry đo đạc không-thời gian (kinematics) từ dữ liệu vệ tinh NASA FIRMS kết hợp dữ liệu khí tượng Open-Meteo, sau đó lập báo cáo tình huống (Tactical SITREP) và đánh giá hướng đe dọa.

Quy tắc bắt buộc:
1. KHÔNG tự ý suy đoán lại tọa độ, góc la bàn hay thời gian cháy. Phải trích dẫn và sử dụng chính xác các số liệu đã được tính toán trong telemetry.
2. Đối chiếu góc lan truyền của lửa với hướng gió thổi để kết luận cơ chế lan (Wind-driven, Slope-driven hay Fuel-driven).
3. Đánh giá cấp độ rủi ro (LOW, MODERATE, HIGH, EXTREME) dựa trên độ ẩm, vận tốc gió và xu hướng FRP.
4. Đưa ra dự báo trong 6-12 giờ tới và đề xuất hành động ngăn chặn theo chiến thuật khoanh vùng đường băng cản lửa.
5. Bắt buộc trả về đúng định dạng JSON hợp lệ (không kèm văn bản thừa ngoài JSON) theo cấu trúc:
{
  "summary_vi": "Tóm tắt ngắn gọn tình hình (2-3 câu tiếng Việt)",
  "risk_level": "LOW|MODERATE|HIGH|EXTREME",
  "spread_mechanism": "WIND_DRIVEN|SLOPE_DRIVEN|FUEL_DRIVEN|STATIONARY",
  "threat_zone": "Mô tả vùng nguy cơ chịu ảnh hưởng chính",
  "forecast_6h": "Dự báo hướng và cự ly lan truyền trong 6 giờ tới",
  "tactical_recommendations": [
    "Khuyến nghị tác chiến 1",
    "Khuyến nghị tác chiến 2",
    "Khuyến nghị tác chiến 3"
  ],
  "sitrep_markdown": "Toàn văn báo cáo chiến thuật định dạng Markdown chuyên nghiệp"
}"""


def _generate_heuristic_sitrep(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic rule-based tactical SITREP generator.
    Guarantees reliable, mathematically grounded responses even when completely offline or unauthenticated.
    """
    event_id = telemetry.get("event_id", "FE-UNKNOWN")
    duration_h = float(telemetry.get("duration_hours", 0.0))
    kinematics = telemetry.get("kinematics", {})
    weather = telemetry.get("weather", {})
    wind_align = telemetry.get("wind_alignment", {})

    compass_dir = kinematics.get("current_compass_dir") or kinematics.get("net_compass_dir", "N/A")
    bearing_deg = kinematics.get("current_bearing_deg") or kinematics.get("net_bearing_deg", 0.0)
    ros_kmh = float(kinematics.get("current_ros_kmh", 0.0))
    total_frp = float(kinematics.get("total_frp_mw", 0.0))
    frp_trend = kinematics.get("frp_trend", "STABLE")

    wind_spd = float(weather.get("wind_speed_kmh", 12.0))
    rh_pct = float(weather.get("relative_humidity_pct", 50.0))
    align_status = wind_align.get("status", "MODERATE_WIND_DRIVEN")

    # Determine risk level
    if (rh_pct < 30.0 and wind_spd >= 20.0 and total_frp > 100.0) or (duration_h >= 24.0 and wind_spd >= 20.0 and total_frp >= 75.0):
        risk_level = "EXTREME"
    elif rh_pct < 45.0 and (wind_spd >= 15.0 or total_frp > 50.0):
        risk_level = "HIGH"
    elif total_frp > 20.0 or duration_h > 6.0:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    # Mechanism
    if "STRONG_WIND" in align_status or "MODERATE_WIND" in align_status:
        mechanism = "WIND_DRIVEN"
        mech_vi = "Lan mạnh thuận chiều gió thổi"
    elif "OPPOSING" in align_status:
        mechanism = "SLOPE_DRIVEN"
        mech_vi = "Lửa leo dốc sườn đồi hoặc cháy ngún ngược gió"
    else:
        mechanism = "FUEL_DRIVEN"
        mech_vi = "Cháy sườn theo vệt thảm thực vật liên tục"

    proj_distance_6h = round(ros_kmh * 6.0, 2)
    if proj_distance_6h < 0.2:
        proj_distance_6h = round(max(0.3, wind_spd * 0.05), 2)

    summary_vi = (
        f"Vụ cháy {event_id} đã duy trì trong {duration_h:.1f} giờ với tổng năng lượng bức xạ {total_frp:.1f} MW. "
        f"Vector lan truyền hiện tại hướng về phía {compass_dir} ({bearing_deg:.1f}°) với vận tốc {ros_kmh:.2f} km/h, "
        f"cơ chế chính: {mech_vi}."
    )

    threat_zone = f"Hành lang sườn phía {compass_dir} trong bán kính {proj_distance_6h + 1.0:.1f} km tính từ tâm hỏa hoạn"
    forecast_6h = (
        f"Dự báo trong 6 giờ tới, mũi lửa có xu hướng tiến thêm xấp xỉ {proj_distance_6h} km về hướng {compass_dir} "
        f"với xu hướng năng lượng {frp_trend}."
    )

    recs = [
        f"Triển khai đường băng cản lửa (firebreak) đón đầu tại hướng {compass_dir} cách tâm đám cháy tối thiểu {proj_distance_6h + 0.5:.1f} km.",
        f"Bố trí trạm quan sát cảnh giới tàn lửa bay (spotting fires) do gió {wind_spd:.1f} km/h có thể cuốn tàn than qua khoảng cách 300-500m.",
        f"Ưu tiên bảo vệ các khu vực thảm thực vật dày và tài sản dân sinh phía hạ lưu gió ({wind_align.get('wind_towards_deg', 0)}°).",
    ]

    sitrep_md = f"""### BÁO CÁO TÁC CHIẾN TÌNH HÌNH HỎA HOẠN (TACTICAL SITREP)
**Mã sự kiện:** `{event_id}` | **Mức độ rủi ro:** `{risk_level}`
* **Thời gian cháy tích lũy:** {duration_h:.1f} giờ
* **Vector lan truyền:** Hướng **{compass_dir}** ({bearing_deg:.1f}°) | Vận tốc lan: **{ros_kmh:.2f} km/h**
* **Năng lượng bức xạ (FRP):** {total_frp:.1f} MW (Xu hướng: `{frp_trend}`)
* **Khí tượng hiện trường:** Gió {wind_spd:.1f} km/h | Độ ẩm không khí: {rh_pct:.1f}% | Nhiệt độ: {weather.get('temperature_c', 30.0):.1f}°C
* **Tương quan Gió - Lửa:** {wind_align.get('description', 'Bình thường')}

#### 1. Đánh giá Tác chiến & Cơ chế Lan truyền
Đám cháy đang hoạt động theo cơ chế **{mechanism}**. Với độ ẩm {rh_pct:.1f}% và vận tốc gió {wind_spd:.1f} km/h, điều kiện bắt cháy tại thảm cỏ và bìa rừng rất nhạy cảm.

#### 2. Dự báo Đe dọa trong 6-12 Giờ Tới
{forecast_6h}

#### 3. Phương án Ngăn chặn Khuyến nghị
1. {recs[0]}
2. {recs[1]}
3. {recs[2]}
"""

    return {
        "summary_vi": summary_vi,
        "risk_level": risk_level,
        "spread_mechanism": mechanism,
        "threat_zone": threat_zone,
        "forecast_6h": forecast_6h,
        "tactical_recommendations": recs,
        "sitrep_markdown": sitrep_md,
        "model_provider": "heuristic_engine_grounded",
    }


def analyze_fire_spread_with_llm(
    telemetry: Dict[str, Any],
    provider: Optional[str] = None,
    timeout_seconds: float = 20.0,
) -> Dict[str, Any]:
    """
    Analyzes fire telemetry using configured LLM provider (gemini, openai, local, or fallback).
    """
    chosen_provider = (
        provider
        or os.environ.get("LLM_PROVIDER")
        or ("gemini" if os.environ.get("GEMINI_API_KEY") else None)
        or ("openai" if os.environ.get("OPENAI_API_KEY") else None)
        or "local"
    )

    user_content = json.dumps(telemetry, ensure_ascii=False, indent=2)

    # 1. Google Gemini
    if chosen_provider == "gemini":
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if api_key:
            model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"{SYSTEM_PROMPT}\n\n[DỮ LIỆU TELEMETRY]\n{user_content}"}
                        ],
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.2,
                },
            }
            try:
                req = Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                )
                with urlopen(req, timeout=timeout_seconds) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    cand = data.get("candidates", [])[0]
                    text = cand.get("content", {}).get("parts", [])[0].get("text", "")
                    parsed = json.loads(text)
                    parsed["model_provider"] = f"gemini ({model})"
                    return parsed
            except Exception as e:
                logger.warning("Gemini API call failed (%s). Falling back.", e)

    # 2. OpenAI or Local OpenAI-compatible (Ollama, vLLM)
    if chosen_provider in ("openai", "local", "ollama"):
        if chosen_provider == "openai":
            base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
            api_key = os.environ.get("OPENAI_API_KEY", "")
            model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        else:
            base_url = os.environ.get("LOCAL_LLM_BASE_URL", "http://localhost:11434/v1")
            api_key = os.environ.get("LOCAL_LLM_API_KEY", "ollama")
            model = os.environ.get("LOCAL_LLM_MODEL", "qwen2.5:7b")

        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        try:
            req = Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
            )
            with urlopen(req, timeout=timeout_seconds) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                text = data["choices"][0]["message"]["content"]
                parsed = json.loads(text)
                parsed["model_provider"] = f"{chosen_provider} ({model})"
                return parsed
        except Exception as e:
            logger.warning("%s call failed (%s). Falling back to heuristic generator.", chosen_provider, e)

    # Fallback to robust deterministic generator
    return _generate_heuristic_sitrep(telemetry)
