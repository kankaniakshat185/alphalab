# AlphaLab — Next Stage

> **Upcoming phase:** Phase 5 — Robustness Engine & Noise Perturbation
> **Depends on:** Phase 1, 2, 3, & 4 complete ✅
> **Last updated:** 2026-07-06

---

## Objective

Design and implement the **Robustness Engine** that evaluates factor stability under synthetic stress tests.

The robustness worker must:
*   Receive a task via Redis (`run_robustness_task(factor_id)`).
*   Perturb the cleaned pricing dataset in DuckDB using:
    1.  **Gaussian noise** additions to Close/AdjClose prices.
    2.  **Missing data simulation** by dropping chunks of dates/bars.
*   Run the factor evaluation and portfolio return calculations over these perturbed datasets.
*   Compute the **Robustness Ratio** comparing the stressed Sharpe ratio to the baseline Sharpe ratio.
*   Write the results (`noise_score`, `missing_data_score`, `overall_score`, `failure_reasons`) back to the `robustness_results` PostgreSQL table and update the status tracker.

---

## Deliverables

| Deliverable | Description |
|---|---|
| Robustness Evaluator | `src/alphalab/engine/robustness.py` implementing Gaussian and missing data perturbations. |
| Worker Updates | Connect `tasks.py` robustness job call to the actual robustness evaluator. |
| Phase 5 Tests | Unit and integration tests validating that noise is injected and overall scores are computed accurately. |

---

## Files Expected to Change or Be Created

```
src/alphalab/engine/
    robustness.py      (NEW: Noise perturbation and scores calculator)

src/alphalab/worker/
    tasks.py           (Update _run_robustness_async to trigger real evaluations)

tests/engine/
    test_robustness.py (NEW: Perturbation unit tests)

docs/
    02_CURRENT_STATE.md      Updated: Phase 5 complete
    03_NEXT_STAGE.md         Rewritten: Phase 6 (API Expansion)

internal/
    development_log/Phase_05.md
```
