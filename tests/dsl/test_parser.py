"""Tests for the Factor DSL Parser."""

import pytest

from alphalab.common.exceptions import DSLCompilationError
from alphalab.dsl.ast import BinaryOp, FunctionCall, NumberLiteral, Variable
from alphalab.dsl.lexer import Lexer
from alphalab.dsl.parser import Parser


def test_parser_basic_expression() -> None:
    tokens = Lexer("Momentum(20) / Volatility(30)").tokens
    parser = Parser(tokens)
    ast = parser.parse()

    assert isinstance(ast, BinaryOp)
    assert ast.operator == "/"
    assert isinstance(ast.left, FunctionCall)
    assert ast.left.name == "Momentum"
    assert len(ast.left.arguments) == 1
    assert isinstance(ast.left.arguments[0], NumberLiteral)
    assert ast.left.arguments[0].value == 20.0

    assert isinstance(ast.right, FunctionCall)
    assert ast.right.name == "Volatility"
    assert len(ast.right.arguments) == 1
    assert isinstance(ast.right.arguments[0], NumberLiteral)
    assert ast.right.arguments[0].value == 30.0


def test_parser_precedence() -> None:
    tokens = Lexer("Price + Volume * 2").tokens
    parser = Parser(tokens)
    ast = parser.parse()

    assert isinstance(ast, BinaryOp)
    assert ast.operator == "+"
    assert isinstance(ast.left, Variable)
    assert ast.left.name == "Price"
    assert isinstance(ast.right, BinaryOp)
    assert ast.right.operator == "*"
    assert isinstance(ast.right.left, Variable)
    assert ast.right.left.name == "Volume"
    assert isinstance(ast.right.right, NumberLiteral)
    assert ast.right.right.value == 2.0


def test_parser_error() -> None:
    tokens = Lexer("Momentum(20").tokens
    parser = Parser(tokens)
    with pytest.raises(DSLCompilationError):
        parser.parse()
