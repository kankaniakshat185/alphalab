# AlphaLab — Next Stage

> **Upcoming phase:** Phase 7 — Research Reports
> **Depends on:** Phase 6 — Backend API Expansion ✅
> **Last updated:** 2026-07-08

---

## Objective

Design and implement a **Research Report Generator** that aggregates the results of an experiment into a portable, human-readable format (e.g., Markdown or PDF). This provides the quant researcher with a tangible artifact that can be shared, archived, and reviewed outside of the web application.

---

## Deliverables

| Deliverable | Description |
|---|---|
| Report Template | A Jinja2 (or similar) template defining the structure of the quantitative report. |
| Report Generator | Python service class to inject experiment results (metrics, failure explanations, recommendations) into the template. |
| API Endpoint | `GET /factors/{factor_id}/report` to trigger report generation and download. |

---

## Files Expected to Change or Be Created

```
src/alphalab/reports/
    generator.py        (NEW: Core reporting logic)
    templates/
        factor_report.md.j2  (NEW: Base template)

src/alphalab/api/routers/
    factors.py          (Updated: Add report download endpoint)

tests/reports/
    test_generator.py   (NEW: Unit tests for report logic)

docs/
    02_CURRENT_STATE.md  Updated: Phase 7 complete
    03_NEXT_STAGE.md     Rewritten: Phase 8 (Frontend)

internal/
    development_log/Phase_07.md
```
