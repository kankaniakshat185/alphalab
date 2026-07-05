# ADR-003 — Project Architecture

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-05 |
| **Phase** | 0 — Engineering Foundation |
| **Deciders** | Vaishnavi Rai, Akshat Kankani |

---

## Context

AlphaLab must evaluate quantitative alpha factors on NIFTY 50 historical data.
The evaluation involves:

1. Fetching and storing multi-year daily OHLCV data
2. Computing factor values using a custom DSL
3. Running walk-forward backtests (30–60 seconds each)
4. Running robustness stress tests (multiple perturbation levels)
5. Serving results via a REST API
6. Displaying results in a web frontend

The architecture must handle long-running computation, relational metadata,
columnar analytical data, and a web interface — while remaining simple enough
for a two-person team to operate.

---

## Decision

### Service Architecture — Two Services

```
FastAPI application     — HTTP interface, job enqueueing
Celery worker           — long-running computation
```

A single-process architecture would block HTTP responses during 30–60 second
backtests. Two services (API + worker) is the minimum viable async architecture.

A microservice architecture (separate services for data, DSL, engine, etc.)
is explicitly rejected — it adds operational complexity (service discovery,
inter-service auth, distributed tracing) that is not warranted at this scale.

### API Layer — FastAPI

**Decision:** FastAPI

**Why FastAPI:**
- Native async support (required for non-blocking I/O)
- Python-native (same language as the engine — no context switching)
- Automatic OpenAPI documentation generation
- Fast development velocity with Pydantic request/response validation

**Alternatives rejected:**
- **Flask:** Synchronous by default; adding async requires more configuration
- **Django REST Framework:** Heavier than needed; Django's ORM would conflict with our DuckDB/SQLAlchemy split
- **Litestar:** Excellent but less mature ecosystem; harder interview story

### Task Queue — Celery + Redis (single queue)

**Decision:** Celery with Redis as broker and result backend

**Why Celery (not speculation — earned by measured latency):**
A full NIFTY 50 backtest over several years takes 30–60 seconds. This is
a measured, concrete latency problem. Celery is introduced to solve this
specific problem, not because "async is good."

Celery is introduced only after Phase 3 measures actual backtest latency.
This is documented explicitly so the architecture decision can be defended:
"We measured 45-second backtests in Phase 3 and introduced Celery in Phase 4
to move this out of the request path." This is a stronger interview answer
than "we used Celery because it's popular."

**Why Redis (not RabbitMQ):**
Redis is Celery's simplest and most reliable broker option. RabbitMQ adds
operational complexity (AMQP protocol, management UI, clustering concepts)
that is not justified when Redis already serves as a cache and session store.

**Why single queue (not priority queues):**
Multi-queue Celery priority tiers are explicitly deferred. A single queue
is simpler to operate and reason about. Priority queues would be justified
if backtest jobs and robustness jobs had materially different priorities —
they do not.

**Alternatives rejected:**
- **RQ (Redis Queue):** Simpler than Celery but less mature; fewer monitoring tools
- **Background threads:** Wrong abstraction — threads cannot be distributed across machines and do not survive process restarts
- **asyncio tasks:** Cannot handle CPU-bound work without defeating the GIL

### Metadata Database — PostgreSQL

**Decision:** PostgreSQL 16 (local Docker; Neon in production)

**Why PostgreSQL:**
The metadata schema (users → experiments → factors → results) is relational.
PostgreSQL provides ACID transactions, foreign keys, complex joins, and
JSON support. It is the industry standard for this workload.

**Why Neon in production:**
Neon provides serverless PostgreSQL with a generous free tier, automatic
scaling, and branching. Zero operational overhead for a solo/pair project.

**Alternatives rejected:**
- **SQLite:** Not suitable for concurrent access from API + worker processes
- **MySQL:** Less feature-rich (weaker JSON support, no partial indexes)
- **DynamoDB:** NoSQL; wrong model for relational metadata

### Analytical Database — DuckDB

**Decision:** DuckDB (embedded, file-based)

**Why DuckDB (and why alongside PostgreSQL):**
The two databases serve fundamentally different workloads:

| | PostgreSQL | DuckDB |
|---|---|---|
| Model | Row-oriented (OLTP) | Column-oriented (OLAP) |
| Workload | Relational metadata, writes | Rolling-window factor computation, reads |
| Access pattern | Many small transactions | Few large analytical queries |
| Deployment | Server process | Embedded in Python process |

Factor value computation involves computing rolling statistics (mean, std, momentum)
over multi-year OHLCV data for 50 tickers. This is a pure analytical workload.
DuckDB's columnar engine computes these operations 10–100× faster than PostgreSQL
on the same hardware, without any server process or network round-trips.

Using PostgreSQL for analytical queries would work, but would be significantly
slower and would conflate two workloads with very different characteristics.

**Alternatives rejected:**
- **Pandas in-memory:** No persistence; data must be re-fetched on every run
- **TimescaleDB:** PostgreSQL extension for time-series; heavier than needed
- **ClickHouse:** Powerful but requires a server process and has significant operational complexity

### Authentication — JWT (PyJWT)

**Decision:** JWT with PyJWT, stateless

**Why JWT:**
Stateless tokens require no server-side session storage. The API can verify
a token without querying the database on every request.

**Alternatives rejected:**
- **Session-based auth:** Requires sticky sessions or Redis for session storage; adds statefulness
- **OAuth2 / OIDC:** Appropriate for multi-tenant systems with social login; overkill for v1

### Frontend — Next.js

**Decision:** Next.js (React, TypeScript, SSR)

**Why Next.js:**
- TypeScript for type safety matching the Python backend's strict typing
- Server-side rendering for better initial page load
- Vercel deployment with zero configuration
- React ecosystem is the industry standard for this use case

**Why two screens only in v1:**
1. Factor Leaderboard
2. Factor Detail (formula, metrics, equity curve, robustness heatmap, research report)

Additional screens (regime explorer, cross-market explorer, multi-factor comparison)
are deferred — they depend on features deferred to v2 (regime detection, cross-market
transfer). Building frontend screens for features that don't exist yet is waste.

**Alternatives rejected:**
- **React SPA:** No SSR; worse initial load and SEO
- **Django templates:** Not portfolio-grade; tightly coupled to the backend

---

## Explicitly Excluded from v1

| Technology | Why excluded |
|---|---|
| MLflow | PostgreSQL table is sufficient at this scale; MLflow's experiment tracking adds complexity without concrete benefit |
| Sentry / structlog | No production traffic yet; structured logging will be added when we have real users |
| Multi-queue Celery | Single queue is sufficient; priority tiers add complexity without measured benefit |
| Microservice tooling | Monolith is appropriate at this scale; distributed tracing/service mesh is premature |

---

## Consequences

1. All runtime dependencies are added to `pyproject.toml` phase-by-phase with
   a justification comment referencing the relevant ADR.
2. DuckDB and PostgreSQL are both always running in Docker Compose — they serve
   different purposes and are not interchangeable.
3. Celery is not introduced until Phase 4, after Phase 3 measures actual latency.
4. This ADR must be updated if any major technology choice changes.
