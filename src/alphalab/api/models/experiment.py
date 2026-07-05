"""
alphalab.api.models.experiment
==============================
Defines the database schema mapping for Factor Research Experiments.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from alphalab.api.models.base import Base

if TYPE_CHECKING:
    from alphalab.api.models.factor import Factor
    from alphalab.api.models.user import User


class Experiment(Base):
    """Experiment database model representation."""

    __tablename__ = "experiments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="PENDING", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # Establish relationships
    user: Mapped["User"] = relationship("User", back_populates="experiments")
    factors: Mapped[list["Factor"]] = relationship(
        "Factor",
        back_populates="experiment",
        cascade="all, delete-orphan",
    )
