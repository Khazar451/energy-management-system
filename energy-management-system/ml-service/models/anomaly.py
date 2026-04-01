"""
anomaly.py — Isolation Forest–based anomaly detection for energy data.
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from typing import List, Tuple
from datetime import datetime


class EnergyAnomalyDetector:
    """
    Wraps scikit-learn's IsolationForest to flag anomalous energy readings.
    Usage:
        detector = EnergyAnomalyDetector()
        results = detector.detect(series)
    """

    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.contamination = contamination
        self.model = IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_estimators=100
        )
        self._fitted = False

    def detect(
        self, series: List[Tuple[datetime, float]]
    ) -> List[dict]:
        """
        Fit Isolation Forest on the series and return anomaly flags.

        Returns a list of dicts:
          {
            "timestamp": ISO string,
            "value": float,
            "anomaly": bool,
            "score": float   # lower = more anomalous
          }
        """
        if len(series) < 5:
            # Not enough data — flag nothing
            return [
                {"timestamp": t.isoformat(), "value": v, "anomaly": False, "score": 0.0}
                for t, v in series
            ]

        values = np.array([v for _, v in series]).reshape(-1, 1)
        self.model.fit(values)
        self._fitted = True

        # Predict: -1 = anomaly, 1 = normal
        predictions = self.model.predict(values)
        scores      = self.model.score_samples(values)

        results = []
        for (ts, val), pred, score in zip(series, predictions, scores):
            results.append({
                "timestamp": ts.isoformat(),
                "value":     round(val, 4),
                "anomaly":   bool(pred == -1),
                "score":     round(float(score), 6)
            })

        return results

    def summary(self, results: List[dict]) -> dict:
        total    = len(results)
        anomalies = [r for r in results if r["anomaly"]]
        return {
            "total_points": total,
            "anomaly_count": len(anomalies),
            "anomaly_rate":  round(len(anomalies) / total, 4) if total else 0,
            "anomalies":     anomalies
        }
