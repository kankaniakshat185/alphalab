"""
alphalab.data.validation.corporate_actions
==========================================
Identifies corporate action adjustments like stock splits, bonuses, or dividends.
"""

import logging

from alphalab.common.types import MarketDataset
from alphalab.data.validation.base import Validator
from alphalab.data.validation.report import Severity, ValidationReport

logger = logging.getLogger("alphalab.data.validation.corporate_actions")


class CorporateActionsValidator(Validator):
    """Detects corporate splits/dividends by monitoring close/adj_close ratio adjustments."""

    def __init__(self, ratio_change_threshold: float = 0.01) -> None:
        """Initialize the CorporateActionsValidator.

        Args:
            ratio_change_threshold: The percentage difference (e.g. 0.01) in ratio to trigger alerts.
        """
        self.ratio_change_threshold = ratio_change_threshold

    def validate(self, dataset: MarketDataset) -> ValidationReport:
        """Identify dates where price adjustments represent corporate actions.

        Args:
            dataset: The MarketDataset to check.

        Returns:
            ValidationReport enclosing corporate action flags.
        """
        logger.info(
            "[DataIngestion] [CorporateActionsValidator] Running corporate action validations"
        )
        report = ValidationReport()
        df = dataset.data

        if df.empty:
            return report

        for ticker, ticker_df in df.groupby("ticker"):
            ticker_str = str(ticker)
            ticker_df = ticker_df.sort_values("date")

            if len(ticker_df) < 2:
                continue

            # Calculate adjustment ratio: close / adj_close
            # Standardize handling of 0 or NaN prices
            adj_close_safe = ticker_df["adj_close"].replace(0, 1.0).fillna(1.0)
            ratio = ticker_df["close"] / adj_close_safe

            # Find percentage change in adjustment ratio between consecutive days
            ratio_pct_change = ratio.pct_change().abs()
            action_days = ticker_df[ratio_pct_change > self.ratio_change_threshold]

            for _, row in action_days.iterrows():
                change_val = ratio_pct_change.loc[row.name]
                report.add_issue(
                    ticker=ticker_str,
                    issue_type="CORPORATE_ACTION",
                    description=(
                        f"Corporate action detected on {row['date']} (Ratio changed by {change_val * 100:.2f}%)"
                    ),
                    severity=Severity.WARNING,
                )

        logger.debug(
            f"[DataIngestion] [CorporateActionsValidator] Corporate actions check completed. "
            f"Captured {len(report.issues)} issues."
        )
        return report
