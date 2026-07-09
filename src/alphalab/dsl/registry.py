"""
alphalab.dsl.registry
=====================
Defines the registry for supported primitives and functions in the Factor DSL.
"""

# Supported binary operators
SUPPORTED_OPERATORS = {"+", "-", "*", "/"}

# Supported functions: Mapping of function name to its expected argument count.
SUPPORTED_FUNCTIONS: dict[str, int] = {
    "Momentum": 1,  # e.g., Momentum(20)
    "Volatility": 1,  # e.g., Volatility(30)
    "RollingMean": 1,  # e.g., RollingMean(20)
    "RollingStd": 1,  # e.g., RollingStd(20)
    "Lag": 2,  # e.g., Lag(Price, 1) - used to evaluate temporal look-ahead checks
    # New WorldQuant/standard alpha functions (case-insensitive supported)
    "rank": 1,
    "scale": 2,
    "delay": 2,
    "delta": 2,
    "ts_max": 2,
    "ts_min": 2,
    "ts_rank": 2,
    "correlation": 3,
}


def is_supported_function(name: str) -> bool:
    """Check if the given function name is registered in the DSL (case-insensitive)."""
    name_lower = name.lower()
    return name_lower in {k.lower() for k in SUPPORTED_FUNCTIONS}


def get_expected_arity(name: str) -> int:
    """Return the expected number of arguments for a function (case-insensitive)."""
    name_lower = name.lower()
    for k, v in SUPPORTED_FUNCTIONS.items():
        if k.lower() == name_lower:
            return v
    return -1
