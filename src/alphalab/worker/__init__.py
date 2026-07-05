"""
alphalab.worker
===============
Background task workers using Celery and Redis.
"""

from alphalab.worker.celery import celery_app

__all__ = ["celery_app"]
