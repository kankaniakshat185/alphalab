# AlphaLab Interview Defense Audit

**Date:** 2026-07-06
**Scope:** Architectural Defensibility (Phases 0–4)
**Focus:** Can a Staff Engineer candidate confidently defend these decisions in a system design interview?

---

## 1. DuckDB over PostgreSQL for Market Data

**Decision:** Using DuckDB for OHLCV data instead of the existing PostgreSQL instance.
**Defense Rating:** Excellent

**The Defense:**
*   **Why this architecture?** Market data is inherently analytical and time-series based. Querying millions of historical daily bars (`SELECT close FROM ohlcv WHERE ticker IN (...)`) requires massive sequential reads. PostgreSQL is row-oriented (OLTP) and would thrash the disk loading unnecessary columns. DuckDB is a columnar OLAP engine, executing these queries orders of magnitude faster using vectorized execution.
*   **Tradeoffs:** DuckDB is embedded (in-process). It does not natively support concurrent multi-writer setups over a network like PostgreSQL.
*   **Scaling path:** If the system scales to petabytes, we would migrate to Parquet files on S3 partitioned by date, queried via Amazon Athena or Snowflake.

## 2. The Custom Factor DSL

**Decision:** Building a Lexer/Parser/AST pipeline instead of using Python's `eval()` for user-submitted formulas.
**Defense Rating:** Excellent

**The Defense:**
*   **Why this architecture?** Allowing users to submit raw Python strings to an `eval()` function is a catastrophic security vulnerability (Remote Code Execution). Furthermore, in quantitative finance, the biggest risk is **look-ahead bias** (accidentally shifting a dataset backwards to peek into the future). Statically analyzing an AST allows us to structurally reject any negative-lag window parameters *before* the code ever executes.
*   **Tradeoffs:** High initial engineering cost. A 5-stage compiler pipeline takes days to build compared to a 10-minute `eval()` implementation.
*   **Scaling path:** The AST can eventually be compiled into highly optimized C++ or Cython arrays rather than Pandas dataframes, providing massive speedups without changing the user's DSL syntax.

## 3. Celery & Redis for Background Execution

**Decision:** Offloading backtests to Celery instead of running them synchronously in FastAPI endpoints.
**Defense Rating:** Good

**The Defense:**
*   **Why this architecture?** Backtesting is highly CPU-bound. FastAPI relies on an asynchronous event loop designed for I/O bound tasks (like waiting for database responses). Running a 15-second matrix multiplication on the FastAPI thread would block the entire web server, causing timeouts for all other users.
*   **Tradeoffs:** It introduces distributed systems complexity, requiring a Redis broker and separate worker containers to be managed, monitored, and scaled.
*   **Future extension:** We can implement multiple Celery queues (e.g., `fast_eval`, `heavy_robustness`) to route different workloads to differently provisioned worker nodes.

## 4. The `MarketDataProvider` Abstraction

**Decision:** Encapsulating `yfinance` behind an Abstract Base Class.
**Defense Rating:** Excellent

**The Defense:**
*   **Why this architecture?** Financial APIs are notorious for deprecation, rate-limiting, or shutting down entirely (e.g., Yahoo Finance's historical API changes). By relying strictly on the `Provider` interface, the data pipeline is completely decoupled from the vendor. 
*   **Tradeoffs:** Slight increase in boilerplate code compared to direct API calls.
*   **Future extension:** Swapping to an institutional provider (like Polygon.io, Alpaca, or Bloomberg) requires zero changes to the `DataPipeline`; we simply implement a `PolygonProvider` and bind it.

## 5. Point-in-Time Universe Resolution

**Decision:** Storing and querying constituent membership by date rather than querying a static list of the "current" NIFTY 50.
**Defense Rating:** Excellent

**The Defense:**
*   **Why this architecture?** **Survivorship Bias.** If we test a strategy today using only the companies currently in the NIFTY 50, we artificially inflate returns because we are guaranteeing that every company we traded "survived" until today. The `Universe` abstraction accurately recreates the index exactly as it existed on any historical date, including companies that later went bankrupt.
*   **Failure modes:** If the historical membership dataset is incomplete, the engine fails silently by querying the wrong assets. We mitigate this using strict data validation suites.

## 6. Worker Orchestration (`tasks.py`)

**Decision:** The Celery worker directly executes domain logic, DuckDB queries, and evaluation steps.
**Defense Rating:** Poor

**The Defense:**
*   **Why this architecture?** It was a fast iteration to prove end-to-end connectivity during Phase 4.
*   **Why not alternatives?** It should have been extracted into an `ExperimentRunner` Service Layer.
*   **Interview Impact:** If presented as a final architectural design, a Staff Engineer candidate would be heavily penalized for violating the Single Responsibility Principle. The worker is tightly coupled to the persistence layer, making it extremely difficult to unit test (currently at 64% coverage). This is the only major piece of technical debt in the system and must be refactored before moving forward.

## 7. Backtesting via Pandas Vectorization

**Decision:** Using Pandas `.groupby().apply()` for cross-sectional factor evaluation.
**Defense Rating:** Good

**The Defense:**
*   **Why this architecture?** Pandas is the industry standard for quantitative research, offering rapid prototyping and built-in rolling window functions. 
*   **Tradeoffs:** The Global Interpreter Lock (GIL) and Pandas memory footprint mean this approach scales poorly when moving from 50 assets (NIFTY 50) to 3,000+ assets (Russell 3000) over 20 years of tick data.
*   **Scaling path:** We would transition the evaluator to use **Polars** (for multi-threaded Rust-backed execution) or **Dask** (for out-of-core distributed execution). Because the DSL is cleanly decoupled from the execution engine, this swap can be made completely transparent to the end user.

---

## Conclusion

With the sole exception of the Worker Orchestration (which is slated for an immediate refactor), every single design decision in AlphaLab is a highly defensible, textbook example of elite engineering. A candidate walking into an interview armed with the justifications for the DuckDB OLAP shift, the DSL Lookahead-Bias prevention, and Point-in-Time Universe survival mapping would easily pass a Staff-level system design interview.
