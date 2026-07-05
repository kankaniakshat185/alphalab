# AlphaLab — Next Stage

> **Upcoming phase:** Phase 2 — Factor DSL
> **Depends on:** Phase 1 complete ✅
> **Last updated:** 2026-07-05

---

## Objective

Design and build a secure Domain-Specific Language (DSL) compiler for quantitative factors:
*   Allows researchers to write math formulas (e.g., `Momentum(10) / Volatility(20)`) as plain strings.
*   Converts the formula strings into an Abstract Syntax Tree (AST).
*   Statically validates the AST to prevent look-ahead bias (e.g., checking that variables do not access future time steps) and validates window bounds.
*   Compiles the validated tree into a callable Python function that can be executed on historical price series.

No backtesting or API integration. Compiler pipeline only.

---

## Deliverables

| Deliverable | Description |
|---|---|
| AST Definitions | Base structures representing operations, literals, and functions. |
| Lexer | Tokenizes raw formula strings into parsed lexical tokens. |
| Parser | Compiles linear tokens into a nested Abstract Syntax Tree (AST). |
| Static Validator | Performs checks for look-ahead bias, negative windows, and complexity bounds. |
| Code Generator | Compiles the AST into an executable Python callable. |
| Phase 2 Tests | Unit tests validating tokenization, AST creation, validation errors, and compiler execution. |
| Phase 2 Learning Notes | Compiler theory, AST structures, recursive descent parsing. |
| Phase 2 ADRs | Factor DSL grammar rules and security safety gates. |

---

## Files Expected to Change or Be Created

```
src/alphalab/dsl/
    __init__.py
    ast.py             Abstract Syntax Tree nodes definition
    lexer.py           Lexer (Tokenizes string formulas)
    parser.py          Parser (Converts tokens to AST)
    validator.py       AST static checker (prevent look-ahead bias)
    compiler.py        Code generator (AST to callable Python function)

tests/
    dsl/
        test_lexer.py
        test_parser.py
        test_validator.py
        test_compiler.py

docs/
    02_CURRENT_STATE.md      Updated: Phase 2 complete
    03_NEXT_STAGE.md         Rewritten: Phase 3
    adr/
        ADR-007-dsl-grammar.md
        ADR-008-static-lookahead-checker.md

internal/
    development_log/Phase_02.md
    learning_notes/
        AST_Design.md
        Parsing_Algorithms.md
        Static_Analysis.md
```

---

## Key Concepts (Phase 2 Interview Topics)
*   **Security Model**: Why we compile a DSL instead of using `eval()` or sandboxing raw Python (arbitrary code execution prevention).
*   **Static Leakage Check**: How to detect temporal look-ahead bias (checking index offsets for future data access).
*   **AST compilation**: How compiler passes separate syntax parsing from semantics validation.
*   **Recursive descent parsing**: Standard grammar parsing methodologies.

---

## Implementation Order

1.  `src/alphalab/dsl/ast.py`: Define node dataclasses.
2.  `src/alphalab/dsl/lexer.py`: Build string-to-token parsing.
3.  `src/alphalab/dsl/parser.py`: Build token-to-AST parsing.
4.  `src/alphalab/dsl/validator.py`: Code checkers (look-ahead bias, windows checks).
5.  `src/alphalab/dsl/compiler.py`: Generate runnable python lambdas.
6.  Unit tests for parser, compiler, and validator.
7.  Documentation (ADRs, learning notes, dev logs).
