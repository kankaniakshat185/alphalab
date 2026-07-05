"""
alphalab.api.routers.users
==========================
FastAPI routing endpoints for User management.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from alphalab.api.auth.hash import get_password_hash
from alphalab.api.auth.jwt import get_current_user
from alphalab.api.database.connection import get_db_session
from alphalab.api.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])


# --- Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Endpoints ---
@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """Create a new user profile.

    Args:
        user_in: User registration inputs (email, name, password).
        db: Active database session.

    Returns:
        The created User profile.
    """
    # Check if email is already taken
    query = select(User).where(User.email == user_in.email)
    result = await db.execute(query)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists",
        )

    # Hash password and create User record
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        id=uuid.uuid4(),
        email=user_in.email,
        hashed_password=hashed_pwd,
        name=user_in.name,
        created_at=datetime.now(UTC),
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.get("/me", response_model=UserOut)
async def read_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> User:
    """Retrieve the profile details of the active authenticated user."""
    return current_user
