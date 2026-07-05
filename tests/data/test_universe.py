"""
tests/data/test_universe.py
===========================
Tests active NIFTY 50 constituent resolution intervals.
"""

from datetime import date

import pytest

from alphalab.common.types import UniverseEntry
from alphalab.data.universe.nifty50 import NIFTY50Universe


@pytest.mark.unit
def test_universe_initialization() -> None:
    """Universe resolver should initialize and point to the correct CSV resource."""
    universe = NIFTY50Universe()
    assert universe.csv_path is not None
    assert "nifty50_history.csv" in universe.csv_path


@pytest.mark.unit
def test_get_constituents_historic_point_in_time() -> None:
    """Verify constituents are resolved according to historical active intervals."""
    universe = NIFTY50Universe()

    # Query a date where GAIL.NS and SHREECEM.NS were active
    date_2020 = date(2020, 6, 1)
    constituents_2020 = universe.get_constituents(date_2020)
    tickers_2020 = {e.ticker for e in constituents_2020}

    assert "GAIL.NS" in tickers_2020
    assert "SHREECEM.NS" in tickers_2020
    assert "TATACONSUM.NS" not in tickers_2020
    assert "ADANIENT.NS" not in tickers_2020

    # Query a date where GAIL.NS had exited but TATACONSUM.NS was active
    date_2021 = date(2021, 6, 1)
    constituents_2021 = universe.get_constituents(date_2021)
    tickers_2021 = {e.ticker for e in constituents_2021}

    assert "GAIL.NS" not in tickers_2021
    assert "SHREECEM.NS" in tickers_2021
    assert "TATACONSUM.NS" in tickers_2021
    assert "ADANIENT.NS" not in tickers_2021

    # Query a date where SHREECEM.NS had exited but ADANIENT.NS was active
    date_2023 = date(2023, 6, 1)
    constituents_2023 = universe.get_constituents(date_2023)
    tickers_2023 = {e.ticker for e in constituents_2023}

    assert "SHREECEM.NS" not in tickers_2023
    assert "ADANIENT.NS" in tickers_2023
    assert "TATACONSUM.NS" in tickers_2023


@pytest.mark.unit
def test_universe_entry_fields() -> None:
    """Universe entries should return fully typed domain objects."""
    universe = NIFTY50Universe()
    constituents = universe.get_constituents(date(2020, 1, 1))

    assert len(constituents) > 0
    first_entry = constituents[0]
    assert isinstance(first_entry, UniverseEntry)
    assert first_entry.index_name == "NIFTY50"
    assert first_entry.effective_from <= date(2020, 1, 1)
