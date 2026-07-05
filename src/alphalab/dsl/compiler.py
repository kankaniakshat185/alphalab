"""
alphalab.dsl.compiler
=====================
Compiles a validated AST into a Pandas-compatible Python callable.
"""

from collections.abc import Callable
from typing import Any

import pandas as pd

from alphalab.common.exceptions import DSLCompilationError
from alphalab.dsl.ast import ASTNode, BinaryOp, FunctionCall, NumberLiteral, Variable


class PandasCompiler:
    """Compiles an AST into a function that takes a DataFrame and returns a Series."""

    def __init__(self, ast: ASTNode):
        self.ast = ast

    def compile(self) -> Callable[[pd.DataFrame], pd.Series]:
        """Returns the compiled execution function."""
        evaluator = self._build(self.ast)

        def execute(df: pd.DataFrame) -> pd.Series:
            result = evaluator(df)
            if isinstance(result, (int, float)):
                # Broadcast scalar to match dataframe index if needed
                return pd.Series(result, index=df.index)
            return result

        return execute

    def _build(self, node: ASTNode) -> Callable[[pd.DataFrame], Any]:
        if isinstance(node, NumberLiteral):
            val = node.value
            return lambda df: val

        elif isinstance(node, Variable):
            name = node.name
            return lambda df: df[name]

        elif isinstance(node, BinaryOp):
            left_eval = self._build(node.left)
            right_eval = self._build(node.right)
            op = node.operator

            if op == "+":
                return lambda df: left_eval(df) + right_eval(df)
            elif op == "-":
                return lambda df: left_eval(df) - right_eval(df)
            elif op == "*":
                return lambda df: left_eval(df) * right_eval(df)
            elif op == "/":
                return lambda df: left_eval(df) / right_eval(df)
            else:
                raise DSLCompilationError(f"Unsupported operator: {op}")

        elif isinstance(node, FunctionCall):
            args_eval = [self._build(arg) for arg in node.arguments]
            name = node.name

            if name == "Momentum":
                # Momentum(N) -> df['Price'].pct_change(N)
                return lambda df: df["Price"].pct_change(int(args_eval[0](df)))
            elif name == "Volatility":
                # Volatility(N) -> df['Price'].pct_change().rolling(N).std()
                return lambda df: df["Price"].pct_change().rolling(int(args_eval[0](df))).std()
            elif name == "RollingMean":
                return lambda df: df["Price"].rolling(int(args_eval[0](df))).mean()
            elif name == "RollingStd":
                return lambda df: df["Price"].rolling(int(args_eval[0](df))).std()
            elif name == "Lag":
                # Lag(Var, Shift)
                return lambda df: args_eval[0](df).shift(int(args_eval[1](df)))
            else:
                raise DSLCompilationError(
                    f"Compilation for function {name} is not implemented."
                )

        raise DSLCompilationError(
            f"Cannot compile unknown node type: {type(node).__name__}"
        )
