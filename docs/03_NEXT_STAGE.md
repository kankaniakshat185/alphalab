# AlphaLab — Next Stage

> **Upcoming phase:** Phase 4 — Background Workers & Asynchronous Execution
> **Depends on:** Phase 1, 2, & 3 complete ✅
> **Last updated:** 2026-07-06

---

## Objective

Design and implement the Celery worker tasks that orchestrate the pipeline from DSL compilation to Factor Evaluation and database storage.

The background worker must:
*   Receive a task via Redis (e.g., `run_backtest(factor_id)`).
*   Fetch the factor metadata from PostgreSQL.
*   Compile the DSL string into a Pandas callable.
*   Run the FactorEvaluator, PortfolioConstructor, and PerformanceCalculator.
*   Write the results back to the `backtest_results` PostgreSQL table and update the job status.

---

## Deliverables

| Deliverable | Description |
|---|---|
| Celery Tasks | `src/alphalab/worker/tasks.py` defining the async entrypoints. |
| DB Integrations | Connecting the SQLAlchemy DB session within the Celery worker context. |
| Phase 4 Tests | Integration tests that mock Redis/Postgres and trigger full end-to-end task execution. |

---

## Files Expected to Change or Be Created

```
src/alphalab/worker/
    tasks.py           (Celery task definitions)
    celery_app.py      (Celery configuration and routing)

tests/worker/
    test_tasks.py      (Task execution mocks)

docs/
    02_CURRENT_STATE.md      Updated: Phase 4 complete
    03_NEXT_STAGE.md         Rewritten: Phase 5 (Robustness)

internal/
    development_log/Phase_04.md
```
