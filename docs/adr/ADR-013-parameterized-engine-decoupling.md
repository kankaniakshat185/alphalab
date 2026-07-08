# ADR 013: Parameterized Engine Decoupling

## Status
Accepted

## Date
2026-07-08 (Phase 5)

## Context
During the initial implementation of the Backtesting and Robustness Engines, instances of `NIFTY50Universe()` and hardcoded `start_date` / `end_date` pairs were instantiated directly inside the evaluation loops (e.g., `run_robustness`). This tightly coupled the core evaluation engines to a specific financial universe (NIFTY 50) and made unit testing difficult, as tests would attempt to fetch actual NIFTY 50 constraints and DuckDB date ranges.

## Decision
We refactored `run_robustness()` (and the worker tasks) to accept `tickers: list[str]`, `start_date: date`, and `end_date: date` as explicit parameters, rather than resolving them internally. The responsibility of resolving the `Universe` constituents and determining the date range was pushed outward to the `worker/tasks.py` layer.

## Rationale
1. **Dependency Injection**: By passing raw data structures (`list[str]`, `date`) into the engine, the engine is fully decoupled from the `alphalab.data.universe` abstractions.
2. **Testability**: Unit testing the engine no longer requires complex mocking of `NIFTY50Universe` or DuckDB file paths. We can pass arbitrary mock tickers and dates directly into the engine's methods.
3. **Future Extension**: If AlphaLab expands to support Russell 3000 or custom user-defined universes, the engine code will require exactly zero changes.

## Consequences
- **Positive**: High testability, strict adherence to the Clean Architecture boundaries (outer layers handle specific data resolving, inner domain layers handle raw evaluation).
- **Negative**: The Celery worker layer now has slightly more responsibility (it must resolve the Universe before passing the list of strings to the engine), but this correctly aligns with the Controller/Orchestrator pattern.
