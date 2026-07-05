"""Tests for the Factor DSL Validator."""

import pytest

from alphalab.common.exceptions import DataLeakageError, DSLCompilationError
from alphalab.dsl.lexer import Lexer
from alphalab.dsl.parser import Parser
from alphalab.dsl.validator import StaticValidator


def test_validator_valid_lag() -> None:
    ast = Parser(Lexer("Lag(Price, 1)").tokens).parse()
    validator = StaticValidator(ast)
    validator.validate()  # Should not raise


def test_validator_lookahead_bias() -> None:
    ast = Parser(Lexer("Lag(Price, -1)").tokens).parse()
    validator = StaticValidator(ast)
    with pytest.raises(DataLeakageError, match="negative shift"):
        validator.validate()


def test_validator_invalid_window() -> None:
    ast = Parser(Lexer("Momentum(-5)").tokens).parse()
    validator = StaticValidator(ast)
    with pytest.raises(DataLeakageError, match="Invalid window size"):
        validator.validate()

    ast2 = Parser(Lexer("Momentum(0)").tokens).parse()
    validator2 = StaticValidator(ast2)
    with pytest.raises(DataLeakageError, match="Invalid window size"):
        validator2.validate()


def test_validator_unsupported_function() -> None:
    ast = Parser(Lexer("FuturePrice(10)").tokens).parse()
    validator = StaticValidator(ast)
    with pytest.raises(DSLCompilationError, match="Unsupported function"):
        validator.validate()
