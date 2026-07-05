# ADR-005 — Analytical Database Choice (DuckDB)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-05 |
| **Phase** | 1 — Data Foundation |
| **Deciders** | Vaishnavi Rai, Akshat Kankani |

---

## Context

AlphaLab requires storing millions of daily stock price records (OHLCV) and millions of calculated factor metrics. The backtesting engine frequently runs rolling-window operations (e.g., 20-day moving averages or 30-day standard deviations) over the entire time-series.

While PostgreSQL is selected for transaction metadata (users, experiments, job status, results), it is a row-oriented relational database (OLTP). Running heavy analytical rolling-window queries over large tables in PostgreSQL is slow and puts substantial load on the transactional database.

We need a dedicated analytical database (OLAP) that is:
1.  **Columnar**: Optimised for aggregations and scans.
2.  **Serverless/Embedded**: Easy to install and run locally without setting up heavy servers.
3.  **Performant**: Integrates natively with Python numerical analysis tools (Pandas, Polars, NumPy).

---

## Decision

Use **DuckDB** as the analytical database engine:
1.  All daily price data (`ohlcv`), universe intervals (`universe`), and compiled factor results (`factor_values`) will be saved in a local, git-ignored DuckDB database file (`internal/data/alphalab.db`).
2.  FastAPI and worker nodes read from and write to this database using the `duckdb` library.
3.  Table creation and indexing are delegated to a dedicated `SchemaManager` to decouple it from storage drivers.

---

## Alternatives Considered

### Option A — PostgreSQL Only (Rejected)
Storing historical price tables directly in PostgreSQL.
*   *Why Rejected*: Poor query performance for analytical tasks. Calculating rolling averages and doing full-table scans is resource-heavy, and it restricts scaling to larger universes.

### Option B — TimescaleDB (Rejected)
An extension for PostgreSQL designed for time-series.
*   *Why Rejected*: Operational overhead. TimescaleDB requires running a server container, is difficult to set up on free hosting providers (such as Render or Neon), and increases development environment complexity.

### Option C — Pandas / Parquet Files on Disk (Rejected)
Saving raw parquet files and loading them entirely into memory for every backtest.
*   *Why Rejected*: Lacks SQL support. Writing filters, joins, and universe mappings on raw files is slower and requires writing complex memory management code.

---

## Tradeoffs

| Tradeoff | Assessment |
|---|---|
| **Two-Database Complexity** | We must manage two databases (PostgreSQL for metadata + DuckDB for prices). However, the separation is clean: OLTP handles users/results, OLAP handles data. |
| **Concurrent Write Locks** | DuckDB locks the database file when writing. We mitigate this by using Redis queues (Celery) to run ingestion and data updates in single-worker batch pipelines. |

---

## Consequences

*   Backtests load data in milliseconds because DuckDB reads parquet/columnar formats instantly.
*   Database reads return Pandas DataFrames natively with zero network overhead.
*   Development environment setup remains lightweight: only requires installing a Python library (no external server required).
