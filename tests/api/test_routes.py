"""
tests.api.test_routes
====================
Integration tests for FastAPI routers, input schemas, and error pathways.
"""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from alphalab.api.database.connection import get_db_session
from alphalab.api.main import app
from alphalab.api.models.experiment import Experiment
from alphalab.api.models.factor import Factor
from alphalab.api.models.user import User


@pytest.fixture
def mock_db() -> AsyncMock:
    """Fixture yielding a mocked database session."""
    db = AsyncMock()
    db.add = MagicMock()
    return db


@pytest.fixture
def client(mock_db: AsyncMock) -> TestClient:
    """Fixture yielding a TestClient with overridden database dependencies."""

    def _override_db():
        yield mock_db

    app.dependency_overrides[get_db_session] = _override_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.unit
def test_root_endpoint(client: TestClient) -> None:
    """Verify that root GET requests check API health."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "status": "online",
        "service": "AlphaLab API",
        "version": "1.0.0",
    }


@pytest.mark.unit
def test_register_user_success(client: TestClient, mock_db: AsyncMock) -> None:
    """Verify user registration succeeds with valid parameters."""
    # Mock email lookup (not found)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    payload = {
        "email": "user@example.com",
        "password": "mypassword123",
        "name": "User Name",
    }

    response = client.post("/users", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["name"] == "User Name"
    assert "id" in data


@pytest.mark.unit
def test_register_user_invalid_email(client: TestClient) -> None:
    """Verify user registration fails with invalid email format."""
    payload = {
        "email": "not-an-email",
        "password": "mypassword123",
        "name": "User Name",
    }

    response = client.post("/users", json=payload)
    assert response.status_code == 422


@pytest.mark.unit
def test_submit_experiment_requires_auth(client: TestClient) -> None:
    """Verify that submitting an experiment requires authorization headers."""
    payload = {
        "name": "Momentum Study",
        "description": "Evaluate momentum variations",
        "factors": [{"name": "MOM_10", "formula": "Momentum(10)"}],
    }

    response = client.post("/experiments", json=payload)
    assert response.status_code == 403


@pytest.mark.unit
@patch("alphalab.api.routers.experiments.run_backtest_task")
@patch("alphalab.api.routers.experiments.run_robustness_task")
def test_submit_experiment_success(
    mock_robustness: MagicMock,
    mock_backtest: MagicMock,
    client: TestClient,
    mock_db: AsyncMock,
) -> None:
    """Verify successful experiment submission queues background tasks."""
    # Mock JWT authentication
    mock_user = User(
        id=uuid.uuid4(),
        email="researcher@example.com",
        hashed_password="hash",
        name="Researcher",
    )
    mock_experiment = Experiment(
        id=uuid.uuid4(),
        user_id=mock_user.id,
        name="Momentum Study",
        description="Eval",
        status="RUNNING",
        created_at=datetime.now(UTC),
        factors=[
            Factor(
                id=uuid.uuid4(),
                name="MOM_10",
                formula="Momentum(10)",
                created_at=datetime.now(UTC),
            )
        ],
    )

    # 1. Mock get_current_user decoding payload to return mock_user
    with (
        patch("alphalab.api.auth.jwt.decode_access_token") as mock_decode,
        patch("alphalab.api.auth.jwt.select"),
    ):
        mock_decode.return_value = {"sub": str(mock_user.id)}

        # Setup mock db query return values for loading current user and reloaded experiment
        mock_user_executor = MagicMock()
        mock_user_executor.scalar_one_or_none.return_value = mock_user

        mock_exp_executor = MagicMock()
        mock_exp_executor.scalar_one.return_value = mock_experiment

        mock_db.execute.side_effect = [mock_user_executor, mock_exp_executor]

        payload = {
            "name": "Momentum Study",
            "description": "Eval",
            "factors": [{"name": "MOM_10", "formula": "Momentum(10)"}],
        }

        headers = {"Authorization": "Bearer fake-token-string"}
        response = client.post("/experiments", json=payload, headers=headers)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Momentum Study"
        assert data["status"] == "RUNNING"
        assert len(data["factors"]) == 1
        assert data["factors"][0]["name"] == "MOM_10"

        # Verify background tasks were enqueued
        mock_backtest.delay.assert_called_once()
        mock_robustness.delay.assert_called_once()
