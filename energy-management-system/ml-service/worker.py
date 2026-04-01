"""
worker.py — Python chron/worker script
Runs periodically (e.g. every 15 minutes) to:
 1. Fetch time-series batches from InfluxDB
 2. Run inference (Isolation Forest / ARIMA)
 3. Push results to ASP.NET Internal API
"""

import os
import time
import requests
import logging
from datetime import datetime
from influx_client import fetch_energy_series
from models.anomaly import EnergyAnomalyDetector
from models.forecast import EnergyForecaster

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_URL  = os.getenv("API_URL", "http://backend:5000")
INTERVAL = int(os.getenv("WORKER_INTERVAL_SEC", "900"))  # 15 minutes by default

detector   = EnergyAnomalyDetector(contamination=0.05)
forecaster = EnergyForecaster(order=(2, 1, 2))


def fetch_active_branches() -> list[int]:
    """
    In a real scenario, the worker might fetch the list of active Branch IDs 
    to process from an internal .NET API endpoint. For simplicity, we hardcode 
    or mock fetching a list of branches currently pushing data.
    """
    return [1, 2, 3, 4]  # Example/mock based on seed data


def run_pipeline_for_branch(branch_id: int):
    logger.info(f"Running ML pipeline for branch {branch_id}...")
    
    try:
        series = fetch_energy_series(branch_id, days=30)
    except Exception as e:
        logger.warning(f"Failed fetching InfluxDB data for branch {branch_id}: {e}")
        return

    if not series:
        logger.info(f"No recent data for branch {branch_id}. Skipping.")
        return

    # 1. Anomaly Detection (recent points)
    anomaly_results = detector.detect(series)
    # Filter anomalies from the last 24h just to push recent flags
    recent_anom = [
        r for r in anomaly_results 
        if (datetime.utcnow() - datetime.fromisoformat(r['timestamp'])).days <= 1
    ]

    # 2. Forecasting
    forecast_results = forecaster.forecast(series, horizon=7)

    # 3. Format payload for internal API push
    ml_results = []
    
    # Pack forecast entries
    for fc in forecast_results:
        ml_results.append({
            "Timestamp": fc["timestamp"],
            "ForecastValue": fc["forecast_kwh"],
            "IsAnomaly": False,
            "AnomalyScore": 0.0
        })
        
    # Pack anomaly flag entries
    for an in recent_anom:
        if an["anomaly"]:
            ml_results.append({
                "Timestamp": an["timestamp"],
                "ForecastValue": an["value"],  # we can piggyback value here
                "IsAnomaly": True,
                "AnomalyScore": an["score"]
            })

    if not ml_results:
        return

    # 4. Push to .NET API
    payload = {
        "BranchId": branch_id,
        "Results": ml_results
    }
    
    try:
        resp = requests.post(f"{API_URL}/internal/api/ml/results", json=payload, timeout=10)
        resp.raise_for_status()
        logger.info(f"Successfully pushed ML batch for branch {branch_id}.")
    except Exception as e:
        logger.error(f"Failed to push ML results explicitly to API: {e}")


def main_loop():
    logger.info("Starting ML worker loop...")
    while True:
        start_t = time.time()
        branches = fetch_active_branches()
        
        for b_id in branches:
            run_pipeline_for_branch(b_id)
            
        elapsed = time.time() - start_t
        wait_time = max(0, INTERVAL - elapsed)
        
        logger.info(f"Batch completed in {elapsed:.1f}s. Sleeping for {wait_time:.1f}s.")
        time.sleep(wait_time)


if __name__ == "__main__":
    # Add a small startup delay to ensure backend is fully ready
    time.sleep(5)
    main_loop()
