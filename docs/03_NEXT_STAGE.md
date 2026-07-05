# AlphaLab — Next Stage

> **Upcoming phase:** Phase 3 — Backtesting Engine
> **Depends on:** Phase 1 & 2 complete ✅
> **Last updated:** 2026-07-05

---

## Objective

Design and build the vectorized backtesting engine that evaluates compiled Factor DSL functions over historical data.

The engine must:
*   Accept a compiled Factor DSL callable.
*   Fetch historical market data (`Price`, `Volume`, etc.) from DuckDB.
*   Apply the factor function across the DataFrame to generate alpha signals.
*   Simulate long/short portfolio construction based on these signals.
*   Calculate core performance metrics (Sharpe Ratio, Max Drawdown, Information Coefficient).

---

## Deliverables

| Deliverable | Description |
|---|---|
| Vectorized Evaluator | Applies the factor to the asset universe matrix efficiently. |
| Portfolio Constructor | Translates raw alpha signals into target portfolio weights. |
| Performance Calculator | Calculates cumulative returns and risk metrics. |
| Phase 3 Tests | Unit tests validating metric calculations against known data. |
| Phase 3 ADRs | Decisions on signal-to-weight translation methods (e.g. rank-based vs z-score). |

---

## Files Expected to Change or Be Created

```
src/alphalab/engine/
    __init__.py
    evaluator.py       (Executes DSL output against DataFrames)
    portfolio.py       (Weight allocation)
    metrics.py         (Sharpe, Drawdown, etc.)

tests/
    engine/
        test_evaluator.py
        test_portfolio.py
        test_metrics.py

docs/
    02_CURRENT_STATE.md      Updated: Phase 3 complete
    03_NEXT_STAGE.md         Rewritten: Phase 4
    adr/
        ADR-009-portfolio-construction.md

internal/
    development_log/Phase_03.md
```
