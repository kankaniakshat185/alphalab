"""
alphalab.common.exceptions
==========================
Defines shared exception classes for the AlphaLab project.
"""


class AlphaLabError(Exception):
    """Base exception for all AlphaLab errors."""

    pass


class DataError(AlphaLabError):
    """Raised when data retrieval, storage, or ingestion operations fail."""

    pass


class DSLCompilationError(AlphaLabError):
    """Raised when the DSL compiler encounters a syntax or parsing error."""

    pass


class DataLeakageError(AlphaLabError):
    """Raised when the static analyzer detects temporal look-ahead bias."""

    pass
