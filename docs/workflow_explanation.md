# Understanding AlphaLab's Engineering Configuration Files

If you're new to professional Python development, the variety of configuration files can look intimidating. Here is a simple, detailed explanation of what each of these files does, how they work, and why AlphaLab uses them.

---

## 1. `pyproject.toml`
*The Project's Master Instruction Manual*

- **What it is:** The modern standard configuration file for Python projects. TOML stands for "Tom's Obvious, Minimal Language" (a very readable format).
- **What it does:** It acts as the "single source of truth" for the repository. Instead of having five different hidden files for five different tools, everything is centralized here. In AlphaLab, it defines:
  - **Project ID:** Name (`alphalab`), version, description, and required Python version (`>=3.12`).
  - **Dependencies:** The external packages the project needs. When you run `pip install -e ".[dev]"`, pip reads this file to know exactly what to download (like `pytest`, `ruff`, and `mypy`).
  - **Ruff Settings:** Tells our linter how long lines of code should be (88 characters) and what specific coding rules to enforce.
  - **Mypy Settings:** Enforces strict type checking across the project.
  - **Pytest Settings:** Tells the test runner where to find tests (`tests/` folder) and how to measure code coverage.
- **Why we use it:** It guarantees that anyone who downloads the repository gets the exact same setup. You don't have to manually configure your testing or formatting tools; the `pyproject.toml` handles it automatically.

---

## 2. `.pre-commit-config.yaml`
*The Local Bouncer*

- **What it is:** A configuration file for a tool called "pre-commit".
- **What it does:** It sets up automated checks ("hooks") that run locally on your laptop **every single time you type `git commit`**. Before Git actually saves your commit, this file runs a checklist:
  - **File Hygiene:** Removes trailing spaces, ensures every file ends with a blank line, and prevents accidentally committing massive 500KB+ files.
  - **Syntax Checking:** Ensures you haven't broken any YAML or TOML files.
  - **Conflict Prevention:** Detects leftover Git merge conflict arrows (`<<<<<<<`).
  - **Branch Protection:** Explicitly prevents you from accidentally committing directly to the protected `main` or `dev` branches.
  - **Auto-Formatting:** Runs Ruff to automatically fix code styling before the commit is finalized.
- **Why we use it:** Humans forget things. Pre-commit acts as an automated assistant that catches formatting mistakes and simple errors *before* you push them to GitHub, saving you from failing CI checks later.

---

## 3. `.github/workflows/lint.yml`
*The GitHub Quality Inspector*

- **What it is:** A GitHub Actions workflow. Think of it as a robot that lives on GitHub's servers.
- **What it does:** Whenever someone pushes code or opens a Pull Request to `dev` or `main`, this robot wakes up, downloads your code into a fresh environment, and runs:
  - **Ruff:** Scans the code for styling violations, unused imports, or bad programming practices.
  - **Mypy:** Performs "static type checking." If a function expects a number, but your code passes text into it, Mypy will catch it.
- **Why we use it:** While pre-commit runs locally, developers can sometimes bypass it. The `lint.yml` workflow on GitHub is the un-bypassable gatekeeper. If the code doesn't meet quality standards, the Pull Request cannot be merged.

---

## 4. `.github/workflows/test.yml`
*The Code Breaker*

- **What it is:** Another GitHub Actions robot, entirely dedicated to testing.
- **What it does:** On every push or Pull Request, it runs `pytest`. This executes every single unit and integration test written in the `tests/` folder. It also calculates a "coverage report"—a percentage showing exactly how much of the code was executed during the tests.
- **Why we use it:** When you add a new feature, you might accidentally break an old feature. Automated tests catch this instantly. By running this workflow on every PR, we guarantee that AlphaLab's core logic is never broken by new code.

---

## 5. `.github/workflows/install.yml`
*The Clean Slate Test*

- **What it is:** A highly specialized GitHub Actions workflow for verifying the build process.
- **What it does:** It creates a completely blank, empty environment (no cached files). It then attempts to install AlphaLab from scratch using `pip install -e ".[dev]"`. Finally, it runs a script to ensure that every single sub-package (like `alphalab.api`, `alphalab.data`) can be successfully imported by Python without crashing.
- **Why we use it:** Have you ever heard a developer say, *"Well, it works on my machine!"*? Sometimes a project works locally because the developer has a specific hidden file or a leftover installed package. The `install.yml` workflow ensures that the project can be installed from scratch by a brand new user, guaranteeing the `pyproject.toml` is configured perfectly.
