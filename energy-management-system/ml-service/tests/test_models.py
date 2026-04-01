"""
tests/test_models.py — unit tests for anomaly detector and forecaster.
Run with: cd ml-service && pip install -r requirements.txt && python -m pytest tests/ -v
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta
from models.anomaly import EnergyAnomalyDetector
from models.forecast import EnergyForecaster


def _make_series(n: int = 30, spike_at: int | None = 15):
    """Generate synthetic time-series with optional spike anomaly."""
    base = datetime.utcnow() - timedelta(days=n)
    series = []
    for i in range(n):
        val = 50.0 + (i * 0.3)          # gentle trend
        if spike_at is not None and i == spike_at:
            val += 80.0                  # inject anomaly
        series.append((base + timedelta(days=i), round(val, 2)))
    return series


# ─── Anomaly Detector ───────────────────────────────────────────────────────

class TestEnergyAnomalyDetector:
    def test_returns_same_length(self):
        series = _make_series(20, spike_at=None)
        det = EnergyAnomalyDetector()
        results = det.detect(series)
        assert len(results) == 20

    def test_detects_spike(self):
        series = _make_series(30, spike_at=15)
        det = EnergyAnomalyDetector(contamination=0.10)
        results = det.detect(series)
        assert results[15]['anomaly'] is True, "Spike should be flagged as anomaly"

    def test_summary_structure(self):
        series = _make_series(30, spike_at=15)
        det = EnergyAnomalyDetector(contamination=0.10)
        results = det.detect(series)
        summary = det.summary(results)
        assert 'total_points'   in summary
        assert 'anomaly_count'  in summary
        assert 'anomaly_rate'   in summary
        assert 'anomalies'      in summary

    def test_empty_series_graceful(self):
        det = EnergyAnomalyDetector()
        results = det.detect([])
        assert results == []

    def test_small_series_no_crash(self):
        series = _make_series(3, spike_at=None)
        det = EnergyAnomalyDetector()
        results = det.detect(series)
        assert len(results) == 3
        assert all(r['anomaly'] is False for r in results)


# ─── Forecaster ─────────────────────────────────────────────────────────────

class TestEnergyForecaster:
    def test_returns_correct_horizon(self):
        series = _make_series(20, spike_at=None)
        fc = EnergyForecaster()
        preds = fc.forecast(series, horizon=7)
        assert len(preds) == 7

    def test_each_prediction_has_required_keys(self):
        series = _make_series(20, spike_at=None)
        fc = EnergyForecaster()
        for pred in fc.forecast(series, horizon=3):
            assert 'timestamp'    in pred
            assert 'forecast_kwh' in pred
            assert 'lower'        in pred
            assert 'upper'        in pred
            assert 'method'       in pred

    def test_forecast_values_non_negative(self):
        series = _make_series(20, spike_at=None)
        fc = EnergyForecaster()
        for pred in fc.forecast(series, horizon=5):
            assert pred['forecast_kwh'] >= 0
            assert pred['lower']        >= 0

    def test_empty_series_returns_empty(self):
        fc = EnergyForecaster()
        assert fc.forecast([], horizon=7) == []

    def test_moving_avg_fallback(self):
        """With < 10 points, should fall back to MovingAverage."""
        series = _make_series(5, spike_at=None)
        fc = EnergyForecaster()
        preds = fc.forecast(series, horizon=3)
        assert all(p['method'] == 'MovingAverage' for p in preds)
