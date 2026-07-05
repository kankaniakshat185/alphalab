"""
alphalab.worker.celery
======================
Configures the Celery application and task discovery routines.
"""

from celery import Celery

from alphalab.config.settings import settings

# Instantiate Celery app bound to Redis broker
celery_app = Celery(
    "alphalab",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

# Load configuration parameters
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=["alphalab.worker.tasks"],
)
