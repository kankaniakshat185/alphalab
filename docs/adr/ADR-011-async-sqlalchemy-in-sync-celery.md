# ADR 011: Handling Async SQLAlchemy in Synchronous Celery Workers

## Status
Accepted

## Date
2026-07-07 (Phase 4)

## Context
AlphaLab's backend (FastAPI) is built using modern asynchronous Python, and we use SQLAlchemy with the `asyncpg` driver for PostgreSQL interactions. However, Celery—our chosen background task queue—is fundamentally synchronous and does not natively support `async def` task functions without third-party plugins or convoluted event-loop management. 

We need to save `BacktestResult` and `RobustnessResult` to PostgreSQL from within Celery workers using our existing async SQLAlchemy session maker.

## Decision
We will execute async database operations inside synchronous Celery tasks by wrapping them in `asyncio.run()`. We will encapsulate this in async helper functions (e.g. `_save_backtest_result`) that are called by the synchronous `@celery_app.task` function.

## Rationale
1. **Consistency:** This allows us to use the exact same async SQLAlchemy models and engine configuration that the FastAPI app uses, preventing the need for a duplicate synchronous engine (`psycopg2`).
2. **Simplicity:** Rather than migrating to an async-native task queue (like ARQ or SAQ) which would require learning a new API and ecosystem, we stick with the industry standard (Celery) and bridge the gap explicitly at the boundary.
3. **Isolation:** Each Celery task spawns its own short-lived event loop via `asyncio.run()`, ensuring clean execution without interfering with global state or other threads.

## Consequences
- **Positive:** We maintain a single, unified asynchronous database layer across the entire application.
- **Negative:** Minor overhead from creating and destroying an asyncio event loop for every task execution, but this is negligible given that backtests take seconds to run.
