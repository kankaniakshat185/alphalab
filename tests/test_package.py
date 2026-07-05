"""
tests/test_package.py — Phase 0 Package Health Tests
======================================================

Purpose
-------
These tests verify the engineering foundation established in Phase 0.
There is no business logic to test yet — instead, these tests verify that:

    1. All packages are importable (the pyproject.toml + src/ layout works)
    2. The expected package structure exists on disk
    3. The package was installed from the src/ directory (not the project root)

Why these tests matter
----------------------
A broken pyproject.toml, a missing __init__.py, or a wrong src/ path would
cause mysterious import errors in every subsequent test. These smoke tests
catch structural regressions immediately, before they propagate.

All tests in this file are marked as unit tests and require no external
dependencies (no database, no network, no Docker).

Definition of Done (Phase 0)
-----------------------------
All 11 tests in this file must pass for Phase 0 to be considered complete.
"""

import importlib
import importlib.util
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _is_importable(module_name: str) -> bool:
    """Return True if the named module can be imported without error."""
    try:
        importlib.import_module(module_name)
        return True
    except ImportError:
        return False


# ---------------------------------------------------------------------------
# Import smoke tests
# Verify every package can be imported after `pip install -e .`
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_root_package_importable() -> None:
    """The root alphalab package must be importable."""
    assert _is_importable(
        "alphalab"
    ), "Could not import 'alphalab'. Ensure you have run: pip install -e '.[dev]'"


@pytest.mark.unit
def test_api_package_importable() -> None:
    """alphalab.api must be importable."""
    assert _is_importable(
        "alphalab.api"
    ), "Could not import 'alphalab.api'. Check src/alphalab/api/__init__.py"


@pytest.mark.unit
def test_data_package_importable() -> None:
    """alphalab.data must be importable."""
    assert _is_importable(
        "alphalab.data"
    ), "Could not import 'alphalab.data'. Check src/alphalab/data/__init__.py"


@pytest.mark.unit
def test_dsl_package_importable() -> None:
    """alphalab.dsl must be importable."""
    assert _is_importable(
        "alphalab.dsl"
    ), "Could not import 'alphalab.dsl'. Check src/alphalab/dsl/__init__.py"


@pytest.mark.unit
def test_engine_package_importable() -> None:
    """alphalab.engine must be importable."""
    assert _is_importable(
        "alphalab.engine"
    ), "Could not import 'alphalab.engine'. Check src/alphalab/engine/__init__.py"


@pytest.mark.unit
def test_worker_package_importable() -> None:
    """alphalab.worker must be importable."""
    assert _is_importable(
        "alphalab.worker"
    ), "Could not import 'alphalab.worker'. Check src/alphalab/worker/__init__.py"


@pytest.mark.unit
def test_common_package_importable() -> None:
    """alphalab.common must be importable."""
    assert _is_importable(
        "alphalab.common"
    ), "Could not import 'alphalab.common'. Check src/alphalab/common/__init__.py"


@pytest.mark.unit
def test_config_package_importable() -> None:
    """alphalab.config must be importable."""
    assert _is_importable(
        "alphalab.config"
    ), "Could not import 'alphalab.config'. Check src/alphalab/config/__init__.py"


@pytest.mark.unit
def test_utils_package_importable() -> None:
    """alphalab.utils must be importable."""
    assert _is_importable(
        "alphalab.utils"
    ), "Could not import 'alphalab.utils'. Check src/alphalab/utils/__init__.py"


# ---------------------------------------------------------------------------
# Package structure validation
# Verify all expected sub-packages exist on disk
# ---------------------------------------------------------------------------

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
    """All expected sub-packages must exist and be importable."""
    missing = [pkg for pkg in EXPECTED_PACKAGES if not _is_importable(pkg)]
    assert (
        not missing
    ), f"The following packages are missing or not importable: {missing}"


# ---------------------------------------------------------------------------
# src/ layout validation
# Verify the package resolves from src/, not from the project root
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_src_layout_respected() -> None:
    """
    The alphalab package must be installed from src/alphalab, not from the
    project root.

    This test catches a common src/ layout mistake: if the package is
    importable directly from the root (without installation), it means
    sys.path contains the project root, bypassing the src/ layout entirely.
    """
    spec = importlib.util.find_spec("alphalab")
    assert spec is not None, "alphalab package not found — run: pip install -e '.[dev]'"

    # The package origin must be a path under src/
    package_origin = Path(spec.origin or "")
    assert "src" in package_origin.parts, (
        f"alphalab is being imported from '{package_origin}', which is NOT inside "
        f"the src/ directory. This means the package was not installed correctly. "
        f"Run: pip install -e '.[dev]'"
    )
