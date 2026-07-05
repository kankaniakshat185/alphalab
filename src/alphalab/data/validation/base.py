"""
alphalab.data.validation.base
=============================
Defines the abstract interface for validating MarketDatasets.
"""

from abc import ABC, abstractmethod

from alphalab.common.types import MarketDataset
from alphalab.data.validation.report import ValidationReport


class Validator(ABC):
    """Abstract base class representing a focused validation check module."""

    @abstractmethod
    def validate(self, dataset: MarketDataset) -> ValidationReport:
        """Run validation rules against a MarketDataset.

        Args:
            dataset: The MarketDataset instance to inspect.

        Returns:
            A ValidationReport compiling any issues detected.
        """
        pass
