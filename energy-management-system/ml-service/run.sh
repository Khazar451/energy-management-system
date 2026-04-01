#!/bin/sh
# Start worker in the background
python worker.py &

# Start FastAPI app in the foreground
exec uvicorn main:app --host 0.0.0.0 --port 8000
