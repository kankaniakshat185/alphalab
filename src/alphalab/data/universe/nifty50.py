"""
alphalab.data.universe.nifty50
==============================
NIFTY 50 concrete constituent loader reading from versioned CSV resource.
"""

import logging
import os
from datetime import date

import pandas as pd

from alphalab.common.types import UniverseEntry
from alphalab.data.universe.base import Universe

logger = logging.getLogger("alphalab.data.universe.nifty50")


class NIFTY50Universe(Universe):
    """Historical NIFTY 50 constituent resolver parsing local CSV index duration intervals."""

    def __init__(self, csv_path: str | None = None) -> None:
        """Initialize the Universe resolver.

        Args:
            csv_path: Optional custom path to nifty50_history.csv.
                      If not provided, resolves relative to package path.
        """
        if csv_path is None:
            current_dir = os.path.dirname(__file__)
            self.csv_path = os.path.abspath(
                os.path.join(current_dir, "../resources/nifty50_history.csv")
            )
        else:
            self.csv_path = csv_path

    def get_constituents(self, as_of_date: date) -> list[UniverseEntry]:
        """Resolve NIFTY 50 active index constituent intervals for a point-in-time date.

        Args:
            as_of_date: Historical query date.

        Returns:
            List of UniverseEntry active on the target date.
        """
        logger.info(
            f"[DataIngestion] [NIFTY50Universe] Resolving NIFTY50 constituents for date: {as_of_date}"
        )

        if not os.path.exists(self.csv_path):
            logger.error(
                f"[DataIngestion] [NIFTY50Universe] CSV resource not found at: {self.csv_path}"
            )
            return []

        # Read CSV file
        df = pd.read_csv(self.csv_path, engine='python')

        # Standardize strings and convert dates
        df["ticker"] = df["ticker"].str.strip()
        df["index_name"] = df["index_name"].str.strip()
        import datetime
        def parse_date(x):
            if pd.isna(x) or not str(x).strip() or str(x).strip() in ("nan", "None"):
                return None
            return datetime.datetime.strptime(str(x).strip()[:10], "%Y-%m-%d").date()
            
        df["effective_from"] = df["effective_from"].apply(parse_date)

        # Safely parse effective_to, mapping NaNs/empty strings to None
        df["effective_to"] = df["effective_to"].apply(parse_date)

        # Filter active constituents for index_name='NIFTY50'
        # constituent is active if: effective_from <= as_of_date and (effective_to is None or effective_to >= as_of_date)
        is_nifty = df["index_name"] == "NIFTY50"
        started = df["effective_from"] <= as_of_date
        not_ended = df["effective_to"].isnull() | (df["effective_to"] >= as_of_date)

        filtered = df[is_nifty & started & not_ended]

        entries = [
            UniverseEntry(
                ticker=row["ticker"],
                index_name=row["index_name"],
                effective_from=row["effective_from"],
                effective_to=row["effective_to"],
            )
            for _, row in filtered.iterrows()
        ]

        logger.info(
            f"[DataIngestion] [NIFTY50Universe] Resolved {len(entries)} constituents for {as_of_date}"
        )
        return entries
