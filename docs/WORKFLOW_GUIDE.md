# AlphaLab Engineering Workflow Guide & Checklist

This document is your definitive start-to-finish guide for contributing to AlphaLab. It consolidates the branching strategy, commit conventions, PR process, and documentation policies into an actionable, step-by-step checklist.

---

## 1. Preparation & Branching

AlphaLab follows a strict branching model:
- `main` is protected and represents production-ready code. No direct commits are ever made.
- `dev` is the active integration branch. All day-to-day development branches off from here.
- `feature/*`, `bug/*`, `chore/*` branches are used for your work.

### 🏁 Branch Creation Checklist
- [ ] Checkout the `dev` branch: `git checkout dev`
- [ ] Pull the latest changes: `git pull origin dev`
- [ ] Verify you are in the correct phase by checking `docs/02_CURRENT_STATE.md` and `docs/03_NEXT_STAGE.md`.
- [ ] Create your new branch following the format `<type>/<scope>-<short-description>`.
  - *Types:* `feature`, `bug`, `chore`
  - *Scopes:* `repo`, `docs`, `infra`, `ci`, `api`, `data`, `dsl`, `engine`, `worker`, `config`, `tests`
  - *Example:* `git checkout -b feature/data-yahoo-provider`

---

## 2. Development & Implementation

The core philosophy of AlphaLab is to answer the research thesis: *"Can we distinguish genuinely robust predictive factors from overfit ones using systematic stress testing?"*

### 🛠️ Development Checklist
- [ ] **Phase Guard Verification:** Stop and verify that the feature belongs to the *current phase*. Do not implement future phase requirements (e.g., no Pydantic models in Phase 1).
- [ ] **Code Quality:** Ensure all public functions have strict type annotations (mypy) and docstrings.
- [ ] **No Magic Numbers:** Extract values into named constants.
- [ ] **Dependency Check:** If introducing a new dependency in `pyproject.toml`, verify it has a concrete present justification and add an inline comment or ADR.
- [ ] **Documentation Updates (The Matrix):** Identify which docs need updating for your feature:
  - Architecture changes → `docs/01_ARCHITECTURE.md`
  - Phase completed → `docs/02_CURRENT_STATE.md`
  - Next milestone defined → `docs/03_NEXT_STAGE.md`
  - Major architectural decision → `docs/adr/ADR-NNN-*.md`
  - New concept → `internal/learning_notes/`
  - Significant implementation → `internal/development_log/`
  - New file with real logic → `internal/file_reference/`

---

## 3. Verification & Validation (Local)

Before committing, you must ensure the codebase remains completely healthy.

### 🧪 Local Validation Checklist
- [ ] Run formatting & linting: `ruff check .` (should yield 0 errors)
- [ ] Run type checking: `mypy src/` (should yield 0 errors)
- [ ] Run test suite: `pytest tests/ -v` (all must pass, >=80% coverage where applicable)
- [ ] Ensure pre-commit hooks are installed (`pre-commit install`) and passing.
- [ ] Ensure infrastructure is valid (if changed): `docker compose -f infra/docker-compose.yml config`

---

## 4. Committing Changes

Commits must be descriptive and follow the exact convention.

### 📝 Commit Structure Checklist
- [ ] Stage your files: `git add <files>`
- [ ] Follow the format: `<type>(<scope>): <short description>`
  - *Rule:* All lowercase, present tense (e.g., "implement", not "implemented"), no period at the end, <= 72 characters.
  - *Example:* `git commit -m "feature(data): implement Yahoo Finance provider"`
- [ ] Add an optional commit body for non-obvious changes.

---

## 5. Pull Request & Review Process

All code makes its way into `dev` via Pull Requests. `main` only receives PRs from `dev` at phase boundaries.

### 🚀 PR Creation Checklist
- [ ] Push your branch: `git push -u origin feature/<your-branch-name>`
- [ ] Open a PR on GitHub targeting the `dev` branch.
- [ ] Ensure PR title matches the commit convention format.
- [ ] **Fill out the PR Template completely (`.github/PULL_REQUEST_TEMPLATE.md`):**
  - [ ] **Summary:** Bulleted list of what changed.
  - [ ] **Why:** Link to the relevant issue or task.
  - [ ] **How it was tested:** Provide exact commands and outputs.
  - [ ] **Documentation Checklist:** Tick all boxes for updated docs.
  - [ ] **Phase Guard:** Acknowledge that the PR stays within the current phase scope.
  - [ ] **CI:** Ensure all GitHub actions (`lint`, `test`, `install`) are passing.

### 🔍 Reviewer Checklist (For whoever reviews the PR)
- [ ] Reviewer has read every changed file completely.
- [ ] Reviewer understands the "why" behind each change.
- [ ] Verifies the change does not conflict with `docs/00_MASTER_PLAN.md`.
- [ ] Verifies Phase Guard (no scope creep into future phases).
- [ ] Confirms all CI checks are green.
- [ ] Verifies that the internal dev logs and learning notes (if any) are updated.
- [ ] *Golden Rule:* **Never approve a PR you cannot fully explain.**

---

## 6. Merging & Cleanup

Once approved and passing, the branch is integrated.

### 🔀 Merge Checklist
- [ ] Merge the PR into `dev` using standard merge strategies.
- [ ] Delete the feature branch post-merge.
- [ ] Update `TASKS.md` to reflect the completed work.
- [ ] (If this completes a phase) Open a PR from `dev` to `main`, repeating the review process for a phase rollout.

---

> **Note on AI and Assumptions:** If you (or the AI) are ever unsure about a requirement, whether a feature belongs in the current phase, or an architectural approach—**stop, document the uncertainty, and ask the human engineer.** Never assume.
