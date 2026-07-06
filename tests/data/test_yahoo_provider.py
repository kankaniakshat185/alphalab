from datetime import date
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from alphalab.common.exceptions import DataError
from alphalab.data.providers.yahoo_provider import YahooProvider


@pytest.fixture
def provider():
    return YahooProvider(timeout=5, max_retries=1)


@patch("alphalab.data.providers.yahoo_provider.yf.download")
def test_fetch_ohlcv_success(mock_download, provider):
    """Test successful bulk download from yfinance mock."""
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 2)
    tickers = ["AAPL"]

    # Mock the returned DataFrame from yfinance
    # For a single ticker, yfinance returns columns like Open, High, Low, Close, Adj Close, Volume
    mock_df = pd.DataFrame(
        {
            "Open": [130.0, 131.0],
            "High": [132.0, 133.0],
            "Low": [129.0, 130.0],
            "Close": [131.0, 132.0],
            "Adj Close": [131.0, 132.0],
            "Volume": [10000, 15000],
        },
        index=pd.DatetimeIndex(["2023-01-01", "2023-01-02"], name="Date"),
    )
    
    # We must match the return structure exactly.
    # We can pass mock_df directly for single ticker testing.
    mock_download.return_value = mock_df

    df = provider.fetch_ohlcv(tickers, start_date, end_date)
    assert not df.empty
    assert "ticker" in df.columns
    assert "close" in df.columns
    assert df.iloc[0]["ticker"] == "AAPL"


@patch("alphalab.data.providers.yahoo_provider.yf.download")
def test_fetch_ohlcv_server_error(mock_download, provider):
    """Test handling of exceptions from yfinance."""
    start_date = date(2023, 1, 1)
    end_date = date(2023, 1, 2)
    tickers = ["AAPL"]

    mock_download.side_effect = Exception("Internal Server Error")

    with pytest.raises(DataError, match="Failed to fetch market data"):
        provider.fetch_ohlcv(tickers, start_date, end_date)
