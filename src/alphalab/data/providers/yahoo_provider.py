"""
alphalab.data.providers.yahoo_provider
======================================
Yahoo Finance concrete provider implementation using the yfinance library.
"""

import logging
import time
from datetime import date, timedelta

import pandas as pd
import yfinance as yf

from alphalab.common.exceptions import DataError
from alphalab.config.settings import settings
from alphalab.data.providers.provider import MarketDataProvider

logger = logging.getLogger("alphalab.data.providers.yahoo_provider")


class YahooProvider(MarketDataProvider):
    """Downloads historical OHLCV stock price series in bulk from Yahoo Finance API."""

    def __init__(
        self,
        timeout: int = settings.YAHOO_HTTP_TIMEOUT,
        max_retries: int = settings.YAHOO_MAX_RETRIES,
    ) -> None:
        """Initialize the Yahoo provider.

        Args:
            timeout: Timeout in seconds for HTTP requests.
            max_retries: Maximum number of request attempts in case of errors.
        """
        self.timeout = timeout
        self.max_retries = max_retries

    def fetch_ohlcv(
        self, tickers: list[str], start_date: date, end_date: date
    ) -> pd.DataFrame:
        """Fetch daily raw historical prices for multiple tickers in bulk.

        Args:
            tickers: List of stock tickers.
            start_date: Start date.
            end_date: End date.

        Returns:
            A long-format DataFrame with raw prices.
        """
        if not tickers:
            return pd.DataFrame()

        # yfinance expects date strings or datetime inputs
        # yfinance's end date is exclusive. To fetch inclusive of end_date, add 1 day.
        exclusive_end = end_date + timedelta(days=1)
        start_str = start_date.isoformat()
        end_str = exclusive_end.isoformat()

        logger.info(
            f"[DataIngestion] [YahooProvider] Requesting yfinance bulk download "
            f"for {len(tickers)} tickers from {start_str} to {end_str}"
        )

        df = None
        last_exception = None
        delay = 2.0  # Initial retry backoff delay in seconds

        for attempt in range(1, self.max_retries + 1):
            try:
                start_time = time.time()
                # Run the download.
                # progress=False turns off print output.
                # threads=True downloads tickers concurrently.
                df = yf.download(
                    tickers,
                    start=start_str,
                    end=end_str,
                    group_by="column",
                    progress=False,
                    threads=True,
                    timeout=self.timeout,
                )
                duration = time.time() - start_time
                logger.info(
                    f"[DataIngestion] [YahooProvider] yfinance download completed in {duration:.2f}s"
                )
                break
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"[DataIngestion] [YahooProvider] Download attempt {attempt} failed: {e}. "
                    f"Retrying in {delay}s..."
                )
                time.sleep(delay)
                delay *= 2.0

        if df is None or df.empty:
            msg = (
                f"Failed to fetch market data from Yahoo Finance after {self.max_retries} attempts."
                + (f" Last error: {last_exception}" if last_exception else "")
            )
            logger.error(f"[DataIngestion] [YahooProvider] {msg}")
            raise DataError(msg)

        # Restructure the DataFrame into long format: ticker, date, Open, High, Low, Close, Volume, Adj Close
        raw_df = df.copy()

        # Case 1: Multiple tickers return a MultiIndex column structure
        if isinstance(raw_df.columns, pd.MultiIndex):
            # Stack the Ticker level (level 1) to transform columns into rows
            # Columns will become index: [Date, Ticker]
            # Metrics will become columns: Open, High, Low, Close, Volume, Adj Close
            try:
                raw_df = raw_df.stack(level=1).reset_index()
            except Exception as e:
                # Fallback in case stack fails due to column format changes
                logger.warning(
                    f"[DataIngestion] [YahooProvider] MultiIndex stack failed: {e}. Attempting manual melt."
                )
                # Group by ticker manually in memory
                dfs = []
                for ticker in tickers:
                    if ticker in raw_df.columns.get_level_values(1):
                        ticker_df = raw_df.xs(ticker, axis=1, level=1).copy()
                        ticker_df["ticker"] = ticker
                        dfs.append(ticker_df)
                raw_df = pd.concat(dfs).reset_index() if dfs else pd.DataFrame()
        # Case 2: A single ticker query returns a SingleIndex column structure
        else:
            raw_df = raw_df.reset_index()
            # If yfinance returned a single ticker, it has no ticker column. Add it.
            if len(tickers) == 1:
                raw_df["ticker"] = tickers[0]

        # Rename index columns if needed
        raw_df = raw_df.rename(columns={"Date": "date", "Ticker": "ticker"})

        # Double check that we have a 'ticker' column
        if "ticker" not in raw_df.columns:
            logger.error(
                f"[DataIngestion] [YahooProvider] Failed to resolve ticker column. Columns: {raw_df.columns}"
            )
            raise DataError("Downloaded dataset is missing ticker column mapping.")

        logger.debug(
            f"[DataIngestion] [YahooProvider] Prepared long-format DataFrame with {len(raw_df)} rows"
        )
        return raw_df
