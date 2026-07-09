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
            if isinstance(result, int | float):
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
            name_lower = node.name.lower()

            def get_price_series(df: pd.DataFrame) -> pd.Series:
                col = (
                    "close"
                    if "close" in df.columns
                    else ("Price" if "Price" in df.columns else df.columns[0])
                )
                return df[col]

            if name_lower == "momentum":
                return lambda df: get_price_series(df).pct_change(int(args_eval[0](df)))
            elif name_lower == "volatility":
                return (
                    lambda df: get_price_series(df)
                    .pct_change()
                    .rolling(int(args_eval[0](df)))
                    .std()
                )
            elif name_lower == "rollingmean":
                return (
                    lambda df: get_price_series(df)
                    .rolling(int(args_eval[0](df)))
                    .mean()
                )
            elif name_lower == "rollingstd":
                return (
                    lambda df: get_price_series(df).rolling(int(args_eval[0](df))).std()
                )
            elif name_lower in ("lag", "delay"):
                return lambda df: args_eval[0](df).shift(int(args_eval[1](df)))
            elif name_lower == "delta":
                return lambda df: args_eval[0](df) - args_eval[0](df).shift(
                    int(args_eval[1](df))
                )
            elif name_lower == "ts_max":
                return lambda df: args_eval[0](df).rolling(int(args_eval[1](df))).max()
            elif name_lower == "ts_min":
                return lambda df: args_eval[0](df).rolling(int(args_eval[1](df))).min()
            elif name_lower == "ts_rank":
                return (
                    lambda df: args_eval[0](df)
                    .rolling(int(args_eval[1](df)))
                    .rank(pct=True)
                )
            elif name_lower == "scale":

                def scale_fn(df):
                    val = args_eval[0](df)
                    target = float(args_eval[1](df))
                    abs_sum = val.abs().sum()
                    if abs_sum == 0:
                        return val
                    return val * (target / abs_sum)

                return scale_fn
            elif name_lower == "correlation":
                return (
                    lambda df: args_eval[0](df)
                    .rolling(int(args_eval[2](df)))
                    .corr(args_eval[1](df))
                )
            elif name_lower == "rank":
                return lambda df: args_eval[0](df)
            else:
                raise DSLCompilationError(
                    f"Compilation for function {node.name} is not implemented."
                )

        raise DSLCompilationError(
            f"Cannot compile unknown node type: {type(node).__name__}"
        )
