# AlphaLab — Current State

> **Current phase:** Phase 8 — Next.js Frontend 🚧 In Progress
> **Next phase:** Polish & Launch
> **Last updated:** 2026-07-11

---

## Phase 8 Summary (In Progress)

Phase 8 focuses on building the Next.js frontend to interact with the backend APIs:
1. **Factor Leaderboard & Dashboard**: Created a highly polished client dashboard displaying platform-wide "Research Grade" metrics.
2. **Detail Retrieval**: Built the individual factor results view integrating the "Strategy Grade Rating" to evaluate specific algorithm robustness and Sharpe ratio.
3. **Methodology & Flow**: Revamped the flow page and methodology documentation for transparent algorithmic logic, integrating a Python-syntax styling for grading algorithms.
4. **UI Polishing**: Standardized equal-sized top navigation buttons, fixed tooltip overlay components, and cleaned up development scratch files.

---

## What Is Complete

### Repository Structure
*   `src/alphalab/data/`: Data ingestion, validation, and storage. (Phase 1)
*   `src/alphalab/dsl/`: Lexer, Parser, AST, Validator, and Pandas Compiler. (Phase 2)
*   `src/alphalab/engine/`: Backtesting evaluator, portfolio constructor, metrics, and robustness evaluator. (Phase 3, 5)
*   `src/alphalab/worker/`: Celery task definitions and execution logic. (Phase 4, 5)
*   `src/alphalab/api/`: FastAPI routes, async db connections, model schemas, token authentication, and factor endpoints. (Phase 1, 6)
*   `web/`: Next.js frontend application. (Phase 8 - In Progress)
*   `alembic/`: Database migration versions.
*   `tests/`: Extensive test suite covering data, endpoints, hashing, celery, backtest/robustness calculations, and the DSL compiler.

### Configuration & Tooling
*   All linter, formatting, and static typing checks pass.

---

## What Does Not Exist Yet

| Component | Phase |
|---|---|
| Research report generator | 7 |

---

## Next

→ See [`docs/03_NEXT_STAGE.md`](03_NEXT_STAGE.md) for Phase 7 — Research Reports (or remaining Phase 8 tasks).
