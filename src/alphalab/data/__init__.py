"""
alphalab.data
=============
Market data, universe constituents, validation, and storage layer.
"""

from alphalab.data.pipeline import IngestionPipeline
from alphalab.data.providers.provider import MarketDataProvider
from alphalab.data.providers.yahoo_provider import YahooProvider
from alphalab.data.storage.base import Storage
from alphalab.data.storage.duckdb import DuckDBStorage
from alphalab.data.storage.schema import SchemaManager
from alphalab.data.transformer import DataTransformer
from alphalab.data.universe.base import Universe
from alphalab.data.universe.nifty50 import NIFTY50Universe
from alphalab.data.validation.base import Validator
from alphalab.data.validation.suite import ValidatorSuite

__all__ = [
    "IngestionPipeline",
    "MarketDataProvider",
    "YahooProvider",
    "Storage",
    "DuckDBStorage",
    "SchemaManager",
    "Universe",
    "NIFTY50Universe",
    "Validator",
    "ValidatorSuite",
    "DataTransformer",
]
