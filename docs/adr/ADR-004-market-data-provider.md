# ADR-004 — Market Data Provider Strategy

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-05 |
| **Phase** | 1 — Data Foundation |
| **Deciders** | Vaishnavi Rai, Akshat Kankani |

---

## Context

AlphaLab requires daily historical Open, High, Low, Close, Volume, and Adjusted Close (OHLCV) price history for NIFTY 50 equities to evaluate factor models.

While Yahoo Finance (`yfinance`) is used for local development and testing because it is free and does not require authentication, it is highly prone to rate limits, format changes, and occasional data drops. In a production environment, this provider will likely need to be replaced with a premium institutional data feed (such as Bloomberg, Refinitiv, or a local database broker).

We need an abstraction layer that isolates the core ingestion pipeline and backtester from the specific vendor's API.

---

## Decision

Introduce the **Strategy Pattern** for data fetching:
1.  Define an abstract interface `MarketDataProvider` in `alphalab.data.providers.provider`.
2.  Implement a concrete `YahooProvider` in `alphalab.data.providers.yahoo_provider` using the `yfinance` library.
3.  Inject the `MarketDataProvider` interface into the `IngestionPipeline`, ensuring the orchestrator never communicates directly with `yfinance`.

---

## Alternatives Considered

### Option A — Direct Integration (Rejected)
Directly calling `yfinance.download()` inside the ingestion pipeline class.
*   *Why Rejected*: Tight coupling. Yahoo's MultiIndex output and ticker suffix formats (e.g., `.NS` for NSE stocks) would leak into the pipeline logic. Replacing Yahoo with another provider would require rewriting the ingestion and test suites.

### Option B — File-Only Provider (Rejected)
Manually downloading CSVs and reading them from disk instead of using a live API.
*   *Why Rejected*: Highly manual. It restricts walk-forward testing and prevents the platform from being automated or updating its databases asynchronously.

---

## Tradeoffs

| Tradeoff | Assessment |
|---|---|
| **Slightly higher code footprint** | Enforcing base classes adds a few lines, but is standard practice for clean, decoupled architectures. |
| **Schema variation** | Different providers return different column names (e.g., `Close` vs. `close_price`). This is resolved by adding a separate `DataTransformer` layer. |

---

## Consequences

*   The ingestion pipeline is decoupled from the vendor. Replacing `YahooProvider` with a different vendor only requires implementing a new subclass of `MarketDataProvider`.
*   Data fetching failures and API rate-limiting retries are isolated inside the provider class.
