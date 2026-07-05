"""
alphalab.data.transformer
=========================
Cleans, standardizes, and converts raw dataframes to MarketDataset domain objects.
"""

import logging
from datetime import date

import pandas as pd

from alphalab.common.types import MarketDataset

logger = logging.getLogger("alphalab.data.transformer")


class DataTransformer:
    """Standardizes raw provider DataFrames into uniform schema shapes."""

    def transform(
        self, raw_df: pd.DataFrame, start_date: date, end_date: date
    ) -> MarketDataset:
        """Clean and convert a raw provider DataFrame to a typed MarketDataset.

        Args:
            raw_df: The raw input DataFrame from Yahoo Finance or another provider.
            start_date: Request start date.
            end_date: Request end date.

        Returns:
            A standardized MarketDataset.
        """
        logger.info(
            f"[DataIngestion] [DataTransformer] Transforming raw DataFrame of {len(raw_df)} rows"
        )

        if raw_df.empty:
            empty_df = pd.DataFrame(
                columns=[
                    "ticker",
                    "date",
                    "open",
                    "high",
                    "low",
                    "close",
                    "volume",
                    "adj_close",
                ]
            )
            return MarketDataset(
                data=empty_df, start_date=start_date, end_date=end_date
            )

        df = raw_df.copy()

        # 1. Standardize column names: map Yahoo names to clean standard lowercase names
        column_mapping = {
            "ticker": "ticker",
            "date": "date",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
            "Adj Close": "adj_close",
        }

        # Handle case-insensitive matching or clean name maps
        rename_dict = {}
        for col in df.columns:
            # Match columns by case-insensitive name or exact key
            matched = False
            for src_name, target_name in column_mapping.items():
                if col.lower() == src_name.lower():
                    rename_dict[col] = target_name
                    matched = True
                    break
            if not matched:
                rename_dict[col] = col.lower()

        df = df.rename(columns=rename_dict)

        # Ensure all standard columns are present (even if empty)
        standard_columns = [
            "ticker",
            "date",
            "open",
            "high",
            "low",
            "close",
            "volume",
            "adj_close",
        ]
        for col in standard_columns:
            if col not in df.columns:
                df[col] = None

        # Keep only standard columns
        df = df[standard_columns]

        # 2. Clean the date column (convert timezone-aware datetimes to python datetime.date objects)
        df["date"] = pd.to_datetime(df["date"]).dt.date

        # 3. Cast numeric columns to their appropriate types
        df["open"] = pd.to_numeric(df["open"], errors="coerce")
        df["high"] = pd.to_numeric(df["high"], errors="coerce")
        df["low"] = pd.to_numeric(df["low"], errors="coerce")
        df["close"] = pd.to_numeric(df["close"], errors="coerce")
        df["volume"] = (
            pd.to_numeric(df["volume"], errors="coerce").fillna(0).astype("int64")
        )
        df["adj_close"] = pd.to_numeric(df["adj_close"], errors="coerce")

        # 4. Clean ticker strings
        df["ticker"] = df["ticker"].astype(str).str.strip()

        # 5. Sort by ticker and date
        df = df.sort_values(by=["ticker", "date"]).reset_index(drop=True)

        logger.info(
            f"[DataIngestion] [DataTransformer] Transformation complete. Shape: {df.shape}"
        )
        return MarketDataset(data=df, start_date=start_date, end_date=end_date)
