"""
Unit tests for the Statistical Evaluation Engine.
Verifies McNemar's Test, Wilcoxon Signed-Rank Test, Cohen's Weighted Kappa,
and Latency statistical tests against known ground truth matrices.
"""

import unittest
from backend.benchmark.statistical_evaluator import (
    compute_mcnemar_test,
    compute_wilcoxon_test,
    compute_weighted_kappa,
    analyze_latencies,
    evaluate_response_consistency,
)


class TestStatisticalEvaluator(unittest.TestCase):

    def test_mcnemar_identical_models(self):
        """When paired models make the exact same errors, p-value should be 1.0."""
        errors_a = [0, 1, 0, 1, 0, 0, 1, 0]
        errors_b = [0, 1, 0, 1, 0, 0, 1, 0]
        res = compute_mcnemar_test(errors_a, errors_b)
        self.assertEqual(res["discordant_pairs"], 0)
        self.assertEqual(res["chi2_statistic"], 0.0)
        self.assertEqual(res["p_value_exact_binomial"], 1.0)
        self.assertFalse(res["significant_p05"])

    def test_mcnemar_significant_difference(self):
        """When Model A has 25 errors and Model B has 0 errors on discordant pairs."""
        # 30 samples: 25 where A=1 & B=0, 5 where A=0 & B=0
        errors_a = [1] * 25 + [0] * 5
        errors_b = [0] * 30
        res = compute_mcnemar_test(errors_a, errors_b)
        self.assertEqual(res["discordant_pairs"], 25)
        self.assertTrue(res["significant_p05"])
        self.assertLess(res["p_value_exact_binomial"], 0.001)
        self.assertGreater(res["chi2_statistic"], 20.0)

    def test_wilcoxon_identical_scores(self):
        """When scores are identical, p-value should be 1.0."""
        scores_a = [8.5, 9.0, 7.5, 8.0, 9.5]
        scores_b = [8.5, 9.0, 7.5, 8.0, 9.5]
        res = compute_wilcoxon_test(scores_a, scores_b)
        self.assertEqual(res["non_zero_pairs"], 0)
        self.assertEqual(res["p_value"], 1.0)
        self.assertEqual(res["effect_size_r"], 0.0)

    def test_wilcoxon_significant_difference(self):
        """When Model B consistently scores higher than Model A across 20 samples."""
        scores_a = [6.0 + (i % 3) * 0.5 for i in range(20)]
        scores_b = [9.0 + (i % 3) * 0.5 for i in range(20)]
        res = compute_wilcoxon_test(scores_a, scores_b)
        self.assertEqual(res["non_zero_pairs"], 20)
        self.assertTrue(res["significant_p05"])
        self.assertLess(res["p_value"], 0.001)
        self.assertGreater(res["effect_size_r"], 0.7)

    def test_weighted_kappa_perfect_agreement(self):
        """Identical risk classifications must yield kappa = 1.0."""
        ratings = ["LOW", "MODERATE", "HIGH", "EXTREME", "HIGH", "MODERATE"]
        res = compute_weighted_kappa(ratings, ratings)
        self.assertEqual(res["kappa_weighted"], 1.0)
        self.assertEqual(res["observed_agreement"], 1.0)
        self.assertEqual(res["interpretation"], "Almost perfect agreement")

    def test_weighted_kappa_partial_agreement(self):
        """Adjacent risk classifications (LOW vs MODERATE) should have high linear agreement."""
        ratings_a = ["LOW", "MODERATE", "HIGH", "HIGH"]
        ratings_b = ["MODERATE", "MODERATE", "HIGH", "EXTREME"]
        res = compute_weighted_kappa(ratings_a, ratings_b)
        self.assertGreater(res["kappa_weighted"], 0.40)
        self.assertLessEqual(res["kappa_weighted"], 1.0)

    def test_latency_analysis(self):
        """Verifies paired t-test, normality test, and effect size calculations."""
        lats_a = [1500.0, 1600.0, 1550.0, 1700.0, 1650.0, 1580.0, 1620.0, 1690.0]
        lats_b = [500.0, 520.0, 480.0, 510.0, 530.0, 490.0, 515.0, 505.0]
        res = analyze_latencies(lats_a, lats_b, "ModelA", "ModelB")
        self.assertGreater(res["difference"]["paired_t_statistic"], 10.0)
        self.assertTrue(res["difference"]["significant_latency_diff_p05"])
        self.assertGreater(res["difference"]["cohens_d"], 5.0)

    def test_evaluate_response_consistency_grounding(self):
        """Evaluates hallucination detection on compliant vs distorted responses."""
        gt = {
            "compass_dir": "SE",
            "ros_kmh": 1.5,
            "wind_alignment_status": "WIND_DRIVEN_HEADFIRE",
            "wind_speed_kmh": 22.0,
        }

        # Compliant response
        good_resp = {
            "risk_level": "HIGH",
            "spread_mechanism": "WIND_DRIVEN",
            "summary_vi": "Đám cháy lan nhanh về phía SE với tốc độ cao.",
            "threat_zone": "Khu vực sườn SE bán kính 10 km",
            "forecast_6h": "Dự báo trong 6h mũi lửa tiến 9.0 km theo hướng SE.",
            "tactical_recommendations": ["Tạo ranh cản lửa tại phía SE"],
        }
        is_hal, reasons, score = evaluate_response_consistency(gt, good_resp)
        self.assertEqual(is_hal, 0)
        self.assertEqual(len(reasons), 0)
        self.assertGreaterEqual(score, 9.0)

        # Distorted response (contradicting direction: NW instead of SE; 180 degrees opposite)
        bad_resp = {
            "risk_level": "EXTREME",
            "spread_mechanism": "FUEL_DRIVEN",
            "summary_vi": "Lửa đang bốc lên và lan mạnh về phía NW.",
            "threat_zone": "Khu vực NW",
            "forecast_6h": "Dự báo lan 500 km về phía NW.",  # Unrealistic distance
            "tactical_recommendations": ["Di tản khẩn cấp"],
        }
        is_hal, reasons, score = evaluate_response_consistency(gt, bad_resp)
        self.assertEqual(is_hal, 1)
        self.assertGreaterEqual(len(reasons), 2)
        self.assertLess(score, 6.0)


if __name__ == "__main__":
    unittest.main()
