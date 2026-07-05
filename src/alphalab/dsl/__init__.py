"""
alphalab.dsl
==========
Domain-Specific Language (DSL) compiler for AlphaLab.
"""

from typing import Callable

import pandas as pd

from alphalab.dsl.compiler import PandasCompiler
from alphalab.dsl.lexer import Lexer
from alphalab.dsl.parser import Parser
from alphalab.dsl.validator import StaticValidator


def compile_factor(expression: str) -> Callable[[pd.DataFrame], pd.Series]:
    """
    Compiles a string formula into an executable Pandas function.
    Raises DSLCompilationError or DataLeakageError if the formula is invalid.
    """
    tokens = Lexer(expression).tokens
    ast = Parser(tokens).parse()
    StaticValidator(ast).validate()
    return PandasCompiler(ast).compile()
