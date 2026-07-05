"""
alphalab.api.models.user
========================
Defines the database schema mapping for User accounts.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from alphalab.api.models.base import Base

if TYPE_CHECKING:
    from alphalab.api.models.experiment import Experiment


class User(Base):
    """User database model representation."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # Establish relationship to experiments
    experiments: Mapped[list["Experiment"]] = relationship(
        "Experiment",
        back_populates="user",
        cascade="all, delete-orphan",
    )
