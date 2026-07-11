<div align="center">

# AlphaLab

**An institutional-grade, robustness-aware quantitative factor research platform built for NIFTY 50 equities.**

[![Lint](https://github.com/VaishnaviRai287/alphalab/actions/workflows/lint.yml/badge.svg)](https://github.com/VaishnaviRai287/alphalab/actions/workflows/lint.yml)
[![Test](https://github.com/VaishnaviRai287/alphalab/actions/workflows/test.yml/badge.svg)](https://github.com/VaishnaviRai287/alphalab/actions/workflows/test.yml)
[![Install](https://github.com/VaishnaviRai287/alphalab/actions/workflows/install.yml/badge.svg)](https://github.com/VaishnaviRai287/alphalab/actions/workflows/install.yml)
[![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## What is AlphaLab?

AlphaLab answers a core quantitative research question:

> *How do we distinguish genuinely predictive alpha factors from overfit strategies that exploit historical noise?*

It combines **cross-sectional backtesting** with **systematic stress testing** — subjecting every factor to synthetic noise and missing-data scenarios — to produce a robustness score alongside the traditional Sharpe ratio. Only factors that survive both dimensions are considered real candidates.

---

## Core Features

| Feature | Description |
|---|---|
| **Factor DSL** | Express signals with primitives like `rank`, `scale`, `delay`, `delta`, `ts_max`, `correlation` — compiled into vectorized execution |
| **NIFTY 50 Universe** | Point-in-time constituent mapping — immune to survivorship bias |
| **Async Backtester** | Celery-backed walk-forward simulations offloaded via Redis |
| **Stress Engine** | 6 noise levels × 6 drop levels — scores factors by median-path Maximum Drawdown |
| **Research Dashboard** | Interactive Next.js UI with scatter plots, leaderboard, and LLM-generated verdicts |
| **JWT Auth** | Secure user sessions with `passlib[bcrypt]` + PyJWT |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js Frontend  (localhost:3000)          │
│  Scatter Plot · Leaderboard · Events Feed   │
└─────────────────┬───────────────────────────┘
                  │ HTTP / REST
┌─────────────────▼───────────────────────────┐
│  FastAPI  (localhost:8000)                  │
│  /experiments  /factors  /backtest          │
│  /robustness   /auth                        │
└──────────┬──────────────────────┬───────────┘
           │ PostgreSQL            │ Redis (Celery broker)
┌──────────▼──────────┐  ┌────────▼──────────────────┐
│  PostgreSQL 16      │  │  Celery Worker            │
│  Users, factors,   │◄─│  run_backtest()           │
│  results, jobs      │  │  run_robustness()         │
└─────────────────────┘  └────────┬──────────────────┘
                                  │ DuckDB (read-only)
                         ┌────────▼──────────────────┐
                         │  DuckDB                   │
                         │  Historical OHLCV,        │
                         │  NIFTY 50 universe cache  │
                         └───────────────────────────┘
```

---

## Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/) — REST API
- [Celery](https://docs.celeryq.dev/) + [Redis](https://redis.io/) — async task queue
- [SQLAlchemy](https://www.sqlalchemy.org/) (async) + [PostgreSQL](https://www.postgresql.org/) — metadata store
- [DuckDB](https://duckdb.org/) — analytics / time-series store
- [Alembic](https://alembic.sqlalchemy.org/) — database migrations
- [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) — configuration

**Frontend**
- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- Recharts, Framer Motion

**Tooling**
- [Ruff](https://docs.astral.sh/ruff/) — linting & formatting
- [Mypy](https://mypy-lang.org/) — static type checking (strict)
- [Pytest](https://pytest.org/) — test suite
- [pre-commit](https://pre-commit.com/) — git hooks
- [Docker Compose](https://docs.docker.com/compose/) — local infrastructure

---

## Quickstart

### Prerequisites

- Python **3.12+**
- Node.js **18+** and NPM
- Docker and Docker Compose

### 1. Clone & install

```bash
git clone https://github.com/VaishnaviRai287/alphalab.git
cd alphalab

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -e ".[dev]"
```

### 2. Configure environment

```bash
cp .env.example .env
# Open .env and fill in your passwords and secrets
```

### 3. Start infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

This starts **PostgreSQL 16** and **Redis 7** in the background.

> Add `--profile tools` to also start **pgAdmin** at `http://localhost:5050`.

### 4. Bootstrap the database

```bash
python scripts/bootstrap.py
```

Runs Alembic migrations and seeds DuckDB with NIFTY 50 pricing history.

### 5. Run the platform

Open three terminal tabs:

```bash
# Tab 1 — API
uvicorn alphalab.api.main:app --reload --port 8000

# Tab 2 — Celery worker
celery -A alphalab.worker.celery worker --pool=solo --loglevel=info

# Tab 3 — Frontend
cd web && npm install && npm run dev
```

Open **http://localhost:3000** to access the Research Dashboard.

---

## Project Structure

```
AlphaLab/
├── src/alphalab/          # Python package (src layout)
│   ├── api/               # FastAPI routes and request/response schemas
│   ├── data/              # Market data ingestion, DuckDB storage, universe
│   ├── dsl/               # Factor DSL — lexer, parser, evaluator
│   ├── engine/            # Backtester and robustness stress engine
│   ├── worker/            # Celery task definitions
│   ├── common/            # Shared types, exceptions, domain primitives
│   └── config/            # Pydantic settings
├── web/                   # Next.js frontend (App Router)
├── tests/                 # Pytest suite
├── infra/                 # Docker Compose and .env.example
├── alembic/               # Database migration scripts
├── scripts/               # bootstrap.py, ingest_data.py
└── docs/                  # Architecture docs and ADRs
```

---

## Development

```bash
# Run tests
pytest tests/ -v

# Lint
ruff check .

# Type check
mypy src/

# Format
ruff format .

# Install git hooks (runs lint on every commit)
pre-commit install
```

---

## License

MIT — see [LICENSE](LICENSE).
