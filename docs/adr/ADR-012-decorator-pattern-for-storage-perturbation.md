# ADR 012: Decorator Pattern for Storage Perturbation

## Status
Accepted

## Date
2026-07-08 (Phase 5)

## Context
The Robustness Engine (Phase 5) needs to evaluate factors against perturbed market data (e.g., Gaussian noise injected into prices, or randomly dropped consecutive bars). 
We had to decide *where* in the architecture this perturbation logic should live. 

Options considered:
1. **Modify DuckDBStorage**: Add `noise_level` and `missing_data_prob` directly to the `read_ohlcv()` method in `DuckDBStorage`.
2. **Modify FactorEvaluator**: Intercept the dataframe inside the engine just before applying the factor function.
3. **Decorator Pattern**: Create a wrapper around any `Storage` instance that intercepts the output of `read_ohlcv()`.

## Decision
We implemented the Decorator Pattern by creating `PerturbedStorage` in `alphalab.engine.robustness`. This class implements the `Storage` interface and takes an existing `Storage` instance (like `DuckDBStorage`) in its constructor. It delegates the `read_ohlcv` call to the underlying storage and then applies pure mutation functions (`perturb_gaussian`, `perturb_missing_data`) to the returned DataFrame.

## Rationale
1. **Dependency Inversion Principle**: The core `FactorEvaluator` requires an object that implements the `Storage` interface. By passing it `PerturbedStorage`, the evaluator doesn't know or care that the data is synthetic. The core engine remains completely unmodified.
2. **Single Responsibility Principle**: `DuckDBStorage` remains solely responsible for reading from DuckDB. It does not get polluted with statistical perturbation logic.
3. **Testability**: The pure perturbation functions (`perturb_gaussian`, `perturb_missing_data`) can be unit tested entirely independently of database connections or backtest engines.

## Consequences
- **Positive**: Extremely clean decoupling. The core backtesting engine remains robust and completely unaware of Phase 5 stress testing mechanisms.
- **Negative**: Slight overhead from wrapping the storage layer and modifying the DataFrame in memory after it's loaded, rather than doing it in SQL, but this is negligible given DuckDB's speed and Pandas' vectorized mutations.
