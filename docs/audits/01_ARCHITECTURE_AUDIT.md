# AlphaLab Architecture Audit

**Date:** 2026-07-06
**Scope:** Architecture correctness (Phases 0–4)
**Focus:** Boundaries, Dependencies, Abstractions, and SRP.

---

## 1. Package Boundaries & Dependency Direction

**Question:** Is the layered architecture intact? Do dependencies point strictly inwards toward the domain?

### Finding 1: Strict Domain Isolation
**Verification Status:** ✓ Verified by execution
**Evidence:** 
Running dependency cross-checks (`grep -r "from alphalab.api" src/alphalab/engine` and `src/alphalab/data`) yields 0 results. 
**Reasoning:** The `engine` and `data` packages represent the core domain. They are entirely decoupled from the delivery mechanisms (`api` and `worker`). This isolation guarantees that the backtesting math can be run purely from a script or Jupyter notebook without ever importing FastAPI or Celery.
**Recommendation:** None. The boundaries are perfectly maintained.

### Finding 2: Storage Leakage in Worker
**Verification Status:** ✓ Verified by code
**Evidence:** `src/alphalab/worker/tasks.py` Line 81.
```python
res = conn.execute("SELECT MIN(date), MAX(date) FROM ohlcv").fetchone()
```
**Reasoning:** The background worker reaches across the boundary to execute raw SQL against the DuckDB connection. The `worker` package should not know the underlying table names or schema of the data layer. This couples the worker to DuckDB specifically.
**Recommendation:** Refactor. Add `get_available_date_range()` to the `Storage` interface in `data/storage/base.py`.

---

## 2. Abstractions

**Question:** Are the abstractions justified? Is there overengineering?

### Provider Abstraction
**Verification Status:** ✓ Verified by code
**Evidence:** `src/alphalab/data/providers/provider.py` and `yahoo_provider.py`.
**Reasoning:** Financial APIs are notoriously fragile. Abstracting `yfinance` behind `MarketDataProvider` is not overengineering; it is mandatory defensive programming to allow swapping to Polygon/Alpaca if Yahoo is rate-limited.
**Conclusion:** Highly justified.

### Universe Abstraction
**Verification Status:** ✓ Verified by code
**Evidence:** `src/alphalab/data/universe/base.py`.
**Reasoning:** Backtesting requires point-in-time constituent resolution to prevent survivorship bias. Hardcoding a static list of 50 tickers would invalidate the research thesis. 
**Conclusion:** Mandatory abstraction.

### Factor AST
**Verification Status:** ✓ Verified by code
**Evidence:** `src/alphalab/dsl/ast.py`.
**Reasoning:** We could have used Python's `eval()` for the DSL. Instead, we built a Lexer -> Parser -> AST -> Compiler pipeline. While this borders on overengineering for a simple web app, it is the *only* way to statically analyze formulas for look-ahead bias (e.g., negative lags) before execution. 
**Conclusion:** Justified by strict research rigor requirements.

---

## 3. Coupling & Cohesion

**Question:** Are modules tightly cohesive and loosely coupled?

### Finding: The Compiler Pipeline is Highly Cohesive
**Verification Status:** ✓ Verified by code
**Evidence:** 
- `src/alphalab/dsl/parser.py` (Syntax Analysis only)
- `src/alphalab/dsl/validator.py` (Semantic Validation only)
- `src/alphalab/dsl/compiler.py` (Code Generation only)
**Reasoning:** Each file does exactly one thing. The compiler has zero coupling to the validation rules, and the validator has zero coupling to Pandas generation. 

### Finding: `tasks.py` is Highly Coupled (God Object)
**Verification Status:** ✓ Verified by code
**Evidence:** `src/alphalab/worker/tasks.py` Lines 60–149.
**Reasoning:** The `_run_backtest_async` function couples PostgreSQL database sessions, DuckDB raw connections, DSL compilation, and Factor evaluation into a single sequential block. It violates the Single Responsibility Principle entirely.
**Recommendation:** Extract all orchestration into a `BacktestOrchestrator` service.

---

## 4. Underengineering

**Question:** Did we simplify anything to the point of structural weakness?

### Finding: Missing Domain Models for Experiment Orchestration
**Verification Status:** ⚠ Inferred
**Evidence:** The absence of a dedicated `ExperimentRunner` or `BacktestService` in `src/alphalab/engine/`.
**Reasoning:** We treated the Celery task as the entry point for backtesting. Because there is no underlying domain service that runs an entire experiment end-to-end, the Celery task was forced to absorb that logic. This is underengineering on the orchestration side.
**Recommendation:** Create an explicit `ExperimentRunner` service class before proceeding to Phase 5.

---

## Conclusion

The architecture is broadly correct, but the orchestration logic (tasks.py) is currently suffering from underengineering (lack of a dedicated service layer) which has forced it to become tightly coupled to both DB engines and the compiler.

**Action Required:** Implement a Service Layer pattern for the `ExperimentRunner` to decouple the celery worker from the underlying operations before beginning Phase 5.
