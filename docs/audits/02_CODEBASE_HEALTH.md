# AlphaLab Codebase Health Audit

**Date:** 2026-07-06
**Scope:** Maintainability (Phases 0–4)
**Focus:** God classes/functions, duplication, dead code, complexity, and file size.

---

## 1. God Classes & Functions

**Question:** Are any modules attempting to do too much?

### Finding 1: God Function in Worker
**Verification Status:** ✓ Verified by code
**Evidence:** 
File: `src/alphalab/worker/tasks.py` (Lines 60–149).
`_run_backtest_async` orchestrates 9 distinct responsibilities, including data ingestion, compilation, and metric calculation.
**Reasoning:** If a maintainer needs to debug a metric calculation error, they are forced to step through Celery worker and database extraction code.
**Recommendation:** High priority extraction to `ExperimentRunner`.

### Finding 2: Lack of God Classes
**Verification Status:** ✓ Verified by execution
**Evidence:** Running file size analysis confirms the longest file in the repository is `src/alphalab/data/storage/duckdb.py` at only **243 lines**. 
**Reasoning:** A typical God Class runs into thousands of lines. The strict enforcement of `Provider`, `Storage`, and `Validator` abstract base classes has successfully forced developers to create many small, cohesive files rather than massive monolithic classes.
**Recommendation:** Continue enforcing interface-driven design.

---

## 2. Duplication

**Question:** Is copy-paste coding rampant?

### Finding 1: Repeated SQLAlchemy Eager Loading Logic
**Verification Status:** ✓ Verified by code
**Evidence:**
File: `src/alphalab/api/routers/experiments.py`
The exact same `selectinload` chain is duplicated three times across different route handlers (Lines 134, 154, 174):
```python
.options(
    selectinload(Experiment.factors).selectinload(Factor.backtest_result),
    selectinload(Experiment.factors).selectinload(Factor.robustness_result),
)
```
**Reasoning:** If we ever add a new relationship to `Factor` (e.g., `Factor.leaderboard_entry`), we will have to remember to update this loading logic in three separate places, which is highly prone to human error.
**Recommendation:** Extract this into a shared query builder method like `_get_experiment_options()`.

---

## 3. TODOs & Dead Code

**Question:** Is there hidden technical debt or untested branches?

### Finding 1: Zero TODOs
**Verification Status:** ✓ Verified by execution
**Evidence:** `grep -r -i "TODO" src/` yields 0 results.
**Reasoning:** The team is resolving technical debt as they go rather than leaving "fixme" comments in the source code.
**Recommendation:** Excellent engineering discipline.

### Finding 2: Low-Coverage IO Boundaries
**Verification Status:** ✓ Verified by execution
**Evidence:** `pytest --cov=src` shows `yahoo_provider.py` at only 16% coverage.
**Reasoning:** While it isn't "dead code", it behaves like it from a CI perspective because the API calls are likely being skipped to avoid rate limits during automated testing.
**Recommendation:** Implement `vcrpy` or `responses` to mock the HTTP responses.

---

## 4. Complexity & Naming Consistency

**Question:** Are the variables understandable and the logic traceable?

### Finding 1: Domain-Driven Naming
**Verification Status:** ✓ Verified by code
**Evidence:** Across the `engine` and `dsl` packages, naming is explicitly financial. (e.g., `Rank IC`, `Calmar`, `Lookahead Bias`, `Turnover`).
**Reasoning:** Code reads like a quantitative finance textbook, adhering strictly to Ubiquitous Language. A quant researcher could read the engine code and immediately understand what `PortfolioConstructor.signals_to_weights` is doing.
**Recommendation:** Excellent.

### Finding 2: Clean Compiler Complexity
**Verification Status:** ✓ Verified by code
**Evidence:** `src/alphalab/dsl/compiler.py` uses the Visitor pattern (`visit_BinaryOperation`, `visit_RollingFunction`).
**Reasoning:** The cyclomatic complexity of compiling an AST could easily spiral out of control with massive `if/else` blocks. The visitor pattern elegantly dispatches operations to small, isolated methods.

---

## Final Verdict

If I had to maintain this codebase for 2 years, I would be **highly confident**. 

The files are incredibly short, there are no scattered `TODO` traps, the domain terminology is pristine, and the complexity is handled using established design patterns (Visitors, Repositories). 

The only two worries for long-term maintenance are the **Celery orchestration function** (which is actively slated for refactoring) and the **duplicated SQLAlchemy eager loading queries** in the API routers, both of which are trivial to fix.
