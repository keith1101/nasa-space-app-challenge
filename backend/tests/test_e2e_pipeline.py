"""
Backend Pytest Integration for 4-Tier E2E Pipeline
NASA Space Apps Challenge — SPHEREx & Planet X Explorer

Integrates with tests/e2e_test_suite.py to allow standard pytest discovery
when running from the backend directory (e.g. pytest tests/ or pytest backend/tests/).
"""

import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
TESTS_DIR = os.path.join(ROOT_DIR, "tests")

if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)

from e2e_test_suite import (
    TestTier1FeatureCoverage,
    TestTier2BoundaryAndCornerCases,
    TestTier3CrossFeatureCombinations,
    TestTier4RealWorldApplicationScenarios,
)

__all__ = [
    "TestTier1FeatureCoverage",
    "TestTier2BoundaryAndCornerCases",
    "TestTier3CrossFeatureCombinations",
    "TestTier4RealWorldApplicationScenarios",
]
