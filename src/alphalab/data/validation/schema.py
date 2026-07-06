"""
alphalab.data.validation.schema
===============================
Implements basic structural and bounds validations on MarketDatasets.
"""

import logging

import pandas as pd

from alphalab.common.types import MarketDataset
from alphalab.data.validation.base import Validator
from alphalab.data.validation.report import Severity, ValidationReport

logger = logging.getLogger("alphalab.data.validation.schema")


class SchemaValidator(Validator):
    """Checks basic layout integrity, null columns, and bounds limits."""

    def validate(self, dataset: MarketDataset) -> ValidationReport:
        """Inspect column bounds, null constraints, and future date checks.

        Args:
            dataset: The MarketDataset to check.

        Returns:
            ValidationReport enclosing errors or warnings.
        """
        logger.info("[DataIngestion] [SchemaValidator] Running schema validations")
        report = ValidationReport()
        df = dataset.data

        if df.empty:
            return report

        today = pd.Timestamp.today().normalize()

        # Group by ticker to run validations per ticker
        for ticker, ticker_df in df.groupby("ticker"):
            ticker_str = str(ticker)

            # 1. Null Checks
            null_cols = []
            for col in ["date", "open", "high", "low", "close", "volume", "adj_close"]:
                if ticker_df[col].isnull().any():
                    null_cols.append(col)

            if null_cols:
                report.add_issue(
                    ticker=ticker_str,
                    issue_type="NULL_VALUE",
                    description=f"Null values detected in columns: {null_cols}",
                    severity=Severity.ERROR,
                )

            # 2. Negative Value Checks
            neg_cols = []
            for col in ["open", "high", "low", "close", "volume", "adj_close"]:
                if (ticker_df[col] < 0).any():
                    neg_cols.append(col)

            if neg_cols:
                report.add_issue(
                    ticker=ticker_str,
                    issue_type="NEGATIVE_VALUE",
                    description=f"Negative values detected in columns: {neg_cols}",
                    severity=Severity.ERROR,
                )

            # 3. Date Integrity Checks
            # Convert col to datetime in case the dataframe has standard python date objects (e.g. from tests)
            dates_as_dt = pd.to_datetime(ticker_df["date"])
            future_dates = ticker_df[dates_as_dt > today]
            if not future_dates.empty:
                report.add_issue(
                    ticker=ticker_str,
                    issue_type="FUTURE_DATE",
                    description=f"Detected {len(future_dates)} records with dates in the future",
                    severity=Severity.ERROR,
                )

        logger.debug(
            f"[DataIngestion] [SchemaValidator] Schema validation completed. Captured {len(report.issues)} issues."
        )
        return report
