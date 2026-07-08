# ADR 014: Experiment Result Versioning

**Date:** 2026-07-08

## Status
Accepted

## Context
When an experiment is run, it generates artifacts including a backtest equity curve and a robustness perturbation grid. If a user re-runs an experiment (perhaps after fixing data issues, or if the backend re-executes a failed job), we must decide whether to retain historical results (versioning) or overwrite them.

Implementing full historical result versioning requires:
- Tracking `run_id` as a separate entity from `experiment_id`.
- Storing multiple instances of `BacktestResult` and `RobustnessResult` per factor.
- API complexity to query specific historical runs.

However, AlphaLab v1 treats an `Experiment` and its `Factors` as immutable declarations of intent. If an experiment is "re-run," it is logically the *same* experiment, just being evaluated again (e.g., against newer market data or to recover from a transient failure). 

## Decision
An experiment has a single canonical result. Re-running overwrites previous outputs. Historical run versioning is deferred.

The backend API and database schema (`BacktestResult` and `RobustnessResult`) are tied 1:1 to a `Factor`. When the Celery worker re-evaluates a factor, it performs an upsert (update if exists, else insert) on these tables.

## Consequences
- **Simplicity:** The API only ever serves the latest, canonical result for a factor. The database schema does not need complex version tracking.
- **Frontend ease:** The frontend does not need a "run history" dropdown. It displays exactly what the API returns.
- **Loss of history:** If a factor's performance changes dramatically between re-runs (e.g. due to updated market data), the user cannot see the older result. If a user wants to preserve historical outputs explicitly, they must create a *new* experiment.
