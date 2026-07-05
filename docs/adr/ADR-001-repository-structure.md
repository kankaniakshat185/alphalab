# ADR-001 — Repository Structure

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-05 |
| **Phase** | 0 — Engineering Foundation |
| **Deciders** | Vaishnavi Rai, Akshat Kankani |

---

## Context

At the start of Phase 0, a repository structure must be established that will
serve the project for all 12 phases. This decision is high-leverage: changing
the repository layout mid-project is expensive and disruptive.

Two sub-decisions are recorded here:

1. Python package layout (`src/` vs flat)
2. Top-level package subdivision

---

## Decision 1 — `src/` Layout

### Decision

Use the `src/` layout for the Python package:

```
src/
  alphalab/
    __init__.py
    api/
    data/
    ...
```

All imports go through `pip install -e .`. No direct path manipulation.

### Alternatives Considered

#### Option A — Flat layout (rejected)

```
alphalab/
  __init__.py
  api/
  data/
  ...
```

In a flat layout, `import alphalab` succeeds from the project root without
installation. This has a subtle failure mode: tests can import the package
from the root directory instead of the installed package, masking installation
errors. A broken `pyproject.toml` would pass tests locally but fail in CI.

The `src/` layout forces all imports through the installed package,
making the test environment identical to the deployment environment.

#### Option B — Script-based (rejected)

Some teams use `PYTHONPATH` manipulation instead of `pip install -e .`.
This is fragile: it depends on the developer remembering to set the path,
is not reproducible across environments, and is incompatible with the
packaging infrastructure we need for CI/CD.

### Tradeoffs

| Tradeoff | Assessment |
|---|---|
| `src/` adds one directory level | Minor inconvenience; far outweighed by correctness |
| Requires `pip install -e .` | This is a feature: it enforces a reproducible install process |
| IDE configuration | Modern IDEs (VS Code, PyCharm) handle `src/` layout natively |

### Consequences

- All developers must run `pip install -e ".[dev]"` after cloning
- CI must also install the package before running tests (enforced in `install.yml`)
- Any new package added under `src/alphalab/` is automatically included

---

## Decision 2 — Package Subdivision

### Decision

The `alphalab` package is subdivided into eight sub-packages:

| Package | Phase | Responsibility |
|---|---|---|
| `api` | 6 | FastAPI application |
| `data` | 1 | Market data, ingestion, DuckDB |
| `dsl` | 2 | Factor DSL compiler |
| `engine` | 3, 5 | Backtest and robustness engines |
| `worker` | 4 | Celery task definitions |
| `common` | 1+ | Shared types, exceptions |
| `config` | 1 | Settings, environment loading |
| `utils` | 1+ | Pure utility functions |

All eight are created in Phase 0 as empty skeletons.

### Why Define the Structure in Phase 0?

The package structure is an architectural decision, not an implementation detail.
Defining it in Phase 0:

1. Makes the intended architecture explicit and reviewable before any code is written
2. Prevents ad-hoc structure that accumulates technical debt
3. Provides a clear home for every future file

### Why This Subdivision?

The subdivision follows the separation of concerns principle, with each package
having a single, clear responsibility. The boundaries align with phase boundaries:
each package is introduced in exactly one phase. This makes the development
sequence and the architecture mutually reinforcing.

### Alternatives Considered

#### Monorepo (rejected)

A monorepo would separate the API service, worker service, and shared library
into independent Python packages with their own `pyproject.toml` files.
This adds significant tooling complexity (workspace management, cross-package
version pinning) that is not justified at this scale. The application is small
enough to live in a single installable package.

#### Feature-based layout (rejected)

Organising by feature (e.g., `experiments/`, `factors/`, `leaderboard/`) rather
than by technical layer would make cross-cutting concerns like data access harder
to manage. The chosen layer-based layout matches the natural boundaries of
the system's components.

---

## Future Impact

- Adding a new top-level package (e.g., `reports/` in Phase 7) requires updating
  this ADR with the rationale.
- The `web/` directory is intentionally outside `src/` — it is a separate Node.js
  project, not a Python package.
