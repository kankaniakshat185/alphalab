# AlphaLab — Master Plan

> **Status:** Active
> **Version:** 1.0
> **Last updated:** 2026-07-05 (Phase 0 — Engineering Foundation)

---

## 1. Project Identity

**AlphaLab** is a robustness-aware factor research platform for NIFTY 50 equities.

Its purpose is not to generate trading signals. Its purpose is to evaluate whether
a given predictive factor is genuinely robust — or merely overfit to historical data.

**AlphaLab is an evaluation platform. Finance is the application domain.**

---

## 2. The Research Question

> **"Can we distinguish genuinely robust predictive factors from overfit ones
> using systematic stress testing?"**

Every component in this system exists to answer this question.

Before any feature is added, the following question must be asked:

> *Does this help answer the research question?*

If the answer is no — do not build it. Document why it was deferred instead.

This is not a restriction. It is a discipline that keeps the project coherent,
defensible, and valuable.

---

## 3. The Research Thesis

Most quantitative factor research suffers from the same failure mode: a factor
that performs well on historical data may do so because it genuinely captures
a stable market dynamic, or because it has been inadvertently fit to the noise
in that specific historical sample.

The standard approach — evaluate on in-sample data, report Sharpe ratio —
cannot distinguish these two cases.

AlphaLab's thesis is that **systematic stress testing** can make this
distinction operationally:

- A factor that maintains its performance when price/volume data is perturbed
  by small amounts of noise is likely capturing a real signal.
- A factor that collapses under small perturbations is likely overfit to
  specific data artefacts.

The robustness score — the ratio of stressed performance to original
performance — is the primary output of this platform.

---

## 4. Project Goals

| Goal | Description |
|---|---|
| Evaluate factor robustness | Quantify how stable a factor's performance is under noise and missing data |
| Prevent look-ahead bias | Enforce point-in-time universe construction and walk-forward validation |
| Safe factor definition | Allow users to define factors without writing arbitrary Python |
| Asynchronous evaluation | Run long backtests in the background without blocking the user |
| Reproducible research | Every experiment is stored with its inputs, outputs, and robustness score |
| Portfolio-quality engineering | The repository serves as a case study in professional software architecture |

---

## 5. Non-Goals

The following are explicitly outside the scope of AlphaLab v1.
They are documented here — not hidden — because the decision to exclude them
is a deliberate engineering choice, not an oversight.

| Not a goal | Why |
|---|---|
| Live trading | AlphaLab evaluates historical factors. Live execution is a separate domain. |
| Portfolio construction | Optimal portfolio weights are beyond the scope of factor robustness evaluation. |
| Real-time data | Historical daily OHLCV from Yahoo Finance is sufficient for the robustness thesis. |
| Factor optimisation | We evaluate factors, not optimise them. Optimisation creates its own overfitting risk. |
| Multi-market coverage | Starting with NIFTY 50 keeps the data pipeline simple. Extension to other markets is designed for but not built. |

---

## 6. Architecture Overview

AlphaLab is a two-service system:

```
┌──────────────────────────────────────────────────────────────────┐
│  Client (Browser / Next.js)                                      │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTP
┌──────────────────────▼───────────────────────────────────────────┐
│  FastAPI Application                                             │
│  - Experiment management                                         │
│  - Factor DSL validation and compilation                         │
│  - Backtest/Robustness job enqueueing                            │
│  - Leaderboard queries                                           │
└────────────┬─────────────────────────────┬────────────────────────┘
             │ PostgreSQL                  │ Redis (enqueue)
┌────────────▼─────────┐        ┌──────────▼──────────────────────┐
│  PostgreSQL          │        │  Celery Worker                  │
│  - Users             │        │  - Backtest engine              │
│  - Experiments       │        │  - Robustness engine            │
│  - Factor metadata   │        │  - Results → PostgreSQL         │
│  - Results           │        └──────────┬──────────────────────┘
│  - Job status        │                   │ DuckDB
└──────────────────────┘        ┌──────────▼──────────────────────┐
                                │  DuckDB                         │
                                │  - OHLCV market data            │
                                │  - Universe (point-in-time)     │
                                │  - Factor values                │
                                └─────────────────────────────────┘
```

---

## 7. Phase Roadmap

| Phase | Name | Status |
|---|---|---|
| 0 | Engineering Foundation | ✅ Complete |
| 1 | Data Foundation | ✅ Complete |
| 2 | Factor DSL | ✅ Complete |
| 3 | Backtesting Engine | ✅ Complete |
| 4 | Background Execution | ✅ Complete |
| 5 | Robustness Engine | ✅ Complete |
| 6 | Backend API | 🔲 Next |
| 7 | Research Reports | 🔲 Planned |
| 8 | Frontend | 🔲 Planned |
| 9 | Testing | 🔲 Planned |
| 10 | Deployment | 🔲 Planned |
| 11 | Polish & Interview Readiness | 🔲 Planned |

---

## 8. Deliberately Deferred Features

The following features were considered and explicitly excluded from v1.
They are documented here because the decision to exclude them is a
signal of engineering maturity, not a gap.

| Feature | Why deferred |
|---|---|
| Regime Detection (HMM/K-Means) | A thesis-sized ML project on its own. Shallow implementation would invite unanswerable interview questions. |
| Cross-Market Transfer (India ↔ US) | Doubles the data pipeline scope. Only meaningful once the India-only robustness thesis is proven. |
| Factor Decay Tracking | Requires months of live data to be meaningful. Cannot be demonstrated from historical backtests. |
| SHAP Explainability | Not load-bearing for the robustness thesis. Adds a dependency without proving the core claim. |
| LLM-Assisted Factor Generation | Highest risk of appearing as a thin wrapper around a prompt. Dilutes the quantitative rigour story. |
| MLflow | PostgreSQL table is sufficient at this scale. MLflow's overhead is not justified. |
| Multi-queue Celery | Single queue is sufficient. Multi-queue adds operational complexity without measured benefit. |

---

## 9. Success Criteria

AlphaLab v1 is complete when:

1. A user can define a factor using the DSL (`Momentum(20) / Volatility(30)`)
2. The system compiles and validates the factor (leakage check, complexity check)
3. A backtest runs asynchronously and produces Sharpe, IC, RankIC, Drawdown
4. A robustness evaluation runs and produces a robustness score with failure reasoning
5. Results are displayed on the leaderboard and factor detail page
6. A research report is automatically generated for every completed experiment
7. All tests pass with ≥80% coverage on `src/alphalab/dsl/` and `src/alphalab/engine/`
8. The system runs cleanly with `docker compose up`
9. The documentation accurately describes the running system

---

## 10. Portfolio Positioning

**Short description (resume bullet):**
> Built AlphaLab, a robustness-aware factor research platform that stress-tests NIFTY 50 alpha factors against noise and missing data to distinguish stable signals from overfit ones.

**Extended description:**
> Designed and built a quantitative research platform with a custom DSL for safe factor definition (no arbitrary code execution), a walk-forward backtesting engine (Sharpe, IC, RankIC), and a robustness engine quantifying factor stability under noise and missing-data perturbation on NIFTY 50 equities. Introduced async task processing (Celery + Redis) after profiling backtest latency, offloading multi-second jobs from the request path.

**Interview talking points:**
- Why a DSL instead of sandboxed Python → safety model, leakage detection tractability
- Why DuckDB alongside PostgreSQL → columnar analytical vs. relational metadata split
- Why Celery, and only a single queue → measured latency problem, not a checklist item
- Why walk-forward validation → temporal leakage, look-ahead bias
- What was deferred and why → each deferred feature is its own thesis
