# AlphaLab — Current State

> **Current phase:** Phase 3 — Backtesting Engine ✅ Complete
> **Next phase:** Phase 4 — Background Workers
> **Last updated:** 2026-07-06

---

## Phase 3 Summary

Phase 3 established the vectorized backtesting engine to evaluate compiled DSL factors over historical data:
1.  **Evaluator (`evaluator.py`)**: Applies the compiled DSL function per-ticker across historical data safely without data leakage.
2.  **Portfolio Constructor (`portfolio.py`)**: Converts raw alpha signals into target long/short portfolio weights via cross-sectional Z-Scoring, enforcing dollar-neutrality.
3.  **Metrics Calculator (`metrics.py`)**: Computes core performance KPIs including annualized Sharpe Ratio, Max Drawdown, and Information Coefficient (IC).

---

## What Is Complete

### Repository Structure
*   `src/alphalab/data/`: Data ingestion, validation, and storage. (Phase 1)
*   `src/alphalab/api/`: FastAPI routes, async db connections, model schemas, token authentication. (Phase 1)
*   `src/alphalab/worker/`: Celery task definitions. (Phase 1)
*   `src/alphalab/dsl/`: Lexer, Parser, AST, Validator, and Pandas Compiler. (Phase 2)
*   `src/alphalab/engine/`: Backtesting evaluator, portfolio constructor, and metrics. (Phase 3)
*   `alembic/`: Database migration versions.
*   `tests/`: Extensive test suite covering data, endpoints, hashing, celery, and the DSL compiler.

### Configuration & Tooling
*   All linter, formatting, and static typing checks pass.

---

## What Does Not Exist Yet

| Component | Phase |
|---|---|
| Backtesting engine | 3 |
| Celery task runner execution logic | 4 |
| Robustness engine | 5 |
| API Factor submission endpoints | 6 |
| Research report generator | 7 |
| Next.js frontend | 8 |

---

## Next

→ See [`docs/03_NEXT_STAGE.md`](03_NEXT_STAGE.md) for Phase 3 — Backtesting Engine.
