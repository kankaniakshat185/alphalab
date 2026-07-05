# AlphaLab — Current State

> **Current phase:** Phase 2 — Factor DSL ✅ Complete
> **Next phase:** Phase 3 — Backtesting Engine
> **Last updated:** 2026-07-05

---

## Phase 2 Summary

Phase 2 established a secure Domain-Specific Language (DSL) compiler for quantitative factors:
1.  **Abstract Syntax Tree (AST)**: Core node definitions representing mathematical formulas.
2.  **Lexer & Parser**: A from-scratch recursive descent parser converting raw strings like `Momentum(20) / Volatility(30)` into ASTs.
3.  **Static Validator**: Pre-execution AST traversal to catch look-ahead bias (e.g., negative shifts in `Lag`) and invalid windows.
4.  **Pandas Compiler**: Code generator that converts validated ASTs into executable Python functions operating natively on Pandas DataFrames.

---

## What Is Complete

### Repository Structure
*   `src/alphalab/data/`: Data ingestion, validation, and storage. (Phase 1)
*   `src/alphalab/api/`: FastAPI routes, async db connections, model schemas, token authentication. (Phase 1)
*   `src/alphalab/worker/`: Celery task definitions. (Phase 1)
*   `src/alphalab/dsl/`: Lexer, Parser, AST, Validator, and Pandas Compiler. (Phase 2)
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
