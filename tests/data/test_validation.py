"""
tests/data/test_validation.py
=============================
Tests validator modules: Schema, Quality, Calendar, and CorporateActions.
"""

from datetime import date

import pandas as pd
import pytest

from alphalab.common.types import MarketDataset
from alphalab.data.validation.calendar import CalendarValidator
from alphalab.data.validation.corporate_actions import CorporateActionsValidator
from alphalab.data.validation.quality import QualityValidator
from alphalab.data.validation.schema import SchemaValidator
from alphalab.data.validation.suite import ValidatorSuite


@pytest.fixture
def clean_dataset() -> MarketDataset:
    data = {
        "ticker": ["RELIANCE.NS", "RELIANCE.NS", "RELIANCE.NS"],
        "date": [date(2026, 1, 1), date(2026, 1, 2), date(2026, 1, 5)],  # Weekdays
        "open": [2400.0, 2415.0, 2430.0],
        "high": [2420.0, 2430.0, 2450.0],
        "low": [2390.0, 2405.0, 2420.0],
        "close": [2410.0, 2425.0, 2440.0],
        "volume": [100000, 120000, 110000],
        "adj_close": [2410.0, 2425.0, 2440.0],
    }
    return MarketDataset(
        data=pd.DataFrame(data), start_date=date(2026, 1, 1), end_date=date(2026, 1, 5)
    )


@pytest.mark.unit
def test_schema_validator_clean(clean_dataset) -> None:
    validator = SchemaValidator()
    report = validator.validate(clean_dataset)
    assert not report.has_errors
    assert len(report.issues) == 0


@pytest.mark.unit
def test_schema_validator_invalid() -> None:
    # Introduce negative bounds and null records
    data = {
        "ticker": ["TCS.NS", "TCS.NS"],
        "date": [date(2026, 1, 1), date(2026, 1, 2)],
        "open": [-100.0, None],  # Negative and Null
        "high": [3830.0, 3850.0],
        "low": [3780.0, 3800.0],
        "close": [3810.0, 3840.0],
        "volume": [80000, 95000],
        "adj_close": [3810.0, 3840.0],
    }
    dataset = MarketDataset(
        data=pd.DataFrame(data), start_date=date(2026, 1, 1), end_date=date(2026, 1, 2)
    )

    validator = SchemaValidator()
    report = validator.validate(dataset)

    assert report.has_errors
    assert len(report.errors) == 2
    issue_types = {issue.issue_type for issue in report.errors}
    assert "NEGATIVE_VALUE" in issue_types
    assert "NULL_VALUE" in issue_types


@pytest.mark.unit
def test_quality_validator_price_jump() -> None:
    # Make price jump more than 15%
    data = {
        "ticker": ["RELIANCE.NS", "RELIANCE.NS"],
        "date": [date(2026, 1, 1), date(2026, 1, 2)],
        "open": [100.0, 200.0],
        "high": [105.0, 210.0],
        "low": [95.0, 195.0],
        "close": [100.0, 200.0],  # 100% price change
        "volume": [100000, 120000],
        "adj_close": [100.0, 200.0],
    }
    dataset = MarketDataset(
        data=pd.DataFrame(data), start_date=date(2026, 1, 1), end_date=date(2026, 1, 2)
    )

    validator = QualityValidator(jump_threshold=0.15)
    report = validator.validate(dataset)

    assert not report.has_errors  # Price jump is WARNING severity
    assert len(report.warnings) == 1
    assert report.warnings[0].issue_type == "PRICE_JUMP"


@pytest.mark.unit
def test_calendar_validator_weekend_and_gaps() -> None:
    data = {
        "ticker": ["INFY.NS"],
        "date": [date(2026, 1, 4)],  # Sunday
        "open": [1500.0],
        "high": [1520.0],
        "low": [1490.0],
        "close": [1510.0],
        "volume": [200000],
        "adj_close": [1510.0],
    }
    # Expected range includes business days: Jan 1st, 2nd, and 5th
    dataset = MarketDataset(
        data=pd.DataFrame(data), start_date=date(2026, 1, 1), end_date=date(2026, 1, 5)
    )

    validator = CalendarValidator()
    report = validator.validate(dataset)

    assert len(report.warnings) == 2
    issue_types = {issue.issue_type for issue in report.warnings}
    assert "WEEKEND_TRADING" in issue_types
    assert "MISSING_TRADING_DAY" in issue_types


@pytest.mark.unit
def test_corporate_actions_validator_split() -> None:
    # Create split event where Close/AdjClose ratio changes significantly
    data = {
        "ticker": ["RELIANCE.NS", "RELIANCE.NS"],
        "date": [date(2026, 1, 1), date(2026, 1, 2)],
        "open": [200.0, 100.0],
        "high": [205.0, 105.0],
        "low": [195.0, 95.0],
        "close": [200.0, 100.0],
        "volume": [100000, 120000],
        "adj_close": [200.0, 50.0],  # Day 1 ratio = 1.0, Day 2 ratio = 2.0
    }
    dataset = MarketDataset(
        data=pd.DataFrame(data), start_date=date(2026, 1, 1), end_date=date(2026, 1, 2)
    )

    validator = CorporateActionsValidator()
    report = validator.validate(dataset)

    assert len(report.warnings) == 1
    assert report.warnings[0].issue_type == "CORPORATE_ACTION"


@pytest.mark.unit
def test_validator_suite_aggregation(clean_dataset) -> None:
    suite = ValidatorSuite(
        validators=[
            SchemaValidator(),
            QualityValidator(),
            CalendarValidator(),
            CorporateActionsValidator(),
        ]
    )
    report = suite.validate(clean_dataset)
    # The clean_dataset is missing Jan 1st and 2nd expected business days (since it only has Jan 5th, etc. actually wait,
    # clean_dataset has 1st, 2nd, 5th, which are weekdays, so no business days are missing)
    # Let's verify no warnings exist
    assert len(report.issues) == 0
