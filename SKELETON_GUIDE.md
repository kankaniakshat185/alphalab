# How to Build the AlphaLab Skeleton (Phase 0) from Scratch

This guide explains how to construct the initial engineering foundation and package skeleton for **AlphaLab** starting with a blank directory. Follow these steps to reproduce the exact setup.

---

## Understanding the Skeleton Structure

Before creating the directories, it is important to understand what each sub-package in `src/alphalab` is responsible for and why the project is designed this way:

### 1. Why the `src/` Layout?
By placing all source code under `src/alphalab/`, the package **must be built and installed** (e.g., `pip install -e .`) before tools like `pytest` or `ruff` can import it. This forces Python to resolve packages from the installed distribution rather than direct directory imports, catching build, path, and packaging errors early.

### 2. Package Responsibilities

*   **`alphalab.config`**: Centralizes configuration. Reads environment variables from the `.env` file, validates them using Pydantic Settings, and distributes configurations to other modules.
*   **`alphalab.common`**: Houses shared domain types (like price bar formats) and custom exceptions (like `DataError` and `ValidationError`). Keeping these types isolated prevents circular imports between packages.
*   **`alphalab.data`**: The market data fetching and storage layer. Implements the **Strategy Pattern** for providers (e.g., `YahooProvider`) to fetch daily stock OHLCV data. It resolves index constituents point-in-time (`NIFTY50Universe`) to avoid survivorship bias and manages the analytical DuckDB database.
*   **`alphalab.dsl`**: Lexes, parses, and validates the custom Domain-Specific Language (DSL) formulas (like `Momentum(10) / Vol(20)`). Using a DSL prevents arbitrary Python execution and enables static look-ahead bias checking.
*   **`alphalab.engine`**: Contains the **Backtesting Engine** (evaluates factor formula returns over time) and the **Robustness Engine** (applies perturbations like Gaussian noise or missing-data to stress-test factor stability).
*   **`alphalab.worker`**: Standardizes long-running asynchronous execution using **Celery** tasks. Because backtests and perturbations are CPU-bound, they are offloaded here via a **Redis** message broker.
*   **`alphalab.api`**: FastAPI server exposing HTTP REST endpoints (like `/factors` or `/leaderboard`), managing database transactions with PostgreSQL (for metadata/results storage).
*   **`alphalab.utils`**: Houses utility functions like mathematical transformations or date helpers.

### 3. Engineering Tools, Configs, & Associated Files

Below is a breakdown of the core developer tools configured in this project skeleton, why we use them, how they work, and their corresponding files:

| Tool | Purpose / Why We Use It | How It Works | Related Files |
| :--- | :--- | :--- | :--- |
| **pyproject.toml** | **Unified Manifest**: Replaces fragmented configuration files (`setup.py`, linter configs, requirements documents) into a single, standardized metadata file (PEP 518/621). | Declares dependencies, build system backends (`hatchling`), and holds configurations for Ruff, Mypy, and Pytest. | [pyproject.toml](file:///Users/prashantkumar/Documents/AlphaLab/pyproject.toml) |
| **Ruff** | **Linting & Formatting**: Enforces visual styles (quotes, indenting, line wrap) and identifies syntax bugs, unused imports, or code complexities. | Written in Rust; scans ASTs in milliseconds to detect errors and reformats files on-save or pre-commit. | Defined in `[tool.ruff]` in `pyproject.toml`, run in `.pre-commit-config.yaml` and `.github/workflows/lint.yml`. |
| **Mypy** | **Static Type Checking**: Prevents variable type mismatches, unhandled `None` values, and non-existent attribute access errors before runtime. | Statically parses type hints (`def func(x: int) -> str`). Configured in `strict` mode to require type annotations on all signatures. | Defined in `[tool.mypy]` in `pyproject.toml`, run in `.github/workflows/lint.yml`. |
| **Pre-commit** | **Git Hooks Gatekeeper**: Ensures every commit meets styling, yaml/toml formatting, and branch policy requirements *before* leaving the local machine. | Automatically intercepts `git commit` commands, running hooks against staged changes. Blocks the commit if failures are found. | [.pre-commit-config.yaml](file:///Users/prashantkumar/Documents/AlphaLab/.pre-commit-config.yaml) |
| **Docker Compose** | **Local Infrastructure**: Standardizes dependencies (PostgreSQL database and Redis task queue) across all developer environments. | Reads docker configuration to download, build, and network Alpine-based image containers, mapping persistent volumes to your drive. | [infra/docker-compose.yml](file:///Users/prashantkumar/Documents/AlphaLab/infra/docker-compose.yml), `infra/.env.example` |
| **Pytest** | **Test Execution**: Automates discovering and executing unit/integration test cases, asserting output values, and reporting coverage. | Automatically detects functions prefixed with `test_` under the `tests/` directory and evaluates assertions. | `[tool.pytest]` & `[tool.coverage]` in `pyproject.toml`, [tests/conftest.py](file:///Users/prashantkumar/Documents/AlphaLab/tests/conftest.py), [tests/test_package.py](file:///Users/prashantkumar/Documents/AlphaLab/tests/test_package.py). |
| **GitHub Actions (CI/CD)** | **Automated Pipelines**: Acts as a gateway to verify that no pushed branch breaks formatting, types, or tests before merging code into main branches. | Spins up clean, cloud-hosted Ubuntu runners when code is pushed, installs setup requirements, and runs lints and test suites. | [.github/workflows/lint.yml](file:///Users/prashantkumar/Documents/AlphaLab/.github/workflows/lint.yml), [test.yml](file:///Users/prashantkumar/Documents/AlphaLab/.github/workflows/test.yml), [install.yml](file:///Users/prashantkumar/Documents/AlphaLab/.github/workflows/install.yml) |

---

## Step 1: Initialize Git and Project Directory Structure

First, initialize a Git repository and construct the folder hierarchy. AlphaLab uses a standard `src/` layout (which forces packages to be installed before they can be tested/run, preventing accidental local imports).

Run the following commands in your shell:

```bash
# Initialize git repository
git init

# Create the source package directories
mkdir -p src/alphalab/api
mkdir -p src/alphalab/data
mkdir -p src/alphalab/dsl
mkdir -p src/alphalab/engine
mkdir -p src/alphalab/worker
mkdir -p src/alphalab/common
mkdir -p src/alphalab/config
mkdir -p src/alphalab/utils

# Create other top-level directories
mkdir -p tests
mkdir -p infra
mkdir -p web
mkdir -p docs/adr
mkdir -p docs/diagrams
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE
```

Next, add an empty `__init__.py` file in the root package and all sub-packages to make them recognizable as Python modules:

```bash
touch src/alphalab/__init__.py
touch src/alphalab/api/__init__.py
touch src/alphalab/data/__init__.py
touch src/alphalab/dsl/__init__.py
touch src/alphalab/engine/__init__.py
touch src/alphalab/worker/__init__.py
touch src/alphalab/common/__init__.py
touch src/alphalab/config/__init__.py
touch src/alphalab/utils/__init__.py
touch tests/__init__.py
```

---

## Step 2: Define Environment and Editor Configurations

Create the basic configuration files to pin the python version and enforce formatting style rules across different editors.

### 1. Pinned Python Version
Create `.python-version` at the root of the project to enforce Python 3.12:
```text
3.12
```

### 2. Editor Configuration
Create `.editorconfig` at the root to enforce editor formatting consistency:
```ini
# EditorConfig helps developers define and maintain consistent
# coding styles between different editors and IDEs.
root = true

[*]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.py]
indent_size = 4

[*.{js,jsx,ts,tsx,json,css}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

---

## Step 3: Define Project Configuration (`pyproject.toml`)

Create `pyproject.toml` in the project root. This is the single source of truth for package metadata, package compilation settings, and development dependencies (like Ruff, Mypy, and Pytest).

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "alphalab"
version = "0.1.0"
description = "A robustness-aware factor research platform for NIFTY 50 equities"
readme = "README.md"
license = { file = "LICENSE" }
requires-python = ">=3.12"
authors = [{ name = "VaishnaviRai287" }]
keywords = ["finance", "quantitative", "factor-research", "backtesting", "robustness", "nifty50"]

# No runtime dependencies yet — added phase-by-phase as justified
dependencies = []

[project.optional-dependencies]
dev = [
    "pytest>=8.2",
    "pytest-cov>=5.0",
    "ruff>=0.5",
    "mypy>=1.10",
    "pre-commit>=3.7",
]

[tool.hatch.build.targets.wheel]
packages = ["src/alphalab"]

[tool.ruff]
target-version = "py312"
line-length = 88
src = ["src", "tests"]

[tool.ruff.lint]
select = ["E", "W", "F", "I", "B", "UP", "N", "SIM"]
ignore = ["E501"]

[tool.ruff.lint.isort]
known-first-party = ["alphalab"]
split-on-trailing-comma = true

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101", "D"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
line-ending = "lf"

[tool.mypy]
python_version = "3.12"
strict = true
mypy_path = "src"
packages = ["alphalab"]
ignore_missing_imports = true
show_error_codes = true
warn_unused_ignores = true

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
addopts = ["--verbose", "--tb=short", "--strict-markers"]
markers = [
    "unit: unit tests (fast, no external dependencies)",
    "integration: integration tests (may require Docker services)",
    "slow: tests that take more than 1 second",
]

[tool.coverage.run]
source = ["src/alphalab"]
branch = true
omit = ["*/tests/*", "*/__init__.py"]

[tool.coverage.report]
show_missing = true
skip_covered = false
fail_under = 0
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "@abstractmethod",
]
```

---

## Step 4: Configure Commit Quality Control (`.pre-commit-config.yaml`)

Create `.pre-commit-config.yaml` to ensure code is formatted and error-free before committing to git:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: end-of-file-fixer
        exclude: "^web/"
      - id: trailing-whitespace
        args: ["--markdown-linebreak-ext=md"]
      - id: check-yaml
        args: ["--unsafe"]
      - id: check-toml
      - id: check-added-large-files
        args: ["--maxkb=500"]
      - id: check-merge-conflict
      - id: no-commit-to-branch
        args: ["--branch=main", "--branch=dev"]

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.5.0
    hooks:
      - id: ruff
        args: ["--fix"]
        types_or: [python, pyi]
      - id: ruff-format
        types_or: [python, pyi]
```

---

## Step 5: Configure Infrastructure Containers

We run PostgreSQL and Redis in Docker containers to keep the local machine clean and match production environments.

### 1. Setup Docker Compose
Create `infra/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: alphalab-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - alphalab-network

  redis:
    image: redis:7-alpine
    container_name: alphalab-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 5s
    networks:
      - alphalab-network

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: alphalab-pgadmin
    restart: unless-stopped
    profiles:
      - tools
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports:
      - "${PGADMIN_PORT:-5050}:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - alphalab-network

volumes:
  postgres_data:
    name: alphalab-postgres-data
  redis_data:
    name: alphalab-redis-data
  pgadmin_data:
    name: alphalab-pgadmin-data

networks:
  alphalab-network:
    name: alphalab-network
    driver: bridge
```

### 2. Setup Env Template
Create `infra/.env.example` to guide developers on configuring local database credentials:

```text
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_local_password_change_me
POSTGRES_DB=alphalab
POSTGRES_PORT=5432

REDIS_PASSWORD=redis_local_password_change_me
REDIS_PORT=6379

PGADMIN_EMAIL=admin@alphalab.local
PGADMIN_PASSWORD=pgadmin_password_change_me
PGADMIN_PORT=5050
```

---

## Step 6: Create Package Health Smoke Tests

Write automated pytest checks to verify the package is structured and installed correctly.

### 1. Test Setup File
Create `tests/conftest.py`:

```python
import pytest

@pytest.fixture(scope="session")
def is_dev_mode() -> bool:
    return True
```

### 2. Package Structure Verification Tests
Create `tests/test_package.py`:

```python
import importlib
import importlib.util
from pathlib import Path
import pytest

def _is_importable(module_name: str) -> bool:
    try:
        importlib.import_module(module_name)
        return True
    except ImportError:
        return False

@pytest.mark.unit
def test_root_package_importable() -> None:
    assert _is_importable("alphalab")

@pytest.mark.unit
def test_api_package_importable() -> None:
    assert _is_importable("alphalab.api")

@pytest.mark.unit
def test_data_package_importable() -> None:
    assert _is_importable("alphalab.data")

@pytest.mark.unit
def test_dsl_package_importable() -> None:
    assert _is_importable("alphalab.dsl")

@pytest.mark.unit
def test_engine_package_importable() -> None:
    assert _is_importable("alphalab.engine")

@pytest.mark.unit
def test_worker_package_importable() -> None:
    assert _is_importable("alphalab.worker")

@pytest.mark.unit
def test_common_package_importable() -> None:
    assert _is_importable("alphalab.common")

@pytest.mark.unit
def test_config_package_importable() -> None:
    assert _is_importable("alphalab.config")

@pytest.mark.unit
def test_utils_package_importable() -> None:
    assert _is_importable("alphalab.utils")

EXPECTED_PACKAGES = [
    "alphalab",
    "alphalab.api",
    "alphalab.data",
    "alphalab.dsl",
    "alphalab.engine",
    "alphalab.worker",
    "alphalab.common",
    "alphalab.config",
    "alphalab.utils",
]

@pytest.mark.unit
def test_package_structure_complete() -> None:
    missing = [pkg for pkg in EXPECTED_PACKAGES if not _is_importable(pkg)]
    assert not missing, f"Missing or not importable: {missing}"

@pytest.mark.unit
def test_src_layout_respected() -> None:
    spec = importlib.util.find_spec("alphalab")
    assert spec is not None
    package_origin = Path(spec.origin or "")
    assert "src" in package_origin.parts, f"alphalab imported from {package_origin}, must be from src/"
```

---

## Step 7: Configure Git Environment and Ignores

Create a `.gitignore` file to ensure local secrets, virtual environments, build outputs, and testing caches are never committed to git:

```text
# Python bytecode
__pycache__/
*.py[cod]
*$py.class

# Environments
.venv/
env/
venv/
ENV/

# Development / Secrets (Must NEVER be tracked)
.env
internal/

# IDE files
.idea/
.vscode/
*.swp

# Testing and Coverage
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/
.ruff_cache/

# Build artifacts
build/
dist/
*.egg-info/
```

---

## Step 8: Configure Automated CI Workflows

Create GitHub Action files under `.github/workflows/` to verify code quality on every PR or commit push.

### 1. Lint Workflow
Create `.github/workflows/lint.yml`:
```yaml
name: Lint

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main, dev ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"
      - name: Run Ruff Check
        run: ruff check .
      - name: Run Ruff Format
        run: ruff format --check .
      - name: Run Mypy Typecheck
        run: mypy src/
```

### 2. Test Workflow
Create `.github/workflows/test.yml`:
```yaml
name: Test

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main, dev ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"
      - name: Run Pytest
        run: pytest --cov=src/alphalab --cov-report=xml
```

### 3. Installation Verification Workflow
Create `.github/workflows/install.yml`:
```yaml
name: Install Check

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main, dev ]

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Clean install check
        run: |
          python -m pip install --upgrade pip
          pip install .
          python -c "import alphalab"
```

---

## Step 9: Verify Everything Works Locally

To verify your newly created skeleton:

```bash
# 1. Create a virtual environment
python -m venv .venv
source .venv/bin/activate

# 2. Install package in development mode
pip install -e ".[dev]"

# 3. Start local Postgres and Redis
docker compose -f infra/docker-compose.yml up -d

# 4. Run pre-commit checks on all files
pre-commit run --all-files

# 5. Run pytest smoke tests
pytest
```

If all 11 tests pass and pre-commit checks succeed, you have successfully set up the **AlphaLab** development skeleton!
