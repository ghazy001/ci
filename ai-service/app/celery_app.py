from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "ai_test_case_generation",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.test_case_generation_tasks",
        "app.tasks.automation_script_generation_tasks",
    ],
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    worker_prefetch_multiplier=1,
    task_acks_late=True,

    task_time_limit=600,
    task_soft_time_limit=540,

    broker_connection_timeout=5,
    broker_connection_retry_on_startup=True,
    broker_transport_options={
        "socket_timeout": 5,
        "socket_connect_timeout": 5,
        "retry_on_timeout": False,
    },
    task_publish_retry=True,
    task_publish_retry_policy={
        "max_retries": 1,
        "interval_start": 0,
        "interval_step": 0.2,
        "interval_max": 0.5,
    },
)