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
    broker=settings.async_redis_url,
    backend=settings.async_redis_url,
)

# Load configuration parameters
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=["alphalab.worker.tasks"],
    task_always_eager=settings.MOCK_MODE,
)
