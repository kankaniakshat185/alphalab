#!/bin/bash
# 1. Run migrations
python scripts/bootstrap.py

# 2. Start Celery worker in the background
celery -A alphalab.worker.celery worker --pool=solo --loglevel=info &

# 3. Start FastAPI server in the foreground
uvicorn alphalab.api.main:app --host 0.0.0.0 --port ${PORT:-8000}
