# AlphaLab — Current State

> **Current phase:** Phase 6 — Backend API Expansion ✅ Complete
> **Next phase:** Phase 7 — Research Reports
> **Last updated:** 2026-07-08

---

## Phase 6 Summary

Phase 6 expanded the FastAPI backend to expose strictly typed endpoints for the frontend application:
1. **Factor Leaderboard (`/factors/leaderboard`)**: Implemented paginated, sortable queries against PostgreSQL for all evaluated factors.
2. **Detail Retrieval (`/factors/{id}`, `/factors/{id}/backtest`, `/factors/{id}/robustness`)**: Implemented distinct DTOs to cleanly serve artifact data.
3. **Structured Persistence**: Modified the `BacktestResult` and `RobustnessResult` database tables to store `equity_curve` and `perturbation_grid` as structured JSON objects, rather than recomputing them dynamically or normalizing them unnecessarily.

---

## What Is Complete

### Repository Structure
*   `src/alphalab/data/`: Data ingestion, validation, and storage. (Phase 1)
*   `src/alphalab/dsl/`: Lexer, Parser, AST, Validator, and Pandas Compiler. (Phase 2)
*   `src/alphalab/engine/`: Backtesting evaluator, portfolio constructor, metrics, and robustness evaluator. (Phase 3, 5)
*   `src/alphalab/worker/`: Celery task definitions and execution logic. (Phase 4, 5)
*   `src/alphalab/api/`: FastAPI routes, async db connections, model schemas, token authentication, and factor endpoints. (Phase 1, 6)
*   `alembic/`: Database migration versions.
*   `tests/`: Extensive test suite covering data, endpoints, hashing, celery, backtest/robustness calculations, and the DSL compiler.

### Configuration & Tooling
*   All linter, formatting, and static typing checks pass.

---

## What Does Not Exist Yet

| Component | Phase |
|---|---|
| Research report generator | 7 |
| Next.js frontend | 8 |

---

## Next

→ See [`docs/03_NEXT_STAGE.md`](03_NEXT_STAGE.md) for Phase 7 — Research Reports.
