# AlphaLab — Tasks

> **Current phase:** Phase 2 — Factor DSL
> **Status:** Planned 🔲
> **Updated:** 2026-07-05

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

## Phase 2 — Factor DSL (Planned 🔲)

- [ ] Define Grammar and AST nodes (`ast.py`).
- [ ] Implement Token Lexer (`lexer.py`).
- [ ] Implement AST Parser (`parser.py`).
- [ ] Implement AST Static Checker (`validator.py` - look-ahead bias, negative windows).
- [ ] Implement Code Generator (`compiler.py` - AST to python callable).
- [ ] Write unit tests for Lexer, Parser, Validator, and Compiler.
- [ ] Document Phase 2 ADRs, development logs, and learning notes.
