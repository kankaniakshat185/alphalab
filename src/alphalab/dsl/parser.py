"""
alphalab.dsl.parser
===================
Recursive descent parser for the Factor DSL.
"""


from alphalab.common.exceptions import DSLCompilationError
from alphalab.dsl.ast import ASTNode, BinaryOp, FunctionCall, NumberLiteral, Variable
from alphalab.dsl.lexer import Token


class Parser:
    """Parses a list of Tokens into an Abstract Syntax Tree (AST)."""

    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0

    def parse(self) -> ASTNode:
        """Parse tokens and return the root ASTNode."""
        if not self.tokens:
            raise DSLCompilationError("Cannot parse empty formula.")
        node = self._expression()
        if self.pos < len(self.tokens):
            tok = self._current()
            raise DSLCompilationError(
                f"Unexpected token '{tok.value}' at position {tok.position}."
            )
        return node

    def _current(self) -> Token:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return Token("EOF", "", -1)

    def _consume(self, expected_type: str) -> Token:
        tok = self._current()
        if tok.type == expected_type:
            self.pos += 1
            return tok
        raise DSLCompilationError(
            f"Expected {expected_type}, got {tok.type} '{tok.value}' at position {tok.position}."
        )

    def _match(self, *expected_types: str) -> bool:
        tok = self._current()
        if tok.type in expected_types:
            self.pos += 1
            return True
        return False

    def _expression(self) -> ASTNode:
        node = self._term()
        while True:
            tok = self._current()
            if tok.type in ("PLUS", "MINUS"):
                self._consume(tok.type)
                right = self._term()
                node = BinaryOp(left=node, operator=tok.value, right=right)
            else:
                break
        return node

    def _term(self) -> ASTNode:
        node = self._factor()
        while True:
            tok = self._current()
            if tok.type in ("MULTIPLY", "DIVIDE"):
                self._consume(tok.type)
                right = self._factor()
                node = BinaryOp(left=node, operator=tok.value, right=right)
            else:
                break
        return node

    def _factor(self) -> ASTNode:
        tok = self._current()
        if tok.type == "MINUS":
            self._consume("MINUS")
            node = self._factor()
            if isinstance(node, NumberLiteral):
                return NumberLiteral(value=-node.value)
            return BinaryOp(left=NumberLiteral(value=-1.0), operator="*", right=node)
        elif tok.type == "NUMBER":
            self._consume("NUMBER")
            return NumberLiteral(value=float(tok.value))
        elif tok.type == "LPAREN":
            self._consume("LPAREN")
            node = self._expression()
            self._consume("RPAREN")
            return node
        elif tok.type == "IDENTIFIER":
            self._consume("IDENTIFIER")
            next_tok = self._current()
            if next_tok.type == "LPAREN":
                self._consume("LPAREN")
                args = []
                if self._current().type != "RPAREN":
                    args.append(self._expression())
                    while self._match("COMMA"):
                        args.append(self._expression())
                self._consume("RPAREN")
                return FunctionCall(name=tok.value, arguments=args)
            else:
                return Variable(name=tok.value)
        else:
            raise DSLCompilationError(
                f"Expected NUMBER, IDENTIFIER, or LPAREN, got {tok.type} '{tok.value}' at position {tok.position}."
            )
