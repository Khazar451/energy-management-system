"""
influx_client.py — InfluxDB query helpers for the ML microservice.
"""

import os
from datetime import datetime, timedelta
from typing import List, Tuple

from influxdb_client import InfluxDBClient
from dotenv import load_dotenv

load_dotenv()

INFLUX_URL    = os.getenv("INFLUX_URL",    "http://influxdb:8086")
INFLUX_TOKEN  = os.getenv("INFLUX_TOKEN",  "my-super-secret-token")
INFLUX_ORG    = os.getenv("INFLUX_ORG",    "energy-org")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "energy-bucket")


def get_client() -> InfluxDBClient:
    return InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)


def fetch_energy_series(
    branch_id: int, days: int = 30
) -> List[Tuple[datetime, float]]:
    """
    Returns a list of (timestamp, energy_kwh) tuples for a branch
    over the last `days` days, sorted chronologically.
    """
    client = get_client()
    query_api = client.query_api()

    flux = f"""
        from(bucket: "{INFLUX_BUCKET}")
          |> range(start: -{days}d)
          |> filter(fn: (r) => r._measurement == "energy_usage")
          |> filter(fn: (r) => r.branch_id == "{branch_id}")
          |> filter(fn: (r) => r._field == "energy_kwh")
          |> sort(columns: ["_time"])
    """

    tables = query_api.query(flux, org=INFLUX_ORG)
    results: List[Tuple[datetime, float]] = []

    for table in tables:
        for record in table.records:
            results.append((record.get_time(), float(record.get_value())))

    client.close()
    return results


def fetch_device_series(
    device_id: int, days: int = 7
) -> List[Tuple[datetime, float]]:
    """
    Returns energy time-series for a single device.
    """
    client = get_client()
    query_api = client.query_api()

    flux = f"""
        from(bucket: "{INFLUX_BUCKET}")
          |> range(start: -{days}d)
          |> filter(fn: (r) => r._measurement == "energy_usage")
          |> filter(fn: (r) => r.device_id == "{device_id}")
          |> filter(fn: (r) => r._field == "energy_kwh")
          |> sort(columns: ["_time"])
    """

    tables = query_api.query(flux, org=INFLUX_ORG)
    results: List[Tuple[datetime, float]] = []

    for table in tables:
        for record in table.records:
            results.append((record.get_time(), float(record.get_value())))

    client.close()
    return results
