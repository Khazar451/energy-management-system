"""
main.py — FastAPI ML Microservice for Energy Management System.
Exposes:
  POST /analyze          → anomaly detection
  GET  /forecast         → energy consumption forecast
  GET  /health           → liveness check
"""

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from influx_client import fetch_energy_series, fetch_device_series
from models.anomaly import EnergyAnomalyDetector
from models.forecast import EnergyForecaster

# ─── App Setup ───────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Energy Management — ML Service",
    description="Anomaly detection and energy forecasting powered by Isolation Forest & ARIMA.",
    version="1.0.0"
)

detector   = EnergyAnomalyDetector(contamination=0.05)
forecaster = EnergyForecaster(order=(2, 1, 2))


# ─── Request / Response Models ───────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    branch_id: int
    days: Optional[int] = 30


class ForecastRequest(BaseModel):
    branch_id: int
    days_history: Optional[int] = 30
    horizon: Optional[int] = 7


# ─── Endpoints ───────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-service"}


@app.post("/analyze")
def analyze_anomalies(req: AnalyzeRequest):
    """
    Fetches energy time-series from InfluxDB for a branch, runs
    Isolation Forest anomaly detection, and returns per-point results.
    """
    logger.info(f"[analyze] branch_id={req.branch_id} days={req.days}")
    try:
        series = fetch_energy_series(req.branch_id, req.days)
    except Exception as e:
        logger.warning(f"InfluxDB fetch failed, using mock data: {e}")
        series = _generate_mock_series(req.days or 30)

    if not series:
        raise HTTPException(status_code=404, detail="No data found for this branch.")

    results = detector.detect(series)
    summary = detector.summary(results)

    return {
        "branch_id": req.branch_id,
        "period_days": req.days,
        "total_readings": len(results),
        **summary,
        "detail": results
    }


@app.post("/forecast")
def forecast_energy(req: ForecastRequest):
    """
    Fetches historical energy data and returns ARIMA or moving-avg forecasts
    for the next `horizon` days.
    """
    logger.info(f"[forecast] branch_id={req.branch_id} horizon={req.horizon}")
    try:
        series = fetch_energy_series(req.branch_id, req.days_history)
    except Exception as e:
        logger.warning(f"InfluxDB fetch failed, using mock data: {e}")
        series = _generate_mock_series(req.days_history or 30)

    if not series:
        raise HTTPException(status_code=404, detail="No historical data found.")

    predictions = forecaster.forecast(series, horizon=req.horizon or 7)

    return {
        "branch_id":       req.branch_id,
        "history_days":    req.days_history,
        "forecast_horizon": req.horizon,
        "predictions":     predictions
    }


@app.get("/forecast")
def forecast_energy_get(
    branch_id: int = Query(..., description="Branch ID to forecast for"),
    days_history: int = Query(30, description="Days of history to use"),
    horizon: int = Query(7, description="Days to forecast ahead")
):
    """GET-friendly alias for the forecast endpoint."""
    return forecast_energy(ForecastRequest(
        branch_id=branch_id,
        days_history=days_history,
        horizon=horizon
    ))


# ─── Mock Data Helper ────────────────────────────────────────────────────────
def _generate_mock_series(days: int):
    """Generates synthetic energy data for demo/testing when InfluxDB is down."""
    import numpy as np
    from datetime import datetime, timedelta

    rng   = np.random.default_rng(42)
    base  = 50.0
    noise = rng.normal(0, 5, days)
    trend = np.linspace(0, 10, days)
    spike = np.zeros(days)
    if days > 10:
        spike[days // 2] = 30  # intentional anomaly

    now    = datetime.utcnow()
    series = []
    for i in range(days):
        ts  = now - timedelta(days=days - i - 1)
        val = max(0, base + trend[i] + noise[i] + spike[i])
        series.append((ts, float(round(val, 2))))

    return series
