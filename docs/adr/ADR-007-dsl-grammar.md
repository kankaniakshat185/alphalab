# ADR 007: Factor DSL Grammar

## Status
Accepted

## Context
Researchers need a way to define quantitative factors using familiar mathematical notation without executing arbitrary Python code (which would pose a severe security risk). We needed to design a grammar that supports arithmetic operations, basic technical indicators (Momentum, Volatility, Lag), and variables (Price, Volume).

## Decision
We chose a custom Domain-Specific Language (DSL) compiled via a handwritten recursive descent parser rather than `eval()`, `exec()`, or a library like `lark`.

The grammar is defined as:
```text
expression  ::= term ( (PLUS | MINUS) term )*
term        ::= factor ( (MULTIPLY | DIVIDE) factor )*
factor      ::= (MINUS)? (NUMBER | function_call | variable | LPAREN expression RPAREN)
function_call ::= IDENTIFIER LPAREN (expression (COMMA expression)*)? RPAREN
variable    ::= IDENTIFIER
```

## Consequences
- **Positive**: Total control over the compilation process and absolute security. Look-ahead bias can be statically verified.
- **Negative**: Adding new syntax (like ternary operators) requires extending the parser manually.
