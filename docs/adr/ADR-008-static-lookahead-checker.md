# ADR 008: Static Look-ahead Checker

## Status
Accepted

## Context
Temporal look-ahead bias (using tomorrow's data to make today's decision) is the most common error in quantitative research. If a researcher writes `Lag(Price, -1)`, the system would be cheating by looking into the future.

## Decision
We implemented a Static Validator that traverses the Abstract Syntax Tree (AST) *before* compilation. It specifically checks:
1. `Lag` shifts must be positive integers (e.g., `Lag(Price, 1)` means yesterday's price).
2. Rolling window sizes for `Momentum`, `Volatility`, `RollingMean`, and `RollingStd` must be strictly positive integers.

## Consequences
- **Positive**: Prevents leaky strategies from ever reaching the backtesting engine.
- **Negative**: Dynamic look-ahead bias (where the window size is derived from a complex runtime calculation) cannot be statically verified. We restrict window sizes to be `NumberLiteral` at parse time to enforce this.
