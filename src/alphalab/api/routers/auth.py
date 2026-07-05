"""
alphalab.api.routers.auth
=========================
FastAPI routing endpoints for token generation.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from alphalab.api.auth.hash import verify_password
from alphalab.api.auth.jwt import create_access_token
from alphalab.api.database.connection import get_db_session
from alphalab.api.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """OAuth2 compatible token login, returning a JWT access token.

    Args:
        form_data: Username (email) and password inputs.
        db: Active database session.

    Returns:
        JSON response with the access token and type.
    """
    # Look up user by email
    query = select(User).where(User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Issue access token bound to the user id
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}
