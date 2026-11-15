"""
Statistical Evaluation Engine for Wildfire Spread LLM Benchmark.
Implements:
1. McNemar's Test with Edwards Continuity Correction & Exact Binomial for Hallucination Rates.
2. Wilcoxon Signed-Rank Test for Non-Parametric Paired Score Comparisons.
3. Cohen's Linear Weighted Kappa (kappa_w) for Risk Level Agreement.
4. Paired Student's t-test, Shapiro-Wilk Normality Test, and Cohen's d Effect Size for Latency.
"""

import json
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import scipy.stats as stats

RISK_LEVEL_ORDER = ["LOW", "MODERATE", "HIGH", "EXTREME"]
VALID_SPREAD_MECHANISMS = [
    "WIND_DRIVEN",
    "FUEL_DRIVEN",
    "SLOPE_DRIVEN",
    "TOPOGRAPHY_SLOPE",
    "PLUME_DOMINATED",
    "STATIONARY",
    "SUPPRESSED",
    "FUEL_OR_TERRAIN_DOMINATED",
    "FLANKING_OR_FUEL_DRIVEN",
    "FUEL_OR_SLOPE_DRIVEN",
]

COMPASS_SECTORS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
]


def _extract_bearing_or_compass(text: str) -> Optional[str]:
    """Finds compass direction mentions in text."""
    if not text:
        return None
    for sec in COMPASS_SECTORS:
        # Match whole word compass direction
        if re.search(rf"\b{sec}\b", text, re.IGNORECASE):
            return sec.upper()
    return None


def evaluate_response_consistency(
    ground_truth: Dict[str, Any],
    response: Optional[Dict[str, Any]],
    error_msg: Optional[str] = None,
) -> Tuple[int, List[str], float]:
    """
    Evaluates kinematic hallucination and quality score for a single model response.
    Returns:
        (is_hallucination: int (1 or 0), failure_reasons: List[str], quality_score: float (0.0 to 10.0))
    """
    if error_msg or not response or not isinstance(response, dict):
        return 1, [f"Inference error or invalid JSON: {error_msg}"], 0.0

    failures = []
    quality_points = 10.0

    # 1. Structural schema compliance
    required_keys = ["risk_level", "spread_mechanism", "threat_zone", "forecast_6h", "tactical_recommendations"]
    missing = [k for k in required_keys if k not in response or not response[k]]
    if missing:
        failures.append(f"Missing required schema keys: {missing}")
        quality_points -= len(missing) * 1.5

    # 2. Risk level validity
    risk = str(response.get("risk_level", "")).upper()
    if risk not in RISK_LEVEL_ORDER:
        failures.append(f"Invalid risk_level '{risk}'")
        quality_points -= 2.0

    # 3. Spread mechanism validity
    mech = str(response.get("spread_mechanism", "")).upper()
    if not any(v in mech for v in VALID_SPREAD_MECHANISMS):
        failures.append(f"Unrecognized spread_mechanism '{mech}'")
        quality_points -= 1.0

    # 4. Kinematic consistency checks
    gt_dir = ground_truth.get("compass_dir")
    summary_text = (
        str(response.get("summary_vi", ""))
        + " " + str(response.get("threat_zone", ""))
        + " " + str(response.get("forecast_6h", ""))
    )

    # 4a. Extreme Direction Hallucination
    # If ground truth has a dominant direction and the model states an opposite direction (180 deg)
    detected_sec = _extract_bearing_or_compass(summary_text)
    if gt_dir and detected_sec:
        try:
            gt_idx = COMPASS_SECTORS.index(gt_dir)
            det_idx = COMPASS_SECTORS.index(detected_sec)
            sector_diff = abs(gt_idx - det_idx)
            if sector_diff > 8:
                sector_diff = 16 - sector_diff
            # If difference is 6 or more sectors (>= 135 degrees), direction is contradicted
            if sector_diff >= 6:
                failures.append(f"Direction hallucination: Ground truth {gt_dir} vs model {detected_sec}")
                quality_points -= 3.0
        except ValueError:
            pass

    # 4b. Extrapolated 6h Distance / ROS Hallucination
    gt_ros = ground_truth.get("ros_kmh")
    if gt_ros is not None and gt_ros > 0:
        expected_dist = gt_ros * 6.0
        # Search for numbers followed by km in forecast_6h
        dist_matches = re.findall(r"(\d+(?:\.\d+)?)\s*(?:km|cây số)", response.get("forecast_6h", ""))
        if dist_matches:
            try:
                reported_dist = float(dist_matches[0])
                # If reported distance is > 5x expected distance or < 0.1x (and expected > 0.5 km)
                if expected_dist > 0.5 and (reported_dist > expected_dist * 5.0 or reported_dist < expected_dist * 0.1):
                    failures.append(
                        f"Unrealistic 6h projected distance: {reported_dist} km vs expected ~{expected_dist:.2f} km"
                    )
                    quality_points -= 2.5
            except ValueError:
                pass

    # 4c. Wind Alignment Physical Consistency
    wind_status = ground_truth.get("wind_alignment_status")
    wind_speed = ground_truth.get("wind_speed_kmh", 0)
    # If wind is near zero (< 3 km/h) but model claims WIND_DRIVEN
    if wind_speed < 3.0 and "WIND" in mech:
        failures.append(f"Physical contradiction: Wind speed {wind_speed} km/h but mechanism is '{mech}'")
        quality_points -= 2.0

    # Final scoring bounds
    quality_score = max(0.0, min(10.0, quality_points))
    is_hallucination = 1 if len(failures) > 0 else 0

    return is_hallucination, failures, round(quality_score, 2)


def compute_mcnemar_test(
    errors_a: List[int],
    errors_b: List[int],
    name_a: str = "Local",
    name_b: str = "OpenAI",
) -> Dict[str, Any]:
    """
    Computes McNemar's Test with Edwards Continuity Correction and Exact Binomial Test.
    H0: Error rate of Model A == Error rate of Model B on paired samples.
    """
    if len(errors_a) != len(errors_b):
        raise ValueError("Paired samples must have equal length.")

    n = len(errors_a)
    # Contingency Table:
    #                 Model B Error=0   Model B Error=1
    # Model A Error=0       a                 b
    # Model A Error=1       c                 d
    a = sum(1 for ea, eb in zip(errors_a, errors_b) if ea == 0 and eb == 0)
    b = sum(1 for ea, eb in zip(errors_a, errors_b) if ea == 0 and eb == 1)
    c = sum(1 for ea, eb in zip(errors_a, errors_b) if ea == 1 and eb == 0)
    d = sum(1 for ea, eb in zip(errors_a, errors_b) if ea == 1 and eb == 1)

    discordant = b + c
    if discordant == 0:
        chi2 = 0.0
        p_val_chi2 = 1.0
        p_val_exact = 1.0
    else:
        # Edwards continuity correction: (|b - c| - 1)^2 / (b + c)
        chi2 = ((abs(b - c) - 1.0) ** 2) / float(discordant) if abs(b - c) > 1.0 else 0.0
        p_val_chi2 = float(stats.chi2.sf(chi2, df=1))
        # Exact two-sided binomial test on discordant pairs
        binom_res = stats.binomtest(k=b, n=discordant, p=0.5, alternative="two-sided")
        p_val_exact = float(binom_res.pvalue)

    odds_ratio = float(c / b) if b > 0 else (float("inf") if c > 0 else 1.0)

    return {
        "n_samples": n,
        "contingency_table": {
            f"{name_a}_ok_{name_b}_ok (a)": a,
            f"{name_a}_ok_{name_b}_err (b)": b,
            f"{name_a}_err_{name_b}_ok (c)": c,
            f"{name_a}_err_{name_b}_err (d)": d,
        },
        "discordant_pairs": discordant,
        "chi2_statistic": round(chi2, 4),
        "df": 1,
        "p_value_chi2": round(p_val_chi2, 6),
        "p_value_exact_binomial": round(p_val_exact, 6),
        "odds_ratio": round(odds_ratio, 4) if not math.isinf(odds_ratio) else "Infinity",
        "error_rate_a": round(sum(errors_a) / n, 4),
        "error_rate_b": round(sum(errors_b) / n, 4),
        "significant_p05": p_val_exact < 0.05,
    }


def compute_wilcoxon_test(
    scores_a: List[float],
    scores_b: List[float],
    name_a: str = "Local",
    name_b: str = "OpenAI",
) -> Dict[str, Any]:
    """
    Computes Wilcoxon Signed-Rank Test for non-parametric paired ordinal/continuous scores.
    H0: Median difference between Model A and Model B quality scores is zero.
    """
    diffs = np.array(scores_a) - np.array(scores_b)
    non_zero_diffs = diffs[diffs != 0]

    if len(non_zero_diffs) == 0:
        return {
            "n_samples": len(scores_a),
            "non_zero_pairs": 0,
            "statistic": 0.0,
            "p_value": 1.0,
            "mean_diff": 0.0,
            "median_diff": 0.0,
            "effect_size_r": 0.0,
            "significant_p05": False,
        }

    res = stats.wilcoxon(scores_a, scores_b, alternative="two-sided")
    stat = float(res.statistic)
    p_val = float(res.pvalue)

    # Effect size r = Z / sqrt(N)
    # Using normal approximation of Wilcoxon for Z
    n_nz = len(non_zero_diffs)
    mean_w = n_nz * (n_nz + 1) / 4.0
    std_w = math.sqrt(n_nz * (n_nz + 1) * (2 * n_nz + 1) / 24.0)
    z_score = (stat - mean_w) / std_w if std_w > 0 else 0.0
    effect_r = abs(z_score) / math.sqrt(n_nz) if n_nz > 0 else 0.0

    return {
        "n_samples": len(scores_a),
        "non_zero_pairs": int(n_nz),
        "statistic": round(stat, 4),
        "z_score": round(z_score, 4),
        "p_value": round(p_val, 6),
        "mean_score_a": round(float(np.mean(scores_a)), 3),
        "mean_score_b": round(float(np.mean(scores_b)), 3),
        "mean_diff": round(float(np.mean(diffs)), 3),
        "median_diff": round(float(np.median(diffs)), 3),
        "effect_size_r": round(effect_r, 4),
        "significant_p05": p_val < 0.05,
    }


def compute_weighted_kappa(
    ratings_a: List[str],
    ratings_b: List[str],
    categories: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Computes Cohen's Linear Weighted Kappa (kappa_w) for ordinal categories.
    weight_ij = 1 - |i - j| / (k - 1)
    """
    cats = categories or RISK_LEVEL_ORDER
    k = len(cats)
    cat_to_idx = {c: i for i, c in enumerate(cats)}

    indices_a = [cat_to_idx.get(str(r).upper(), 0) for r in ratings_a]
    indices_b = [cat_to_idx.get(str(r).upper(), 0) for r in ratings_b]
    n = len(indices_a)

    if n == 0:
        return {"kappa_weighted": 0.0, "observed_agreement": 0.0, "expected_agreement": 0.0}

    # Confusion matrix
    conf = np.zeros((k, k), dtype=np.float64)
    for ia, ib in zip(indices_a, indices_b):
        conf[ia, ib] += 1.0

    # Linear weights
    w = np.zeros((k, k), dtype=np.float64)
    for i in range(k):
        for j in range(k):
            w[i, j] = 1.0 - abs(i - j) / float(k - 1)

    # Observed agreement
    p_o = np.sum(w * conf) / float(n)

    # Expected agreement
    row_sum = np.sum(conf, axis=1) / float(n)
    col_sum = np.sum(conf, axis=0) / float(n)
    p_e = np.sum(w * np.outer(row_sum, col_sum))

    if abs(1.0 - p_e) < 1e-9:
        kappa = 1.0
    else:
        kappa = (p_o - p_e) / (1.0 - p_e)

    # Interpretation guideline (Landis & Koch, 1977)
    if kappa < 0:
        interp = "Poor agreement"
    elif kappa <= 0.20:
        interp = "Slight agreement"
    elif kappa <= 0.40:
        interp = "Fair agreement"
    elif kappa <= 0.60:
        interp = "Moderate agreement"
    elif kappa <= 0.80:
        interp = "Substantial agreement"
    else:
        interp = "Almost perfect agreement"

    return {
        "n_samples": n,
        "kappa_weighted": round(float(kappa), 4),
        "observed_agreement": round(float(p_o), 4),
        "expected_agreement": round(float(p_e), 4),
        "interpretation": interp,
    }


def analyze_latencies(
    latencies_a: List[float],
    latencies_b: List[float],
    name_a: str = "Local",
    name_b: str = "OpenAI",
) -> Dict[str, Any]:
    """
    Performs parametric and non-parametric hypothesis tests on inference latencies.
    Tests normality with Shapiro-Wilk, computes Paired t-test and Cohen's d.
    """
    arr_a = np.array(latencies_a)
    arr_b = np.array(latencies_b)
    diffs = arr_a - arr_b

    # Shapiro-Wilk test on differences (requires n >= 3)
    if len(diffs) >= 3:
        shapiro_stat, shapiro_p = stats.shapiro(diffs)
        is_normal = bool(shapiro_p >= 0.05)
        shapiro_p_val = round(float(shapiro_p), 6)
    else:
        shapiro_stat, shapiro_p = 0.0, 1.0
        is_normal = True
        shapiro_p_val = 1.0

    # Paired Student's t-test
    ttest_res = stats.ttest_rel(arr_a, arr_b)
    t_stat = float(ttest_res.statistic)
    t_p = float(ttest_res.pvalue)

    # Cohen's d = mean(diff) / std(diff, ddof=1)
    std_d = float(np.std(diffs, ddof=1))
    cohens_d = float(np.mean(diffs) / std_d) if std_d > 0 else 0.0

    return {
        "model_a": {
            "name": name_a,
            "mean_ms": round(float(np.mean(arr_a)), 1),
            "std_ms": round(float(np.std(arr_a, ddof=1)), 1),
            "median_ms": round(float(np.median(arr_a)), 1),
            "iqr_ms": round(float(np.percentile(arr_a, 75) - np.percentile(arr_a, 25)), 1),
            "min_ms": round(float(np.min(arr_a)), 1),
            "max_ms": round(float(np.max(arr_a)), 1),
        },
        "model_b": {
            "name": name_b,
            "mean_ms": round(float(np.mean(arr_b)), 1),
            "std_ms": round(float(np.std(arr_b, ddof=1)), 1),
            "median_ms": round(float(np.median(arr_b)), 1),
            "iqr_ms": round(float(np.percentile(arr_b, 75) - np.percentile(arr_b, 25)), 1),
            "min_ms": round(float(np.min(arr_b)), 1),
            "max_ms": round(float(np.max(arr_b)), 1),
        },
        "difference": {
            "mean_diff_ms": round(float(np.mean(diffs)), 1),
            "median_diff_ms": round(float(np.median(diffs)), 1),
            "shapiro_wilk_p": shapiro_p_val,
            "is_normally_distributed": bool(is_normal),
            "paired_t_statistic": round(t_stat, 4),
            "paired_t_p_value": round(t_p, 6),
            "cohens_d": round(cohens_d, 4),
            "significant_latency_diff_p05": t_p < 0.05,
        },
    }


def evaluate_benchmark_log(log_file: Path) -> Dict[str, Any]:
    """
    Parses comparison_log.jsonl and runs the complete statistical test suite.
    """
    records = []
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line.strip()))

    errors_local, errors_openai = [], []
    scores_local, scores_openai = [], []
    risks_local, risks_openai = [], []
    lats_local, lats_openai = [], []

    detail_evals = []

    for rec in records:
        gt = rec.get("ground_truth", {})
        loc = rec.get("local_model", {})
        oai = rec.get("openai_model", {})

        loc_err, loc_reasons, loc_score = evaluate_response_consistency(
            gt, loc.get("response"), loc.get("error")
        )
        oai_err, oai_reasons, oai_score = evaluate_response_consistency(
            gt, oai.get("response"), oai.get("error")
        )

        errors_local.append(loc_err)
        errors_openai.append(oai_err)
        scores_local.append(loc_score)
        scores_openai.append(oai_score)

        risk_loc = (loc.get("response") or {}).get("risk_level", "UNKNOWN")
        risk_oai = (oai.get("response") or {}).get("risk_level", "UNKNOWN")
        risks_local.append(risk_loc)
        risks_openai.append(risk_oai)

        lats_local.append(loc.get("latency_ms", 0.0))
        lats_openai.append(oai.get("latency_ms", 0.0))

        detail_evals.append({
            "sample_id": rec.get("sample_id"),
            "local": {"hallucination": loc_err, "score": loc_score, "failures": loc_reasons},
            "openai": {"hallucination": oai_err, "score": oai_score, "failures": oai_reasons},
        })

    mcnemar_res = compute_mcnemar_test(errors_local, errors_openai, "Qwen3_8B", "GPT6_Luna")
    wilcoxon_res = compute_wilcoxon_test(scores_local, scores_openai, "Qwen3_8B", "GPT6_Luna")
    kappa_res = compute_weighted_kappa(risks_local, risks_openai)
    latency_res = analyze_latencies(lats_local, lats_openai, "Qwen3_8B", "GPT6_Luna")

    return {
        "dataset_size": len(records),
        "mcnemar_hallucination_test": mcnemar_res,
        "wilcoxon_quality_test": wilcoxon_res,
        "weighted_kappa_agreement": kappa_res,
        "latency_analysis": latency_res,
        "detail_evaluations": detail_evals,
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        log_p = Path(sys.argv[1])
        result = evaluate_benchmark_log(log_p)
        print(json.dumps(result, indent=2, ensure_ascii=False))
