"""
alphalab.data.validation.suite
==============================
Orchestrates and executes multiple sub-validators in sequence, merging results.
"""

import logging

from alphalab.common.types import MarketDataset
from alphalab.data.validation.base import Validator
from alphalab.data.validation.report import Severity, ValidationReport

logger = logging.getLogger("alphalab.data.validation.suite")


class ValidatorSuite(Validator):
    """Orchestrates execution of multiple Validator modules against a MarketDataset."""

    def __init__(self, validators: list[Validator]) -> None:
        """Initialize the ValidatorSuite.

        Args:
            validators: A list of Validator instances to execute.
        """
        self.validators = validators

    def validate(self, dataset: MarketDataset) -> ValidationReport:
        """Run all registered validators sequentially, merging reports.

        Args:
            dataset: The MarketDataset to check.

        Returns:
            ValidationReport containing consolidated warnings and errors.
        """
        logger.info(
            f"[DataIngestion] [ValidatorSuite] Executing suite of {len(self.validators)} validators"
        )
        suite_report = ValidationReport()

        for validator in self.validators:
            validator_name = validator.__class__.__name__
            try:
                report = validator.validate(dataset)
                suite_report.merge(report)
            except Exception as e:
                logger.error(
                    f"[DataIngestion] [ValidatorSuite] Validator {validator_name} raised unexpected error: {e}"
                )
                suite_report.add_issue(
                    ticker="SYSTEM",
                    issue_type="VALIDATION_FAILED",
                    description=f"Validator {validator_name} failed: {e}",
                    severity=Severity.ERROR,  # Block ingestion if validator crashes
                )

        logger.info(
            f"[DataIngestion] [ValidatorSuite] Suite execution complete. "
            f"Errors: {len(suite_report.errors)}, Warnings: {len(suite_report.warnings)}"
        )
        return suite_report
