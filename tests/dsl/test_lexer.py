"""Tests for the Factor DSL Lexer."""

import pytest

from alphalab.common.exceptions import DSLCompilationError
from alphalab.dsl.lexer import Lexer


def test_lexer_basic_tokens() -> None:
    lexer = Lexer("Momentum(20) / Volatility(30.5) + Lag(Price, 1)")
    tokens = lexer.tokens

    expected_types = [
        "IDENTIFIER",
        "LPAREN",
        "NUMBER",
        "RPAREN",
        "DIVIDE",
        "IDENTIFIER",
        "LPAREN",
        "NUMBER",
        "RPAREN",
        "PLUS",
        "IDENTIFIER",
        "LPAREN",
        "IDENTIFIER",
        "COMMA",
        "NUMBER",
        "RPAREN",
    ]

    assert [t.type for t in tokens] == expected_types
    assert tokens[0].value == "Momentum"
    assert tokens[2].value == "20"
    assert tokens[7].value == "30.5"


def test_lexer_mismatch() -> None:
    with pytest.raises(
        DSLCompilationError, match="Unexpected character '@' at position 5"
    ):
        Lexer("Price@10")
