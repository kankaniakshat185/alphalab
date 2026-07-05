# AlphaLab — Data Layer Phase Guide (Phase 1)

This developer guide details the file layout, data flows, and architectural design choices implemented in Phase 1 (Data Foundation).

---

## 1. File Responsibilities Index

Below is a index of every file created in Phase 1, its role, and its namespace path:

| Namespace File Path | Role | Responsibilities |
| :--- | :--- | :--- |
| **[config/settings.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/config/settings.py)** | Configuration | Loads settings from `.env`, managing database locations, HTTP limits, retry counts, and limits. |
| **[common/types.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/common/types.py)** | Domain Models | Defines standard type containers (`MarketDataset` and `UniverseEntry`) as clean `@dataclass` structures. |
| **[common/exceptions.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/common/exceptions.py)** | Error Handling | Defines standardized custom exceptions (`DataError`, `AlphaLabException`). |
| **[data/providers/provider.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/providers/provider.py)** | Provider Interface | Abstract class defining how to download raw price data in bulk. |
| **[data/providers/yahoo_provider.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/providers/yahoo_provider.py)** | Yahoo Client | Implements yfinance integration with retry backoffs, stacking ticker metrics into standard long-format DataFrames. |
| **[data/transformer.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/transformer.py)** | Transform Stage | Standardizes columns, normalizes timestamp dates, sets datatypes, and wraps output inside a `MarketDataset`. |
| **[data/universe/base.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/universe/base.py)** | Universe Interface | Abstract class for index constituent lookup functions. |
| **[data/universe/nifty50.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/universe/nifty50.py)** | Universe Resolver | Resolves point-in-time constituent lists active on specific dates using interval lookups. |
| **[data/resources/nifty50_history.csv](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/resources/nifty50_history.csv)** | Resource CSV | Pinned constituent data tracking active index intervals. |
| **[data/storage/schema.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/storage/schema.py)** | Schema Manager | Decouples table creation logic from database operations. Creates `ohlcv` and `universe` tables. |
| **[data/storage/base.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/storage/base.py)** | Storage Interface | Abstract base class for database input and query operations. |
| **[data/storage/duckdb.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/storage/duckdb.py)** | DuckDB Driver | Implements bulk writing of datasets and point-in-time lists. |
| **[data/validation/report.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/validation/report.py)** | Diagnostics Model | Houses diagnostic `ValidationIssue` and `ValidationReport` containers. |
| **[data/validation/base.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/validation/base.py)** | Validator Interface | Abstract base class for dataset inspections. |
| **[data/validation/schema.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/validation/schema.py)** | Format Validator | Checks column presence, null cells, and negative price bounds. |
| **[data/validation/quality.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/validation/quality.py)** | Quality Validator | Identifies relative missing bars and single-day price jumps. |
| **[data/validation/calendar.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/validation/calendar.py)** | Calendar Validator | Asserts dates fall on business days, flagging weekend transactions and date gaps. |
| **[data/validation/corporate_actions.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/validation/corporate_actions.py)** | Split Validator | Tracks daily changes in the Close-to-Adjusted Close ratio to identify splits or dividends. |
| **[data/validation/suite.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/validation/suite.py)** | Validator Suite | Orchestrates running multiple validators, merging separate lists into a single consolidated report. |
| **[data/pipeline.py](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/pipeline.py)** | Pipeline Orchestrator | Connects all components: downloads data, standardizes, validates, filters out errors, and writes clean data. |

---

## 2. Structured Data Flow Description

Here is how data flows through the ingestion pipeline from end-to-end:

1.  **Index Resolution**:
    *   The `IngestionPipeline` requests NIFTY 50 constituents active on the run date from `NIFTY50Universe`.
    *   `NIFTY50Universe` reads the [nifty50_history.csv](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/resources/nifty50_history.csv) resource, filters entries active on the date, and returns a list of `UniverseEntry` objects.
2.  **Bulk Fetch**:
    *   `IngestionPipeline` extracts tickers from the entries and calls `YahooProvider.fetch_ohlcv()`.
    *   `YahooProvider` executes a bulk API call to yfinance, downloads the data, and stacks the metrics into a long-format DataFrame with raw column names.
3.  **Data Standardization**:
    *   `DataTransformer` standardizes raw column names (mapping names like `Adj Close` to `adj_close`), normalizes datatypes, truncates timestamps to dates, and wraps the cleaned DataFrame in a `MarketDataset` domain object.
4.  **Diagnostics Verification**:
    *   `IngestionPipeline` passes the `MarketDataset` to `ValidatorSuite`.
    *   The suite executes `SchemaValidator`, `QualityValidator`, `CalendarValidator`, and `CorporateActionsValidator` in sequence. Each validator appends diagnostics to a `ValidationReport` without changing the data.
5.  **Filtering & Logging**:
    *   The pipeline scans the `ValidationReport`.
    *   Warnings (like weekend transactions or corporate action flags) are written to structured logs.
    *   For entries flagged with `Severity.ERROR` (like negative prices or null fields), the pipeline drops the corresponding ticker's records from the dataset.
6.  **Load Phase**:
    *   The filtered `MarketDataset` is passed to `DuckDBStorage.write_ohlcv()`.
    *   The corresponding clean `UniverseEntry` records are written to `DuckDBStorage.write_universe()`.
    *   The tables are written to the database file (configured in settings).

---

## 3. Rationale for Key Architectural Decisions

### A. Wrapping DataFrames in a `MarketDataset`
*   *Decision*: Avoid passing raw pandas DataFrames across packages; wrap them in a `@dataclass` `MarketDataset`.
*   *Why*: Raw DataFrames lack compile-time guarantees about what columns are present. By wrapping the DataFrame, we enforce column contracts (`ticker`, `date`, `open`, etc.) and dates in a typed container.

### B. Moving Schema Logic to `SchemaManager`
*   *Decision*: Remove SQL table creation statements from `DuckDBStorage` and place them in `SchemaManager`.
*   *Why*: Separation of concerns. The storage driver should focus on reading and writing data, not managing database schemas. Decoupling this allows schema updates or table modifications to be managed independently.

### C. Validation Reporting instead of Exceptions
*   *Decision*: Validators output a `ValidationReport` containing issues instead of throwing exceptions immediately.
*   *Why*: A single validation error shouldn't crash the entire ingestion run. By returning diagnostic reports, we can log details, filter out corrupted records, and let the remaining clean data process successfully.

### D. Interval-Based Universe Tracking
*   *Decision*: Track index membership using start and end intervals (`effective_from` and `effective_to`) rather than change log events.
*   *Why*: Lookups are simplified. Resolving active tickers for any historical date is done with a single query check: `effective_from <= date AND (effective_to IS NULL OR effective_to >= date)`, ensuring point-in-time accuracy and preventing survivorship bias.

### E. Vectorized Dataset Processing
*   *Decision*: Process all pricing data in bulk datasets (vectorized DataFrames) instead of iterating ticker-by-ticker or row-by-row.
*   *Why*: Performance. Vectorized operations run in compiled C-extension libraries in pandas and DuckDB, running 100x faster than standard Python loops, which is critical when processing thousands of daily records.
