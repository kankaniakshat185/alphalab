# AlphaLab — Next Stage

> **Upcoming phase:** Phase 6 — Backend API Expansion
> **Depends on:** Phase 5 — Robustness Engine complete ✅
> **Last updated:** 2026-07-06

---

## Objective

Expand the FastAPI backend API router to support the frontend screens:
1.  **Factor Leaderboard (`GET /leaderboard`)**:
    *   Expose a sortable leaderboard containing factor details, formulas, Sharpe, IC, and Robustness overall scores.
2.  **Factor Details (`GET /factors/{factor_id}`)**:
    *   Retrieve completed backtest performance metrics, stress test ratios, and failure reasons for a single factor.
3.  **Factor Backtest/Robustness Details (`GET /factors/{factor_id}/backtest` and `GET /factors/{factor_id}/robustness`)**:
    *   Dedicated endpoints for retrieving underlying dataset values, equity curve series, and the noise x missing-data grid coordinates.

---

## Deliverables

| Deliverable | Description |
|---|---|
| Leaderboard Endpoint | `GET /leaderboard` sorting by Sharpe, IC, or Robustness score. |
| Factor Router | `src/alphalab/api/routers/factors.py` for factor metrics, backtest details, and robustness details. |
| Phase 6 Tests | Integration tests validating leaderboard retrieval and factor queries. |

---

## Files Expected to Change or Be Created

```
src/alphalab/api/routers/
    factors.py          (NEW: Factor and Leaderboard routes)

src/alphalab/api/main.py
    (Register factors router)

tests/api/
    test_factors.py     (NEW: API endpoints test suite)

docs/
    02_CURRENT_STATE.md  Updated: Phase 6 complete
    03_NEXT_STAGE.md     Rewritten: Phase 7 (Research Reports)

internal/
    development_log/Phase_06.md
```
