# ADR 010: Single Celery Queue Architecture

## Status
Accepted

## Date
2026-07-07 (Phase 4)

## Context
AlphaLab requires background execution for long-running factor backtests and robustness stress tests. We need to decide how to route tasks in Celery. Many enterprise architectures default to multi-queue setups (e.g., separate queues for backtests, robustness, reports) to ensure high priority tasks aren't blocked by low priority ones.

## Decision
We will use a single Celery queue (`celery`) for all background tasks in v1. 

## Rationale
1. **YAGNI (You Aren't Gonna Need It):** AlphaLab v1 is a portfolio project and research tool, not a multi-tenant SaaS application operating at scale. A single queue is sufficient to prove the async architecture.
2. **Operational Simplicity:** Multiple queues require multiple worker configurations, complex routing rules, and more moving parts in `docker-compose.yml`.
3. **Master Plan Alignment:** The Master Plan explicitly lists "Multi-queue Celery" under *Deliberately Deferred Features*, noting that "Single queue is sufficient. Multi-queue adds operational complexity without measured benefit."

## Consequences
- **Positive:** Simpler deployment, easier debugging, and less boilerplate in `tasks.py`.
- **Negative:** If a user submits a massive batch of robustness tests, standard backtests will be queued behind them until workers free up. We accept this limitation for v1.
