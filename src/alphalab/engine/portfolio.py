"""
alphalab.engine.portfolio
=========================
Translates raw factor signals into dollar-neutral target portfolio weights.
"""

import pandas as pd


class PortfolioConstructor:
    """Constructs portfolios from raw alpha signals using cross-sectional transformations."""

    @staticmethod
    def signals_to_weights(signals_df: pd.DataFrame) -> pd.DataFrame:
        """
        Convert raw alpha signals into target portfolio weights via cross-sectional Z-Scoring.

        Args:
            signals_df: DataFrame with columns ['date', 'ticker', 'signal'].

        Returns:
            DataFrame with columns ['date', 'ticker', 'weight'].
        """
        if signals_df.empty:
            return pd.DataFrame(columns=["date", "ticker", "weight"])

        # Group by date to cross-sectionally z-score signals
        def z_score(group: pd.DataFrame) -> pd.DataFrame:
            signal = group["signal"]
            std = signal.std()

            # If all signals are identical or only one asset exists, we can't z-score
            if pd.isna(std) or std == 0:
                weights = pd.Series(0.0, index=signal.index)
            else:
                z_scores = (signal - signal.mean()) / std
                # Normalize so sum of absolute weights == 1.0 (gross exposure)
                gross_exposure = z_scores.abs().sum()
                weights = z_scores / gross_exposure if gross_exposure > 0 else pd.Series(0.0, index=signal.index)

            return pd.DataFrame({
                "date": group.name,
                "ticker": group["ticker"],
                "weight": weights
            })

        weights_df = signals_df.groupby("date", group_keys=False).apply(z_score, include_groups=False)

        return weights_df.reset_index(drop=True)
