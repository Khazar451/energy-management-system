"""
forecast.py — ARIMA-based energy consumption forecasting.
Uses statsmodels for lightweight forecasting without heavy dependencies.
Falls back to a simple moving-average if statsmodels is not available.
"""

from typing import List, Tuple
from datetime import datetime, timedelta

import numpy as np

try:
    from statsmodels.tsa.arima.model import ARIMA as _ARIMA
    _HAS_STATSMODELS = True
except ImportError:
    _HAS_STATSMODELS = False


class EnergyForecaster:
    """
    Forecasts future energy consumption based on historical time-series.

    Steps:
      1. Fit an ARIMA(2,1,2) model on historical values.
      2. Produce `horizon`-step-ahead forecasts.
      3. Falls back to seasonal moving average if statsmodels absent.
    """

    def __init__(self, order: Tuple[int, int, int] = (2, 1, 2)):
        self.order = order

    def forecast(
        self,
        series: List[Tuple[datetime, float]],
        horizon: int = 7
    ) -> List[dict]:
        """
        Fit on `series` and return `horizon` future predictions.

        Returns:
            List of {"timestamp": ISO, "forecast_kwh": float, "lower": float, "upper": float}
        """
        if not series:
            return []

        values = np.array([v for _, v in series], dtype=float)
        last_ts = series[-1][0]

        if _HAS_STATSMODELS and len(values) >= 10:
            return self._arima_forecast(values, last_ts, horizon)
        else:
            return self._moving_avg_forecast(values, last_ts, horizon)

    # ── ARIMA ──────────────────────────────────────────────────────────────
    def _arima_forecast(
        self, values: np.ndarray, last_ts: datetime, horizon: int
    ) -> List[dict]:
        from statsmodels.tsa.arima.model import ARIMA
        model  = ARIMA(values, order=self.order)
        fitted = model.fit()
        fc     = fitted.get_forecast(steps=horizon)
        means  = fc.predicted_mean
        ci     = fc.conf_int(alpha=0.05)

        results = []
        for i in range(horizon):
            ts = last_ts + timedelta(days=i + 1)
            results.append({
                "timestamp":     ts.isoformat(),
                "forecast_kwh":  round(float(max(0, means[i])), 4),
                "lower":         round(float(max(0, ci[i, 0])), 4),
                "upper":         round(float(max(0, ci[i, 1])), 4),
                "method":        "ARIMA"
            })
        return results

    # ── Moving Average fallback ─────────────────────────────────────────────
    def _moving_avg_forecast(
        self, values: np.ndarray, last_ts: datetime, horizon: int
    ) -> List[dict]:
        window = min(7, len(values))
        ma     = float(np.mean(values[-window:]))
        std    = float(np.std(values[-window:])) if window > 1 else 0.0

        results = []
        for i in range(horizon):
            ts = last_ts + timedelta(days=i + 1)
            results.append({
                "timestamp":     ts.isoformat(),
                "forecast_kwh":  round(max(0, ma), 4),
                "lower":         round(max(0, ma - 1.96 * std), 4),
                "upper":         round(max(0, ma + 1.96 * std), 4),
                "method":        "MovingAverage"
            })
        return results
