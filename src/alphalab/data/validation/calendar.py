"""
alphalab.data.validation.calendar
=================================
Validates trading dates in MarketDatasets against expected business days.
"""

import logging
from datetime import date

import pandas as pd

from alphalab.common.types import MarketDataset
from alphalab.data.validation.base import Validator
from alphalab.data.validation.report import Severity, ValidationReport

logger = logging.getLogger("alphalab.data.validation.calendar")


class CalendarValidator(Validator):
    """Ensures trading dates fall on valid weekdays and identifies unexpected gaps."""

    def __init__(self) -> None:
        """Initialize the CalendarValidator."""
        pass

    def validate(self, dataset: MarketDataset) -> ValidationReport:
        """Inspect dates for weekend trading and check for missing business days.

        Args:
            dataset: The MarketDataset to check.

        Returns:
            ValidationReport enclosing errors or warnings.
        """
        logger.info("[DataIngestion] [CalendarValidator] Running calendar validations")
        report = ValidationReport()
        df = dataset.data

        if df.empty:
            return report

        # 1. Resolve expected business days in range (Monday to Friday)
        expected_range = pd.date_range(
            start=dataset.start_date, end=dataset.end_date, freq="B"
        )
        expected_dates: set[date] = set(expected_range.date)

        # 2. Check for weekend entries (Saturday=5, Sunday=6)
        # Convert date column to pandas datetime to extract day of week
        date_series = pd.to_datetime(df["date"])
        weekend_mask = date_series.dt.dayofweek.isin([5, 6])
        weekend_records = df[weekend_mask]

        if not weekend_records.empty:
            for ticker, ticker_df in weekend_records.groupby("ticker"):
                ticker_str = str(ticker)
                bad_dates = ticker_df["date"].unique()
                report.add_issue(
                    ticker=ticker_str,
                    issue_type="WEEKEND_TRADING",
                    description=f"Detected trading activity on weekends: {list(bad_dates)}",
                    severity=Severity.WARNING,
                )

        # 3. Check for missing business days per ticker
        for ticker, ticker_df in df.groupby("ticker"):
            ticker_str = str(ticker)
            ticker_dates = set(ticker_df["date"])
            missing_days = expected_dates - ticker_dates

            # Flag missing business days as a WARNING
            if missing_days:
                sorted_missing = sorted(list(missing_days))
                # limit print length in reports
                display_days = (
                    f"{sorted_missing[:5]}... (+{len(sorted_missing)-5} more)"
                    if len(sorted_missing) > 5
                    else f"{sorted_missing}"
                )
                report.add_issue(
                    ticker=ticker_str,
                    issue_type="MISSING_TRADING_DAY",
                    description=f"Missing expected business day(s): {display_days}",
                    severity=Severity.WARNING,
                )

        logger.debug(
            f"[DataIngestion] [CalendarValidator] Calendar check completed. Captured {len(report.issues)} issues."
        )
        return report
