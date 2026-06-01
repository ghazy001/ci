from celery.utils.log import get_task_logger

from app.celery_app import celery_app
from app.schemas.script_generation import (
    GenerateAutomationScriptRequest,
    GenerateAutomationScriptResponse,
)
from app.services.script_generation_pipeline import AutomationScriptGenerationPipeline

logger = get_task_logger(__name__)


@celery_app.task(name="generate_automation_script_task", bind=True)
def generate_automation_script_task(self, payload: dict):
    try:
        request = GenerateAutomationScriptRequest.model_validate(payload)

        pipeline = AutomationScriptGenerationPipeline()
        response: GenerateAutomationScriptResponse = pipeline.generate(request)

        return response.model_dump(mode="json")

    except Exception as error:
        logger.exception("Automation script generation task failed")
        raise error