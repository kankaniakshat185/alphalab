# AlphaLab — Tasks

> **Current phase:** Phase 5 — Robustness Engine
> **Status:** Planned 🔲
> **Updated:** 2026-07-06

This file tracks the granular task checklist for the current and completed phases.

---

## Phase 0 — Engineering Foundation (Complete ✅)

- [x] Pinned Python version, editor config, and pre-commit hooks.
- [x] Package skeleton directories and base imports.
- [x] CI/CD workflows and pytest smoketest setup.
- [x] PostgreSQL + Redis Docker container configurations.
- [x] Base master plan, architecture guides, and Phase 0 ADRs.

---

## Phase 1 — Data & Backend Foundation (Complete ✅)

### Core Models & Shared Resources (Developer A)
- [x] Added dependencies to `pyproject.toml` (`yfinance`, `duckdb`, `pandas`, `pydantic-settings`).
- [x] Created `src/alphalab/config/settings.py` for database paths, retries, and thresholds.
- [x] Created `src/alphalab/common/types.py` defining dataclass models (`MarketDataset`, `UniverseEntry`).
- [x] Created `src/alphalab/common/exceptions.py` defining custom domain exceptions.
- [x] Added `src/alphalab/data/resources/nifty50_history.csv` for NIFTY 50 membership intervals.

### Storage & Fetching Layer (Developer A)
- [x] Created `src/alphalab/data/storage/schema.py` for decoupled table initialization.
- [x] Created `src/alphalab/data/storage/base.py` defining database action abstractions.
- [x] Created `src/alphalab/data/storage/duckdb.py` driver writing data in vectorized batches.
- [x] Created `src/alphalab/data/providers/provider.py` abstract interface.
- [x] Created `src/alphalab/data/providers/yahoo_provider.py` bulk downloader.
- [x] Created `src/alphalab/data/transformer.py` cleaning and wrapping dataframes.
- [x] Created `src/alphalab/data/universe/base.py` and `nifty50.py` resolving point-in-time constituents.

### Validation Engine (Developer A)
- [x] Created `src/alphalab/data/validation/report.py` defining diagnostic lists.
- [x] Created `src/alphalab/data/validation/schema.py` checking price bounds and null values.
- [x] Created `src/alphalab/data/validation/quality.py` checking missing bars and spikes.
- [x] Created `src/alphalab/data/validation/calendar.py` asserting weekday alignments.
- [x] Created `src/alphalab/data/validation/corporate_actions.py` detecting splits/dividends.
- [x] Created `src/alphalab/data/validation/suite.py` orchestrating individual checks.
- [x] Created `src/alphalab/data/pipeline.py` managing fetching, validating, filtering, and database loading.

### Backend Infrastructure & Security (Developer B)
- [x] Configured backend environment parameters in `settings.py`.
- [x] Set up async database engine in `src/alphalab/api/database/connection.py`.
- [x] Created SQLAlchemy schema models: `User`, `Experiment`, `Factor`, `BacktestResult`, `RobustnessResult`.
- [x] Implemented bcrypt password hashing and verification in `src/alphalab/api/auth/hash.py`.
- [x] Created JWT authentication helpers and `get_current_user` route dependency in `src/alphalab/api/auth/jwt.py`.

### FastAPI Routers & Workers (Developer B)
- [x] Assembled main app in `src/alphalab/api/main.py`.
- [x] Coded token login route (`POST /auth/token`) in `src/alphalab/api/routers/auth.py`.
- [x] Coded profile registration & lookup routes in `src/alphalab/api/routers/users.py`.
- [x] Coded experiment submissions routes (spawning workers) in `src/alphalab/api/routers/experiments.py`.
- [x] Configured Celery tasks routing with Redis broker in `src/alphalab/worker/celery.py` and `tasks.py`.
- [x] Initialized Alembic migration configuration and version `001_initial_schema.py`.

### Documentation & Verification
- [x] Created tests for all modules under `tests/`.
- [x] Written ADRs: ADR-004, ADR-005, and ADR-006.
- [x] Written development log `internal/development_log/Phase_01.md`.
- [x] Written learning notes under `internal/learning_notes/`.

---

## Phase 2 — Factor DSL (Complete ✅)

- [x] Define Grammar and AST nodes (`ast.py`).
- [x] Implement Token Lexer (`lexer.py`).
- [x] Implement AST Parser (`parser.py`).
- [x] Implement AST Static Checker (`validator.py` - look-ahead bias, negative windows).
- [x] Implement Code Generator (`compiler.py` - AST to python callable).
- [x] Write unit tests for Lexer, Parser, Validator, and Compiler.
- [x] Document Phase 2 ADRs (ADR-007, ADR-008), development logs, and learning notes.

---

## Phase 3 — Backtesting Engine (Complete ✅)

- [x] Define Vectorized Evaluator matrix execution layer (`evaluator.py`).
- [x] Implement Rank-based and Z-score Portfolio weight allocations (`portfolio.py`).
- [x] Implement mathematical calculators for Sharpe, Sortino, Calmar, Drawdowns, IC, and Rank IC (`metrics.py`).
- [x] Write unit tests for portfolios, evaluators, and performance risk metrics.
- [x] Write ADR-009 (Portfolio Signal Weightings) and Phase 3 development logs.

---

## Phase 4 — Background Execution (Complete ✅)

- [x] Connect FastAPI router triggers to queue background Celery tasks.
- [x] Replace task stubs with production backtest/robustness run calls.
- [x] Implement worker task status persistence state machine (`PENDING`, `RUNNING`, `SUCCESS`, `FAILED`) in PostgreSQL.
- [x] Add integration tests verifying task scheduling and execution tracking.

---

## Phase 5 — Robustness Engine (Planned 🔲)

- [ ] Implement pricing noise perturbation generator (Gaussian models).
- [ ] Implement missing-data bar drop-out simulator.
- [ ] Implement Robustness Ratio calculator comparing perturbed performance to baseline.
- [ ] Save stress-test outputs and detailed failure reasons to PostgreSQL.

---

## Phase 6 — API Expansion (Planned 🔲)

- [ ] Implement Paginated global Factor Leaderboard endpoint (`GET /leaderboard`).
- [ ] Implement metrics-based and robustness-based filtering/sorting.
- [ ] Add endpoints for specific factor histories and experiment breakdowns.

---

## Phase 7 — Research Reports (Planned 🔲)

- [ ] Create automated factor overview report builder compiling results and formulas.
- [ ] Build automated markdown-to-PDF export pipeline for finalized research logs.

---

## Phase 8 — Next.js Frontend Dashboard (Planned 🔲)

- [ ] Establish Next.js application skeleton using clean vanilla CSS variables.
- [ ] Build charts and panels for equity curves and robustness evaluations.
- [ ] Integrate user authentication and factor editor panels.
