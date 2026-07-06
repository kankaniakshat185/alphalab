# AlphaLab Testing Audit

**Date:** 2026-07-06
**Scope:** Test Suite Reliability & Coverage (Phases 0–4)
**Focus:** Missing tests, external APIs, determinism, and coverage.

---

## 1. Actual Coverage & Missing Tests

**Question:** What is well tested, and what is dangerously ignored?

### Finding 1: Core Domain is Bulletproof
**Verification Status:** ✓ Verified by execution
**Evidence:** 
Executing `pytest --cov=src/alphalab --cov-report=term-missing` outputs:
- `TOTAL`: 84%
- `src/alphalab/dsl/`: >92%
- `src/alphalab/engine/`: >84%
**Reasoning:** The computational heavy lifting—parsing formulas for lookahead bias and running Pandas vectorized math—is extensively covered. The fact that the `dsl` compiler sits at 92%+ coverage means we can trust that arbitrary strings won't crash the evaluator or execute malicious code.
**Recommendation:** Excellent.

### Finding 2: Severe IO Testing Gaps
**Verification Status:** ✓ Verified by execution
**Evidence:**
- `src/alphalab/data/providers/yahoo_provider.py`: 16% coverage.
- `src/alphalab/worker/tasks.py`: 64% coverage.
**Reasoning:** The system has an inverted "testing hourglass." The purely logical inner components are perfect, but the outer boundaries that actually touch the real world (Yahoo Finance HTTP calls and Celery task orchestration) are highly undertested. Without mocking Yahoo's API in the test suite, we cannot guarantee the system will gracefully handle a `503 Service Unavailable` error when trying to fetch market data.
**Recommendation:** Integrate `responses` or `vcrpy` to mock HTTP payloads for `yahoo_provider.py` and test API failure recovery.

---

## 2. Edge Cases & Deterministic Behavior

**Question:** Does the test suite account for real-world market imperfections?

### Finding 1: Proactive Edge-Case Mocking
**Verification Status:** ✓ Verified by execution
**Evidence:** The recent fix committed to `src/alphalab/data/validation/schema.py` (Line 72) where `datetime.date` was colliding with Pandas `Timestamp` during test execution. 
**Reasoning:** The test suite uses mock datasets that successfully replicate the exact type-mismatch bugs that occur between mocked Python objects and real Yahoo Finance dataframes. Because the `SchemaValidator` is tested against these edges, it caught a type-casting bug before production.
**Recommendation:** Continue building edge-case fixtures (e.g., DataFrames containing missing days, splits, and NaN values) for the evaluator tests.

### Finding 2: Lack of Deterministic Seed Enforcement
**Verification Status:** ⚠ Inferred
**Evidence:** Currently, no tests explicitly assert randomness using fixed `random.seed(42)` or `np.random.seed(42)`.
**Reasoning:** As we approach Phase 5 (Robustness Engine), we will be generating Gaussian noise. If the test suite does not enforce fixed RNG seeds, the tests will become flaky, passing 99% of the time and randomly failing when the synthetic noise exceeds a threshold.
**Recommendation:** Mandate the use of `pytest-randomly` or explicitly hardcode `np.random.seed` fixtures inside the upcoming `test_robustness.py` file to guarantee deterministic test runs.

---

## Final Verdict

**Do I trust this repository?** Yes, but strictly within a controlled environment. 

I trust the math, and I trust the compiler. I do *not* trust the external boundaries yet. Because `yahoo_provider.py` lacks coverage, a sudden API change from Yahoo could bring the entire ingestion pipeline down without a single test failing beforehand. 

**Preconditions for Production:** 
Mocking the external API calls and extracting the Celery orchestration logic into a testable Domain Service are mandatory before this repository can be completely trusted in a live, automated environment.
