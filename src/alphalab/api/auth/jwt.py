"""
alphalab.api.auth.jwt
=====================
Defines JSON Web Token creation, authentication parsing, and user resolvers.
"""

import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from alphalab.api.database.connection import get_db_session
from alphalab.api.models.user import User
from alphalab.config.settings import settings

logger = logging.getLogger("alphalab.api.auth.jwt")

# Setup Bearer authorization header parser
security_scheme = HTTPBearer()


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Generate a signed JWT access token.

    Args:
        data: Subject data containing identifiers (e.g. user_id).
        expires_delta: Optional custom expiry duration.

    Returns:
        The encoded token string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Cast timestamp to numeric epoch representation
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT access token.

    Args:
        token: Signed JWT token string.

    Returns:
        Decoded payload dictionary or None if invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("[BackendAuth] [JWT] Access token signature has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"[BackendAuth] [JWT] Access token decoding failed: {e}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),  # noqa: B008
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """Dependency resolver parsing token authorization headers to load the active User."""

    if settings.MOCK_MODE:
        return User(id=uuid.uuid4(), email="bypass@alphalab.com", name="Bypass User", hashed_password="dummy")

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Query the user from the database
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user
