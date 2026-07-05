"""
alphalab.data.universe.base
===========================
Defines the abstract interface for universe constituent resolution.
"""

from abc import ABC, abstractmethod
from datetime import date

from alphalab.common.types import UniverseEntry


class Universe(ABC):
    """Abstract base class representing an index universe resolver."""

    @abstractmethod
    def get_constituents(self, as_of_date: date) -> list[UniverseEntry]:
        """Resolve active index constituents for a specific point-in-time date.

        Args:
            as_of_date: Point-in-time calculation date.

        Returns:
            List of UniverseEntry domain objects active on the target date.
        """
        pass
