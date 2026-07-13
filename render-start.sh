#!/bin/bash
# Start Celery worker in the background
celery -A alphalab.worker.celery worker --loglevel=info &

# Start FastAPI server in the foreground
uvicorn alphalab.api.main:app --host 0.0.0.0 --port ${PORT:-8000}
