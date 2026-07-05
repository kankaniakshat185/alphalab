"""
alphalab.dsl.lexer
==================
Tokenizes mathematical formulas into a stream of tokens.
"""

import re
from dataclasses import dataclass
from typing import List

from alphalab.common.exceptions import DSLCompilationError


@dataclass
class Token:
    """Represents a lexical token from the formula."""

    type: str
    value: str
    position: int


class Lexer:
    """
    Lexical analyzer for the Factor DSL.
    Converts raw strings into structured Tokens.
    """

    TOKEN_SPECS = [
        ("NUMBER", r"\d+(\.\d+)?"),
        ("IDENTIFIER", r"[a-zA-Z_]\w*"),
        ("PLUS", r"\+"),
        ("MINUS", r"-"),
        ("MULTIPLY", r"\*"),
        ("DIVIDE", r"/"),
        ("LPAREN", r"\("),
        ("RPAREN", r"\)"),
        ("COMMA", r","),
        ("WHITESPACE", r"\s+"),
        ("MISMATCH", r"."),
    ]

    def __init__(self, formula: str):
        self.formula = formula
        self.tokens: List[Token] = []
        self._tokenize()

    def _tokenize(self) -> None:
        tok_regex = "|".join(f"(?P<{pair[0]}>{pair[1]})" for pair in self.TOKEN_SPECS)

        for mo in re.finditer(tok_regex, self.formula):
            kind = mo.lastgroup
            if kind is None:
                continue

            value = mo.group()
            position = mo.start()

            if kind == "WHITESPACE":
                continue
            elif kind == "MISMATCH":
                raise DSLCompilationError(
                    f"Unexpected character '{value}' at position {position}"
                )

            self.tokens.append(Token(type=kind, value=value, position=position))
