"""
tests.api.test_auth
===================
Unit tests for password hashing and JWT token processing.
"""

from datetime import timedelta

import pytest

from alphalab.api.auth.hash import get_password_hash, verify_password
from alphalab.api.auth.jwt import create_access_token, decode_access_token


@pytest.mark.unit
def test_password_hashing() -> None:
    """Ensure password hashing generates unique hashes and validates successfully."""
    pwd = "secretpassword123"
    hashed = get_password_hash(pwd)

    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


@pytest.mark.unit
def test_jwt_token_generation_and_decoding() -> None:
    """Ensure JWT tokens encode subject claims and expire properly."""
    sub_data = {"sub": "test-user-id-1234"}
    token = create_access_token(sub_data, expires_delta=timedelta(minutes=5))

    # Verify token is a valid string
    assert isinstance(token, str)

    # Decode and check claims
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "test-user-id-1234"
    assert "exp" in decoded


@pytest.mark.unit
def test_expired_jwt_token() -> None:
    """Ensure expired JWT tokens return None."""
    sub_data = {"sub": "expired-user"}
    # Create token that expired 5 minutes ago
    token = create_access_token(sub_data, expires_delta=timedelta(minutes=-5))

    decoded = decode_access_token(token)
    assert decoded is None
