"""
tests/dsl/test_dsl_logical.py
==============================
Logical correctness tests for the Factor DSL.

Each test feeds a known DataFrame into compile_factor() and asserts
that every output value matches the manually-computed expected value.

Coverage:
  - NumberLiteral scalar broadcast
  - Variable passthrough
  - BinaryOp: +, -, *, / (including operator precedence)
  - Parenthesised expressions overriding precedence
  - Negation / unary minus
  - Momentum(N)    — pct_change(N)
  - Volatility(N)  — pct_change().rolling(N).std()
  - RollingMean(N) — rolling(N).mean()
  - RollingStd(N)  — rolling(N).std()
  - Lag(Var, N)    — shift(N)
  - Nested / composed expressions
  - NaN propagation is correct
  - Error cases: unsupported func, look-ahead bias, arity, bad char
"""

import pandas as pd
import pytest

from alphalab.common.exceptions import DataLeakageError, DSLCompilationError
from alphalab.dsl import compile_factor

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PRICES = [100.0, 110.0, 120.0, 150.0, 130.0, 140.0, 160.0, 155.0]
VOLUMES = [1000.0, 1200.0, 900.0, 1500.0, 1100.0, 1300.0, 1400.0, 1250.0]


def make_df(prices=PRICES, volumes=VOLUMES):
    """Return a DataFrame with Price and Volume columns."""
    return pd.DataFrame({"Price": prices, "Volume": volumes})


def assert_series(result: pd.Series, expected: list, *, label: str = "") -> None:
    """
    Element-wise assertion.
    - Pass None in 'expected' to assert that position is NaN.
    - All non-None values are compared with pytest.approx (relative 1e-6).
    """
    assert len(result) == len(
        expected
    ), f"{label}: length mismatch — got {len(result)}, expected {len(expected)}"
    for i, (got, exp) in enumerate(zip(result, expected, strict=False)):
        if exp is None:
            assert pd.isna(got), f"{label}[{i}]: expected NaN, got {got}"
        else:
            assert got == pytest.approx(
                exp, rel=1e-6
            ), f"{label}[{i}]: got {got}, expected {exp}"


# ===========================================================================
# 1. Scalar broadcast
# ===========================================================================


def test_scalar_broadcast_integer():
    """A bare integer literal must be broadcast across all rows."""
    df = make_df()
    result = compile_factor("42")(df)
    assert list(result) == [42.0] * len(df)


def test_scalar_broadcast_float():
    """A floating-point literal must be broadcast correctly."""
    df = make_df()
    result = compile_factor("3.14")(df)
    assert_series(result, [3.14] * len(df), label="scalar_float")


# ===========================================================================
# 2. Variable passthrough
# ===========================================================================


def test_variable_price_passthrough():
    """A bare column name must return that column unchanged."""
    df = make_df()
    result = compile_factor("Price")(df)
    assert list(result) == PRICES


def test_variable_volume_passthrough():
    """Volume column passthrough."""
    df = make_df()
    result = compile_factor("Volume")(df)
    assert list(result) == VOLUMES


# ===========================================================================
# 3. Binary arithmetic
# ===========================================================================


def test_addition_scalar_to_column():
    """Price + 10 must add 10 to every price."""
    df = make_df()
    result = compile_factor("Price + 10")(df)
    assert_series(result, [p + 10 for p in PRICES], label="price+10")


def test_subtraction_columns():
    """Price - Volume must subtract element-wise."""
    df = make_df()
    result = compile_factor("Price - Volume")(df)
    assert_series(
        result,
        [p - v for p, v in zip(PRICES, VOLUMES, strict=False)],
        label="price-volume",
    )


def test_multiplication_scalar():
    """2 * Price must double every price."""
    df = make_df()
    result = compile_factor("2 * Price")(df)
    assert_series(result, [2 * p for p in PRICES], label="2*price")


def test_division_columns():
    """Price / Volume must divide element-wise."""
    df = make_df()
    result = compile_factor("Price / Volume")(df)
    assert_series(
        result,
        [p / v for p, v in zip(PRICES, VOLUMES, strict=False)],
        label="price/volume",
    )


# ===========================================================================
# 4. Operator precedence (* and / bind tighter than + and -)
# ===========================================================================


def test_precedence_multiply_before_add():
    """
    Price + Volume * 2  must be interpreted as  Price + (Volume * 2).
    """
    df = make_df()
    result = compile_factor("Price + Volume * 2")(df)
    expected = [p + v * 2 for p, v in zip(PRICES, VOLUMES, strict=False)]
    assert_series(result, expected, label="prec_mul_before_add")


def test_precedence_divide_before_subtract():
    """
    Volume - Price / 2  must be interpreted as  Volume - (Price / 2).
    """
    df = make_df()
    result = compile_factor("Volume - Price / 2")(df)
    expected = [v - p / 2 for p, v in zip(PRICES, VOLUMES, strict=False)]
    assert_series(result, expected, label="prec_div_before_sub")


# ===========================================================================
# 5. Parentheses override precedence
# ===========================================================================


def test_parens_override_precedence():
    """(Price + Volume) * 2 must add first, then multiply."""
    df = make_df()
    result = compile_factor("(Price + Volume) * 2")(df)
    expected = [(p + v) * 2 for p, v in zip(PRICES, VOLUMES, strict=False)]
    assert_series(result, expected, label="parens_override")


def test_nested_parens():
    """(Price + (Volume - 100)) * 3 must evaluate innermost first."""
    df = make_df()
    result = compile_factor("(Price + (Volume - 100)) * 3")(df)
    expected = [(p + (v - 100)) * 3 for p, v in zip(PRICES, VOLUMES, strict=False)]
    assert_series(result, expected, label="nested_parens")


# ===========================================================================
# 6. Unary negation
# ===========================================================================


def test_negation_literal():
    """-5 must compile to the scalar -5 broadcast across all rows."""
    df = make_df()
    result = compile_factor("-5")(df)
    assert list(result) == [-5.0] * len(df)


def test_negation_expression():
    """-1 * (Price - Volume) must negate the sub-expression."""
    df = make_df()
    result = compile_factor("-1 * (Price - Volume)")(df)
    expected = [-(p - v) for p, v in zip(PRICES, VOLUMES, strict=False)]
    assert_series(result, expected, label="neg_expr")


# ===========================================================================
# 7. Momentum(N) — pct_change(N)
# ===========================================================================


def test_momentum_1():
    """Momentum(1) = pct_change(1). Index 0 must be NaN."""
    prices = [100.0, 110.0, 121.0, 133.1]
    df = pd.DataFrame({"Price": prices, "Volume": [0] * 4})
    result = compile_factor("Momentum(1)")(df)

    assert pd.isna(result.iloc[0])
    assert result.iloc[1] == pytest.approx(0.10)  # (110-100)/100
    assert result.iloc[2] == pytest.approx(0.10)  # (121-110)/110
    assert result.iloc[3] == pytest.approx(0.10)  # (133.1-121)/121


def test_momentum_2():
    """Momentum(2) = pct_change(2). First two values must be NaN."""
    df = make_df()
    result = compile_factor("Momentum(2)")(df)
    p = PRICES

    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    assert result.iloc[2] == pytest.approx((p[2] - p[0]) / p[0])  # (120-100)/100 = 0.20
    assert result.iloc[3] == pytest.approx((p[3] - p[1]) / p[1])  # (150-110)/110


def test_momentum_scaled():
    """Momentum(2) * 2 = double the two-period return."""
    df = make_df()
    result = compile_factor("Momentum(2) * 2")(df)
    p = PRICES

    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    assert result.iloc[2] == pytest.approx(2 * (p[2] - p[0]) / p[0])
    assert result.iloc[3] == pytest.approx(2 * (p[3] - p[1]) / p[1])


# ===========================================================================
# 8. Volatility(N) — pct_change().rolling(N).std()
# ===========================================================================


def test_volatility_3():
    """Volatility(3) must match pct_change().rolling(3).std()."""
    prices = [100.0, 102.0, 99.0, 104.0, 101.0]
    df = pd.DataFrame({"Price": prices, "Volume": [0] * 5})
    result = compile_factor("Volatility(3)")(df)

    expected = pd.Series(prices).pct_change().rolling(3).std()

    # First 3 values must be NaN (need 3 returns → available only from idx=3)
    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    assert pd.isna(result.iloc[2])
    assert result.iloc[3] == pytest.approx(expected.iloc[3])
    assert result.iloc[4] == pytest.approx(expected.iloc[4])


# ===========================================================================
# 9. RollingMean(N) — rolling(N).mean() on Price
# ===========================================================================


def test_rolling_mean_3():
    """RollingMean(3) must return the 3-period rolling average of Price."""
    prices = [10.0, 20.0, 30.0, 40.0, 50.0]
    df = pd.DataFrame({"Price": prices, "Volume": [0] * 5})
    result = compile_factor("RollingMean(3)")(df)

    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    assert result.iloc[2] == pytest.approx(20.0)  # (10+20+30)/3
    assert result.iloc[3] == pytest.approx(30.0)  # (20+30+40)/3
    assert result.iloc[4] == pytest.approx(40.0)  # (30+40+50)/3


def test_rolling_mean_relative_to_price():
    """Price / RollingMean(3) — price relative to its 3-bar moving average."""
    prices = [10.0, 20.0, 30.0, 40.0, 50.0]
    df = pd.DataFrame({"Price": prices, "Volume": [0] * 5})
    result = compile_factor("Price / RollingMean(3)")(df)

    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    assert result.iloc[2] == pytest.approx(30.0 / 20.0)
    assert result.iloc[3] == pytest.approx(40.0 / 30.0)
    assert result.iloc[4] == pytest.approx(50.0 / 40.0)


# ===========================================================================
# 10. RollingStd(N) — rolling(N).std() on Price
# ===========================================================================


def test_rolling_std_3():
    """RollingStd(3) must match rolling(3).std() on Price."""
    prices = [10.0, 20.0, 30.0, 40.0, 50.0]
    df = pd.DataFrame({"Price": prices, "Volume": [0] * 5})
    result = compile_factor("RollingStd(3)")(df)

    expected = pd.Series(prices).rolling(3).std()

    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    assert result.iloc[2] == pytest.approx(expected.iloc[2])
    assert result.iloc[3] == pytest.approx(expected.iloc[3])
    assert result.iloc[4] == pytest.approx(expected.iloc[4])


# ===========================================================================
# 11. Lag(Var, N) — shift by N periods
# ===========================================================================


def test_lag_price_1():
    """Lag(Price, 1) = yesterday's price; index 0 must be NaN."""
    df = make_df()
    result = compile_factor("Lag(Price, 1)")(df)

    assert pd.isna(result.iloc[0])
    for i in range(1, len(PRICES)):
        assert result.iloc[i] == pytest.approx(PRICES[i - 1])


def test_lag_price_2():
    """Lag(Price, 2) = price from 2 days ago; first two must be NaN."""
    df = make_df()
    result = compile_factor("Lag(Price, 2)")(df)

    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    for i in range(2, len(PRICES)):
        assert result.iloc[i] == pytest.approx(PRICES[i - 2])


def test_lag_volume():
    """Lag(Volume, 1) should lag the Volume column correctly."""
    df = make_df()
    result = compile_factor("Lag(Volume, 1)")(df)

    assert pd.isna(result.iloc[0])
    for i in range(1, len(VOLUMES)):
        assert result.iloc[i] == pytest.approx(VOLUMES[i - 1])


# ===========================================================================
# 12. Composed / nested expressions
# ===========================================================================


def test_momentum_minus_lag():
    """
    Momentum(1) - Lag(Price, 1):
    Momentum gives % returns, Lag gives yesterday's price.
    """
    prices = [100.0, 110.0, 121.0]
    df = pd.DataFrame({"Price": prices, "Volume": [0] * 3})
    result = compile_factor("Momentum(1) - Lag(Price, 1)")(df)

    assert pd.isna(result.iloc[0])
    # idx=1: pct_change=0.10, Lag=100.0  → -99.90
    assert result.iloc[1] == pytest.approx(0.10 - 100.0)
    # idx=2: pct_change=0.10, Lag=110.0  → -109.90
    assert result.iloc[2] == pytest.approx(0.10 - 110.0)


def test_rolling_mean_minus_lag():
    """RollingMean(3) - Lag(Price, 1) — mixed function composition."""
    prices = [10.0, 20.0, 30.0, 40.0]
    df = pd.DataFrame({"Price": prices, "Volume": [0] * 4})
    result = compile_factor("RollingMean(3) - Lag(Price, 1)")(df)

    rm = pd.Series(prices).rolling(3).mean()
    lag = pd.Series(prices).shift(1)

    assert pd.isna(result.iloc[0])  # both NaN
    assert pd.isna(result.iloc[1])  # rm still NaN (need 3 bars)
    assert result.iloc[2] == pytest.approx(rm.iloc[2] - lag.iloc[2])
    assert result.iloc[3] == pytest.approx(rm.iloc[3] - lag.iloc[3])


def test_complex_expression():
    """
    (Momentum(2) + 1) * RollingMean(3) — multi-step composition.
    Verifies all non-NaN rows are numerically correct.
    """
    prices = [100.0, 110.0, 120.0, 150.0, 130.0]
    df = pd.DataFrame({"Price": prices, "Volume": [0] * 5})
    result = compile_factor("(Momentum(2) + 1) * RollingMean(3)")(df)

    mom = pd.Series(prices).pct_change(2)
    rm = pd.Series(prices).rolling(3).mean()

    for i in range(len(prices)):
        if pd.isna(mom.iloc[i]) or pd.isna(rm.iloc[i]):
            assert pd.isna(result.iloc[i]), f"idx={i} should be NaN"
        else:
            expected = (mom.iloc[i] + 1) * rm.iloc[i]
            assert result.iloc[i] == pytest.approx(expected), f"idx={i}"


# ===========================================================================
# 13. Scalar-only arithmetic
# ===========================================================================


def test_scalar_arithmetic_precedence():
    """
    10 + 5 * 2 must broadcast scalar 20 (not 30) — tests precedence on literals.
    """
    df = make_df()
    result = compile_factor("10 + 5 * 2")(df)
    # 5*2 = 10, then 10+10 = 20
    assert list(result) == [20.0] * len(df)


# ===========================================================================
# 14. Error cases — must be caught at compile time
# ===========================================================================


def test_error_unsupported_function():
    """An unknown function name must raise DSLCompilationError."""
    with pytest.raises(DSLCompilationError, match="Unsupported function"):
        compile_factor("FuturePrice(10)")


def test_error_negative_lag_shift():
    """Lag with negative shift must raise DataLeakageError (look-ahead bias)."""
    with pytest.raises(DataLeakageError, match="negative shift"):
        compile_factor("Lag(Price, -1)")


def test_error_zero_momentum_window():
    """Momentum(0) must raise DataLeakageError (window must be > 0)."""
    with pytest.raises(DataLeakageError, match="Invalid window size"):
        compile_factor("Momentum(0)")


def test_error_negative_volatility_window():
    """Volatility(-5) must raise DataLeakageError."""
    with pytest.raises(DataLeakageError, match="Invalid window size"):
        compile_factor("Volatility(-5)")


def test_error_wrong_arity():
    """Momentum takes exactly 1 argument; passing 2 must raise DSLCompilationError."""
    with pytest.raises(DSLCompilationError, match="expects 1 arguments"):
        compile_factor("Momentum(20, 5)")


def test_error_bad_character():
    """An illegal character in the expression must raise DSLCompilationError."""
    with pytest.raises(DSLCompilationError, match="Unexpected character"):
        compile_factor("Price@10")


def test_error_empty_formula():
    """An empty string must raise DSLCompilationError."""
    with pytest.raises(DSLCompilationError, match="empty formula"):
        compile_factor("")


def test_error_incomplete_expression():
    """A dangling open parenthesis must raise DSLCompilationError."""
    with pytest.raises(DSLCompilationError):
        compile_factor("Momentum(20")
