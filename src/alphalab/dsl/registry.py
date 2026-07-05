"""
alphalab.dsl.registry
=====================
Defines the registry for supported primitives and functions in the Factor DSL.
"""

from typing import Dict

# Supported binary operators
SUPPORTED_OPERATORS = {"+", "-", "*", "/"}

# Supported functions: Mapping of function name to its expected argument count.
SUPPORTED_FUNCTIONS: Dict[str, int] = {
    "Momentum": 1,     # e.g., Momentum(20)
    "Volatility": 1,   # e.g., Volatility(30)
    "RollingMean": 1,  # e.g., RollingMean(20)
    "RollingStd": 1,   # e.g., RollingStd(20)
    "Lag": 2,          # e.g., Lag(Price, 1) - used to evaluate temporal look-ahead checks
}


def is_supported_function(name: str) -> bool:
    """Check if the given function name is registered in the DSL."""
    return name in SUPPORTED_FUNCTIONS


def get_expected_arity(name: str) -> int:
    """Return the expected number of arguments for a function."""
    return SUPPORTED_FUNCTIONS.get(name, -1)
