<div align="center">

# AlphaLab

**A quantitative factor research platform for evaluating alpha signal robustness on NIFTY 50 equities.**

[![Lint](https://github.com/VaishnaviRai287/alphalab/actions/workflows/lint.yml/badge.svg)](https://github.com/VaishnaviRai287/alphalab/actions/workflows/lint.yml)
[![Test](https://github.com/VaishnaviRai287/alphalab/actions/workflows/test.yml/badge.svg)](https://github.com/VaishnaviRai287/alphalab/actions/workflows/test.yml)
[![Install](https://github.com/VaishnaviRai287/alphalab/actions/workflows/install.yml/badge.svg)](https://github.com/VaishnaviRai287/alphalab/actions/workflows/install.yml)
[![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*A two-member engineering project by [Vaishnavi Rai](https://github.com/VaishnaviRai287) and [Akshat Kankani](https://github.com/kankaniakshat185).*

</div>

---

## What is AlphaLab?

AlphaLab is a software system for testing whether quantitative alpha factors are genuinely predictive or merely overfit to historical data.

It addresses a core problem in quantitative research: a factor that performs well in backtesting may have exploited noise rather than captured a real market signal. AlphaLab evaluates this by running each factor through a systematic stress-testing grid alongside standard backtesting — and assigns an explicit **robustness score** alongside the Sharpe ratio.

The platform is **not** a trading system and does not produce trading signals. Its purpose is factor evaluation.

---

## Core Research Pipeline

```
User submits DSL formula (e.g. ts_rank(close, 10) - delay(close, 5))
           │
           ▼
    ┌─────────────────────┐
    │  DSL Compiler        │  Lex → Parse → AST → Static Validation → Pandas callable
    └────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │  Factor Evaluator    │  Applies compiled function per-ticker over OHLCV data
    └────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │  Portfolio Layer     │  Cross-sectional Z-score → dollar-neutral weights
    └────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │  Metrics             │  Sharpe ratio, Max Drawdown, IC (Spearman)
    └────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │  Robustness Engine   │  18 perturbed re-runs → noise score + missing-data score
    └─────────────────────┘
```

---

## Infrastructure Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js Frontend  (App Router / TypeScript) │
│  Research dashboard, leaderboard, PDF export │
└─────────────────┬───────────────────────────┘
                  │ HTTP / REST
┌─────────────────▼───────────────────────────┐
│  FastAPI  (Uvicorn)                         │
│  /experiments  /factors  /auth              │
│  Returns 202 immediately; delegates to queue │
└──────────┬──────────────────────┬───────────┘
           │ PostgreSQL (async)    │ Redis (Celery broker)
┌──────────▼──────────┐  ┌────────▼──────────────────┐
│  PostgreSQL          │  │  Celery Worker             │
│  Users, experiments  │◄─│  run_backtest_task()      │
│  factors, results    │  │  run_robustness_task()    │
└─────────────────────┘  └────────┬──────────────────┘
                                  │ read-only
                         ┌────────▼──────────────────┐
                         │  DuckDB (embedded)         │
                         │  OHLCV prices (~5yr)       │
                         │  NIFTY 50 universe history │
                         └───────────────────────────┘
```

The API never blocks on computation. When a factor is submitted, the API enqueues two Celery tasks (backtest and robustness) and returns immediately. The frontend polls for completion.

---

## Factor DSL

Users express alpha factors using a domain-specific language rather than arbitrary Python. This was a deliberate choice driven by two constraints: **security** (users should not be able to execute arbitrary code) and **static analysis** (look-ahead bias can only be verified before execution if the expression is represented as a structured AST).

### Grammar

```
expression    ::= term ( (PLUS | MINUS) term )*
term          ::= factor ( (MULTIPLY | DIVIDE) factor )*
factor        ::= (MINUS)? (NUMBER | function_call | variable | LPAREN expression RPAREN)
function_call ::= IDENTIFIER LPAREN (expression (COMMA expression)*)? RPAREN
variable      ::= IDENTIFIER
```

### Compilation pipeline

| Stage | Component | What it does |
|---|---|---|
| Tokenization | `Lexer` | Regex-based scan → `Token` stream |
| Parsing | `Parser` | Recursive descent → AST (`BinaryOp`, `FunctionCall`, `NumberLiteral`, `Variable`) |
| Validation | `StaticValidator` | AST traversal raising `DataLeakageError` on illegal temporal shifts |
| Compilation | `PandasCompiler` | AST traversal → Python closure over a Pandas DataFrame |

The compiled output is a `Callable[[pd.DataFrame], pd.Series]`. It is applied per-ticker using `groupby(...).apply()` to prevent cross-ticker data leakage.

### Supported primitives

| Function | Arguments | What it computes |
|---|---|---|
| `Momentum(n)` | window | `pct_change(n)` of adjusted close |
| `Volatility(n)` | window | Rolling std of daily returns |
| `RollingMean(n)` | window | Rolling mean of adjusted close |
| `RollingStd(n)` | window | Rolling std of adjusted close |
| `delay(x, n)` / `Lag(x, n)` | series, shift | `x.shift(n)` |
| `delta(x, n)` | series, window | `x - x.shift(n)` |
| `ts_max(x, n)` | series, window | Rolling max |
| `ts_min(x, n)` | series, window | Rolling min |
| `ts_rank(x, n)` | series, window | Rolling percentile rank |
| `scale(x, target)` | series, scalar | L1-normalize to `target` gross exposure |
| `correlation(x, y, n)` | series, series, window | Rolling Pearson correlation |
| `rank(x)` | series | Cross-sectional percentile rank |

Binary arithmetic (`+`, `-`, `*`, `/`) composes freely across all of the above.

### Look-ahead bias prevention

The `StaticValidator` traverses the AST before compilation and raises `DataLeakageError` for:
- Negative shift values in `delay` / `Lag` (e.g., `Lag(close, -1)` would read tomorrow's price)
- Zero or negative window sizes in all rolling functions
- Non-integer window parameters (which would indicate a runtime-computed window that cannot be statically verified)

This is enforced at parse time, before any data is touched. A factor that would introduce temporal leakage cannot be submitted — it fails at the AST stage.

---

## Market Data and Universe

### Storage: two-database architecture

AlphaLab uses two databases for distinct workloads:

| Database | Role | Why |
|---|---|---|
| **DuckDB** (embedded) | OHLCV prices, universe intervals | Columnar OLAP; returns Pandas DataFrames natively; zero network overhead |
| **PostgreSQL** | Users, experiments, job status, computed results | OLTP; transactional integrity for user-facing metadata |

See [ADR-005](docs/adr/ADR-005-duckdb.md) for the full evaluation of PostgreSQL-only, TimescaleDB, and Parquet-on-disk alternatives.

### NIFTY 50 Universe

Universe membership is resolved from a versioned CSV (`nifty50_history.csv`) containing constituent intervals with `effective_from` and `effective_to` dates. Membership is resolved **point-in-time**: a constituent is included in a backtest if and only if it was active in the index on the evaluation date.

This means a factor is never evaluated on stocks that were not actually in the index on a given day — a basic control for **survivorship bias**. However, the CSV covers the period in our dataset; survivorship bias from stocks that were removed from NIFTY 50 before our data window is not addressed.

### Data ingestion pipeline

The `IngestionPipeline` orchestrates six stages:
1. Schema initialization
2. Point-in-time constituent resolution
3. Bulk OHLCV download via Yahoo Finance
4. Column standardization and type normalization
5. Multi-validator data quality checks (schema, calendar, corporate actions, outliers)
6. Clean write to DuckDB (tickers with schema errors are dropped entirely)

The pipeline drops entire tickers that fail schema validation rather than silently proceeding with bad data.

---

## Backtesting Methodology

### Signal generation

The compiled DSL callable is applied per-ticker over the OHLCV DataFrame via `groupby("ticker").apply()`. This ensures the factor function for one ticker never receives data from another.

The evaluator uses **adjusted close prices** (`adj_close`). If both `close` and `adj_close` are present, `adj_close` replaces `close` before any computation.

If the formula contains a `rank(...)` call, a cross-sectional percentile rank is applied per date after per-ticker signal generation.

### Portfolio construction

Signals are converted to portfolio weights by cross-sectional Z-scoring per date:

```
weight_i = z_score_i / sum(|z_scores|)
```

This produces a **dollar-neutral portfolio** where the gross exposure (sum of absolute weights) equals 1.0 on each rebalancing date.

### Performance metrics

| Metric | Method |
|---|---|
| **Sharpe ratio** | Annualized: `mean(daily_returns) * 252 / (std(daily_returns) * √252)` |
| **Max drawdown** | Peak-to-trough: `max((cum_peak - cum_value) / cum_peak)` |
| **IC** | Mean daily Spearman rank correlation of signal vs. 1-day forward return |

### What is not modeled

This is important for interpreting results:
- **No transaction costs** — the backtest assumes costless rebalancing
- **No market impact** — positions are assumed to fill at close prices
- **No execution delay** — signals computed on day T are assumed to execute at day T close
- **No slippage**
- **Static rebalancing** — the backtest rebalances on every available date
- **Single-country universe** — NIFTY 50 only

Backtest performance numbers should be interpreted as research-grade signals for evaluating factor quality, not as estimates of live trading performance.

---

## Robustness Evaluation

### The problem

A factor may generate a strong Sharpe ratio in a clean backtest simply because it overfit to the specific noise pattern in the historical data. A genuine alpha signal should remain predictive when the data is slightly perturbed — a fragile, overfit factor will degrade sharply.

### Methodology

After the baseline backtest runs, the robustness engine executes **18 additional backtests** on perturbed versions of the same data:

| Perturbation type | Levels | Iterations per level | Total runs |
|---|---|---|---|
| Gaussian price/volume noise | 0.5%, 1.0%, 2.0% | 3 | 9 |
| Random consecutive data drops | 5%, 10%, 20% | 3 | 9 |
| **Total** | | | **18** |

The **noise perturbation** adds multiplicative Gaussian noise (`1 + N(0, σ²)`) to all price and volume columns, using a fixed-seed RNG per iteration for reproducibility. This simulates bid-ask spread uncertainty and execution slippage.

The **missing-data perturbation** randomly drops consecutive chunks of rows per ticker, simulating illiquidity gaps and data quality failures.

### Scoring

For each of the 6 environments (3 noise + 3 drop levels), the 3 iteration Sharpe ratios are averaged. A **retention ratio** is computed:

```
retention = avg_stressed_sharpe / baseline_sharpe     (clamped to [0.0, 1.0])
```

The **noise score** and **missing-data score** are each the mean retention across their respective 3 levels. The **overall robustness score** is `(noise_score + missing_data_score) / 2`.

A factor passes the robustness threshold if overall score ≥ 0.80 (i.e., retains ≥ 80% of its Sharpe ratio under synthetic perturbations).

### Interpretation

A high robustness score means the factor's performance is **stable under synthetic data quality degradation**. It does not mean the factor will perform well in live markets. The 18-fold perturbation grid is a stress test for signal stability, not a prediction mechanism.

---

## Engineering Decisions

### Why a custom DSL instead of plain Python functions?

*Problem:* Allowing users to submit arbitrary Python functions would require sandboxing, make static look-ahead bias detection impossible, and create an attack surface.

*Decision:* Handwritten recursive descent parser producing an AST, with a `StaticValidator` that traverses the AST before compilation.

*Trade-off:* Adding new syntax (e.g., ternary expressions, conditional logic) requires extending the parser. This was considered acceptable given the target domain.

See [ADR-007](docs/adr/ADR-007-dsl-grammar.md).

### Why DuckDB for time-series data?

*Problem:* Running rolling-window operations over millions of OHLCV rows in PostgreSQL is slow. PostgreSQL is row-oriented and not optimized for analytical scans.

*Decision:* DuckDB is used as an embedded OLAP engine for price data. It returns Pandas DataFrames natively via Apache Arrow, with zero network serialization overhead.

*Trade-off:* DuckDB holds an exclusive write lock on the file. Concurrent writes are prevented by routing all writes through a single Celery queue.

See [ADR-005](docs/adr/ADR-005-duckdb.md).

### Why Celery + Redis for task execution?

*Problem:* A full backtest + 18-fold robustness grid takes 2–3 minutes. Blocking the web server thread for this duration would fail any standard HTTP timeout.

*Decision:* The FastAPI layer enqueues two Celery tasks and returns a `202 Accepted` immediately. The worker manages DB state transitions (`PENDING → RUNNING → COMPLETED / FAILED`). The frontend polls the API for status.

*Trade-off:* Adds operational complexity (two extra services: Redis broker + Celery worker process). A single queue is used in v1 — a user submitting a large batch of stress tests can queue-block other users.

See [ADR-010](docs/adr/ADR-010-single-celery-queue.md), [ADR-011](docs/adr/ADR-011-async-sqlalchemy-in-sync-celery.md).

### Async SQLAlchemy inside a synchronous Celery worker

*Problem:* The FastAPI layer uses `async` SQLAlchemy. Celery workers are synchronous. Mixing these is non-trivial.

*Decision:* Each Celery task maintains a persistent event loop (`asyncio.new_event_loop()`) and runs the async DB session using `loop.run_until_complete()`. The heavy computation (robustness grid) is offloaded from the event loop via `asyncio.to_thread()`.

See [ADR-011](docs/adr/ADR-011-async-sqlalchemy-in-sync-celery.md).

---

## Testing

The test suite contains **104 tests** across 21 test modules.

```bash
pytest tests/ -v
```

| Domain | Coverage | Notes |
|---|---|---|
| `dsl/` — lexer, parser, AST, validator, compiler | >92% | Includes look-ahead bias rejection tests, arity validation, unknown-function errors |
| `engine/` — evaluator, portfolio, metrics, robustness | >84% | Includes edge cases: empty universe, zero-std signals, negative baseline Sharpe |
| `data/` — pipeline, transformer, validation | Partial | Schema, calendar, outlier validators covered; Yahoo Finance HTTP calls are not mocked |
| `api/` — auth, routes, factors | Partial | Integration tests use FastAPI TestClient |
| `worker/` — tasks | ~64% | Integration paths mocked; DB session management partially covered |

Coverage numbers are from the internal audit (`docs/audits/04_TESTING.md`, measured 2026-07-06). They may differ from current state.

**What the tests verify:**
- The DSL compiler rejects negative shifts, zero-window functions, and unknown identifiers before any data is touched
- The portfolio constructor produces dollar-neutral weights summing to zero net exposure
- The Sharpe ratio calculation matches the `√252 × (μ/σ)` formula on controlled return sequences
- The robustness evaluator correctly averages perturbed Sharpe ratios and clamps retention to `[0, 1]`
- API routes return `202` on factor submission without waiting for backtest completion

**Known gaps:**
- `yahoo_provider.py` is 16% covered — HTTP error handling is not integration-tested (no mocked API responses)
- Frontend has no automated tests
- No property-based testing

---

## Limitations

**Methodology:**
- No transaction costs, slippage, or market-impact modeling
- Static daily rebalancing (no frequency optimization)
- Universe is NIFTY 50 only; results do not generalize to other indices
- The robustness grid uses synthetic perturbations, not real walk-forward out-of-sample splits
- Survivorship bias from stocks removed from NIFTY 50 before the historical data window is not addressed

**Data:**
- Market data sourced from Yahoo Finance via `yfinance`; corporate actions adjustments rely on Yahoo's `adj_close`
- Data quality validation runs at ingestion time, but downstream computation depends on Yahoo's data accuracy
- Universe membership CSV covers a fixed historical period

**Infrastructure:**
- DuckDB does not support concurrent writes; all writes must be serialized
- Single Celery queue: a large batch can block other users' jobs
- No horizontal scaling of workers in the current deployment configuration
- No frontend test suite

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- Docker and Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/VaishnaviRai287/alphalab.git
cd alphalab

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -e ".[dev]"
```

### 2. Configure environment

```bash
cp infra/.env.example .env
# Edit .env and fill in DATABASE_URL, REDIS_URL, and SECRET_KEY
```

### 3. Start infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

Starts PostgreSQL 16 and Redis 7. Add `--profile tools` to also run pgAdmin at `http://localhost:5050`.

### 4. Bootstrap and ingest data

```bash
python scripts/bootstrap.py
```

Runs Alembic migrations, initializes the DuckDB schema, and downloads NIFTY 50 historical prices from Yahoo Finance.

### 5. Run the platform

Open three terminal tabs:

```bash
# Tab 1 — API server
uvicorn alphalab.api.main:app --reload --port 8000

# Tab 2 — Celery worker
celery -A alphalab.worker.celery worker --pool=solo --loglevel=info

# Tab 3 — Frontend
cd web && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Run tests

```bash
pytest tests/ -v
```

---

## Project Structure

```
alphalab/
├── src/alphalab/
│   ├── api/           FastAPI application — routes, auth, request/response schemas
│   ├── common/        Domain types (MarketDataset, UniverseEntry), exceptions
│   ├── config/        Pydantic Settings — environment variable loading
│   ├── data/
│   │   ├── pipeline.py          Ingestion orchestrator
│   │   ├── providers/           Yahoo Finance download client
│   │   ├── storage/             DuckDB read/write implementation + abstract interface
│   │   ├── transformer/         Column normalization and type casting
│   │   ├── universe/            NIFTY 50 point-in-time constituent resolver
│   │   └── validation/          Schema, calendar, outlier, corporate-actions validators
│   ├── dsl/           Lexer, Parser, AST nodes, StaticValidator, PandasCompiler
│   ├── engine/        FactorEvaluator, PortfolioConstructor, PerformanceCalculator, RobustnessEvaluator
│   ├── utils/         Shared utilities
│   └── worker/        Celery app definition, task definitions, verdict generators
├── web/               Next.js frontend (App Router, TypeScript)
├── tests/             104 tests across 21 modules
├── alembic/           Database migration scripts
├── scripts/           bootstrap.py, ingest_data.py, seed_demo.py
├── infra/             Docker Compose, .env.example
└── docs/              Architecture docs, 15 ADRs, audit reports
```

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/00_MASTER_PLAN.md`](docs/00_MASTER_PLAN.md) | Project identity, goals, and non-goals |
| [`docs/01_ARCHITECTURE.md`](docs/01_ARCHITECTURE.md) | System design and data flow |
| [`docs/adr/`](docs/adr/) | 15 Architecture Decision Records covering DSL grammar, database choice, Celery topology, async patterns |
| [`docs/audits/`](docs/audits/) | Internal audits: codebase health, testing coverage, interview defense notes |

---

## License

MIT — see [LICENSE](LICENSE).
