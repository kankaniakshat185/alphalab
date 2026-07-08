"""
tests.api.test_factors
======================
Test suite for the factors router (leaderboard and details).
"""

import uuid
from collections.abc import Generator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from alphalab.api.database.connection import get_db_session
from alphalab.api.main import app
from alphalab.api.models.experiment import Experiment
from alphalab.api.models.factor import Factor
from alphalab.api.models.results import BacktestResult, RobustnessResult


@pytest.fixture
def mock_db() -> AsyncMock:
    """Fixture yielding a mocked database session."""
    db = AsyncMock()
    return db


@pytest.fixture
def client(mock_db: AsyncMock) -> Generator[TestClient, None, None]:
    """Fixture yielding a TestClient with overridden database dependencies."""
    def _override_db() -> Generator[AsyncMock, None, None]:
        yield mock_db

    app.dependency_overrides[get_db_session] = _override_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_factor() -> Factor:
    """Returns a mocked factor with results."""
    f = Factor(
        id=uuid.uuid4(),
        experiment_id=uuid.uuid4(),
        name="Test Factor",
        formula="Momentum(10)",
        created_at=datetime.now(UTC),
    )
    b_res = BacktestResult(
        factor_id=f.id,
        sharpe=1.5,
        ic=0.03,
        equity_curve=[{"date": "2020-01-01", "cumulative_return": 1.0}]
    )
    r_res = RobustnessResult(
        factor_id=f.id,
        overall_score=0.8,
        failure_reasons={"dominant_failure": "none"},
        perturbation_grid=[{"level": 0.05, "sharpe": 1.4, "retention": 0.9}]
    )
    f.backtest_result = b_res
    f.robustness_result = r_res
    exp = Experiment(id=f.experiment_id, status="COMPLETED")
    f.experiment = exp
    return f


def test_get_leaderboard(client: TestClient, mock_db: AsyncMock, sample_factor: Factor) -> None:
    """Test leaderboard returns successfully."""
    # Mock total count
    mock_db.scalar.return_value = 1

    # Mock query result
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [sample_factor]
    mock_db.execute.return_value = mock_result

    response = client.get("/factors/leaderboard")
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == str(sample_factor.id)
    assert data["items"][0]["overall_score"] == 0.8


def test_get_factor_details(client: TestClient, mock_db: AsyncMock, sample_factor: Factor) -> None:
    """Test retrieving factor metadata."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sample_factor
    mock_db.execute.return_value = mock_result

    response = client.get(f"/factors/{sample_factor.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(sample_factor.id)
    assert data["metrics"]["sharpe"] == 1.5


def test_get_factor_backtest(client: TestClient, mock_db: AsyncMock, sample_factor: Factor) -> None:
    """Test retrieving factor equity curve."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sample_factor.backtest_result
    mock_db.execute.return_value = mock_result

    response = client.get(f"/factors/{sample_factor.id}/backtest")
    assert response.status_code == 200
    data = response.json()
    assert len(data["equity_curve"]) == 1
    assert data["equity_curve"][0]["cumulative_return"] == 1.0


def test_get_factor_robustness(client: TestClient, mock_db: AsyncMock, sample_factor: Factor) -> None:
    """Test retrieving factor robustness."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sample_factor.robustness_result
    mock_db.execute.return_value = mock_result

    response = client.get(f"/factors/{sample_factor.id}/robustness")
    assert response.status_code == 200
    data = response.json()
    assert data["overall_score"] == 0.8
    assert len(data["grid"]) == 1
