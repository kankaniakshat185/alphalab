"""
alphalab.data.validation.report
===============================
Defines the ValidationIssue and ValidationReport structures to track diagnostics.
"""

from dataclasses import dataclass, field
from enum import Enum


class Severity(Enum):
    """Indicates the impact of a validation check failure."""

    WARNING = "WARNING"  # Minor anomalies, data remains usable
    ERROR = "ERROR"  # Critical failures, data must be discarded


@dataclass(frozen=True)
class ValidationIssue:
    """Represents a single validation check failure detail."""

    ticker: str
    issue_type: str
    description: str
    severity: Severity


@dataclass
class ValidationReport:
    """Orchestrates multiple ValidationIssues captured during checks."""

    issues: list[ValidationIssue] = field(default_factory=list)

    def add_issue(
        self, ticker: str, issue_type: str, description: str, severity: Severity
    ) -> None:
        """Helper to create and append a new validation issue."""
        self.issues.append(
            ValidationIssue(
                ticker=ticker,
                issue_type=issue_type,
                description=description,
                severity=severity,
            )
        )

    def merge(self, other: "ValidationReport") -> None:
        """Merge another ValidationReport's issues into this report."""
        self.issues.extend(other.issues)

    @property
    def has_errors(self) -> bool:
        """Return True if any logged issue has ERROR severity."""
        return any(issue.severity == Severity.ERROR for issue in self.issues)

    @property
    def errors(self) -> list[ValidationIssue]:
        """Retrieve all logged issues marked as ERROR."""
        return [issue for issue in self.issues if issue.severity == Severity.ERROR]

    @property
    def warnings(self) -> list[ValidationIssue]:
        """Retrieve all logged issues marked as WARNING."""
        return [issue for issue in self.issues if issue.severity == Severity.WARNING]
