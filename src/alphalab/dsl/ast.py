"""
alphalab.dsl.ast
================
Defines the Abstract Syntax Tree (AST) nodes for the Factor DSL.
"""

from dataclasses import dataclass


class ASTNode:
    """Base class for all AST nodes."""

    pass


@dataclass
class NumberLiteral(ASTNode):
    """Represents a numeric literal (e.g., 10, 0.5)."""

    value: float


@dataclass
class Variable(ASTNode):
    """Represents a time-series variable (e.g., Price, Volume)."""

    name: str


@dataclass
class BinaryOp(ASTNode):
    """Represents a binary arithmetic operation (+, -, *, /)."""

    left: ASTNode
    operator: str
    right: ASTNode


@dataclass
class FunctionCall(ASTNode):
    """Represents a function call (e.g., Momentum(20), Lag(Price, 1))."""

    name: str
    arguments: list[ASTNode]
