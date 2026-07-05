# ADR-006 — Point-in-Time Universe Abstraction

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-05 |
| **Phase** | 1 — Data Foundation |
| **Deciders** | Vaishnavi Rai, Akshat Kankani |

---

## Context

Backtesting quantitative factors on historical data is subject to **survivorship bias** if we use the *current* list of NIFTY 50 constituents. Historically, companies are frequently added to or deleted from the index based on market capitalization, liquidity, and other rules. If a backtester evaluates a factor in 2020 using the 2026 constituents, it is evaluating companies that survived and thrived, skewing the performance metrics artificially high.

To prevent this, the backtesting engine must evaluate factors using the exact point-in-time constituents list active on that specific historical date.

We need a clean model to track and query these constituent memberships over time.

---

## Decision

Implement an **Interval-Based Universe Mapping**:
1.  Define a `Universe` interface and concrete `NIFTY50Universe` class.
2.  Store constituent records with duration intervals using start and end dates: `effective_from` and `effective_to`. If a stock is currently active, its `effective_to` is `None` (NULL in the database).
3.  Query active constituents for a target date using interval bounds:
    `effective_from <= date AND (effective_to IS NULL OR effective_to >= date)`.
4.  Define constituent records in a versioned CSV resource file (`src/alphalab/data/resources/nifty50_history.csv`) inside the package repository rather than hardcoding it in python code.
5.  Return typed `UniverseEntry` domain models.

---

## Alternatives Considered

### Option A — Hardcoded date ranges in Python (Rejected)
Writing lists of if-else checks in code.
*   *Why Rejected*: Poor maintainability. Hardcoding tickers makes it difficult to read, test, or update without changing source code files.

### Option B — Event Logs (Rejected)
Logging discrete event additions and deletions (e.g. `{"date": "2022-09-30", "action": "ADD", "ticker": "ADANIENT.NS"}`).
*   *Why Rejected*: Query complexity. Reconstructing the active list of 50 constituents for any date requires replaying the entire history of events from the beginning, which is slow and prone to errors.

---

## Tradeoffs

| Tradeoff | Assessment |
|---|---|
| **Manual CSV Maintenance** | We must update the CSV file whenever the NIFTY 50 index changes. However, index changes only occur semi-annually, so the maintenance cost is extremely low. |

---

## Consequences

*   The backtester is guaranteed to run without survivorship bias.
*   Determining the active universe for any historical date is completed in a single, fast SQL or Pandas query.
*   Constituent records are versioned in Git alongside the source code.
