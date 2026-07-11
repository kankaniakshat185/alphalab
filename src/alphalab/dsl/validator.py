"""
alphalab.dsl.validator
======================
Statically analyzes the AST for look-ahead bias and validity.
"""

from alphalab.common.exceptions import DataLeakageError, DSLCompilationError
from alphalab.dsl.ast import ASTNode, BinaryOp, FunctionCall, NumberLiteral, Variable
from alphalab.dsl.registry import get_expected_arity, is_supported_function


class StaticValidator:
    """Traverses the AST and raises exceptions on invalid syntax or logic."""

    def __init__(self, ast: ASTNode):
        self.ast = ast

    def validate(self) -> None:
        """Runs all validations on the AST."""
        self._visit(self.ast)

    def _visit(self, node: ASTNode) -> None:
        if isinstance(node, BinaryOp):
            self._visit(node.left)
            self._visit(node.right)
        elif isinstance(node, FunctionCall):
            self._validate_function(node)
            for arg in node.arguments:
                self._visit(arg)
        elif isinstance(node, NumberLiteral | Variable):
            pass
        else:
            raise DSLCompilationError(f"Unknown AST node type: {type(node).__name__}")

    def _validate_function(self, node: FunctionCall) -> None:
        if not is_supported_function(node.name):
            raise DSLCompilationError(f"Unsupported function: {node.name}")

        expected_arity = get_expected_arity(node.name)
        if expected_arity != -1 and len(node.arguments) != expected_arity:
            raise DSLCompilationError(
                f"Function {node.name} expects {expected_arity} arguments, "
                f"got {len(node.arguments)}"
            )

        # Specific validations for look-ahead bias and correct literal usage
        name_lower = node.name.lower()

        if name_lower in ("lag", "delay") and len(node.arguments) >= 2:
            arg = node.arguments[1]
            if isinstance(arg, NumberLiteral):
                val = arg.value
                if val < 0:
                    raise DataLeakageError(
                        f"Temporal look-ahead bias detected in {node.name}: negative shift ({val})"
                    )
                if not val.is_integer():
                    raise DSLCompilationError(
                        f"Shift size for {node.name} must be an integer, got {val}"
                    )
        elif name_lower == "delta" and len(node.arguments) >= 2:
            arg = node.arguments[1]
            if isinstance(arg, NumberLiteral):
                val = arg.value
                if val <= 0:
                    raise DataLeakageError(
                        f"Invalid window/shift size for {node.name}: {val} (must be > 0)"
                    )
                if not val.is_integer():
                    raise DSLCompilationError(
                        f"Window/shift size for {node.name} must be an integer, got {val}"
                    )
        elif name_lower in ("ts_max", "ts_min", "ts_rank") and len(node.arguments) >= 2:
            arg = node.arguments[1]
            if isinstance(arg, NumberLiteral):
                val = arg.value
                if val <= 0:
                    raise DataLeakageError(
                        f"Invalid window size for {node.name}: {val} (must be > 0)"
                    )
                if not val.is_integer():
                    raise DSLCompilationError(
                        f"Window size for {node.name} must be an integer, got {val}"
                    )
        elif name_lower == "correlation" and len(node.arguments) >= 3:
            arg = node.arguments[2]
            if isinstance(arg, NumberLiteral):
                val = arg.value
                if val <= 0:
                    raise DataLeakageError(
                        f"Invalid window size for {node.name}: {val} (must be > 0)"
                    )
                if not val.is_integer():
                    raise DSLCompilationError(
                        f"Window size for {node.name} must be an integer, got {val}"
                    )
        elif (
            name_lower in ("momentum", "volatility", "rollingmean", "rollingstd")
            and len(node.arguments) >= 1
        ):
            arg = node.arguments[0]
            if isinstance(arg, NumberLiteral):
                val = arg.value
                if val <= 0:
                    raise DataLeakageError(
                        f"Invalid window size for {node.name}: {val} (must be > 0)"
                    )
                if not val.is_integer():
                    raise DSLCompilationError(
                        f"Window size for {node.name} must be an integer, got {val}"
                    )
