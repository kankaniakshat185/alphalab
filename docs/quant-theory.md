# Quantitative & Financial Theory Guide

> **Scope:** Economic & Quant concepts relevant to AlphaLab
> **Author:** Vaishnavi Rai, Akshat Kankani
> **Last updated:** 2026-07-06

This guide serves as a comprehensive reference for the economic, financial, and quantitative trading theory underlying the **AlphaLab** platform. It outlines key market anomalies, statistical biases, and data-engineering challenges, explaining exactly where they manifest and how the platform prevents or accounts for them.

---

## 1. Summary of Concepts

| Concept | What it is | Where it occurs in AlphaLab | How we prevent/model it |
|---|---|---|---|
| **Survivorship Bias** | Ignoring assets that went bankrupt, merged, or got delisted historically. | Historical NIFTY 50 universe selection. | [Point-in-Time Universe](#21-survivorship-bias) |
| **Look-Ahead Bias** | Peeking at future information that was not yet known. | Factor formula calculations and DB queries. | [SQL boundaries & AST shift validation](#22-look-ahead-bias-data-leakage) |
| **Overfitting (Snooping)** | Fitting strategy rules to historical noise rather than real signals. | Tuning factor formulas to get a high Sharpe. | [Systematic Robustness Perturbations](#23-overfitting--data-snooping-bias) |
| **Corporate Actions** | Stock splits and dividends causing artificial price jumps. | Ingestion of raw stock close prices. | [Adjusted Close Tracking & Validation](#24-corporate-actions-split--dividend-bias) |
| **Market Impact & Turnover** | Price slippage caused by our own trading volumes. | Backtester portfolio rebalancing. | [Turnover Penalties & Transaction Drag](#25-market-impact--portfolio-turnover) |
| **Walk-Forward Bias** | Optimizing parameters globally across the entire backtest. | Factor performance evaluations. | [Rolling Out-of-Sample Splits](#26-walk-forward-validation) |

---

## 2. In-Depth Concepts

### 2.1. Survivorship Bias

#### The Theory
If you backtest a trading model using the list of index constituents active **today**, you are introducing survivorship bias. Today's companies are, by definition, the "survivors" (winners). You are ignoring the companies that were in the index in the past but collapsed, merged, or got kicked out due to declining market values.

#### Where it comes into play
In AlphaLab, we backtest on historical NIFTY 50 stocks from 2015 to 2026. If we evaluated our factors only on the NIFTY 50 constituents of 2026, our backtests would show an artificially high Sharpe ratio because we never simulated buying the companies that declined and got delisted.

#### How we prevent it
We implement a **Point-in-Time (PIT) Universe**:
1. We store historical membership changes in [nifty50_history.csv](file:///Users/prashantkumar/Documents/AlphaLab/src/alphalab/data/resources/nifty50_history.csv) (tracking `effective_from` and `effective_to` dates).
2. For any simulated date $T$, `NIFTY50Universe.get_constituents(T)` retrieves only the stocks that were *actually* in the index on that specific day.
3. If *Yes Bank* was in the index in 2017, we trade it. When it was kicked out of the NIFTY 50 in 2020, we stop trading it.

---

### 2.2. Look-Ahead Bias (Data Leakage)

#### The Theory
Look-ahead bias occurs when a backtest utilizes information that was not yet historically available at the simulated time of trade. For example, using tomorrow's close price to decide whether to buy today.

#### Where it comes into play
1. **Database Queries**: Fetching historical prices without locking the query date.
2. **DSL Factor Expressions**: Writing expressions like `Lag(Price, -2)` (which shifts data forward, peeking at future price points).
3. **Index Announcements**: Buying a stock on Jan 1 because it is announced to join the NIFTY 50 in March.

#### How we prevent it
1. **Strict SQL Time-Gates**: All database queries retrieve data using an explicit upper boundary on the timestamp:
   `WHERE date <= :current_date`
2. **AST Static Checks**: The `StaticValidator` walks the parsed Abstract Syntax Tree (AST) of the factor expression. If a `Lag` function uses a negative shift (e.g. `Lag(Price, -1)`), the validator immediately throws a `DataLeakageError` and halts compilation.
3. **Index Membership Date Enforcement**: Membership lookups check `effective_from <= T`. Even if a stock joins in March, it is invisible to the backtester in January.

---

### 2.3. Overfitting / Data Snooping Bias

#### The Theory
If a researcher tests 1,000 different factor parameters (e.g. varying moving average windows from 1 to 1,000) on the same historical dataset, they will eventually find one that performs exceptionally well. However, this parameter is likely fit to the random noise of that specific dataset, not a real signal, and will lose money in live trading.

#### Where it comes into play
When researchers submit and iterate on factor formulas in the experiment pipeline, trying to maximize the Sharpe ratio on historical NIFTY 50 daily prices.

#### How we prevent it
We build a **Robustness Stress-Testing Engine** (Phase 5):
1. Instead of trusting a single backtest score, we pertub the base dataset. We generate multiple perturbed datasets in-memory by injecting low-amplitude Gaussian noise and simulating missing data gaps (dropout).
2. We run the compiled factor function on all perturbed datasets.
3. If the factor's performance collapses under noise, it indicates the factor was fit to the noise (overfit). The platform flags this factor with a low **Robustness Score** and lists the failure reasoning, alerting the researcher that the signal is fragile.

---

### 2.4. Corporate Actions (Split & Dividend Bias)

#### The Theory
When a stock undergoes a **stock split** (e.g., a 2-for-1 split) or distributes a **large dividend**, the nominal share price drops instantly (e.g. from \$100 to \$50). In raw price data, this looks like a sudden 50% price drop.
If your factor calculations use unadjusted prices, a momentum factor would interpret this drop as a massive sell signal, and a volatility factor would report extreme risk, when in reality no investor lost money.

#### Where it comes into play
During data ingestion, when raw daily price data is loaded from Yahoo Finance.

#### How we prevent it
1. **Adjusted Close Tracking**: The `Transformer` cleans raw tables and mandates the presence of `adj_close` (adjusted close price) inside the `MarketDataset` dataclass wrapper. `adj_close` accounts for stock splits, reverse splits, and dividends backward in time.
2. **Validation Rules**: The `CorporateActionsValidator` flags large price jumps (e.g., $>50\%$) that are accompanied by huge volume anomalies, alerting the pipeline of unadjusted outliers before they enter storage.

---

### 2.5. Market Impact & Portfolio Turnover

#### The Theory
*   **Portfolio Turnover**: Measures the rate at which a portfolio replaces its stock holdings. High turnover means buying and selling frequently.
*   **Market Impact / Slippage**: In reality, you cannot execute trades at the exact historical close price if you trade large volumes. Your own orders push the price against you (buying pushes prices up, selling pushes them down). High turnover exacerbates this cost, wiping out theoretical profits.

#### Where it comes into play
In Phase 3 (Backtesting Engine), when simulating rebalancing signals (converting daily factor ranks into target portfolio holdings).

#### How we prevent it
1. **Turnover Tracking**: We calculate portfolio turnover as:
   $$\text{Turnover} = \sum |w_{i, t} - w_{i, t^-}|$$
   where $w_{i, t}$ is the target weight and $w_{i, t^-}$ is the pre-rebalance weight.
2. **Transaction Cost Drag**: The `metrics.py` calculator applies a transaction fee (slippage penalty) per unit of turnover (e.g., 10 basis points) to penalize hyper-active strategies that are unprofitable after accounting for execution friction.

---

### 2.6. Walk-Forward Validation

#### The Theory
Evaluating a model's performance on the same dataset used to generate the parameters (In-Sample) gives an overly optimistic view. Models must be evaluated on unseen data (Out-of-Sample).

#### Where it comes into play
Phase 3 (Backtesting Engine) when presenting the final factor performance reports on the leaderboard.

#### How we prevent it
We design the backtesting loop to run a **Walk-Forward Simulation**:
*   The factor weights are determined dynamically at each timestamp using historical ranks up to that day.
*   The strategy returns are computed only on the subsequent periods. This simulates a realistic "live trading" scenario, ensuring that performance metrics represent out-of-sample execution.
