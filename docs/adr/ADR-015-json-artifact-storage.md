# ADR 015: JSON Storage for Experiment Artifacts

**Date:** 2026-07-08

## Status
Accepted

## Context
Each evaluated factor produces complex data structures:
1. **Backtest Equity Curve:** A daily timeseries of cumulative returns (`[{"date": "...", "cumulative_return": 1.05}, ...]`).
2. **Robustness Grid:** A multidimensional grid of perturbation scenarios and their results (`[{"perturbation": "noise", "level": 0.05, "sharpe": 1.4, "retention": 0.93}, ...]`).

We had to decide how to persist these artifacts in PostgreSQL.
- **Option A (JSON Columns):** Add `JSONB` columns (`equity_curve`, `perturbation_grid`) directly to the `BacktestResult` and `RobustnessResult` tables.
- **Option B (Relational Normalization):** Create separate tables like `EquityCurvePoint (id, backtest_id, date, cumulative_return)` and `PerturbationGridPoint (id, robustness_id, perturbation, level, sharpe, retention)`.

## Decision
We chose **Option A**. We will store experiment artifacts as structured JSON arrays inside `JSONB` columns directly on the result models. 

## Consequences
- **Performance & Simplicity:** Retrieving a factor's results requires only a single `SELECT` statement without massive table joins. The frontend almost exclusively requests these artifacts in their entirety to render charts or tables.
- **Write Efficiency:** The worker can dump the entire generated array into the database in one upsert, rather than performing bulk inserts of thousands of row-level points.
- **Query Limitations:** We lose the ability to perform complex cross-experiment SQL aggregations (e.g., "Find all factors that had a cumulative return > 1.5 on 2021-01-01") efficiently. However, AlphaLab treats these artifacts as immutable, read-only outputs for specific runs, so this analytical query pattern is not required for the web application.
- **Frontend Contract:** We mitigate the risk of arbitrary JSON schema drift by enforcing strict Pydantic Response DTOs in the FastAPI layer, ensuring the frontend always receives well-typed JSON structures regardless of how they are stored in the database.
