"""Tests for the Factor DSL Compiler."""

import pandas as pd
import pytest

from alphalab.dsl import compile_factor
from alphalab.dsl.compiler import PandasCompiler
from alphalab.dsl.lexer import Lexer
from alphalab.dsl.parser import Parser


def test_compiler_basic_arithmetic() -> None:
    # 2 * Price + 10
    tokens = Lexer("2 * Price + 10").tokens
    ast = Parser(tokens).parse()
    compiler = PandasCompiler(ast)
    func = compiler.compile()

    df = pd.DataFrame({"Price": [10.0, 20.0, 30.0]})
    result = func(df)

    assert result.tolist() == [30.0, 50.0, 70.0]


def test_compiler_lag() -> None:
    tokens = Lexer("Lag(Price, 1)").tokens
    ast = Parser(tokens).parse()
    func = PandasCompiler(ast).compile()

    df = pd.DataFrame({"Price": [10.0, 20.0, 30.0]})
    result = func(df)

    assert pd.isna(result.iloc[0])
    assert result.iloc[1] == 10.0
    assert result.iloc[2] == 20.0


def test_compile_factor_pipeline() -> None:
    func = compile_factor("Momentum(2) * 2")
    df = pd.DataFrame({"Price": [100.0, 110.0, 120.0, 150.0]})

    # Momentum(2) = pct_change(2)
    # idx 0: NaN
    # idx 1: NaN
    # idx 2: (120 - 100) / 100 = 0.20
    # idx 3: (150 - 110) / 110 = 0.3636...
    # result = Momentum(2) * 2

    result = func(df)
    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    assert result.iloc[2] == pytest.approx(0.40)
    assert result.iloc[3] == pytest.approx(0.72727272)
